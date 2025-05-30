# DataPresso桌面应用后端算法增强改进施工文档

## 1. 项目概述

本施工文档针对DataPresso桌面应用的后端算法进行全面增强和改进，基于前期分析发现的差距与不足，提供详细的实施方案和代码示例。改进工作将覆盖五个核心架构层，包括数据生成扩充层、数据质量评估层、数据多维度筛选层、高级评估与筛选层和集成训练层。

## 2. 总体改进目标

1. 完善高级评估方法的实现（如IFD、LIMR、LESS等）
2. 增强质量与多样性平衡算法
3. 统一各层数据格式与设计文档一致
4. 增强技术验证功能（代码/数学验证）
5. 改进数据可视化和分析功能
6. 实现断点续传功能
7. 增强模型训练评估功能
8. 完善文档和示例

## 3. 数据生成扩充层改进

### 3.1 统计报告格式完善

**文件路径**: `python-backend/core/data_generators/generator_engine.py`

**改进内容**:
1. 增加详细的统计报告生成函数，与设计文档格式保持一致

```python
def generate_statistics_report(self, generated_data: List[Dict[str, Any]], 
                               seed_data: List[Dict[str, Any]] = None,
                               generation_time: float = 0) -> Dict[str, Any]:
    """生成详细的统计报告，符合设计文档格式"""
    stats = {
        "generation_stats": {
            "total_generated": len(generated_data),
            "passed_initial_filter": 0,  # 将在过滤后更新
            "rejected": 0,  # 将在过滤后更新
            "generation_time": f"{generation_time:.2f}秒",
            "average_time_per_sample": generation_time / len(generated_data) if generated_data else 0,
            "domain_distribution": self._calculate_domain_distribution(generated_data),
            "difficulty_distribution": self._calculate_difficulty_distribution(generated_data)
        }
    }
    return stats

def _calculate_domain_distribution(self, data: List[Dict[str, Any]]) -> Dict[str, int]:
    """计算领域分布"""
    domains = {}
    for item in data:
        domain = item.get("metadata", {}).get("domain", "未分类")
        if domain not in domains:
            domains[domain] = 0
        domains[domain] += 1
    return domains

def _calculate_difficulty_distribution(self, data: List[Dict[str, Any]]) -> Dict[str, int]:
    """计算难度分布"""
    difficulty_ranges = {
        "easy (0.0-0.3)": 0,
        "medium (0.3-0.7)": 0,
        "hard (0.7-1.0)": 0
    }
    
    for item in data:
        difficulty = item.get("metadata", {}).get("difficulty", 0.5)
        if difficulty <= 0.3:
            difficulty_ranges["easy (0.0-0.3)"] += 1
        elif difficulty <= 0.7:
            difficulty_ranges["medium (0.3-0.7)"] += 1
        else:
            difficulty_ranges["hard (0.7-1.0)"] += 1
    
    return difficulty_ranges
```

### 3.2 增强初步质量筛选功能

**文件路径**: `python-backend/core/data_generators/generator_engine.py`

**改进内容**:
1. 增加更复杂的质量评估和筛选功能

```python
def apply_initial_filtering(self, generated_data: List[Dict[str, Any]], 
                           filter_config: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """应用初步质量筛选"""
    if not filter_config.get("enabled", False):
        return generated_data, {"filtered": 0, "passed": len(generated_data)}
    
    filtered_data = []
    rejected_count = 0
    rejection_reasons = {}
    
    min_length = filter_config.get("min_length", 0)
    max_length = filter_config.get("max_length", float('inf'))
    banned_patterns = filter_config.get("banned_patterns", [])
    
    # 编译正则表达式以提高性能
    banned_regex = [re.compile(pattern, re.IGNORECASE) for pattern in banned_patterns]
    
    for item in generated_data:
        # 获取响应文本
        response_text = ""
        if isinstance(item.get("response"), dict):
            response_text = item["response"].get("origin_text", "")
        elif isinstance(item.get("response"), str):
            response_text = item["response"]
        
        # 检查长度
        if len(response_text) < min_length:
            rejected_count += 1
            if "too_short" not in rejection_reasons:
                rejection_reasons["too_short"] = 0
            rejection_reasons["too_short"] += 1
            continue
            
        if len(response_text) > max_length:
            rejected_count += 1
            if "too_long" not in rejection_reasons:
                rejection_reasons["too_long"] = 0
            rejection_reasons["too_long"] += 1
            continue
        
        # 检查禁用模式
        rejected = False
        for pattern in banned_regex:
            if pattern.search(response_text):
                rejected_count += 1
                pattern_str = pattern.pattern
                if pattern_str not in rejection_reasons:
                    rejection_reasons[pattern_str] = 0
                rejection_reasons[pattern_str] += 1
                rejected = True
                break
        
        if not rejected:
            filtered_data.append(item)
    
    filtering_stats = {
        "filtered": rejected_count,
        "passed": len(filtered_data),
        "rejection_reasons": rejection_reasons
    }
    
    return filtered_data, filtering_stats
```

