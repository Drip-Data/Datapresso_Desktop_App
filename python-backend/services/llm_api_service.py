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

# Import provider factory but not all providers to avoid blocking imports
from llm_api.provider_factory import LLMProviderFactory # Changed: Relative import
from llm_api.batch_processor import BatchProcessor # Changed: Relative import
from llm_api.batch_processors.anthropic_batch import AnthropicBatchProcessor # Changed: Relative import
from llm_api.batch_processors.openai_batch import OpenAIBatchProcessor # Changed: Relative import
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
                    # The `task_info` in the original code was a dict, so adding keys was easy.                    # The `task_schema.result` (which is a dict) can hold this.
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
            
            # 使用静态数据避免依赖导入问题
            result = {
                "openai": {
                    "models": {
                        "gpt-4o": {
                            "context_window": 128000,
                            "max_output_tokens": 4096,
                            "capabilities": ["text", "vision", "function_calling"]
                        },
                        "gpt-4o-mini": {
                            "context_window": 128000,
                            "max_output_tokens": 4096,
                            "capabilities": ["text", "vision", "function_calling"]
                        },
                        "gpt-3.5-turbo": {
                            "context_window": 16385,
                            "max_output_tokens": 4096,
                            "capabilities": ["text"]
                        }
                    },
                    "pricing": {
                        "gpt-4o": {"prompt": 0.005, "completion": 0.015},
                        "gpt-4o-mini": {"prompt": 0.0015, "completion": 0.0060},
                        "gpt-3.5-turbo": {"prompt": 0.0005, "completion": 0.0015}
                    },
                    "has_api_key": bool(os.environ.get("OPENAI_API_KEY")),
                    "capabilities": {
                        "text": True,
                        "images": True,
                        "embeddings": True,
                        "batch": True
                    }
                },
                "anthropic": {
                    "models": {
                        "claude-3-5-sonnet-20241022": {
                            "context_window": 200000,
                            "max_output_tokens": 4096,
                            "capabilities": ["text", "vision"]
                        },
                        "claude-3-5-haiku-20241022": {
                            "context_window": 200000,
                            "max_output_tokens": 4096,
                            "capabilities": ["text", "vision"]
                        }
                    },
                    "pricing": {
                        "claude-3-5-sonnet-20241022": {"prompt": 0.003, "completion": 0.015},
                        "claude-3-5-haiku-20241022": {"prompt": 0.00025, "completion": 0.00125}
                    },
                    "has_api_key": bool(os.environ.get("ANTHROPIC_API_KEY")),
                    "capabilities": {
                        "text": True,
                        "images": True,
                        "embeddings": False,
                        "batch": True
                    }
                },
                "gemini": {
                    "models": {
                        "gemini-1.5-pro": {
                            "context_window": 1000000,
                            "max_output_tokens": 8192,
                            "capabilities": ["text", "vision"]
                        },
                        "gemini-1.5-flash": {
                            "context_window": 1000000,
                            "max_output_tokens": 8192,
                            "capabilities": ["text", "vision"]
                        }
                    },
                    "pricing": {
                        "gemini-1.5-pro": {"prompt": 0.00125, "completion": 0.005},
                        "gemini-1.5-flash": {"prompt": 0.000075, "completion": 0.0003}
                    },
                    "has_api_key": bool(os.environ.get("GEMINI_API_KEY")),
                    "capabilities": {
                        "text": True,
                        "images": True,
                        "embeddings": True,
                        "batch": False
                    }
                },
                "deepseek": {
                    "models": {
                        "deepseek-chat": {
                            "context_window": 32768,
                            "max_output_tokens": 4096,
                            "capabilities": ["text"]
                        },
                        "deepseek-coder": {
                            "context_window": 16384,
                            "max_output_tokens": 4096,
                            "capabilities": ["text"]
                        }
                    },
                    "pricing": {
                        "deepseek-chat": {"prompt": 0.00014, "completion": 0.00028},
                        "deepseek-coder": {"prompt": 0.00014, "completion": 0.00028}
                    },
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
    
    async def test_provider_connection(self, provider_id: str, api_key: Optional[str] = None) -> Dict[str, Any]:
        """
        测试特定LLM提供商的连接。
        尝试创建一个提供商实例并执行一个简单的API调用。
        
        Args:
            provider_id: 提供商ID
            api_key: 可选的API密钥，如果不提供则从环境变量获取
            
        Returns:
            测试结果字典
        """
        logger.info(f"Attempting to test connection for provider: {provider_id}")
        
        # 获取API密钥：优先使用传入的密钥，否则从环境变量获取
        if not api_key:
            api_key = os.environ.get(f"{provider_id.upper()}_API_KEY")
        
        if not api_key:
            return {
                "provider_name": provider_id,
                "test_passed": False,
                "message": f"API Key for {provider_id.capitalize()} is not provided or configured in environment variables."
            }

        try:
            llm_provider_instance = LLMProviderFactory.create_provider(
                provider_id=provider_id,
                api_key=api_key,
            )
            
            # 尝试获取模型列表来测试连接
            models = await llm_provider_instance.list_models()
            
            # 如果成功获取模型列表，认为连接正常
            return {
                "provider_name": provider_id,
                "test_passed": True,
                "message": f"Connection to {provider_id.capitalize()} successful. Found {len(models)} models.",
                "details": {
                    "models_found": len(models),
                    "models": models[:5] if models else []  # 返回前5个模型作为示例
                }
            }
        except ValueError as e:
            # API密钥格式错误或配置问题
            logger.warning(f"Configuration error for provider {provider_id}: {str(e)}")
            return {
                "provider_name": provider_id,
                "test_passed": False,
                "message": f"Configuration error for {provider_id.capitalize()}: {str(e)}",
                "details": {"error_type": "configuration_error", "error": str(e)}
            }
        except Exception as e:
            # 网络错误或其他API调用失败
            logger.error(f"Connection test failed for provider {provider_id}: {str(e)}", exc_info=True)
            error_message = str(e)
            
            # 提供更具体的错误信息
            if "api key" in error_message.lower() or "unauthorized" in error_message.lower():
                error_type = "authentication_error"
                friendly_message = f"Authentication failed for {provider_id.capitalize()}. Please check your API key."
            elif "network" in error_message.lower() or "timeout" in error_message.lower():
                error_type = "network_error"
                friendly_message = f"Network error when connecting to {provider_id.capitalize()}. Please check your internet connection."
            else:
                error_type = "api_error"
                friendly_message = f"Connection to {provider_id.capitalize()} failed: {error_message}"
            
            return {
                "provider_name": provider_id,
                "test_passed": False,
                "message": friendly_message,
                "details": {"error_type": error_type, "error": error_message}
            }
    
    async def get_provider_models(self, provider_id: str) -> List[Dict[str, Any]]:
        """
        获取特定LLM提供商的动态模型列表
        
        Args:
            provider_id: 提供商ID
            
        Returns:
            模型列表
        """
        logger.info(f"Getting models for provider: {provider_id}")
        api_key = os.environ.get(f"{provider_id.upper()}_API_KEY")
        
        if not api_key:
            logger.warning(f"API Key for {provider_id.capitalize()} is not configured")
            # 返回静态模型列表作为后备
            return self._get_static_models_for_provider(provider_id)
        
        try:
            llm_provider_instance = LLMProviderFactory.create_provider(
                provider_id=provider_id,
                api_key=api_key,
            )
            
            models = await llm_provider_instance.list_models()
            logger.info(f"Successfully retrieved {len(models)} models for provider {provider_id}")
            return models
            
        except Exception as e:
            logger.error(f"Failed to get models for provider {provider_id}: {str(e)}", exc_info=True)
            # 返回静态模型列表作为后备
            return self._get_static_models_for_provider(provider_id)

    def _get_static_models_for_provider(self, provider_id: str) -> List[Dict[str, Any]]:
        """
        获取提供商的静态模型列表作为后备
        
        Args:
            provider_id: 提供商ID
            
        Returns:
            静态模型列表
        """
        static_models = {
            "openai": [
                {"id": "gpt-4o", "context_window": 128000, "max_output_tokens": 4096, "capabilities": ["text", "vision"]},
                {"id": "gpt-4o-mini", "context_window": 128000, "max_output_tokens": 4096, "capabilities": ["text", "vision"]},
                {"id": "gpt-3.5-turbo", "context_window": 16385, "max_output_tokens": 4096, "capabilities": ["text"]},
            ],
            "anthropic": [
                {"id": "claude-3-5-sonnet-20241022", "context_window": 200000, "max_output_tokens": 4096, "capabilities": ["text", "vision"]},
                {"id": "claude-3-5-haiku-20241022", "context_window": 200000, "max_output_tokens": 4096, "capabilities": ["text", "vision"]},
                {"id": "claude-3-opus-20240229", "context_window": 200000, "max_output_tokens": 4096, "capabilities": ["text", "vision"]},
            ],
            "gemini": [
                {"id": "gemini-1.5-pro", "context_window": 1000000, "max_output_tokens": 8192, "capabilities": ["text", "vision"]},
                {"id": "gemini-1.5-flash", "context_window": 1000000, "max_output_tokens": 8192, "capabilities": ["text", "vision"]},
                {"id": "gemini-pro", "context_window": 30720, "max_output_tokens": 2048, "capabilities": ["text"]},
            ],
            "deepseek": [
                {"id": "deepseek-chat", "context_window": 32768, "max_output_tokens": 4096, "capabilities": ["text"]},
                {"id": "deepseek-coder", "context_window": 16384, "max_output_tokens": 4096, "capabilities": ["text"]},            ],
        }
        
        return static_models.get(provider_id, [])
    
    async def update_provider_config(self, provider_name: str, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        更新LLM提供商配置
        
        Args:
            provider_name: 提供商名称
            config_data: 配置数据
            
        Returns:
            更新结果字典
        """
        try:
            logger.info(f"Updating configuration for provider: {provider_name}")
            
            # 验证提供商名称
            valid_providers = ["openai", "anthropic", "gemini", "deepseek"]
            if provider_name.lower() not in valid_providers:
                return {
                    "success": False,
                    "message": f"Invalid provider name: {provider_name}. Valid providers are: {', '.join(valid_providers)}"
                }
            
            # 验证配置数据结构
            if not isinstance(config_data, dict):
                return {
                    "success": False,
                    "message": "Configuration data must be a dictionary"
                }
            
            # 验证必需的配置字段
            required_fields = ["api_key"]
            missing_fields = [field for field in required_fields if field not in config_data]
            if missing_fields:
                return {
                    "success": False,
                    "message": f"Missing required configuration fields: {', '.join(missing_fields)}"
                }
            
            # 验证API密钥格式（基本验证）
            api_key = config_data.get("api_key", "").strip()
            if not api_key or len(api_key) < 10:
                return {
                    "success": False,
                    "message": "Invalid API key format"
                }
            
            # 如果提供了模型名称，验证模型是否有效
            if "model" in config_data:
                model_name = config_data["model"]
                static_models = self._get_static_models_for_provider(provider_name.lower())
                valid_model_ids = [model["id"] for model in static_models]
                if model_name not in valid_model_ids:
                    logger.warning(f"Model {model_name} not found in static models for {provider_name}, but allowing it")
            
            # 测试配置是否有效（可选，根据需要启用）
            test_connection = config_data.get("test_connection", False)
            if test_connection:
                test_result = await self.test_provider_connection(provider_name, api_key)
                if not test_result.get("test_passed"):
                    return {
                        "success": False,
                        "message": f"Configuration test failed: {test_result.get('message', 'Unknown error')}"
                    }
            
            # 创建LLM控制器实例来保存配置
            from llm_api.controller import LLMController
            controller = LLMController()
            
            # 更新配置
            success = controller.update_provider_config(provider_name, config_data)
            
            if success:
                logger.info(f"Successfully updated configuration for provider: {provider_name}")
                return {
                    "success": True,
                    "message": f"Configuration for {provider_name} updated successfully",
                    "provider": provider_name,
                    "updated_fields": list(config_data.keys())
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to save configuration for {provider_name}"
                }
                
        except Exception as e:
            logger.error(f"Error updating provider config for {provider_name}: {str(e)}", exc_info=True)
            return {
                "success": False,
                "message": f"Internal error while updating configuration: {str(e)}"
            }
