from typing import Dict, Any, Optional, Type, Union, List
import os
from abc import ABC, abstractmethod

class BaseLLMProvider(ABC):
    """所有LLM提供商适配器的基类"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "default"):
        """
        初始化基础LLM提供商
        
        Args:
            api_key: API密钥
            model_name: 模型名称
        """
        self.api_key = api_key
        self.model_name = model_name
    
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

    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]:
        """列出提供商支持的所有模型及其详细信息"""
        pass

    @property
    @abstractmethod
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息，包括上下文窗口大小等"""
        pass


class LLMProviderFactory:
    """LLM提供商工厂，根据配置创建对应的适配器实例"""
    
    _providers = {}
    _provider_modules = {
        'openai': 'llm_api.providers.openai_provider',
        'anthropic': 'llm_api.providers.anthropic_provider', 
        'gemini': 'llm_api.providers.gemini_provider',
        'deepseek': 'llm_api.providers.deepseek_provider',
        'local_llm': 'llm_api.providers.local_llm_provider',
        'mock': 'llm_api.providers.mock_provider'
    }
    _loaded_providers = set()
    
    @classmethod
    def register_provider(cls, provider_id: str, provider_class: Type[BaseLLMProvider]):
        """注册LLM提供商适配器类"""
        cls._providers[provider_id] = provider_class
        cls._loaded_providers.add(provider_id)
    
    @classmethod
    def _lazy_load_provider(cls, provider_id: str):
        """懒加载提供者模块"""
        if provider_id in cls._loaded_providers:
            return
            
        if provider_id not in cls._provider_modules:
            raise ValueError(f"未知的LLM提供商: {provider_id}")
            
        try:
            import importlib
            module_path = cls._provider_modules[provider_id]
            importlib.import_module(module_path)
            cls._loaded_providers.add(provider_id)
        except ImportError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"无法加载提供者 {provider_id}: {e}")
            # 不抛出异常，只是记录警告
    
    @classmethod
    def get_available_providers(cls) -> List[str]:
        """获取可用的提供者列表"""
        available = []
        for provider_id in cls._provider_modules.keys():
            try:
                cls._lazy_load_provider(provider_id)
                if provider_id in cls._providers:
                    available.append(provider_id)
            except Exception:
                pass  # 忽略加载失败的提供者
        return available
    
    @classmethod
    def is_provider_available(cls, provider_id: str) -> bool:
        """检查提供者是否可用"""
        try:
            cls._lazy_load_provider(provider_id)
            return provider_id in cls._providers
        except Exception:
            return False
    
    @classmethod
    def create_provider(cls, provider_id: str, api_key: Optional[str] = None, 
                      model_name: str = None, **kwargs) -> BaseLLMProvider:
        """创建LLM提供商适配器实例"""
        # 尝试懒加载提供者
        cls._lazy_load_provider(provider_id)
        
        if provider_id not in cls._providers:
            raise ValueError(f"提供商 {provider_id} 不可用或加载失败")
        
        # 如果没有提供API key，尝试从环境变量获取
        if not api_key:
            env_var_name = f"{provider_id.upper()}_API_KEY"
            api_key = os.environ.get(env_var_name)
            
        return cls._providers[provider_id](api_key=api_key, model_name=model_name, **kwargs)