### 3.3 增强种子数据关联追踪

**文件路径**: `python-backend/core/data_generators/generator_engine.py`

**改进内容**:
1. 增强变异生成时的种子数据关联追踪

```python
def _enhance_metadata_with_seed_info(self, new_item: Dict[str, Any], 
                                     seed_item: Dict[str, Any],
                                     generation_params: Dict[str, Any]) -> Dict[str, Any]:
    """增强元数据，添加种子数据关联信息"""
    # 确保metadata存在
    if "metadata" not in new_item:
        new_item["metadata"] = {}
    
    # 添加种子ID关联
    seed_id = seed_item.get("id", None)
    if seed_id:
        new_item["metadata"]["seed_id"] = seed_id
    
    # 添加生成信息
    new_item["metadata"]["source"] = generation_params.get("model", "system") + "生成"
    new_item["metadata"]["creation_timestamp"] = datetime.now().isoformat()
    
    # 添加生成参数
    if "generation" not in new_item["metadata"]:
        new_item["metadata"]["generation"] = {}
    
    new_item["metadata"]["generation"].update({
        "model": generation_params.get("model", "unknown"),
        "temperature": generation_params.get("temperature", 0.7),
        "prompt_template": generation_params.get("prompt_template", "basic_generation"),
        "generation_time": generation_params.get("generation_time", 0),
        "initial_quality": generation_params.get("initial_quality", 0.5)
    })
    
    return new_item
```

## 4. 数据质量评估层改进

### 4.1 增强技术验证功能

**文件路径**: `python-backend/core/quality_assessors/technical_verifier.py`（新文件）

**改进内容**:
1. 创建专门的技术验证器模块，实现代码执行和数学验证

```python
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
```

### 4.2 统一评估报告格式

**文件路径**: `python-backend/core/evaluators/evaluation_engine.py`

**改进内容**:
1. 添加符合设计文档格式的评估报告生成函数

```python
def generate_assessment_report(metric_scores: List[Dict[str, Any]], 
                              data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """生成符合设计文档格式的评估统计报告"""
    # 计算通过验证的样本数
    passed_verification = 0
    failed_verification = 0
    
    for item in data:
        verification = item.get("metadata", {}).get("evaluations", {}).get("verification", {})
        if verification.get("verified", False):
            passed_verification += 1
        else:
            failed_verification += 1
    
    # 计算各指标的统计信息
    score_distribution = {}
    for metric in ["instruction_complexity", "response_quality", "reasoning_depth", 
                  "safety_score", "overall_score"]:
        scores = [item.get("metadata", {}).get("evaluations", {}).get(metric, 0) 
                 for item in data if metric in item.get("metadata", {}).get("evaluations", {})]
        
        if scores:
            score_distribution[metric] = {
                "mean": sum(scores) / len(scores),
                "median": sorted(scores)[len(scores) // 2],
                "std": math.sqrt(sum((x - sum(scores) / len(scores)) ** 2 for x in scores) / len(scores))
            }
    
    # 计算各领域的性能
    domain_performance = {}
    domains = set(item.get("metadata", {}).get("domain", "未分类") for item in data)
    
    for domain in domains:
        domain_items = [item for item in data if item.get("metadata", {}).get("domain") == domain]
        if domain_items:
            domain_scores = [item.get("metadata", {}).get("evaluations", {}).get("overall_score", 0) 
                           for item in domain_items]
            
            domain_verification = [item.get("metadata", {}).get("evaluations", {}).get("verification", {}).get("verified", False) 
                                 for item in domain_items]
            
            domain_performance[domain] = {
                "mean_score": sum(domain_scores) / len(domain_scores) if domain_scores else 0,
                "verification_success_rate": sum(1 for v in domain_verification if v) / len(domain_verification) if domain_verification else 0
            }
    
    # 构建报告
    report = {
        "assessment_stats": {
            "total_assessed": len(data),
            "passed_verification": passed_verification,
            "failed_verification": failed_verification,
            "score_distribution": score_distribution,
            "domain_performance": domain_performance
        }
    }
    
    return report
```

### 4.3 实现断点续传功能

**文件路径**: `python-backend/core/evaluators/evaluation_engine.py`

**改进内容**:
1. 添加断点续传功能，支持中断后继续评估

