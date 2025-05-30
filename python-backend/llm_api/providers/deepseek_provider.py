import os
import json
import asyncio
from typing import Dict, Any, Optional, List, Union
import logging

try:
    import tiktoken
    from openai import AsyncOpenAI
except ImportError:
    logging.warning("openai or tiktoken library not installed. DeepSeekProvider may not be usable if it relies on these.")
    tiktoken = None
    AsyncOpenAI = None

# Assuming these are in the same directory or accessible via python path
from ..provider_factory import BaseLLMProvider, LLMProviderFactory
from ..constants import DEEPSEEK_MODELS, DEEPSEEK_PRICING

# Fallback if the above relative imports don't work
# from datapresso.llm_api.provider_factory import BaseLLMProvider, LLMProviderFactory
# from datapresso.llm_api.constants import DEEPSEEK_MODELS, DEEPSEEK_PRICING

logger = logging.getLogger(__name__)

DEEPSEEK_API_BASE_URL = "https://api.deepseek.com/v1" # Default, can be overridden by env or config

class DeepSeekProvider(BaseLLMProvider):
    """DeepSeek API适配器 (OpenAI Compatible)"""
    def __init__(self, api_key: Optional[str] = None, model_name: str = "deepseek-chat", base_url: Optional[str] = None):
        super().__init__(api_key, model_name)
        
        if not AsyncOpenAI or not tiktoken:
            raise ImportError("openai and tiktoken libraries are required to use DeepSeekProvider.")

        self.api_key = api_key or os.environ.get("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise ValueError("未提供DeepSeek API密钥")
        
        self.model_name = model_name
        self.base_url = base_url or os.environ.get("DEEPSEEK_API_BASE_URL", DEEPSEEK_API_BASE_URL)
        
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        
        try:
            # DeepSeek models often use cl100k_base like gpt-4
            self.encoding = tiktoken.get_encoding("cl100k_base") 
        except Exception:
            logger.warning("Failed to get cl100k_base encoding for DeepSeek, falling back to model name. Token counts might be inaccurate.")
            try:
                self.encoding = tiktoken.encoding_for_model(model_name) # Fallback, might not be accurate
            except Exception:
                logger.warning(f"Failed to get tiktoken encoding for model {model_name}. Token counts will be estimated.")
                self.encoding = None


    async def generate(self, prompt: str, system_prompt: Optional[str] = None, 
                     temperature: float = 0.7, max_tokens: int = 2048, # Deepseek default max_tokens can be higher
                     **kwargs) -> Dict[str, Any]:
        """生成文本响应"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        # Filter OpenAI specific kwargs that DeepSeek might not support or handle differently
        # For now, assume compatibility for common ones like stop, presence_penalty, frequency_penalty
        openai_compatible_kwargs = {
            "stop": kwargs.get("stop_sequences"), # OpenAI uses 'stop'
            "presence_penalty": kwargs.get("presence_penalty"),
            "frequency_penalty": kwargs.get("frequency_penalty"),
            "top_p": kwargs.get("top_p"),
            # stream is handled by the caller if needed, not directly here for non-streaming generate
        }
        openai_compatible_kwargs = {k: v for k, v in openai_compatible_kwargs.items() if v is not None}

        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **openai_compatible_kwargs
        )
        
        prompt_tokens = response.usage.prompt_tokens if response.usage else 0
        completion_tokens = response.usage.completion_tokens if response.usage else 0
        total_tokens = response.usage.total_tokens if response.usage else 0

        usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cost": self.calculate_cost(prompt_tokens, completion_tokens)
        }
        
        return {
            "text": response.choices[0].message.content,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": response.choices[0].finish_reason,
            "raw_response": response.model_dump() # Convert Pydantic model to dict
        }
    
    async def generate_with_images(self, prompt: str, images: List[Union[str, bytes]], 
                                 system_prompt: Optional[str] = None,
                                 **kwargs) -> Dict[str, Any]:
        """DeepSeek API (OpenAI compatible) typically does not support image inputs via chat completions.
           This method should raise NotImplementedError unless a specific multimodal DeepSeek model is targeted
           and the API supports it in an OpenAI-compatible way."""
        logger.warning("DeepSeekProvider's generate_with_images is called, but standard DeepSeek chat models are not multimodal.")
        # Check model_info if it indicates multimodal capability
        model_capabilities = self.model_info.get("capabilities", {})
        if not model_capabilities.get("images", False): # Assuming 'capabilities' dict in model_info
            raise NotImplementedError("Selected DeepSeek model does not support image inputs via this provider.")

        # If a future DeepSeek model supports OpenAI-like multimodal input:
        # The logic would be similar to OpenAIProvider's image handling.
        # For now, raising error.
        raise NotImplementedError("DeepSeekProvider generate_with_images is not implemented for current models.")

    async def get_embeddings(self, text: str, model: Optional[str] = None) -> list:
        """获取文本嵌入向量. DeepSeek has embedding models."""
        embedding_model = model or DEEPSEEK_MODELS.get(self.model_name, {}).get("embedding_model", "deepseek-embedding") # Default or from constants
        if not embedding_model: # Fallback if no specific embedding model found
             embedding_model = "deepseek-embedding" # A common DeepSeek embedding model name

        try:
            response = await self.client.embeddings.create(
                model=embedding_model, # Use the determined embedding model
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"DeepSeek get_embeddings failed for model {embedding_model}: {e}")
            raise

    def get_token_count(self, text: str) -> int:
        """计算文本的token数量 using tiktoken (cl100k_base typically for DeepSeek)."""
        if self.encoding:
            return len(self.encoding.encode(text))
        else:
            # Fallback if encoding failed to initialize
            logger.warning("Tiktoken encoding not available for DeepSeek, estimating token count.")
            return len(text) // 3 # Rough estimate, as DeepSeek tokens are often CJK char based
    
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        model_pricing_key = self.model_name
        if self.model_name not in DEEPSEEK_PRICING:
            # Try to find a general pricing for the model series if specific version not listed
            base_model_name = self.model_name.split('-')[0] + '-' + self.model_name.split('-')[1] # e.g. "deepseek-chat"
            if base_model_name in DEEPSEEK_PRICING:
                model_pricing_key = base_model_name
            else:
                logger.warning(f"Pricing not found for DeepSeek model {self.model_name}. Cost will be 0.")
                return 0.0
        
        pricing = DEEPSEEK_PRICING[model_pricing_key]
        # DeepSeek pricing is often per Million tokens
        prompt_cost = (prompt_tokens / 1_000_000) * pricing.get("prompt_million", 0.0)
        completion_cost = (completion_tokens / 1_000_000) * pricing.get("completion_million", 0.0)

        # Fallback for per 1k tokens if that's how constants are structured
        if pricing.get("prompt_million", 0) == 0 and pricing.get("completion_million", 0) == 0:
            if "prompt" in pricing and "completion" in pricing:
                 prompt_cost = prompt_tokens * pricing["prompt"] / 1000
                 completion_cost = completion_tokens * pricing["completion"] / 1000
        
        return prompt_cost + completion_cost
    
    @property
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        # Default values, can be overridden by DEEPSEEK_MODELS
        default_info = {"context_window": 16384, "max_output_tokens": 4096, "provider": "deepseek", "capabilities": {"text": True, "images": False}}
        
        model_key_to_check = self.model_name
        if self.model_name not in DEEPSEEK_MODELS:
            base_model_name = self.model_name.split('-')[0] + '-' + self.model_name.split('-')[1]
            if base_model_name in DEEPSEEK_MODELS:
                model_key_to_check = base_model_name
        
        if model_key_to_check in DEEPSEEK_MODELS:
            model_specific_info = DEEPSEEK_MODELS[model_key_to_check].copy()
            model_specific_info.setdefault("provider", "deepseek")
            # Ensure capabilities from constants are merged/override default
            default_caps = default_info.get("capabilities", {}).copy()
            specific_caps = model_specific_info.get("capabilities", {})
            default_caps.update(specific_caps)
            model_specific_info["capabilities"] = default_caps
            
            merged_info = default_info.copy()
            merged_info.update(model_specific_info)
            return merged_info

        return default_info

# 注册提供商
if AsyncOpenAI and tiktoken: # Only register if dependencies are met
    LLMProviderFactory.register_provider("deepseek", DeepSeekProvider)
else:
    logger.warning("DeepSeekProvider not registered because openai or tiktoken library is missing.")