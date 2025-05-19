from typing import Dict, Any, Optional, List, Union
import logging
import asyncio
import time
import json
import os
from .provider_factory import LLMProviderFactory, BaseLLMProvider

logger = logging.getLogger(__name__)

class LLMController:
    """LLM API控制器，提供统一接口调用各种LLM服务"""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        初始化LLM控制器
        
        Args:
            config_path: LLM配置文件路径
        """
        self.providers = {}
        self.configs = {}
        
        # 加载配置
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                self.configs = json.load(f)
    
    def get_provider(self, provider_id: str, model_name: Optional[str] = None) -> BaseLLMProvider:
        """
        获取指定的LLM提供商
        
        Args:
            provider_id: 提供商ID
            model_name: 模型名称
        
        Returns:
            LLM提供商实例
        """
        # 生成缓存键
        cache_key = f"{provider_id}:{model_name or 'default'}"
        
        # 检查是否已有缓存的提供商实例
        if cache_key in self.providers:
            return self.providers[cache_key]
        
        # 获取提供商配置
        provider_config = self.configs.get(provider_id, {})
        provider_api_key = provider_config.get('api_key')
        
        # 如果配置中没有指定模型，使用默认模型
        if not model_name:
            model_name = provider_config.get('default_model')
        
        # 创建提供商实例
        provider = LLMProviderFactory.create_provider(
            provider_id=provider_id,
            api_key=provider_api_key,
            model_name=model_name,
            **provider_config.get('options', {})
        )
        
        # 缓存实例
        self.providers[cache_key] = provider
        
        return provider
    
    async def generate(self, prompt: str, provider_id: str, model_name: Optional[str] = None, 
                     system_prompt: Optional[str] = None, **params) -> Dict[str, Any]:
        """
        生成文本
        
        Args:
            prompt: 提示词
            provider_id: 提供商ID
            model_name: 模型名称
            system_prompt: 系统提示词
            params: 额外参数
            
        Returns:
            生成结果
        """
        provider = self.get_provider(provider_id, model_name)
        
        try:
            start_time = time.time()
            result = await provider.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                **params
            )
            execution_time = time.time() - start_time
            
            # 添加元数据
            result['execution_time'] = execution_time
            result['provider_id'] = provider_id
            
            return result
        except Exception as e:
            logger.error(f"生成文本失败: {str(e)}")
            raise
    
    async def generate_with_images(self, prompt: str, images: List[Union[str, bytes]], 
                                provider_id: str, model_name: Optional[str] = None, 
                                system_prompt: Optional[str] = None, **params) -> Dict[str, Any]:
        """
        使用图像生成文本
        
        Args:
            prompt: 提示词
            images: 图像列表
            provider_id: 提供商ID
            model_name: 模型名称
            system_prompt: 系统提示词
            params: 额外参数
            
        Returns:
            生成结果
        """
        provider = self.get_provider(provider_id, model_name)
        
        try:
            start_time = time.time()
            result = await provider.generate_with_images(
                prompt=prompt,
                images=images,
                system_prompt=system_prompt,
                **params
            )
            execution_time = time.time() - start_time
            
            # 添加元数据
            result['execution_time'] = execution_time
            result['provider_id'] = provider_id
            
            return result
        except NotImplementedError:
            logger.error(f"提供商 {provider_id} 不支持多模态生成")
            raise
        except Exception as e:
            logger.error(f"多模态生成失败: {str(e)}")
            raise
    
    async def get_embeddings(self, text: str, provider_id: str, model_name: Optional[str] = None) -> List[float]:
        """
        获取文本嵌入向量
        
        Args:
            text: 文本
            provider_id: 提供商ID
            model_name: 模型名称
            
        Returns:
            嵌入向量
        """
        provider = self.get_provider(provider_id, model_name)
        
        try:
            return await provider.get_embeddings(text)
        except NotImplementedError:
            logger.error(f"提供商 {provider_id} 不支持嵌入向量生成")
            raise
        except Exception as e:
            logger.error(f"获取嵌入向量失败: {str(e)}")
            raise
    
    def get_available_providers(self) -> Dict[str, Any]:
        """
        获取可用的LLM提供商列表
        
        Returns:
            提供商信息字典
        """
        providers = {}
        
        for provider_id, config in self.configs.items():
            try:
                # 尝试创建提供商实例以验证配置是否有效
                provider = self.get_provider(provider_id)
                
                # 获取支持的模型
                models = config.get("models", [])
                
                providers[provider_id] = {
                    "name": config.get("name", provider_id),
                    "is_configured": True,
                    "default_model": config.get("default_model"),
                    "models": models
                }
            except Exception as e:
                providers[provider_id] = {
                    "name": config.get("name", provider_id),
                    "is_configured": False,
                    "error": str(e)
                }
        
        return providers
    
    def save_config(self, config_path: str) -> bool:
        """
        保存配置到文件
        
        Args:
            config_path: 配置文件路径
            
        Returns:
            是否保存成功
        """
        try:
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(self.configs, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"保存配置失败: {str(e)}")
            return False
    
    def update_provider_config(self, provider_id: str, config: Dict[str, Any]) -> bool:
        """
        更新提供商配置
        
        Args:
            provider_id: 提供商ID
            config: 配置
            
        Returns:
            是否更新成功
        """
        try:
            self.configs[provider_id] = config
            
            # 清除现有提供商缓存
            for key in list(self.providers.keys()):
                if key.startswith(f"{provider_id}:"):
                    del self.providers[key]
            
            return True
        except Exception as e:
            logger.error(f"更新提供商配置失败: {str(e)}")
            return False