```python
async def evaluate_metrics_with_checkpoint(
    data: List[Dict[str, Any]],
    checkpoint_file: str,
    reference_data: Optional[List[Dict[str, Any]]] = None,
    metrics: List[str] = [],
    custom_metric_code: Optional[str] = None,
    weights: Optional[Dict[str, float]] = None,
    batch_size: int = 10
) -> Tuple[List[Dict[str, Any]], float]:
    """
    支持断点续传的评估函数
    
    Args:
        data: 要评估的数据列表
        checkpoint_file: 检查点文件路径
        reference_data: 参考数据列表(可选)
        metrics: 要评估的指标列表
        custom_metric_code: 自定义指标代码(可选)
        weights: 指标权重字典(可选)
        batch_size: 批处理大小
        
    Returns:
        (metric_scores, overall_score): 各指标得分列表和总体评分
    """
    # 检查是否存在检查点
    checkpoint_data = {}
    processed_indices = set()
    
    if os.path.exists(checkpoint_file):
        try:
            with open(checkpoint_file, 'r', encoding='utf-8') as f:
                checkpoint_data = json.load(f)
                processed_indices = set(checkpoint_data.get("processed_indices", []))
                logger.info(f"加载检查点，已处理 {len(processed_indices)} 个样本")
        except Exception as e:
            logger.error(f"加载检查点失败: {e}")
    
    # 初始化结果
    metric_scores = checkpoint_data.get("metric_scores", [])
    processed_data = checkpoint_data.get("processed_data", [])
    
    # 分批处理未处理的数据
    remaining_indices = [i for i in range(len(data)) if i not in processed_indices]
    
    for i in range(0, len(remaining_indices), batch_size):
        batch_indices = remaining_indices[i:i+batch_size]
        batch_data = [data[idx] for idx in batch_indices]
        
        # 评估批次
        batch_scores, _ = await evaluate_metrics(
            batch_data, reference_data, metrics, custom_metric_code, weights
        )
        
        # 更新结果
        for idx, item_idx in enumerate(batch_indices):
            processed_data.append({
                "index": item_idx,
                "scores": batch_scores[idx] if idx < len(batch_scores) else {}
            })
            processed_indices.add(item_idx)
        
        # 保存检查点
        checkpoint_data = {
            "processed_indices": list(processed_indices),
            "metric_scores": metric_scores,
            "processed_data": processed_data,
            "last_update": datetime.now().isoformat()
        }
        
        with open(checkpoint_file, 'w', encoding='utf-8') as f:
            json.dump(checkpoint_data, f, indent=2)
        
        logger.info(f"已处理 {len(processed_indices)}/{len(data)} 个样本，保存检查点")
    
    # 重建完整结果
    final_data = data.copy()
    for item in processed_data:
        idx = item["index"]
        if idx < len(final_data):
            # 将评估结果添加到原始数据
            if "metadata" not in final_data[idx]:
                final_data[idx]["metadata"] = {}
            if "evaluations" not in final_data[idx]["metadata"]:
                final_data[idx]["metadata"]["evaluations"] = {}
            
            for metric, score in item["scores"].items():
                final_data[idx]["metadata"]["evaluations"][metric] = score
    
    # 计算总体评分
    overall_score = calculate_overall_score(metric_scores, weights)
    
    return final_data, overall_score
```

## 5. 数据多维度筛选层改进

### 5.1 增强多样性分析器

