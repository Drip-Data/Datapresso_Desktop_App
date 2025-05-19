import os
import asyncio
from typing import Dict, Any, Optional, List, Union
import logging
import base64

try:
    import google.generativeai as genai
    from PIL import Image # For image handling with Gemini
    import io
except ImportError:
    # This allows the module to be imported even if google-generativeai is not installed,
    # though it will fail at runtime if used.
    logging.warning("google-generativeai or Pillow library not installed. GeminiProvider will not be usable.")
    genai = None
    Image = None

# Assuming these are in the same directory or accessible via python path
# Adjust import paths if these files are in a different location relative to 'datapresso_desktop_app.python_backend'
from ..provider_factory import BaseLLMProvider, LLMProviderFactory
from ..constants import GEMINI_MODELS, GEMINI_PRICING

# Fallback if the above relative imports don't work in the execution context of the tool
# from datapresso.llm_api.provider_factory import BaseLLMProvider, LLMProviderFactory
# from datapresso.llm_api.constants import GEMINI_MODELS, GEMINI_PRICING

logger = logging.getLogger(__name__)

class GeminiProvider(BaseLLMProvider):
    """Google Gemini API适配器"""

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-1.5-flash-latest"):
        if not genai:
            raise ImportError("google-generativeai library is required to use GeminiProvider.")
        
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("未提供Google Gemini API密钥")
        
        genai.configure(api_key=self.api_key)
        self.model_name = model_name
        # For embeddings, a specific model is often used
        self.embedding_model_name = GEMINI_MODELS.get(model_name, {}).get("embedding_model", "embedding-001")

        # Safety settings can be configured here if needed
        self.safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ]
        
        self.generative_model = genai.GenerativeModel(
            self.model_name,
            safety_settings=self.safety_settings
        )

    async def generate(self, prompt: str, system_prompt: Optional[str] = None,
                     temperature: float = 0.7, max_tokens: Optional[int] = None, # max_tokens is max_output_tokens for Gemini
                     **kwargs) -> Dict[str, Any]:
        """生成文本响应"""
        generation_config = genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens, # Gemini uses max_output_tokens
            top_p=kwargs.get("top_p"),
            top_k=kwargs.get("top_k"),
            stop_sequences=kwargs.get("stop_sequences")
        )
        
        # Gemini API takes system instruction separately for some models or as part of contents
        # For newer models, system_instruction is a direct parameter.
        # For older ones, it might be part of the initial message.
        # The genai.GenerativeModel can take a system_instruction argument.
        # Let's re-initialize model if system_prompt is given and model supports it.
        
        model_to_use = self.generative_model
        if system_prompt:
            try:
                # Some models accept system_instruction directly
                model_to_use = genai.GenerativeModel(
                    self.model_name,
                    safety_settings=self.safety_settings,
                    system_instruction=system_prompt 
                )
            except TypeError: # If system_instruction is not a valid param for the model object
                logger.warning(f"Model {self.model_name} might not support system_instruction directly at model init. Prepending to prompt.")
                prompt = f"{system_prompt}\n\nUser: {prompt}"


        response = await model_to_use.generate_content_async(
            prompt,
            generation_config=generation_config,
            # safety_settings can also be passed here per request
        )

        completion_text = response.text
        
        # Token counting for Gemini needs to be done separately
        prompt_tokens = await self.get_token_count_async(prompt) # For prompt only
        completion_tokens = await self.get_token_count_async(completion_text) # For completion only

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
            "finish_reason": str(response.candidates[0].finish_reason) if response.candidates else "unknown",
            "raw_response": str(response) # Gemini response object might not be directly JSON serializable
        }

    async def generate_with_images(self, prompt: str, images: List[Union[str, bytes]],
                                 system_prompt: Optional[str] = None,
                                 **kwargs) -> Dict[str, Any]:
        """生成包含图像的多模态响应"""
        if not Image:
             raise ImportError("Pillow library is required for image handling with GeminiProvider.")

        model_to_use = self.generative_model
        if system_prompt:
             try:
                model_to_use = genai.GenerativeModel(
                    self.model_name,
                    safety_settings=self.safety_settings,
                    system_instruction=system_prompt
                )
             except TypeError:
                logger.warning(f"Model {self.model_name} might not support system_instruction directly. Prepending to prompt.")
                prompt = f"{system_prompt}\n\nUser: {prompt}"

        content_parts = [prompt]
        for image_data in images:
            try:
                if isinstance(image_data, str):
                    if image_data.startswith("data:image/"): # data URI
                        header, encoded = image_data.split(",", 1)
                        # media_type = header.split(":")[1].split(";")[0] # e.g. image/jpeg
                        image_bytes = base64.b64decode(encoded)
                        img = Image.open(io.BytesIO(image_bytes))
                    elif image_data.startswith(('http://', 'https://')):
                        # Gemini SDK does not directly load from URL, needs bytes
                        # This part would require an async HTTP client to fetch the image
                        raise NotImplementedError("Image URL fetching not implemented for GeminiProvider. Please provide image bytes or base64.")
                    else: # Assume raw base64 string
                        image_bytes = base64.b64decode(image_data)
                        img = Image.open(io.BytesIO(image_bytes))
                elif isinstance(image_data, bytes):
                    img = Image.open(io.BytesIO(image_data))
                else:
                    raise ValueError(f"Unsupported image data type: {type(image_data)}")
                content_parts.append(img)
            except Exception as e:
                logger.error(f"Error processing image for Gemini: {e}")
                # Skip problematic image or raise error
                continue 
        
        generation_config = genai.types.GenerationConfig(
            temperature=kwargs.get("temperature", 0.7),
            max_output_tokens=kwargs.get("max_tokens", 2048), # Default for vision models
            top_p=kwargs.get("top_p"),
            top_k=kwargs.get("top_k")
        )

        response = await model_to_use.generate_content_async(
            content_parts,
            generation_config=generation_config
        )
        
        completion_text = response.text
        
        # Token counting for multimodal input is more complex
        # For simplicity, we might only count text tokens or use a rough estimate
        # Or use response.usage_metadata if available and informative
        prompt_tokens = response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else await self.get_token_count_async(prompt)
        completion_tokens = response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else await self.get_token_count_async(completion_text)

        usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens, # or response.usage_metadata.total_token_count
            "cost": self.calculate_cost(prompt_tokens, completion_tokens)
        }

        return {
            "text": completion_text,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": str(response.candidates[0].finish_reason) if response.candidates else "unknown",
            "raw_response": str(response)
        }

    async def get_embeddings(self, text: str, task_type="retrieval_document") -> list:
        """获取文本嵌入向量"""
        # Ensure using an appropriate embedding model
        response = await genai.embed_content_async(
            model=self.embedding_model_name, # e.g., "models/embedding-001"
            content=text,
            task_type=task_type # e.g., "retrieval_document", "semantic_similarity"
        )
        return response['embedding']

    async def get_token_count_async(self, text_or_parts: Union[str, List[Any]]) -> int:
        """Helper to count tokens asynchronously for Gemini."""
        try:
            # Use the primary generative model for token counting if it's text
            # For multimodal, counting is more complex and might need specific handling
            if isinstance(text_or_parts, str):
                 count_response = await self.generative_model.count_tokens_async(text_or_parts)
                 return count_response.total_tokens
            # If it's parts (for multimodal), the generate_content_async response.usage_metadata is better
            # This function is mainly for text token counting here.
            return len(str(text_or_parts)) // 4 # Very rough fallback
        except Exception as e:
            logger.warning(f"Gemini token count failed: {e}. Estimating.")
            return len(str(text_or_parts)) // 4

    def get_token_count(self, text: str) -> int:
        """计算文本的token数量 (synchronous wrapper for BaseLLMProvider compliance)"""
        # This is a bit of a workaround as genai's count_tokens is async.
        # For a truly synchronous call, one might need to run the async in a loop.
        # Or, the BaseLLMProvider could be updated to have async get_token_count.
        # For now, a simple estimate or raise NotImplementedError if strict sync is needed.
        # logger.warning("Gemini get_token_count is a sync wrapper around async, or an estimate.")
        try:
            # This is not ideal as it blocks.
            # loop = asyncio.get_event_loop()
            # if loop.is_running():
            #     # This is problematic if called from within an already running loop in a way that can't nest.
            #     # Consider using a dedicated sync method in the SDK if available or a proper async-to-sync bridge.
            #     # For now, let's use a rough estimate for the synchronous version.
            #     pass # Fall through to estimate
            # else:
            #    return loop.run_until_complete(self.get_token_count_async(text))
            return len(text) // 4 # Rough estimate for sync version
        except Exception:
            return len(text) // 4 # Rough estimate

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        # Gemini pricing is often per 1k characters for prompt and per 1k characters for output for text models,
        # or per image + per 1k characters for multimodal.
        # The GEMINI_PRICING constant should reflect this.
        # This is a simplified version assuming token-based pricing similar to others for consistency.
        # Actual Gemini cost calculation might need to use character counts or image counts.
        
        # Let's assume GEMINI_PRICING stores per 1000 tokens for now for consistency with BaseLLMProvider
        # Or it could store per 1M tokens, or per character. This needs to align with constants.py
        
        model_pricing_key = self.model_name
        if self.model_name not in GEMINI_PRICING:
            # Try to find a general pricing for the model series if specific version not listed
            # e.g. if model is "gemini-1.5-pro-latest", check for "gemini-1.5-pro"
            base_model_name = "-".join(self.model_name.split('-')[:3]) # e.g. "gemini-1.5-pro"
            if base_model_name in GEMINI_PRICING:
                model_pricing_key = base_model_name
            else: # Fallback to a generic or default if any, or 0.0
                logger.warning(f"Pricing not found for Gemini model {self.model_name}. Cost will be 0.")
                return 0.0
        
        pricing = GEMINI_PRICING[model_pricing_key]
        
        # Assuming pricing in constants is per 1000 tokens for prompt and completion
        prompt_cost = (prompt_tokens / 1000) * pricing.get("prompt", 0.0)
        completion_cost = (completion_tokens / 1000) * pricing.get("completion", 0.0)
        
        # If pricing is per 1M tokens
        if pricing.get("prompt_million") is not None:
            prompt_cost = (prompt_tokens / 1_000_000) * pricing.get("prompt_million", 0.0)
        if pricing.get("completion_million") is not None:
            completion_cost = (completion_tokens / 1_000_000) * pricing.get("completion_million", 0.0)

        # TODO: Add image cost if applicable and defined in GEMINI_PRICING
        # cost += num_images * pricing.get("image_cost_per_image", 0.0)
        
        return prompt_cost + completion_cost

    @property
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        default_info = {"context_window": 1048576, "max_output_tokens": 8192, "provider": "gemini"} # Gemini 1.5 Pro defaults
        if self.model_name in GEMINI_MODELS:
            model_specific_info = GEMINI_MODELS[self.model_name].copy()
            model_specific_info.setdefault("provider", "gemini")
            merged_info = default_info.copy()
            merged_info.update(model_specific_info)
            return merged_info
        # Try to find by base model if specific version not listed
        base_model_name = "-".join(self.model_name.split('-')[:3])
        if base_model_name in GEMINI_MODELS:
            model_specific_info = GEMINI_MODELS[base_model_name].copy()
            model_specific_info.setdefault("provider", "gemini")
            merged_info = default_info.copy()
            merged_info.update(model_specific_info)
            return merged_info
            
        return default_info

# 注册提供商
if genai: # Only register if the library was successfully imported
    LLMProviderFactory.register_provider("gemini", GeminiProvider)
else:
    logger.warning("GeminiProvider not registered because google-generativeai library is missing.")