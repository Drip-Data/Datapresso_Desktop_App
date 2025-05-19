from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession # Added for db session
from db.database import get_async_db # Added for db session
from schemas import EvaluationRequest, Task as TaskSchema # Changed import for EvaluationRequest, added TaskSchema
from models.response_models import EvaluationResponse, BaseResponse # Changed to direct import, assuming these are still in models.response_models
from services.evaluation_service import EvaluationService # Changed to direct import
import logging
import time
from typing import Any, Union # Added Union

router = APIRouter()
logger = logging.getLogger(__name__)

def get_evaluation_service():
    """依赖注入：获取评估服务实例"""
    return EvaluationService()

@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_data(
    request: EvaluationRequest,
    service: EvaluationService = Depends(get_evaluation_service)
):
    """
    评估数据质量和特性
    
    - **data**: 需要评估的数据
    - **reference_data**: 参考数据(可选)
    - **metrics**: 评估指标列表
    - **custom_metric_code**: 自定义指标代码(如需)
    
    返回:
    - **overall_score**: 总体评分
    - **metric_scores**: 各指标评分
    - **recommendations**: 改进建议
    """
    try:
        logger.info(f"Received evaluation request (id: {request.request_id}) with {len(request.data)} items")
        start_time = time.time()
        
        # 调用服务层处理评估
        result = await service.evaluate_data(
            data=request.data,
            reference_data=request.reference_data,
            metrics=request.metrics,
            custom_metric_code=request.custom_metric_code,
            weights=request.weights,
            threshold=request.threshold,
            schema=request.schema,
            detail_level=request.detail_level
        )
        
        execution_time = (time.time() - start_time) * 1000
        logger.info(f"Evaluation completed (id: {request.request_id})")
        
        # 构建响应
        return EvaluationResponse(
            overall_score=result["overall_score"],
            metric_scores=result["metric_scores"],
            visualization_data=result.get("visualization_data"),
            recommendations=result.get("recommendations"),
            passed=result.get("passed"),
            details_by_field=result.get("details_by_field"),
            status="success",
            message="Data evaluated successfully",
            request_id=request.request_id,
            execution_time_ms=execution_time
        )
    except Exception as e:
        logger.error(f"Error in evaluate_data (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/async_evaluate", response_model=BaseResponse)
async def async_evaluate_data(
    request: EvaluationRequest, # This will now use schemas.EvaluationRequest
    background_tasks: BackgroundTasks,
    service: EvaluationService = Depends(get_evaluation_service),
    db: AsyncSession = Depends(get_async_db) # Added db session for service call
):
    """
    异步执行数据评估，适用于大数据集
    
    返回任务ID，可通过/task/{task_id}查询结果
    """
    try:
        logger.info(f"Received async evaluation request (id: {request.request_id}) with {len(request.data)} items")
        
        # 将评估任务加入后台任务队列
        # Assuming service.start_async_evaluation_task now requires db session
        task_id = await service.start_async_evaluation_task(request, db)

        async def execute_task_with_db_session(tid: str):
            async for session in get_async_db():
                await service.execute_async_evaluation_task(tid, session)
                break

        background_tasks.add_task(execute_task_with_db_session, task_id)
        
        return BaseResponse(
            status="success",
            message=f"Async evaluation task started with ID: {task_id}",
            request_id=request.request_id
        )
    except Exception as e:
        logger.error(f"Error in async_evaluate_data (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/task/{task_id}", response_model=Union[TaskSchema, EvaluationResponse, BaseResponse]) # Updated response_model
async def get_evaluation_task_result(
    task_id: str,
    service: EvaluationService = Depends(get_evaluation_service),
    db: AsyncSession = Depends(get_async_db) # Added db session
):
    """获取异步评估任务结果"""
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
                # Assuming task_schema.result is structured to be compatible with EvaluationResponse
                # This might require EvaluationService to store results in a specific way.
                try:
                    return EvaluationResponse(**task_schema.result)
                except Exception as e:
                    logger.error(f"Error parsing completed evaluation task result for {task_id}: {str(e)}")
                    return BaseResponse(status="error", message="Error parsing task result.", request_id=task_id)
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
        else:
             return BaseResponse(
                status="unknown",
                message=f"Task {task_id} has an unknown status: {task_schema.status}",
                request_id=task_id
            )
    except Exception as e:
        logger.error(f"Error retrieving task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
