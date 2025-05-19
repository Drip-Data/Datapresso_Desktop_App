import os
import json
import asyncio
from typing import Dict, Any, Optional, List, Union
import tiktoken
from openai import AsyncOpenAI

from ..provider_factory import BaseLLMProvider, LLMProviderFactory
from ..constants import OPENAI_MODELS, OPENAI_PRICING

class OpenAIProvider(BaseLLMProvider):
    """OpenAI API适配器"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gpt-4o", base_url: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("未提供OpenAI API密钥")
        
        self.model_name = model_name
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=base_url)
        self.encoding = tiktoken.encoding_for_model(model_name)
        
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, 
                     temperature: float = 0.7, max_tokens: int = 1000,
                     **kwargs) -> Dict[str, Any]:
        """生成文本响应"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
        
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
            "cost": self.calculate_cost(response.usage.prompt_tokens, response.usage.completion_tokens)
        }
        
        return {
            "text": response.choices[0].message.content,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": response.choices[0].finish_reason,
            "raw_response": response
        }
    
    async def generate_with_images(self, prompt: str, images: List[Union[str, bytes]], 
                                system_prompt: Optional[str] = None,
                                **kwargs) -> Dict[str, Any]:
        """生成包含图像的多模态响应"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        content = []
        content.append({"type": "text", "text": prompt})
        
        for image in images:
            if isinstance(image, str):
                if image.startswith(('http://', 'https://')):
                    content.append({
                        "type": "image_url",
                        "image_url": {"url": image}
                    })
                else:
                    # 处理base64图片
                    content.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image}"}
                    })
            elif isinstance(image, bytes):
                import base64
                image_base64 = base64.b64encode(image).decode('utf-8')
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                })
        
        messages.append({"role": "user", "content": content})
        
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            **kwargs
        )
        
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
            "cost": self.calculate_cost(response.usage.prompt_tokens, response.usage.completion_tokens)
        }
        
        return {
            "text": response.choices[0].message.content,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": response.choices[0].finish_reason,
            "raw_response": response
        }
    
    async def get_embeddings(self, text: str) -> list:
        """获取文本嵌入向量"""
        response = await self.client.embeddings.create(
            model="text-embedding-3-large",
            input=text
        )
        return response.data[0].embedding
    
    def get_token_count(self, text: str) -> int:
        """计算文本的token数量"""
        return len(self.encoding.encode(text))
    
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        if self.model_name not in OPENAI_PRICING:
            return 0.0
        
        pricing = OPENAI_PRICING[self.model_name]
        prompt_cost = prompt_tokens * pricing["prompt"] / 1000
        completion_cost = completion_tokens * pricing["completion"] / 1000
        return prompt_cost + completion_cost
    
    @property
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        if self.model_name not in OPENAI_MODELS:
            return {"context_window": 4096, "max_output_tokens": 2048}
        
        return OPENAI_MODELS[self.model_name]

# 注册提供商
LLMProviderFactory.register_provider("openai", OpenAIProvider)
