from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List, Optional, Union
import logging
import time
import asyncio
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession # Added
from db.database import get_async_db # Changed: Relative import
import schemas # Changed: Relative import
# Assuming LlmApiRequest, LlmApiMultimodalRequest, LlmBatchCreateRequest are now in schemas.py
# from models.request_models import LlmApiRequest, LlmApiMultimodalRequest, LlmBatchCreateRequest
from models.response_models import LlmApiResponse, BaseResponse # Changed: Relative import
from services.llm_api_service import LlmApiService # Changed: Relative import

router = APIRouter()
logger = logging.getLogger(__name__)

def get_llm_api_service():
    """依赖注入：获取LLM API服务实例"""
    return LlmApiService()

@router.post("/invoke", response_model=LlmApiResponse)
async def invoke_llm( # This endpoint does not directly use DB operations via this router, service handles it if needed
    request: schemas.LlmApiRequest, # Changed to use schema from schemas.py
    service: LlmApiService = Depends(get_llm_api_service)
    # db: AsyncSession = Depends(get_async_db) # Not adding db here as invoke_llm service method doesn't take it
):
    """
    调用LLM生成文本
    
    - **prompt**: 提示词
    - **model**: 模型名称
    - **system_message**: 系统消息(可选)
    - **temperature**: 温度(可选)
    - **max_tokens**: 最大生成token数(可选)
    - **provider**: 提供商('openai', 'anthropic', 'local'等)(可选)
    
    返回:
    - **result**: 生成的文本
    - **model**: 使用的模型
    - **tokens_used**: 使用的token数
    """
    try:
        logger.info(f"Received LLM API request (id: {request.request_id}) for model {request.model}")
        start_time = time.time()
        
        # 调用服务层处理请求
        result = await service.invoke_llm(
            prompt=request.prompt,
            model=request.model,
            system_message=request.system_message,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            frequency_penalty=request.frequency_penalty,
            presence_penalty=request.presence_penalty,
            stop_sequences=request.stop_sequences,
            stream=request.stream,
            provider=request.provider
        )
        
        execution_time = (time.time() - start_time) * 1000
        logger.info(f"LLM API completed (id: {request.request_id}), tokens used: {result.get('tokens_used', 0)}")
        
        # 构建响应
        return LlmApiResponse(
            result=result["text"],
            model=request.model,
            tokens_used=result.get("tokens_used", 0),
            token_breakdown=result.get("token_breakdown"),
            finish_reason=result.get("finish_reason"),
            provider=request.provider,
            cost=result.get("cost"),
            status="success",
            message="LLM invocation successful",
            request_id=request.request_id,
            execution_time_ms=execution_time
        )
    except Exception as e:
        logger.error(f"Error in invoke_llm (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invoke_with_images", response_model=LlmApiResponse)
async def invoke_llm_with_images( # This endpoint also does not directly use DB operations via this router
    request: schemas.LlmApiMultimodalRequest, # Changed to use schema from schemas.py
    service: LlmApiService = Depends(get_llm_api_service)
    # db: AsyncSession = Depends(get_async_db) # Not adding db here
):
    """
    调用多模态LLM生成文本
    
    - **prompt**: 文本提示词
    - **images**: 图像列表(URL或Base64编码)
    - **model**: 模型名称
    - **system_message**: 系统消息(可选)
    
    返回:
    - **result**: 生成的文本
    - **model**: 使用的模型
    - **tokens_used**: 使用的token数
    """
    try:
        # request_id is now part of BaseRequest, Pydantic handles it.
        logger.info(f"Received multimodal LLM API request (id: {request.request_id}) for model {request.model}")
        start_time = time.time()
        
        # Pydantic model handles validation
        
        # 调用服务层处理请求
        result = await service.invoke_llm_with_images(
            prompt=request.prompt,
            images=request.images, # Assuming images are List[str] (URLs or base64)
            model=request.model,
            system_message=request.system_message,
            provider=request.provider
            # Pass other params from request if LlmApiMultimodalRequest and service.invoke_llm_with_images are updated
        )
        
        execution_time = (time.time() - start_time) * 1000
        logger.info(f"Multimodal LLM API completed (id: {request.request_id})")
        
        # 构建响应
        return LlmApiResponse(
            result=result["text"], # service.invoke_llm_with_images returns a dict
            model=request.model,
            tokens_used=result.get("usage", {}).get("total_tokens", 0), # Adjusted to match service response structure
            token_breakdown=result.get("usage"), # Adjusted
            finish_reason=result.get("finish_reason"),
            provider=request.provider,
            cost=result.get("usage", {}).get("cost"), # Adjusted
            status="success",
            message="Multimodal LLM invocation successful",
            request_id=request.request_id,
            execution_time_ms=execution_time
        )
    except Exception as e:
        logger.error(f"Error in invoke_llm_with_images: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch", response_model=BaseResponse)