```python
                difficulty = sample.get("metadata", {}).get("difficulty", 0.5)
                if difficulty <= 0.3:
                    difficulty_distribution["easy"] += 1
                elif difficulty <= 0.7:
                    difficulty_distribution["medium"] += 1
                else:
                    difficulty_distribution["hard"] += 1
            
            # 计算领域均衡性
            domain_balance = self._calculate_distribution_balance(list(domain_counts.values()))
            
            # 计算难度均衡性
            difficulty_balance = self._calculate_distribution_balance([
                difficulty_distribution["easy"],
                difficulty_distribution["medium"],
                difficulty_distribution["hard"]
            ])
            
            return {
                "diversity_score": diversity_score,
                "domain_distribution": domain_counts,
                "domain_balance": domain_balance,
                "difficulty_distribution": difficulty_distribution,
                "difficulty_balance": difficulty_balance,
                "semantic_diversity": diversity_score,
                "sample_count": len(samples)
            }
            
        except Exception as e:
            logger.error(f"多样性分析失败: {e}")
            return {"diversity_score": 0, "error": str(e)}
    
    def calculate_diversity_contribution(self, sample: Dict[str, Any], 
                                        dataset_stats: Dict[str, Any]) -> float:
        """
        计算样本对多样性的贡献
        
        Args:
            sample: 数据样本
            dataset_stats: 数据集统计信息
            
        Returns:
            多样性贡献分数(0-1)
        """
        # 提取样本信息
        domain = sample.get("metadata", {}).get("domain", "未分类")
        difficulty = sample.get("metadata", {}).get("difficulty", 0.5)
        
        # 计算领域贡献
        domain_contribution = 0.0
        domain_distribution = dataset_stats.get("domain_distribution", {})
        total_samples = dataset_stats.get("sample_count", 1)
        
        if domain in domain_distribution:
            # 稀有领域贡献更大
            domain_ratio = domain_distribution[domain] / total_samples
            domain_contribution = 1.0 - domain_ratio
        else:
            # 新领域贡献最大
            domain_contribution = 1.0
        
        # 计算难度贡献
        difficulty_contribution = 0.0
        difficulty_distribution = dataset_stats.get("difficulty_distribution", {})
        
        if difficulty <= 0.3:
            difficulty_category = "easy"
        elif difficulty <= 0.7:
            difficulty_category = "medium"
        else:
            difficulty_category = "hard"
        
        difficulty_count = difficulty_distribution.get(difficulty_category, 0)
        difficulty_ratio = difficulty_count / total_samples if total_samples > 0 else 0
        difficulty_contribution = 1.0 - difficulty_ratio
        
        # 计算语义贡献（需要样本文本和数据集文本）
        semantic_contribution = 0.5  # 默认值
        
        # 组合贡献分数，可以根据需要调整权重
        combined_score = (domain_contribution * 0.4 + 
                         difficulty_contribution * 0.3 + 
                         semantic_contribution * 0.3)
        
        return combined_score
    
    def _calculate_distribution_balance(self, counts: List[int]) -> float:
        """计算分布的均衡性，使用熵作为指标"""
        total = sum(counts)
        if total == 0:
            return 0
        
        # 计算概率分布
        probs = [count / total for count in counts if count > 0]
        
        # 计算熵
        entropy = -sum(p * np.log2(p) for p in probs)
        
        # 最大熵（均匀分布）
        max_entropy = np.log2(len(probs)) if probs else 0
        
        # 归一化熵（0-1之间，1表示完全均衡）
        normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0
        
        return normalized_entropy
```

### 5.2 增强质量与多样性平衡算法

**文件路径**: `python-backend/core/data_filters/balanced_selector.py`（新文件）

**改进内容**:
1. 创建专门的平衡选择器，实现质量与多样性的平衡

