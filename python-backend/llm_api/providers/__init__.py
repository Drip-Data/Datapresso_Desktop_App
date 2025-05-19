# This file makes Python treat the 'providers' directory as a package.
# It also serves to ensure all provider modules are imported, which should
# trigger their self-registration with the LLMProviderFactory.

import logging

logger = logging.getLogger(__name__)

try:
    from . import local_llm_provider
    logger.debug("Successfully imported local_llm_provider.")
except ImportError as e:
    logger.warning(f"Could not import local_llm_provider: {e}")

try:
    from . import openai_provider
    logger.debug("Successfully imported openai_provider.")
except ImportError as e:
    logger.warning(f"Could not import openai_provider: {e}")

try:
    from . import anthropic_provider
    logger.debug("Successfully imported anthropic_provider.")
except ImportError as e:
    logger.warning(f"Could not import anthropic_provider: {e}")

try:
    from . import gemini_provider
    logger.debug("Successfully imported gemini_provider.")
except ImportError as e:
    logger.warning(f"Could not import gemini_provider: {e}")
    
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