import os
import json
import asyncio
from typing import Dict, Any, Optional, List, Union
import base64
from anthropic import AsyncAnthropic, HUMAN_PROMPT, AI_PROMPT

# Assuming these are in the same directory or accessible via python path
# Adjust import paths if these files are in a different location relative to 'datapresso_desktop_app.python_backend'
from ..provider_factory import BaseLLMProvider, LLMProviderFactory
from ..constants import ANTHROPIC_MODELS, ANTHROPIC_PRICING

# Fallback if the above relative imports don't work in the execution context of the tool
# from datapresso.llm_api.provider_factory import BaseLLMProvider, LLMProviderFactory
# from datapresso.llm_api.constants import ANTHROPIC_MODELS, ANTHROPIC_PRICING


class AnthropicProvider(BaseLLMProvider):
    """Anthropic API适配器 (Claude)"""

    def __init__(self, api_key: Optional[str] = None, model_name: str = "claude-3-opus-20240229", base_url: Optional[str] = None):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("未提供Anthropic API密钥")

        self.model_name = model_name
        self.client = AsyncAnthropic(api_key=self.api_key, base_url=base_url) # base_url might not be standard for Anthropic SDK, check docs

    async def generate(self, prompt: str, system_prompt: Optional[str] = None,
                     temperature: float = 0.7, max_tokens: int = 1000,
                     **kwargs) -> Dict[str, Any]:
        """生成文本响应"""
        messages = []
        if system_prompt: # Anthropic's new Messages API takes system prompt as a top-level parameter
            pass # Will be passed directly to client.messages.create

        messages.append({"role": "user", "content": prompt})
        
        # Filter out non-standard kwargs for Anthropic if necessary
        anthropic_kwargs = {
            "top_p": kwargs.get("top_p"),
            "top_k": kwargs.get("top_k"),
            "stop_sequences": kwargs.get("stop_sequences")
        }
        # Remove None values to avoid sending them if not set
        anthropic_kwargs = {k: v for k, v in anthropic_kwargs.items() if v is not None}

        response = await self.client.messages.create(
            model=self.model_name,
            system=system_prompt, # System prompt passed here
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **anthropic_kwargs
        )

        completion_text = ""
        if response.content and isinstance(response.content, list):
            for block in response.content:
                if hasattr(block, 'text'):
                    completion_text += block.text
        
        prompt_tokens = response.usage.input_tokens
        completion_tokens = response.usage.output_tokens

        usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "cost": self.calculate_cost(prompt_tokens, completion_tokens)
        }

        return {
            "text": completion_text,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": response.stop_reason,
            "raw_response": response.model_dump() # Convert Pydantic model to dict
        }

    async def generate_with_images(self, prompt: str, images: List[Union[str, bytes]],
                                 system_prompt: Optional[str] = None,
                                 **kwargs) -> Dict[str, Any]:
        """生成包含图像的多模态响应"""
        user_content = []
        user_content.append({"type": "text", "text": prompt})

        for image_data in images:
            image_media_type = "image/jpeg" # Default, can be more specific
            if isinstance(image_data, str):
                if image_data.startswith("data:image/"): # data URI
                    parts = image_data.split(";base64,")
                    meta = parts[0].split(":")[1]
                    image_media_type = meta
                    base64_encoded_image = parts[1]
                elif image_data.startswith(('http://', 'https://')):
                    # Anthropic SDK currently doesn't directly support image URLs.
                    # User would need to download and then provide as base64.
                    # For now, we'll assume if it's a string, it's base64 or a data URI.
                    # This part might need adjustment based on how image URLs are handled upstream.
                    # Let's assume non-data-URI strings are base64 data without the prefix.
                    base64_encoded_image = image_data 
                else: # Assume raw base64 string
                    base64_encoded_image = image_data
            elif isinstance(image_data, bytes):
                base64_encoded_image = base64.b64encode(image_data).decode('utf-8')
            else:
                raise ValueError(f"Unsupported image data type: {type(image_data)}")

            user_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": image_media_type,
                    "data": base64_encoded_image,
                },
            })
        
        messages = [{"role": "user", "content": user_content}]
        
        anthropic_kwargs = {
            "top_p": kwargs.get("top_p"),
            "top_k": kwargs.get("top_k"),
            "stop_sequences": kwargs.get("stop_sequences")
        }
        anthropic_kwargs = {k: v for k, v in anthropic_kwargs.items() if v is not None}

        response = await self.client.messages.create(
            model=self.model_name,
            system=system_prompt,
            messages=messages,
            max_tokens=kwargs.get("max_tokens", 1000), # max_tokens is required
            temperature=kwargs.get("temperature", 0.7),
            **anthropic_kwargs
        )
        
        completion_text = ""
        if response.content and isinstance(response.content, list):
            for block in response.content:
                if hasattr(block, 'text'):
                    completion_text += block.text

        prompt_tokens = response.usage.input_tokens
        completion_tokens = response.usage.output_tokens
        
        usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "cost": self.calculate_cost(prompt_tokens, completion_tokens)
        }

        return {
            "text": completion_text,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": response.stop_reason,
            "raw_response": response.model_dump()
        }

    async def get_embeddings(self, text: str) -> list:
        """获取文本嵌入向量 - Anthropic 目前不直接提供独立的嵌入API，通常通过其模型进行。"""
        # This is a placeholder. Anthropic's main models are for text/chat generation.
        # They don't have a separate embedding API like OpenAI's `client.embeddings.create`.
        # If embeddings are needed, one might use a different service or a model fine-tuned for embeddings.
        # For now, returning an empty list and logging a warning.
        # Or, could raise NotImplementedError.
        # logger.warning("AnthropicProvider does not have a dedicated embedding API. Returning empty list.")
        raise NotImplementedError("AnthropicProvider does not have a dedicated embedding API.")
        # return []

    def get_token_count(self, text: str) -> int:
        """计算文本的token数量"""
        # The new Anthropic SDK (>=0.20.0) provides a tokenizer
        try:
            return self.client.count_tokens(text=text)
        except Exception as e:
            # Fallback or simple character count if tokenizer fails or not available for a model
            # logger.warning(f"Anthropic tokenizer failed for model {self.model_name}: {e}. Estimating token count.")
            return len(text) // 4 # A very rough estimate

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        if self.model_name not in ANTHROPIC_PRICING:
            return 0.0

        pricing = ANTHROPIC_PRICING[self.model_name]
        # Anthropic pricing is typically per million tokens
        prompt_cost = (prompt_tokens / 1_000_000) * pricing.get("prompt_million", 0)
        completion_cost = (completion_tokens / 1_000_000) * pricing.get("completion_million", 0)
        
        # Fallback if per_1k_tokens is used in constants
        if "prompt" in pricing and "completion" in pricing:
            prompt_cost_1k = prompt_tokens * pricing["prompt"] / 1000
            completion_cost_1k = completion_tokens * pricing["completion"] / 1000
            # Use the one that's likely defined (non-zero if only one pricing scheme is in constants)
            if pricing.get("prompt_million", 0) == 0 and pricing.get("completion_million", 0) == 0 :
                 return prompt_cost_1k + completion_cost_1k

        return prompt_cost + completion_cost
        

    @property
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        # Default values, can be overridden by ANTHROPIC_MODELS
        default_info = {"context_window": 200000, "max_output_tokens": 4096, "provider": "anthropic"}
        if self.model_name in ANTHROPIC_MODELS:
            model_specific_info = ANTHROPIC_MODELS[self.model_name].copy()
            # Ensure provider is set
            model_specific_info.setdefault("provider", "anthropic")
            # Merge with defaults, specific values take precedence
            # For example, if ANTHROPIC_MODELS only contains 'context_window', 'max_output_tokens' will come from default_info
            # A better way is to have ANTHROPIC_MODELS be comprehensive or merge carefully.
            # Let's assume ANTHROPIC_MODELS is comprehensive enough or we prioritize its values.
            
            # A simple merge:
            merged_info = default_info.copy()
            merged_info.update(model_specific_info)
            return merged_info

        return default_info

# 注册提供商
LLMProviderFactory.register_provider("anthropic", AnthropicProvider)