```python
import numpy as np
from typing import List, Dict, Any, Tuple
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class BalancedSelector:
    """平衡质量与多样性的数据选择器"""
    
    def __init__(self, diversity_analyzer=None):
        """
        初始化平衡选择器
        
        Args:
            diversity_analyzer: 多样性分析器实例
        """
        self.diversity_analyzer = diversity_analyzer
    
    def select_balanced_dataset(
        self,
        data: List[Dict[str, Any]],
        quality_threshold: float = 0.7,
        diversity_weight: float = 0.3,
        target_size: int = 1000,
        domain_balance: bool = True,
        difficulty_distribution: Dict[str, float] = None,
        min_domain_samples: int = 50
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        选择平衡质量与多样性的数据集
        
        Args:
            data: 输入数据列表
            quality_threshold: 质量阈值
            diversity_weight: 多样性权重(0-1)
            target_size: 目标数据集大小
            domain_balance: 是否平衡领域分布
            difficulty_distribution: 目标难度分布
            min_domain_samples: 每个领域的最小样本数
            
        Returns:
            (selected_data, selection_stats): 选中的数据和选择统计信息
        """
        if not data:
            return [], {"error": "输入数据为空"}
        
        # 默认难度分布
        if not difficulty_distribution:
            difficulty_distribution = {
                "easy": 0.2,
                "medium": 0.5,
                "hard": 0.3
            }
        
        # 1. 首先按质量阈值筛选
        quality_filtered = []
        for item in data:
            overall_score = item.get("metadata", {}).get("evaluations", {}).get("overall_score", 0)
            if overall_score >= quality_threshold:
                quality_filtered.append(item)
        
        logger.info(f"质量筛选后剩余 {len(quality_filtered)}/{len(data)} 个样本")
        
        # 如果质量筛选后样本不足，降低阈值
        if len(quality_filtered) < target_size:
            logger.warning(f"质量筛选后样本不足，降低阈值")
            quality_filtered = sorted(
                data, 
                key=lambda x: x.get("metadata", {}).get("evaluations", {}).get("overall_score", 0),
                reverse=True
            )[:target_size]
        
        # 2. 分析数据集多样性
        if self.diversity_analyzer:
            diversity_stats = self.diversity_analyzer.analyze_diversity(quality_filtered)
        else:
            # 简单统计领域和难度分布
            diversity_stats = self._simple_diversity_analysis(quality_filtered)
        
        # 3. 计算每个样本的选择分数
        scored_samples = []
        for item in quality_filtered:
            quality_score = item.get("metadata", {}).get("evaluations", {}).get("overall_score", 0)
            
            # 计算多样性贡献
            if self.diversity_analyzer:
                diversity_score = self.diversity_analyzer.calculate_diversity_contribution(item, diversity_stats)
            else:
                diversity_score = self._calculate_simple_diversity_contribution(item, diversity_stats)
            
            # 计算综合分数
            selection_score = (1 - diversity_weight) * quality_score + diversity_weight * diversity_score
            
            scored_samples.append({
                "item": item,
                "selection_score": selection_score,
                "quality_score": quality_score,
                "diversity_score": diversity_score
            })
        
        # 4. 按领域分组
        domain_groups = {}
        for sample in scored_samples:
            domain = sample["item"].get("metadata", {}).get("domain", "未分类")
            if domain not in domain_groups:
                domain_groups[domain] = []
            domain_groups[domain].append(sample)
        
        # 5. 平衡选择
        selected_samples = []
        
        if domain_balance and len(domain_groups) > 1:
            # 计算每个领域应分配的样本数
            total_domains = len(domain_groups)
            base_allocation = min_domain_samples  # 每个领域的基础分配
            remaining_allocation = target_size - base_allocation * total_domains
            
            # 如果基础分配已超过目标大小，按比例缩减
            if remaining_allocation < 0:
                base_allocation = target_size // total_domains
                remaining_allocation = target_size - base_allocation * total_domains
            
            # 按领域大小分配剩余配额
            domain_sizes = {domain: len(samples) for domain, samples in domain_groups.items()}
            total_size = sum(domain_sizes.values())
            
            domain_allocations = {}
            for domain, size in domain_sizes.items():
                # 基础分配 + 按比例分配剩余部分
                allocation = base_allocation
                if total_size > 0:
                    allocation += int(remaining_allocation * (size / total_size))
                domain_allocations[domain] = min(allocation, len(domain_groups[domain]))
            
            # 选择每个领域中分数最高的样本
            for domain, allocation in domain_allocations.items():
                domain_samples = sorted(domain_groups[domain], key=lambda x: x["selection_score"], reverse=True)
                selected_samples.extend(domain_samples[:allocation])
        else:
            # 简单选择分数最高的样本
            selected_samples = sorted(scored_samples, key=lambda x: x["selection_score"], reverse=True)[:target_size]
        
        # 6. 提取结果并添加选择信息
        result = []
        for sample in selected_samples:
            item = sample["item"]
            
            # 添加筛选信息
            if "metadata" not in item:
                item["metadata"] = {}
            if "filtering" not in item["metadata"]:
                item["metadata"]["filtering"] = {}
            
            item["metadata"]["filtering"].update({
                "selected": True,
                "reason": f"质量分数 {sample['quality_score']:.2f} 和多样性贡献 {sample['diversity_score']:.2f}",
                "selection_score": sample["selection_score"],
                "quality_contribution": sample["quality_score"],
                "diversity_contribution": sample["diversity_score"],
                "filtering_timestamp": datetime.now().isoformat()
            })
            
            result.append(item)
        
        # 7. 生成选择统计信息
        selection_stats = {
            "input_samples": len(data),
            "quality_filtered": len(quality_filtered),
            "selected_samples": len(result),
            "rejected_samples": len(data) - len(result),
            "quality_distribution": self._calculate_score_distribution([s["quality_score"] for s in selected_samples]),
            "domain_distribution": self._calculate_domain_distribution(result),
            "difficulty_distribution": self._calculate_difficulty_distribution(result),
            "selection_criteria": {
                "quality_threshold": quality_threshold,
                "diversity_weight": diversity_weight,
                "target_size": target_size
            }
        }
        
        return result, selection_stats
    
    def _simple_diversity_analysis(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """简单的多样性分析"""
        domain_counts = {}
        difficulty_distribution = {
            "easy": 0,
            "medium": 0,
            "hard": 0
        }
        
        for item in data:
            domain = item.get("metadata", {}).get("domain", "未分类")
            if domain not in domain_counts:
                domain_counts[domain] = 0
            domain_counts[domain] += 1
            
            difficulty = item.get("metadata", {}).get("difficulty", 0.5)
            if difficulty <= 0.3:
                difficulty_distribution["easy"] += 1
            elif difficulty <= 0.7:
                difficulty_distribution["medium"] += 1
            else:
                difficulty_distribution["hard"] += 1
        
        return {
            "domain_distribution": domain_counts,
            "difficulty_distribution": difficulty_distribution,
            "sample_count": len(data)
        }
    
    def _calculate_simple_diversity_contribution(self, item: Dict[str, Any], 
                                               stats: Dict[str, Any]) -> float:
        """计算样本对多样性的简单贡献"""
        domain = item.get("metadata", {}).get("domain", "未分类")
        difficulty = item.get("metadata", {}).get("difficulty", 0.5)
        
        # 领域贡献
        domain_contribution = 0.0
        domain_distribution = stats.get("domain_distribution", {})
        total_samples = stats.get("sample_count", 1)
        
        if domain in domain_distribution:
            domain_ratio = domain_distribution[domain] / total_samples
            domain_contribution = 1.0 - domain_ratio
        else:
            domain_contribution = 1.0
        
        # 难度贡献
        difficulty_category = "easy" if difficulty <= 0.3 else "medium" if difficulty <= 0.7 else "hard"
        difficulty_distribution = stats.get("difficulty_distribution", {})
        difficulty_count = difficulty_distribution.get(difficulty_category, 0)
        difficulty_ratio = difficulty_count / total_samples if total_samples > 0 else 0
        difficulty_contribution = 1.0 - difficulty_ratio
        
        # 组合贡献
        return (domain_contribution * 0.6 + difficulty_contribution * 0.4)
    
    def _calculate_score_distribution(self, scores: List[float]) -> Dict[str, float]:
        """计算分数分布统计"""
        if not scores:
            return {"mean": 0, "median": 0, "min": 0, "max": 0}
        
        return {
            "mean": np.mean(scores),
            "median": np.median(scores),
            "min": min(scores),
            "max": max(scores)
        }
    
    def _calculate_domain_distribution(self, data: List[Dict[str, Any]]) -> Dict[str, int]:
        """计算领域分布"""
        domain_counts = {}
        for item in data:
            domain = item.get("metadata", {}).get("domain", "未分类")
            if domain not in domain_counts:
                domain_counts[domain] = 0
            domain_counts[domain] += 1
        return domain_counts
    
    def _calculate_difficulty_distribution(self, data: List[Dict[str, Any]]) -> Dict[str, int]:
        """计算难度分布"""
        difficulty_counts = {
            "easy (0.0-0.3)": 0,
            "medium (0.3-0.7)": 0,
            "hard (0.7-1.0)": 0
        }
        
        for item in data:
            difficulty = item.get("metadata", {}).get("difficulty", 0.5)
            if difficulty <= 0.3:
                difficulty_counts["easy (0.0-0.3)"] += 1
            elif difficulty <= 0.7:
                difficulty_counts["medium (0.3-0.7)"] += 1
            else:
                difficulty_counts["hard (0.7-1.0)"] += 1
        
        return difficulty_counts
```

