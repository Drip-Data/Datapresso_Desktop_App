from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_async_db
import schemas
from schemas import DataGenerationRequest, DataGenerationResponse, BaseResponse, Task as TaskSchema # Consolidated imports
from services.data_generation_service import DataGenerationService
import logging
import time
from typing import Any, Union # Added Union

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/test")
async def test_data_generation():
    """数据生成模块联调测试端点"""
    try:
        return {
            "status": "success",
            "message": "Data generation module is working",
            "module": "data_generation",
            "endpoints": [
                "/generate - POST: 同步生成数据",
                "/async_generate - POST: 异步生成数据",
                "/task/{task_id} - GET: 查询任务结果"
            ]
        }
    except Exception as e:
        logger.error(f"Error in data generation test: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

def get_data_generation_service():
    """依赖注入：获取数据生成服务实例"""
    return DataGenerationService()

@router.post("/generate", response_model=DataGenerationResponse)
async def generate_data(
    request: DataGenerationRequest, # 直接使用导入的类型
    service: DataGenerationService = Depends(get_data_generation_service)
):
    """
    生成数据
    
    - **seed_data**: 种子数据(可选)
    - **template**: 数据模板(可选)
    - **generation_method**: 生成方法
    - **count**: 生成数据数量
    - **field_constraints**: 字段约束(可选)
    - **variation_factor**: 变异因子(0.0-1.0)
    
    返回:
    - **generated_data**: 生成的数据
    - **stats**: 数据统计信息
    """
    try:
        logger.info(f"Received data generation request (id: {request.request_id}) for {request.count} items")
        start_time = time.time()
        
        # 调用服务层处理生成
        result = await service.generate_data(
            seed_data=request.seed_data,
            template=request.template,
            generation_method=request.generation_method,
            count=request.count,
            field_constraints=request.field_constraints,
            variation_factor=request.variation_factor,
            preserve_relationships=request.preserve_relationships,
            random_seed=request.random_seed,
            llm_prompt=request.llm_prompt,
            llm_model=request.llm_model
        )
        
        execution_time = (time.time() - start_time) * 1000
        logger.info(f"Generation completed (id: {request.request_id}), generated {len(result['generated_data'])} items")
        
        # 构建响应
        return DataGenerationResponse(
            status="success",
            message="Data generated successfully",
            request_id=request.request_id,
            execution_time_ms=execution_time,
            generated_data=result["generated_data"],
            generation_method=request.generation_method.value,
            count=len(result["generated_data"]),
            stats=result.get("stats"),
            seed_used=result.get("seed_used", request.random_seed), # Prefer service layer's seed_used
            processing_info=result.get("processing_info") # Prefer service layer's processing_info
        )
    except Exception as e:
        logger.error(f"Error in generate_data (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/async_generate", response_model=BaseResponse)
async def async_generate_data(
    request: DataGenerationRequest, # 直接使用导入的类型
    background_tasks: BackgroundTasks,
    service: DataGenerationService = Depends(get_data_generation_service),
    db: AsyncSession = Depends(get_async_db) # Added db session
):
    """
    异步执行数据生成，适用于大量生成
    
    返回任务ID，可通过/task/{task_id}查询结果
    """
    try:
        logger.info(f"Received async generation request (id: {request.request_id}) to generate {request.count} items")
        
        # 将生成任务加入后台任务队列
        # Pass the db session to the service method
        # Ensure 'request' is compatible with what service.start_async_generation_task now expects (schemas.DataGenerationRequest)
        task_id = await service.start_async_generation_task(request, db)

        async def execute_task_with_db_session(tid: str):
            async for session in get_async_db(): # Correct way to use dependency in background
                await service.execute_async_generation_task(tid, session)
                break # Important: break after first iteration

        background_tasks.add_task(execute_task_with_db_session, task_id)
        
        return BaseResponse(
            status="success",
            message=f"Async generation task started with ID: {task_id}",
            request_id=request.request_id
        )
    except Exception as e:
        logger.error(f"Error in async_generate_data (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/task/{task_id}", response_model=Union[TaskSchema, BaseResponse, DataGenerationResponse]) # Use aliased TaskSchema
async def get_generation_task_result(
    task_id: str,
    service: DataGenerationService = Depends(get_data_generation_service),
    db: AsyncSession = Depends(get_async_db) # Added db session
):
    """获取异步生成任务结果"""
    try:
        # 获取任务状态和结果
        task_schema = await service.get_task_status(task_id, db) # Pass db session
        
        if not task_schema:
            return BaseResponse(
                status="error",
                message=f"Task {task_id} not found",
                request_id=task_id,
                error_code="TASK_NOT_FOUND"
            )

        if task_schema.status == "completed":
            if task_schema.result:
                # task_schema.result is a dict. We need to map it to DataGenerationResponse
                # The service stored: "generated_data_preview", "count_generated", "stats", "warnings", etc.
                task_result_dict = task_schema.result
                return DataGenerationResponse(
                    status="success",
                    message=task_result_dict.get("status_message", "Task completed successfully"),
                    request_id=task_result_dict.get("original_request_id", task_id),
                    execution_time_ms=task_result_dict.get("execution_time_ms"),
                    generated_data=task_result_dict.get("generated_data_preview", []), # Note: this is preview
                    generation_method=task_result_dict.get("processing_info", {}).get("generation_method"),
                    count=task_result_dict.get("count_generated", 0),
                    stats=task_result_dict.get("stats"),
                    warnings=task_result_dict.get("warnings"),
                    seed_used=task_result_dict.get("seed_used"),
                    processing_info=task_result_dict.get("processing_info")
                )
            else:
                 return BaseResponse(status="success", message="Task completed, but no result data found.", request_id=task_id)

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
    except Exception as e:
        logger.error(f"Error retrieving task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