async def create_batch_task(
    request: schemas.LlmBatchCreateRequest, # Changed to use schema from schemas.py
    background_tasks: BackgroundTasks,
    service: LlmApiService = Depends(get_llm_api_service),
    db: AsyncSession = Depends(get_async_db) # Added db session
):
    """
    创建批量LLM处理任务
    
    - **items**: 要处理的数据项列表
    - **prompt_template**: 提示词模板
    - **model**: 模型名称
    - **system_prompt**: 系统提示词(可选)
    - **provider**: 提供商(可选)
    
    返回:
    - **task_id**: 任务ID
    """
    try:
        # request_id is now part of BaseRequest
        logger.info(f"Received batch LLM request (id: {request.request_id}) for model {request.model}")
        
        # Pydantic model handles validation
        
        # 创建批量任务
        # service.create_batch_task now expects LlmBatchCreateRequest and db session
        task_id = await service.create_batch_task(request, db)
        
        # 添加后台任务
        async def execute_task_with_db_session(tid: str):
            async for session in get_async_db(): # Correct way to use dependency in background
                await service.execute_batch_task(tid, session)
                break # Important: break after first iteration

        background_tasks.add_task(execute_task_with_db_session, task_id)
        
        return BaseResponse(
            status="success",
            message=f"Batch task created with ID: {task_id}",
            request_id=request.request_id # Use request_id from Pydantic model
        )
    except Exception as e:
        logger.error(f"Error in create_batch_task: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/batch/{task_id}", response_model=Union[schemas.Task, BaseResponse]) # Updated response_model
async def get_batch_task_status(
    task_id: str,
    service: LlmApiService = Depends(get_llm_api_service),
    db: AsyncSession = Depends(get_async_db) # Added db session
):
    """获取批量任务状态"""
    try:
        task_schema = await service.get_batch_task_status(task_id, db) # Pass db session
        if not task_schema:
            # Service now returns Optional[schemas.Task]
            return BaseResponse(
                status="error",
                message=f"Task {task_id} not found",
                request_id=task_id, # task_id here acts as a reference
                error_code="TASK_NOT_FOUND"
            )
        
        # If task is found, return the schemas.Task object directly
        # The client will receive all fields defined in schemas.Task
        # including id, status, progress, parameters, result, error, timestamps.
        # The 'result' field in schemas.Task for an LLM batch task contains 'result_file' and 'stats'.
        # It might also contain 'sample_results' if the service layer added it.
        
        if task_schema.status == "completed":
            return task_schema # Contains all info including the result dict
        elif task_schema.status == "running" or task_schema.status == "pending":
            return BaseResponse(
                status="pending",
                message=f"Task {task_id} is {task_schema.status}. Progress: {task_schema.progress * 100 if task_schema.progress is not None else 0:.0f}%",
                request_id=task_id
            )
        elif task_schema.status == "failed":
            return BaseResponse(
                status="error",
                message=f"Task {task_id} failed: {task_schema.error or 'Unknown error'}",
                request_id=task_id,
                error_code="TASK_FAILED"
            )
        else: # Should not happen
             return BaseResponse(
                status="unknown",
                message=f"Task {task_id} has an unknown status: {task_schema.status}",
                request_id=task_id
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_batch_task_status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/providers", response_model=Dict[str, Any])
async def get_llm_providers(
    service: LlmApiService = Depends(get_llm_api_service)
):
    """获取所有可用的LLM提供商和模型信息"""
    try:
        providers = await service.get_providers_info()
        return {
            "status": "success",
            "providers": providers
        }
    except Exception as e:
        logger.error(f"Error in get_llm_providers: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