### 5.3 增强去重机制

**文件路径**: `python-backend/core/data_filters/deduplicator.py`（新文件）

**改进内容**:
1. 创建专门的去重模块，实现高级相似度检测

```python
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

class Deduplicator:
    """高级数据去重器，基于语义相似度"""
    
    def __init__(self, similarity_threshold: float = 0.85):
        """
        初始化去重器
        
        Args:
            similarity_threshold: 相似度阈值，超过此值视为重复
        """
        self.similarity_threshold = similarity_threshold
        self.vectorizer = TfidfVectorizer(max_features=1000)
    
    def deduplicate(self, data: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        去除重复数据
        
        Args:
            data: 输入数据列表
            
        Returns:
            (deduplicated_data, stats): 去重后的数据和统计信息
        """
        if not data:
            return [], {"duplicate_clusters": 0, "duplicates_removed": 0}
        
        # 提取文本内容
        texts = []
        for item in data:
            instruction = item.get("instruction", "")
            
            response_text = ""
            if isinstance(item.get("response"), dict):
                response_text = item["response"].get("origin_text", "")
            elif isinstance(item.get("response"), str):
                response_text = item["response"]
            
            texts.append(f"{instruction} {response_text}")
        
        # 计算TF-IDF向量
        try:
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # 计算余弦相似度矩阵
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            # 找出相似度高于阈值的对
            duplicate_clusters = self._find_duplicate_clusters(similarity_matrix)
            
            # 从每个重复簇中选择代表
            deduplicated_indices = self._select_representatives(duplicate_clusters, data)
            
            # 构建结果
            result = [data[i] for i in deduplicated_indices]
            
            # 统计信息
            stats = {
                "duplicate_clusters": len(duplicate_clusters),
                "duplicates_removed": len(data) - len(result),
                "original_count": len(data),
                "deduplicated_count": len(result)
            }
            
            return result, stats
            
        except Exception as e:
            logger.error(f"去重失败: {e}")
            return data, {"error": str(e)}
    
    def _find_duplicate_clusters(self, similarity_matrix: np.ndarray) -> List[List[int]]:
        """找出重复簇"""
        n = similarity_matrix.shape[0]
        visited = [False] * n
        clusters = []
        
        for i in range(n):
            if visited[i]:
                continue
            
            cluster = [i]
            visited[i] = True
            
            for j in range(i+1, n):
                if not visited[j] and similarity_matrix[i, j] >= self.similarity_threshold:
                    cluster.append(j)
                    visited[j] = True
            
            if len(cluster) > 1:
                clusters.append(cluster)
        
        return clusters
    
    def _select_representatives(self, clusters: List[List[int]], 
                              data: List[Dict[str, Any]]) -> List[int]:
        """从每个簇中选择代表"""
        # 保留所有非重复项和每个簇的代表
        representatives = set(range(len(data)))
        
        for cluster in clusters:
            # 从簇中移除所有项
            for idx in cluster:
                representatives.discard(idx)
            
            # 选择质量最高的项作为代表
            best_idx = max(cluster, key=lambda i: data[i].get("metadata", {}).get("evaluations", {}).get("overall_score", 0))
            representatives.add(best_idx)
        
        return sorted(list(representatives))
    
    def find_similar_items(self, query_item: Dict[str, Any], 
                          data: List[Dict[str, Any]], 
                          top_k: int = 5) -> List[Tuple[int, float]]:
        """
        查找与查询项相似的数据项
        
        Args:
            query_item: 查询项
            data: 数据集
            top_k: 返回的最相似项数量
            
        Returns:
            [(index, similarity_score), ...]: 相似项索引和相似度分数
        """
        # 提取查询文本
        query_instruction = query_item.get("instruction", "")
        
        query_response = ""
        if isinstance(query_item.get("response"), dict):
            query_response = query_item["response"].get("origin_text", "")
        elif isinstance(query_item.get("response"), str):
            query_response = query_item["response"]
        
        query_text = f"{query_instruction} {query_response}"
        
        # 提取数据集文本
        texts = []
        for item in data:
            instruction = item.get("instruction", "")
            
            response_text = ""
            if isinstance(item.get("response"), dict):
                response_text = item["response"].get("origin_text", "")
            elif isinstance(item.get("response"), str):
                response_text = item["response"]
            
            texts.append(f"{instruction} {response_text}")
        
        # 计算TF-IDF向量
        all_texts = [query_text] + texts
        tfidf_matrix = self.vectorizer.fit_transform(all_texts)
        
        # 计算查询项与所有项的相似度
        query_vector = tfidf_matrix[0:1]
        data_vectors = tfidf_matrix[1:]
        similarities = cosine_similarity(query_vector, data_vectors)[0]
        
        # 找出最相似的项
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        result = [(int(idx), float(similarities[idx])) for idx in top_indices]
        
        return result
```

