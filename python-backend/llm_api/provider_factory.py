from typing import Dict, Any, Optional, Type, Union
import os
from abc import ABC, abstractmethod

class BaseLLMProvider(ABC):
    """所有LLM提供商适配器的基类"""
    
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, 
                      temperature: float = 0.7, max_tokens: int = 1000, 
                      **kwargs) -> Dict[str, Any]:
        """生成文本响应"""
        pass
        
    @abstractmethod
    async def generate_with_images(self, prompt: str, images: list, 
                                 system_prompt: Optional[str] = None,
                                 **kwargs) -> Dict[str, Any]:
        """生成包含图像的多模态响应"""
        pass
    
    @abstractmethod
    async def get_embeddings(self, text: str) -> list:
        """获取文本嵌入向量"""
        pass
    
    @abstractmethod
    def get_token_count(self, text: str) -> int:
        """计算文本的token数量"""
        pass
    
    @abstractmethod
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        pass

    @property
    @abstractmethod
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息，包括上下文窗口大小等"""
        pass


class LLMProviderFactory:
    """LLM提供商工厂，根据配置创建对应的适配器实例"""
    
    _providers = {}
    
    @classmethod
    def register_provider(cls, provider_id: str, provider_class: Type[BaseLLMProvider]):
        """注册LLM提供商适配器类"""
        cls._providers[provider_id] = provider_class
    
    @classmethod
    def create_provider(cls, provider_id: str, api_key: Optional[str] = None, 
                      model_name: str = None, **kwargs) -> BaseLLMProvider:
        """创建LLM提供商适配器实例"""
        if provider_id not in cls._providers:
            raise ValueError(f"未知的LLM提供商: {provider_id}")
        
        # 如果没有提供API key，尝试从环境变量获取
        if not api_key:
            env_var_name = f"{provider_id.upper()}_API_KEY"
            api_key = os.environ.get(env_var_name)
            
        return cls._providers[provider_id](api_key=api_key, model_name=model_name, **kwargs)
