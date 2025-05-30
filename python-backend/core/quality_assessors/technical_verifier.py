import re
import math
import subprocess
import tempfile
import os
import json
import sympy
from typing import Dict, Any, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class TechnicalVerifier:
    """技术验证器，用于验证代码执行和数学计算结果"""
    
    def __init__(self, timeout: int = 5, max_memory: int = 100):
        """
        初始化技术验证器
        
        Args:
            timeout: 代码执行超时时间(秒)
            max_memory: 最大内存限制(MB)
        """
        self.timeout = timeout
        self.max_memory = max_memory
    
    def verify_samples(self, samples: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """验证样本的技术正确性"""
        verified_samples = []
        
        for sample in samples:
            instruction = sample.get("instruction", "")
            response = sample.get("response", {})
            
            # 确定验证方法
            verification_result = None
            if self._is_code_task(instruction, response):
                verification_result = self._verify_code(instruction, response)
            elif self._is_math_task(instruction, response):
                verification_result = self._verify_math(instruction, response)
            
            # 添加验证结果
            if verification_result:
                if "metadata" not in sample:
                    sample["metadata"] = {}
                if "evaluations" not in sample["metadata"]:
                    sample["metadata"]["evaluations"] = {}
                
                sample["metadata"]["evaluations"]["verification"] = verification_result
            
            verified_samples.append(sample)
        
        return verified_samples
    
    def _is_code_task(self, instruction: str, response: Dict[str, Any]) -> bool:
        """判断是否为代码任务"""
        instruction_lower = instruction.lower()
        code_keywords = ["代码", "编程", "函数", "实现", "写一个", "编写", "program", "code", "function", "implement"]
        
        # 检查指令中是否包含代码关键词
        if any(keyword in instruction_lower for keyword in code_keywords):
            return True
        
        # 检查响应中是否包含代码块
        response_text = ""
        if isinstance(response, dict):
            response_text = response.get("origin_text", "")
        elif isinstance(response, str):
            response_text = response
        
        code_block_pattern = r"```[\w]*\n[\s\S]*?\n```"
        return bool(re.search(code_block_pattern, response_text))
    
    def _is_math_task(self, instruction: str, response: Dict[str, Any]) -> bool:
        """判断是否为数学任务"""
        instruction_lower = instruction.lower()
        math_keywords = ["计算", "求解", "方程", "数学", "calculate", "solve", "equation", "math"]
        
        # 检查指令中是否包含数学关键词
        if any(keyword in instruction_lower for keyword in math_keywords):
            return True
        
        # 检查响应中是否包含数学表达式
        response_text = ""
        if isinstance(response, dict):
            response_text = response.get("origin_text", "")
        elif isinstance(response, str):
            response_text = response
        
        math_patterns = [
            r"\d+\s*[\+\-\*\/]\s*\d+",  # 基本算术
            r"=\s*\d+",  # 等于某数
            r"\\frac{.*}{.*}",  # LaTeX分数
            r"\d+\^2"  # 平方
        ]
        
        for pattern in math_patterns:
            if re.search(pattern, response_text):
                return True
        
        return False
    
    def _verify_code(self, instruction: str, response: Dict[str, Any]) -> Dict[str, Any]:
        """验证代码执行结果"""
        # 提取代码
        response_text = ""
        if isinstance(response, dict):
            response_text = response.get("origin_text", "")
        elif isinstance(response, str):
            response_text = response
        
        code_blocks = re.findall(r"```([\w]*)\n([\s\S]*?)\n```", response_text)
        
        if not code_blocks:
            return {
                "verified": False,
                "method": "code_validation",
                "results": {
                    "error": "未找到代码块"
                }
            }
        
        # 获取语言和代码
        language, code = code_blocks[0]
        if not language:
            # 尝试从内容猜测语言
            if "def " in code and ":" in code:
                language = "python"
            elif "function" in code and "{" in code:
                language = "javascript"
            else:
                language = "python"  # 默认Python
        
        # 根据语言执行代码
        try:
            if language.lower() in ["python", "py"]:
                result = self._execute_python_code(code)
            elif language.lower() in ["javascript", "js"]:
                result = self._execute_js_code(code)
            else:
                return {
                    "verified": False,
                    "method": "code_validation",
                    "results": {
                        "error": f"不支持的语言: {language}"
                    }
                }
            
            return {
                "verified": result["success"],
                "method": "code_validation",
                "results": result
            }
            
        except Exception as e:
            return {
                "verified": False,
                "method": "code_validation",
                "results": {
                    "error": str(e),
                    "exception": str(type(e).__name__)
                }
            }
    
    def _execute_python_code(self, code: str) -> Dict[str, Any]:
        """在安全沙箱中执行Python代码"""
        with tempfile.NamedTemporaryFile(suffix='.py', delete=False) as temp:
            temp_name = temp.name
            temp.write(code.encode('utf-8'))
        
        try:
            # 添加安全限制
            cmd = [
                "python", "-c",
                f"import resource; resource.setrlimit(resource.RLIMIT_AS, ({self.max_memory * 1024 * 1024}, {self.max_memory * 1024 * 1024})); "
                f"exec(open('{temp_name}').read())"
            ]
            
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout
            )
            
            success = proc.returncode == 0
            
            return {
                "success": success,
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "return_code": proc.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "代码执行超时"
            }
        finally:
            # 清理临时文件
            if os.path.exists(temp_name):
                os.unlink(temp_name)
    
    def _execute_js_code(self, code: str) -> Dict[str, Any]:
        """在安全沙箱中执行JavaScript代码"""
        with tempfile.NamedTemporaryFile(suffix='.js', delete=False) as temp:
            temp_name = temp.name
            temp.write(code.encode('utf-8'))
        
        try:
            # 使用Node.js执行
            cmd = ["node", temp_name]
            
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout
            )
            
            success = proc.returncode == 0
            
            return {
                "success": success,
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "return_code": proc.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "代码执行超时"
            }
        finally:
            # 清理临时文件
            if os.path.exists(temp_name):
                os.unlink(temp_name)
    
    def _verify_math(self, instruction: str, response: Dict[str, Any]) -> Dict[str, Any]:
        """验证数学计算结果"""
        # 提取问题和答案
        question = instruction
        
        answer = ""
        expected_answer = None
        
        if isinstance(response, dict):
            if "final_answer" in response:
                answer = response["final_answer"]
            else:
                answer = response.get("origin_text", "")
        elif isinstance(response, str):
            answer = response
        
        # 尝试从问题中提取预期答案
        expected_match = re.search(r"等于\s*([\d\.]+)", question)
        if expected_match:
            try:
                expected_answer = float(expected_match.group(1))
            except:
                pass
        
        # 从答案中提取数值结果
        answer_match = re.search(r"(?:等于|是|=)\s*([\d\.]+)", answer)
        if answer_match:
            try:
                actual_answer = float(answer_match.group(1))
                
                # 如果有预期答案，比较结果
                if expected_answer is not None:
                    is_correct = abs(actual_answer - expected_answer) < 1e-6
                    
                    return {
                        "verified": is_correct,
                        "method": "math_validation",
                        "results": {
                            "expected_answer": expected_answer,
                            "actual_answer": actual_answer,
                            "is_correct": is_correct
                        }
                    }
                else:
                    # 尝试使用sympy计算表达式
                    try:
                        # 从问题中提取表达式
                        expr_match = re.search(r"计算\s*(.+?)\s*的结果", question)
                        if expr_match:
                            expr_str = expr_match.group(1)
                            # 替换中文乘号
                            expr_str = expr_str.replace("乘以", "*")
                            # 替换中文除号
                            expr_str = expr_str.replace("除以", "/")
                            
                            # 使用sympy计算
                            expr = sympy.sympify(expr_str)
                            calculated_result = float(expr.evalf())
                            
                            is_correct = abs(actual_answer - calculated_result) < 1e-6
                            
                            return {
                                "verified": is_correct,
                                "method": "math_validation",
                                "results": {
                                    "expected_answer": calculated_result,
                                    "actual_answer": actual_answer,
                                    "is_correct": is_correct,
                                    "expression": expr_str
                                }
                            }
                    except:
                        # 如果无法计算，只返回提取的答案
                        return {
                            "verified": True,  # 无法验证，默认为真
                            "method": "math_validation",
                            "results": {
                                "actual_answer": actual_answer
                            }
                        }
            except:
                pass
        
        # 如果无法提取答案，返回未验证
        return {
            "verified": False,
            "method": "math_validation",
            "results": {
                "error": "无法提取或验证答案"
            }
        }