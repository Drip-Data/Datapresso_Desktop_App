# This file makes Python treat the 'providers' directory as a package.
# Providers are now loaded lazily through the LLMProviderFactory to avoid
# blocking imports during application startup.

import logging

logger = logging.getLogger(__name__)

# 不再立即导入所有提供者模块，而是通过工厂进行懒加载
# 这避免了由于缺失依赖或配置问题导致的启动阻塞

logger.debug("Provider package initialized with lazy loading support.")
    
try:
    from . import deepseek_provider
    logger.debug("Successfully imported deepseek_provider.")
except ImportError as e:
    logger.warning(f"Could not import deepseek_provider: {e}")

# To make it easier to access the factory and base class from this package level
from ..provider_factory import LLMProviderFactory, BaseLLMProvider

__all__ = [
    "LLMProviderFactory",
    "BaseLLMProvider",
    # Individual providers are not typically exported here,
    # as they are accessed via the factory.
]