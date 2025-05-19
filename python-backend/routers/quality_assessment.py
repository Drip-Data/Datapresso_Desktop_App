from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from schemas import QualityAssessmentRequest # Changed import from models.request_models to schemas
from models.response_models import QualityAssessmentResponse, BaseResponse
from services.quality_assessment_service import QualityAssessmentService
import logging
import time
from typing import Any

router = APIRouter()
logger = logging.getLogger(__name__)

def get_quality_assessment_service():
    """依赖注入：获取质量评估服务实例"""
    return QualityAssessmentService()

@router.post("/assess", response_model=QualityAssessmentResponse)
async def assess_quality(
    request: QualityAssessmentRequest,
    service: QualityAssessmentService = Depends(get_quality_assessment_service)
):
    """
    评估数据质量
    
    - **data**: 要评估的数据
    - **dimensions**: 评估维度列表
    - **schema**: 数据结构定义(可选)
    - **reference_data**: 参考数据(可选)
    
    返回:
    - **overall_score**: 总体评分
    - **dimension_scores**: 各维度评分
    - **summary**: 评估摘要
    """
    try:
        logger.info(f"Received quality assessment request (id: {request.request_id}) with {len(request.data)} items")
        start_time = time.time()
        
        # 调用服务层处理评估
        result = await service.assess_quality(
            data=request.data,
            dimensions=request.dimensions,
            schema=request.schema,
            reference_data=request.reference_data,
            weights=request.weights,
            threshold_scores=request.threshold_scores,
            generate_report=request.generate_report,
            report_format=request.report_format,
            detail_level=request.detail_level,
            custom_rules=request.custom_rules
        )
        
        execution_time = (time.time() - start_time) * 1000
        logger.info(f"Quality assessment completed (id: {request.request_id})")
        
        # 构建响应
        return QualityAssessmentResponse(
            overall_score=result["overall_score"],
            dimension_scores=result["dimension_scores"],
            summary=result["summary"],
            passed_threshold=result.get("passed_threshold"),
            report_url=result.get("report_url"),
            field_scores=result.get("field_scores"),
            improvement_priority=result.get("improvement_priority"),
            visualizations=result.get("visualizations"),
            status="success",
            message="Data quality assessed successfully",
            request_id=request.request_id,
            execution_time_ms=execution_time
        )
    except Exception as e:
        logger.error(f"Error in assess_quality (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/async_assess", response_model=BaseResponse)
async def async_assess_quality(
    request: QualityAssessmentRequest,
    background_tasks: BackgroundTasks,
    service: QualityAssessmentService = Depends(get_quality_assessment_service)
):
    """
    异步执行质量评估，适用于大数据集
    
    返回任务ID，可通过/task/{task_id}查询结果
    """
    try:
        logger.info(f"Received async quality assessment request (id: {request.request_id}) with {len(request.data)} items")
        
        # 将评估任务加入后台任务队列
        task_id = await service.start_async_assessment_task(request)
        background_tasks.add_task(service.execute_async_assessment_task, task_id)
        
        return BaseResponse(
            status="success",
            message=f"Async quality assessment task started with ID: {task_id}",
            request_id=request.request_id
        )
    except Exception as e:
        logger.error(f"Error in async_assess_quality (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/task/{task_id}", response_model=Any)
async def get_assessment_task_result(
    task_id: str,
    service: QualityAssessmentService = Depends(get_quality_assessment_service)
):
    """获取异步评估任务结果"""
    try:
        # 获取任务状态和结果
        task_status = await service.get_task_status(task_id)
        
        if task_status["status"] == "completed":
            return QualityAssessmentResponse(**task_status["result"])
        elif task_status["status"] == "running":
            return BaseResponse(
                status="pending",
                message=f"Task {task_id} is still running. Progress: {task_status.get('progress', 0)}%",
                request_id=task_id
            )
        elif task_status["status"] == "failed":
            return BaseResponse(
                status="error",
                message=f"Task {task_id} failed: {task_status.get('error', 'Unknown error')}",
                request_id=task_id,
                error_code="TASK_FAILED"
            )
        else:
            return BaseResponse(
                status="error", 
                message=f"Task {task_id} not found",
                request_id=task_id,
                error_code="TASK_NOT_FOUND"
            )
    except Exception as e:
        logger.error(f"Error retrieving task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