## 6. 高级评估与筛选层改进

### 6.1 实现IFD等高级评估方法

**文件路径**: `python-backend/core/advanced_assessment/ifd_calculator.py`（新文件）

**改进内容**:
1. 创建IFD（Instruction-Following Difficulty）计算器

```python
import torch
import numpy as np
from typing import List, Dict, Any, Optional
import logging
from transformers import AutoModelForCausalLM, AutoTokenizer
import os
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class IFDCalculator:
    """指令遵循难度(IFD)计算器"""
    
    def __init__(self, model_name: str = "llama3-7b", device: str = "cuda"):
        """
        初始化IFD计算器
        
        Args:
            model_name: 模型名称
            device: 计算设备
        """
        self.model_name = model_name
        self.device = device
        self.model = None
        self.tokenizer = None
    
    def load_model(self):
        """加载模型"""
        try:
            logger.info(f"加载模型: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None
            )
            logger.info(f"模型加载成功")
        except Exception as e:
            logger.error(f"模型加载失败: {e}")
            raise
    
    def calculate_ifd(self, samples: List[Dict[str, Any]], 
                     checkpoint_file: Optional[str] = None,
                     batch_size: int = 4) -> List[Dict[str, Any]]:
        """
        计算样本的IFD分数
        
        Args:
            samples: 数据样本列表
            checkpoint_file: 检查点文件路径
            batch_size: 批处理大小
            
        Returns:
            添加了IFD分数的样本列表
        """
        if not samples:
            return []
        
        # 加载模型（如果尚未加载）
        if self.model is None:
            self.load_model()
        
        # 检查是否存在检查点
        processed_indices = set()
        if checkpoint_file and os.path.exists(checkpoint_file):
            try:
                with open(checkpoint_file, 'r') as f:
                    checkpoint_data = json.load(f)
                    processed_indices = set(checkpoint_data.get("processed_indices", []))
                    logger.info(f"加载检查点，已处理 {len(processed_indices)} 个样本")
            except Exception as e:
                logger.error(f"加载检查点失败: {e}")
        
        # 分批处理
        results = samples.copy()
        remaining_indices = [i for i in range(len(samples)) if i not in processed_indices]
        
        for i in range(0, len(remaining_indices), batch_size):
            batch_indices = remaining_indices[i:i+batch_size]
            batch = [samples[idx] for idx in batch_indices]
            
            # 计算批次的IFD分数
            batch_scores = self._calculate_batch_ifd(batch)
            
            # 更新结果
            for idx, score in zip(batch_indices, batch_scores):
                if "metadata" not in results[idx]:
                    results[idx]["metadata"] = {}
                if "advanced_assessment" not in results[idx]["metadata"]:
                    results[idx]["metadata"]["advanced_assessment"] = {}
                
                results[idx]["metadata"]["advanced_assessment"]["ifd_score"] = score
                processed_indices.add(idx)
            
            # 保存检查点
            if checkpoint_file:
                with open(checkpoint_file, 'w') as f:
                    json.dump({
                        "processed_indices": list(processed_indices),
                        "last_update": datetime.now().isoformat()
                    }, f)
                logger.info(f"已处理 {len(processed_indices)}/{len(samples)} 个样本，保存检查点")
        
        return results
    
    def _calculate_batch_ifd(self, batch: List[Dict[str, Any]]) -> List[float]:
        """计算批次的IFD分数"""
        scores = []
        
        for sample in batch:
            instruction = sample.get("instruction", "")
            
            response_text = ""
            if isinstance(sample.get("response"), dict):
                response_text = sample["response"].get("origin_text", "")
            elif isinstance(sample.get("response"), str):
                response_text = sample["response"]
            
            # 计算指令的复杂度
            instruction_complexity = self._calculate_instruction_complexity(instruction)
            
            # 计算响应的困难度
            response_difficulty = self._calculate_response_difficulty(response_text)
            
            # 计算指令和响应的一致性
            instruction_response_alignment = self._calculate_instruction_response_alignment(
                instruction, response_text
            )
            
            # 组合分数
            ifd_score = (
                instruction_complexity * 0.4 + 
                response_difficulty * 0.4 + 
                instruction_response_alignment * 0.2
            )
            
            scores.append(ifd_score)
        
        return scores
    
    def _calculate_instruction_complexity(self, instruction: str) -> float:
        """计算指令的复杂度"""
        # 使用模型计算困惑度作为复杂度指标
        try:
            inputs = self.tokenizer(instruction, return_tensors="pt").to(self.device)
            with torch.no_grad():
                outputs = self.model(**inputs)
            
            loss = outputs.loss.item()
            perplexity = torch.exp(torch.tensor(loss)).item()
            
            # 归一化到0-1范围
            normalized_score = min(1.0, perplexity / 20.0)
            return normalized_score
            
        except Exception as e:
            logger.error(f"计算指令复杂度失败: {e}")
            return 0.5  # 默认中等复杂度
    
    def _calculate_response_difficulty(self, response: str) -> float:
        """计算响应的困难度"""
        # 使用模型计算困惑度作为困难度指标
        try:
            inputs = self.tokenizer(response, return_tensors="pt").to(self.device)
            with torch.no_grad():
                outputs = self.model(**inputs)
            
            loss = outputs.loss.item()
            perplexity = torch.exp(torch.tensor(loss)).item()
            
            # 归一化到0-1范围
            normalized_score = min(1.0, perplexity / 20.0)
            return normalized_score
            
        except Exception as e:
            logger.error(f"计算响应困难度失败: {e}")
            return 0.5  # 默认中等困难度
    
    def _calculate_instruction_response_alignment(self, instruction: str, response: str) -> float:
        """计算指令和响应的一致性"""
        # 实现指令和响应的一致性计算逻辑
        # 这里需要根据具体模型和任务来实现
        # 这里暂时返回一个默认值
        return 0.5
```

