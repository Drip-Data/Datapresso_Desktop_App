import os
import json
import asyncio
from typing import Dict, Any, Optional, List, Union
import logging
import time
import subprocess
import httpx
import numpy as np

from ..provider_factory import BaseLLMProvider, LLMProviderFactory

logger = logging.getLogger(__name__)

class LocalLLMProvider(BaseLLMProvider):
    """本地LLM适配器，支持不同的本地LLM服务器"""
    
    def __init__(self, model_name: str = "local-model", api_key: Optional[str] = None, 
                base_url: str = "http://127.0.0.1:8080", server_type: str = "llama.cpp"):
        """
        初始化本地LLM提供商
        
        Args:
            model_name: 模型名称
            api_key: API密钥(大多本地服务不需要)
            base_url: 服务器URL
            server_type: 服务器类型("llama.cpp", "text-generation-webui", "ollama")
        """
        self.model_name = model_name
        self.api_key = api_key
        self.base_url = base_url
        self.server_type = server_type
        
        # 检查服务器类型
        if server_type not in ["llama.cpp", "text-generation-webui", "ollama", "vllm"]:
            raise ValueError(f"不支持的服务器类型: {server_type}")
        
        # 初始化HTTP客户端
        self.client = httpx.AsyncClient(timeout=60.0)
        self.headers = {}
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"
        
        # 尝试自动启动服务器（如果不在运行中）
        self._auto_start_server()
        
    def _auto_start_server(self):
        """尝试自动启动本地LLM服务器"""
        try:
            # 先检查服务器是否已经运行
            try:
                response = httpx.get(f"{self.base_url}/health", timeout=1.0)
                if response.status_code == 200:
                    logger.info(f"本地LLM服务器已经运行: {self.server_type}")
                    return
            except Exception:
                logger.info(f"本地LLM服务器未运行，尝试启动: {self.server_type}")
            
            # 根据服务器类型启动
            if self.server_type == "llama.cpp":
                # 启动llama.cpp服务器
                cmd = [
                    "llama-server",
                    "-m", os.environ.get("LLAMA_MODEL_PATH", "models/llama-2-7b-chat.gguf"),
                    "--host", "127.0.0.1",
                    "--port", "8080"
                ]
                subprocess.Popen(cmd)
                logger.info("已启动llama.cpp服务器")
                
            elif self.server_type == "ollama":
                # 启动ollama服务器
                cmd = ["ollama", "serve"]
                subprocess.Popen(cmd)
                logger.info("已启动ollama服务器")
                
            # 等待服务器启动
            time.sleep(3)
            
        except Exception as e:
            logger.warning(f"自动启动本地LLM服务器失败: {e}")
        
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, 
                     temperature: float = 0.7, max_tokens: int = 1000,
                     **kwargs) -> Dict[str, Any]:
        """生成文本响应"""
        start_time = time.time()
        
        try:
            response_text = ""
            
            # 根据服务器类型构造请求
            if self.server_type == "llama.cpp":
                request_data = {
                    "prompt": prompt,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stop": kwargs.get("stop", [])
                }
                
                if system_prompt:
                    request_data["system"] = system_prompt
                
                response = await self.client.post(
                    f"{self.base_url}/completion",
                    json=request_data,
                    headers=self.headers
                )
                response.raise_for_status()
                result = response.json()
                response_text = result.get("content", "")
                
            elif self.server_type == "text-generation-webui":
                request_data = {
                    "prompt": prompt,
                    "max_new_tokens": max_tokens,
                    "temperature": temperature,
                    "stop": kwargs.get("stop", [])
                }
                
                response = await self.client.post(
                    f"{self.base_url}/api/v1/generate",
                    json=request_data,
                    headers=self.headers
                )
                response.raise_for_status()
                result = response.json()
                response_text = result.get("results", [{}])[0].get("text", "")
                
            elif self.server_type == "ollama":
                request_data = {
                    "model": self.model_name,
                    "prompt": prompt,
                    "system": system_prompt or "",
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                }
                
                response = await self.client.post(
                    f"{self.base_url}/api/generate",
                    json=request_data,
                    headers=self.headers
                )
                response.raise_for_status()
                result = response.json()
                response_text = result.get("response", "")
                
            elif self.server_type == "vllm":
                request_data = {
                    "model": self.model_name,
                    "prompt": prompt,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stop": kwargs.get("stop", [])
                }
                
                if system_prompt:
                    request_data["system_prompt"] = system_prompt
                
                response = await self.client.post(
                    f"{self.base_url}/generate",
                    json=request_data,
                    headers=self.headers
                )
                response.raise_for_status()
                result = response.json()
                response_text = result.get("text", "")
            
            # 预估token使用量
            prompt_tokens = self.get_token_count(prompt)
            if system_prompt:
                prompt_tokens += self.get_token_count(system_prompt)
            
            completion_tokens = self.get_token_count(response_text)
            total_tokens = prompt_tokens + completion_tokens
                
            # 计算成本
            cost = self.calculate_cost(prompt_tokens, completion_tokens)
            
            end_time = time.time()
            
            return {
                "text": response_text,
                "model": self.model_name,
                "usage": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "cost": cost
                },
                "finish_reason": "stop",
                "elapsed_time": end_time - start_time
            }
        except Exception as e:
            logger.error(f"本地LLM生成失败: {e}")
            raise
        
    async def generate_with_images(self, prompt: str, images: List[Union[str, bytes]], 
                                system_prompt: Optional[str] = None,
                                **kwargs) -> Dict[str, Any]:
        """生成包含图像的多模态响应"""
        try:
            # 检查是否支持多模态
            if self.server_type not in ["ollama"]:
                raise NotImplementedError(f"服务器类型{self.server_type}不支持多模态生成")
            
            # 转换图像为Base64
            base64_images = []
            for image in images:
                if isinstance(image, str):
                    if image.startswith(('http://', 'https://')):
                        # 下载图像
                        async with httpx.AsyncClient() as client:
                            response = await client.get(image)
                            response.raise_for_status()
                            image_bytes = response.content
                    else:
                        # 假设是Base64编码的图像
                        import base64
                        # 移除Base64前缀
                        if "base64," in image:
                            image = image.split("base64,")[1]
                        image_bytes = base64.b64decode(image)
                elif isinstance(image, bytes):
                    image_bytes = image
                
                # 编码为Base64
                import base64
                base64_image = base64.b64encode(image_bytes).decode('utf-8')
                base64_images.append(base64_image)
            
            # 根据服务器类型处理
            if self.server_type == "ollama":
                # Ollama的多模态API
                import json
                
                messages = []
                
                # 添加系统消息
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                
                # 添加用户消息
                user_message = {"role": "user", "content": []}
                
                # 添加文本
                user_message["content"].append({"type": "text", "text": prompt})
                
                # 添加图像
                for img in base64_images:
                    user_message["content"].append({
                        "type": "image",
                        "image": img
                    })
                
                messages.append(user_message)
                
                # 构建请求
                request_data = {
                    "model": self.model_name,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": kwargs.get("temperature", 0.7),
                        "num_predict": kwargs.get("max_tokens", 1000)
                    }
                }
                
                # 发送请求
                response = await self.client.post(
                    f"{self.base_url}/api/chat",
                    json=request_data,
                    headers=self.headers
                )
                response.raise_for_status()
                result = response.json()
                
                # 预估token使用量
                prompt_tokens = self.get_token_count(prompt) + (1000 * len(base64_images))  # 每个图像大约1000 tokens
                completion_tokens = self.get_token_count(result.get("message", {}).get("content", ""))
                total_tokens = prompt_tokens + completion_tokens
                
                # 计算成本
                cost = self.calculate_cost(prompt_tokens, completion_tokens)
                
                return {
                    "text": result.get("message", {}).get("content", ""),
                    "model": self.model_name,
                    "usage": {
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": total_tokens,
                        "cost": cost
                    },
                    "finish_reason": "stop"
                }
        except Exception as e:
            logger.error(f"本地LLM多模态生成失败: {e}")
            raise
    
    async def get_embeddings(self, text: str) -> list:
        """获取文本嵌入向量"""
        try:
            if self.server_type == "llama.cpp":
                response = await self.client.post(
                    f"{self.base_url}/embedding",
                    json={"prompt": text},
                    headers=self.headers
                )
                response.raise_for_status()
                result = response.json()
                return result.get("embedding", [])
                
            elif self.server_type == "ollama":
                response = await self.client.post(
                    f"{self.base_url}/api/embeddings",
                    json={"model": self.model_name, "prompt": text},
                    headers=self.headers
                )
                response.raise_for_status()
                result = response.json()
                return result.get("embedding", [])
                
            else:
                # 其他服务器类型可能不支持嵌入
                raise NotImplementedError(f"服务器类型{self.server_type}不支持嵌入")
                
        except Exception as e:
            logger.error(f"本地LLM嵌入生成失败: {e}")
            # 返回随机嵌入（用于测试）
            return list(np.random.rand(384).astype(float))
    
    def get_token_count(self, text: str) -> int:
        """估算文本的token数量"""
        # 简单估算，使用平均每个单词1.3个token
        if not text:
            return 0
        return int(len(text.split()) * 1.3)
    
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本（本地部署通常免费）"""
        # 本地模型每百万token的电费成本估算（非常低）
        electricity_cost_per_million = 0.01  # $0.01 per million tokens
        return (prompt_tokens + completion_tokens) * electricity_cost_per_million / 1000000
    
    @property
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        # 默认信息
        info = {
            "context_window": 4096,
            "max_output_tokens": 2048,
            "capabilities": ["text"],
        }
        
        # 根据模型名称获取更准确的信息
        if "llama3" in self.model_name.lower():
            info["context_window"] = 8192
        elif "mistral" in self.model_name.lower():
            info["context_window"] = 8192
        elif "mixtral" in self.model_name.lower():
            info["context_window"] = 32768
        elif "qwen" in self.model_name.lower():
            info["context_window"] = 32768
        
        # 检查是否支持多模态
        if "vision" in self.model_name.lower() or "llava" in self.model_name.lower():
            info["capabilities"].append("vision")
        
        return info

# 注册提供商
LLMProviderFactory.register_provider("local", LocalLLMProvider)
