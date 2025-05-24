import os
import json
import logging
import time
import asyncio
import uuid
from typing import Dict, Any, List, Optional, Union
from datetime import datetime # Added
import aiofiles
from sqlalchemy.ext.asyncio import AsyncSession # Added
import schemas # Changed: Relative import
from db import operations as crud # Changed: Relative import

# Ensure all providers are registered by importing the providers package
import llm_api.providers
from llm_api.provider_factory import LLMProviderFactory # Changed: Relative import
from llm_api.batch_processor import BatchProcessor # Changed: Relative import
from llm_api.batch_processors.anthropic_batch import AnthropicBatchProcessor # Changed: Relative import
from llm_api.batch_processors.openai_batch import OpenAIBatchProcessor # Changed: Relative import
from llm_api.constants import ( # Changed: Relative import
    OPENAI_MODELS, ANTHROPIC_MODELS, GEMINI_MODELS, DEEPSEEK_MODELS,
    OPENAI_PRICING, ANTHROPIC_PRICING, GEMINI_PRICING, DEEPSEEK_PRICING
)
# from db.operations import save_task, update_task, get_task # Replaced by crud
from config import get_settings # Changed: Relative import

logger = logging.getLogger(__name__)
settings = get_settings()

class LlmApiService:
    """LLM API服务"""
    
    def __init__(self):
        """初始化LLM API服务"""
        # 批量任务结果存储路径
        self.batch_results_dir = os.path.join(
            settings.data_dir, 
            'llm_batch_results'
        )
        os.makedirs(self.batch_results_dir, exist_ok=True)
    
    async def invoke_llm(
        self, 
        prompt: str,
        model: str = "gpt-3.5-turbo",
        system_message: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        frequency_penalty: float = 0.0,
        presence_penalty: float = 0.0,
        stop_sequences: Optional[List[str]] = None,
        stream: bool = False,
        provider: str = "openai"
    ) -> Dict[str, Any]:
        """
        调用LLM生成文本
        
        Args:
            prompt: 提示词
            model: 模型名称
            system_message: 系统消息
            temperature: 温度
            max_tokens: 最大生成token数
            frequency_penalty: 频率惩罚
            presence_penalty: 存在惩罚
            stop_sequences: 停止序列
            stream: 是否流式输出
            provider: 提供商
            
        Returns:
            结果字典
        """
        logger.debug(f"Invoking LLM with provider {provider}, model {model}")

        if provider.lower() == "mock":
            logger.info(f"Using mock provider for model {model}. Returning predefined mock response.")
            # 模拟LLM调用延迟
            await asyncio.sleep(0.1) # 100ms delay
            mock_text = f"This is a mock response for model '{model}' with prompt: '{prompt[:50]}...'"
            mock_tokens_used = len(prompt.split()) + len(mock_text.split())
            return {
                "text": mock_text,
                "tokens_used": mock_tokens_used,
                "token_breakdown": {
                    "prompt_tokens": len(prompt.split()),
                    "completion_tokens": len(mock_text.split())
                },
                "finish_reason": "stop",
                "cost": 0.0, # Mock calls are free
                "provider": "mock",
                "model_used": model # Echo back the requested model
            }
        
        # 确定API密钥
        api_key = os.environ.get(f"{provider.upper()}_API_KEY")
        if not api_key:
            logger.warning(f"API key for provider {provider.upper()} not found. LLM call will likely fail.")
            # Optionally, you could raise an error here or return a specific "API key missing" response
            # For now, let it proceed and fail at the provider level if key is truly required.
        
        try:
            # 创建LLM提供商实例
            llm_provider = LLMProviderFactory.create_provider(
                provider_id=provider,
                api_key=api_key,
                model_name=model
            )
            
            # 调用LLM
            result = await llm_provider.generate(
                prompt=prompt,
                system_prompt=system_message,
                temperature=temperature,
                max_tokens=max_tokens,
                **{
                    "frequency_penalty": frequency_penalty,
                    "presence_penalty": presence_penalty,
                    "stop": stop_sequences,
                    "stream": stream
                }
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error invoking LLM: {str(e)}", exc_info=True)
            raise
    
    async def invoke_llm_with_images(
        self,
        prompt: str,
        images: List[Union[str, bytes]],
        model: str = "gpt-4o",
        system_message: Optional[str] = None,
        provider: str = "openai"
    ) -> Dict[str, Any]:
        """
        调用多模态LLM生成文本
        
        Args:
            prompt: 文本提示词
            images: 图像列表(URL或Base64编码)
            model: 模型名称
            system_message: 系统消息
            provider: 提供商
            
        Returns:
            结果字典
        """
        logger.debug(f"Invoking multimodal LLM with provider {provider}, model {model}")
        
        # 确定API密钥
        api_key = os.environ.get(f"{provider.upper()}_API_KEY")
        
        try:
            # 创建LLM提供商实例
            llm_provider = LLMProviderFactory.create_provider(
                provider_id=provider,
                api_key=api_key,
                model_name=model
            )
            
            # 调用多模态LLM
            result = await llm_provider.generate_with_images(
                prompt=prompt,
                images=images,
                system_prompt=system_message
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error invoking multimodal LLM: {str(e)}", exc_info=True)
            raise
    
    async def create_batch_task(self, request: schemas.LlmBatchCreateRequest, db: AsyncSession) -> str: # Added db, updated request type
        """
        创建批量LLM处理任务
        
        Args:
            request: 包含批量任务信息的 Pydantic schema
            db: Async database session
            
        Returns:
            任务ID
        """
        task_id = str(uuid.uuid4()) # Or use default from Task model if not passing id in TaskCreate
        
        task_payload_for_db = schemas.TaskCreate(
            id=task_id,
            name=f"LlmBatchTask-{request.request_id or task_id}", # Assuming request is BaseRequest
            task_type="llm_batch",
            status="queued",
            parameters=request.dict(exclude_none=True) # Store the whole batch request as parameters
        )
        await crud.create_task(db=db, task_in=task_payload_for_db)
        
        return task_id
    
    async def execute_batch_task(self, task_id: str, db: AsyncSession): # Added db
        """
        执行批量LLM处理任务
        
        Args:
            task_id: 任务ID
            db: Async database session
        """
        try:
            # 更新任务状态为运行中
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(status="running", started_at=datetime.now()))
            
            # 获取任务请求
            task_orm = await crud.get_task(db=db, task_id=task_id)
            if not task_orm or not task_orm.parameters:
                logger.error(f"LLM Batch Task {task_id} not found or has no parameters.")
                await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(status="failed", error="Task data or parameters not found for LLM batch", completed_at=datetime.now()))
                return

            request_params = task_orm.parameters # This is a dict from LlmBatchCreateRequest
            
            # 提取参数
            items = request_params["items"] # items is List[LlmBatchItem] which are dicts here
            prompt_template = request_params["prompt_template"]
            model_name_from_req = request_params["model"] # Renamed to avoid conflict
            system_prompt = request_params.get("system_prompt")
            provider_from_req = request_params.get("provider", "openai") # Renamed
            temperature = request_params.get("temperature", 0.7)
            max_tokens = request_params.get("max_tokens", 1000)
            
            # 确定使用的批处理器
            if provider_from_req == "anthropic" and request_params.get("use_batch_api", True):
                # 使用Anthropic专用批处理器
                batch_processor = AnthropicBatchProcessor(
                    model_name=model_name_from_req,
                    output_dir=self.batch_results_dir
                )
            elif provider_from_req == "openai" and request_params.get("use_batch_api", True):
                # 使用OpenAI专用批处理器
                batch_processor = OpenAIBatchProcessor(
                    model_name=model_name_from_req,
                    output_dir=self.batch_results_dir
                )
            else:
                # 使用通用批处理器
                batch_processor = BatchProcessor(
                    provider_id=provider_from_req,
                    model_name=model_name_from_req,
                    max_concurrent_requests=request_params.get("max_concurrent_requests", 5), # Corrected param name
                    output_dir=self.batch_results_dir
                )
            
            # 执行批量处理
            result_file = await batch_processor.process_batch(
                items=items,
                prompt_template=prompt_template,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            # 计算总体统计信息
            stats = batch_processor.stats
            
            # 更新任务状态为完成
            task_result_payload = {
                "result_file": result_file, # Path to the output file
                "stats": stats, # Dictionary of statistics from BatchProcessor
                "status_message": "LLM batch task completed successfully.",
                "original_request_id": request_params.get("request_id")
            }
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(
                status="completed",
                result=task_result_payload,
                completed_at=datetime.now(),
                progress=1.0
            ))
            
        except Exception as e:
            logger.error(f"Error in batch task {task_id}: {str(e)}", exc_info=True)
            # 更新任务状态为失败
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(
                status="failed",
                error=str(e),
                completed_at=datetime.now()
            ))
    
    async def get_batch_task_status(self, task_id: str, db: AsyncSession) -> Optional[schemas.Task]: # Added db, updated return type
        """
        获取批量任务状态
        
        Args:
            task_id: 任务ID
            db: Async database session
            
        Returns:
            任务状态 Pydantic schema or None
        """
        task_orm = await crud.get_task(db=db, task_id=task_id)
        if not task_orm:
            return None
        
        task_schema = schemas.Task.from_orm(task_orm)

        # 如果任务有结果文件且已完成，读取样例结果
        if (task_schema.status == "completed" and
            task_schema.result and
            isinstance(task_schema.result, dict) and
            "result_file" in task_schema.result):
            
            result_file = task_schema.result.get("result_file")
            
            # 读取前10行结果作为示例
            sample_results = []
            try:
                if os.path.exists(result_file):
                    async with aiofiles.open(result_file, 'r') as f:
                        line_count = 0
                        async for line in f:
                            if line_count >= 10:
                                break
                            sample_results.append(json.loads(line))
                            line_count += 1
                    
                    # task_schema is immutable, so we can't directly add to it.
                    # We can return a dict or extend the schema if this is a common pattern.
                    # For now, let's log it or decide if this info should be part of the main task_schema.result
                    # This part of the logic might need to be in the router if it's for display purposes.
                    # Or, the Task schema's 'result' field could be made more flexible or include a 'sample_results' field.
                    # Let's assume for now that the router will handle displaying this if needed,
                    # or the 'result' dict in the task_schema is sufficient.
                    # To keep service layer clean, sample reading could be a separate utility or done in router.
                    # However, if it's consistently needed with task status, it can be here.
                    # Let's try to add it to the result dict of the task_schema if possible,
                    # but Pydantic models are generally immutable after creation.
                    # A workaround: create a new dict from task_schema and add it.
                    
                    task_dict_with_samples = task_schema.dict()
                    task_dict_with_samples["result"] = task_dict_with_samples.get("result", {})
                    task_dict_with_samples["result"]["sample_results"] = sample_results # Add to the result dict
                    # This means the caller gets a dict, not a schemas.Task object if samples are added.
                    # This is not ideal.
                    # Alternative: The `schemas.Task` could have an Optional[List[Dict]] field for sample_results.
                    # Let's assume `schemas.Task` is extended to have `sample_results: Optional[List[Dict[str, Any]]]=None`
                    # and `sample_results_error: Optional[str]=None`.
                    # This requires modifying schemas.py. For now, I will skip adding it directly to the schema object.
                    # The caller can inspect task_schema.result["result_file"] and read samples if needed.
                    # For this diff, I will keep the sample reading logic but not modify the returned task_schema object directly.
                    # The `task_info` in the original code was a dict, so adding keys was easy.
                    # The `task_schema.result` (which is a dict) can hold this.
                    if task_schema.result: # Ensure result dict exists
                        task_schema.result["sample_results"] = sample_results
            except Exception as e:
                logger.error(f"Error reading sample results for task {task_id}: {str(e)}")
                if task_schema.result:
                    task_schema.result["sample_results_error"] = str(e)
        
        return task_schema
    
    async def get_providers_info(self) -> Dict[str, Any]:
        """
        获取所有可用的LLM提供商和模型信息
        
        Returns:
            提供商和模型信息字典
        """
        try:
            logger.info("Getting providers info...")
            
            result = {
                "openai": {
                    "models": OPENAI_MODELS,
                    "pricing": OPENAI_PRICING,
                    "has_api_key": bool(os.environ.get("OPENAI_API_KEY")),
                    "capabilities": {
                        "text": True,
                        "images": True,
                        "embeddings": True,
                        "batch": True
                    }
                },
                "anthropic": {
                    "models": ANTHROPIC_MODELS,
                    "pricing": ANTHROPIC_PRICING,
                    "has_api_key": bool(os.environ.get("ANTHROPIC_API_KEY")),
                    "capabilities": {
                        "text": True,
                        "images": True,
                        "embeddings": False,
                        "batch": True
                    }
                },
                "gemini": {
                    "models": GEMINI_MODELS,
                    "pricing": GEMINI_PRICING,
                    "has_api_key": bool(os.environ.get("GEMINI_API_KEY")),
                    "capabilities": {
                        "text": True,
                        "images": True,
                        "embeddings": True,
                        "batch": False
                    }
                },
                "deepseek": {
                    "models": DEEPSEEK_MODELS,
                    "pricing": DEEPSEEK_PRICING,
                    "has_api_key": bool(os.environ.get("DEEPSEEK_API_KEY")),
                    "capabilities": {
                        "text": True,
                        "images": False,
                        "embeddings": True,
                        "batch": False
                    }
                }
            }
            
            logger.info("Successfully built providers info")
            return result
            
        except Exception as e:
            logger.error(f"Error getting providers info: {str(e)}", exc_info=True)
            raise

    async def test_provider_connection(self, provider_id: str) -> Dict[str, Any]:
        """
        测试特定LLM提供商的连接。
        尝试创建一个提供商实例并执行一个简单的API调用。
        """
        logger.info(f"Attempting to test connection for provider: {provider_id}")
        api_key = os.environ.get(f"{provider_id.upper()}_API_KEY")
        
        if not api_key:
            return {
                "provider_name": provider_id,
                "test_passed": False,
                "message": f"API Key for {provider_id.capitalize()} is not configured in environment variables."
            }

        try:
            llm_provider_instance = LLMProviderFactory.create_provider(
                provider_id=provider_id,
                api_key=api_key,
            )
            
            models = await llm_provider_instance.list_models()
            
            return {
                "provider_name": provider_id,
                "test_passed": True,
                "message": f"Connection to {provider_id.capitalize()} successful. Found {len(models)} models.",
                "details": {"models_found": len(models)}
            }
        except Exception as e:
            logger.error(f"Connection test failed for provider {provider_id}: {str(e)}", exc_info=True)
            return {
                "provider_name": provider_id,
                "test_passed": False,
                "message": f"Connection to {provider_id.capitalize()} failed: {str(e)}",
                "details": {"error": str(e)}
            }