### 6.2 预留LIMR/LESS等方法接口
- 设计统一的高级评估接口，便于后续扩展。

## 7. 集成训练层改进

### 7.1 训练数据格式转换
- 增强数据格式转换，严格对齐设计文档格式。

### 7.2 训练过程监控与可视化
- 增加训练日志、指标、loss曲线等可视化接口。

### 7.3 支持断点恢复与分布式训练
- 训练任务支持中断恢复，支持多机/多卡分布式。

## 8. 其他建议

- **文档与示例**：为每个新模块补充README和用法示例。
- **单元测试**：为关键算法模块补充单元测试，保证可维护性。
- **可视化**：可集成streamlit、gradio等工具快速实现数据/训练过程可视化。
- **性能优化**：大数据量场景下优先采用pandas、numpy等高效实现。

## 9. 目录建议

```
python-backend/core/
  data_generators/
    generator_engine.py
  quality_assessors/
    technical_verifier.py
  data_filters/
    diversity_analyzer.py
    balanced_selector.py
    deduplicator.py
  advanced_assessment/
    ifd_calculator.py
  ...
```

## 10. 施工流程建议

1. 按模块分阶段开发，每个模块独立测试
2. 先实现基础功能，逐步完善高级功能
3. 每次迭代后与设计文档对齐，确保格式和接口一致
4. 重点关注断点续传、批量处理和性能优化
5. 完善文档和示例，便于团队协作和后续维护

如需详细代码实现，可参考本文件前文的代码片段，或根据具体需求进一步细化。
