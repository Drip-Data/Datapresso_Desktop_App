from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from typing import Dict, Any, List, Optional, Union
import logging
import asyncio
import time
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_async_db
from schemas import LlamaFactoryConfigRequest, LlamaFactoryTaskRequest, BaseResponse, LlamaFactoryResponse, Task as TaskSchema # Import new schemas

from core.llamafactory.llamafactory_service import LlamaFactoryService
from core.llamafactory_config import llamafactory_config

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/test")
async def test_llamafactory():
    """LlamaFactory模块联调测试端点"""
    try:
        return {
            "status": "success",
            "message": "LlamaFactory module is working",
            "module": "llamafactory",
            "endpoints": [
                "/configs - POST: 保存LlamaFactory配置",
                "/tasks - POST: 启动LlamaFactory任务",
                "/tasks/{task_id} - GET: 查询任务状态",
                "/run - POST: 执行LlamaFactory操作"
            ]
        }
    except Exception as e:
        logger.error(f"Error in llamafactory test: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# 全局LlamaFactory服务实例
llamafactory_service = None

# 依赖函数，获取LlamaFactory服务实例
def get_llamafactory_service():
    global llamafactory_service
    if llamafactory_service is None:
        llamafactory_service = LlamaFactoryService()
    return llamafactory_service


@router.post("/configs", response_model=BaseResponse)
async def create_llamafactory_config(
    request: LlamaFactoryConfigRequest,
    service: LlamaFactoryService = Depends(get_llamafactory_service)
):
    """
    保存LlamaFactory配置
    """
    try:
        await service.create_config(request.config_data, request.config_type)
        return BaseResponse(status="success", message="LlamaFactory config saved successfully", request_id=request.request_id)
    except Exception as e:
        logger.error(f"Error saving LlamaFactory config (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tasks", response_model=BaseResponse) # Returns task ID
async def start_llamafactory_task(
    request: LlamaFactoryTaskRequest,
    background_tasks: BackgroundTasks,
    service: LlamaFactoryService = Depends(get_llamafactory_service),
    db: AsyncSession = Depends(get_async_db)
):
    """
    启动LlamaFactory任务 (训练、评估、推理等)
    """
    try:
        task_id = await service.start_task(
            request.task_type,
            request.config_name,
            request.arguments,
            db,
            request.project_id,
            request.request_id # Pass original request_id for task tracking
        )
        
        async def execute_task_with_db_session(tid: str):
            async for session in get_async_db():
                await service.execute_task(tid, session)
                break
        
        background_tasks.add_task(execute_task_with_db_session, task_id)
        
        return BaseResponse(status="success", message=f"LlamaFactory task started with ID: {task_id}", request_id=request.request_id)
    except Exception as e:
        logger.error(f"Error starting LlamaFactory task (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks/{task_id}", response_model=Union[TaskSchema, LlamaFactoryResponse, BaseResponse])
async def get_llamafactory_task_status(
    task_id: str,
    service: LlamaFactoryService = Depends(get_llamafactory_service),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取LlamaFactory任务状态和结果
    """
    try:
        task_schema = await service.get_task_status(task_id, db)
        if not task_schema:
            return BaseResponse(status="error", message=f"Task {task_id} not found", request_id=task_id, error_code="TASK_NOT_FOUND")

        if task_schema.status == "completed":
            if task_schema.result:
                try:
                    # Assuming task_schema.result is compatible with LlamaFactoryResponse
                    return LlamaFactoryResponse(**task_schema.result)
                except Exception as e:
                    logger.error(f"Error parsing completed LlamaFactory task result for {task_id}: {str(e)}")
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
            return BaseResponse(status="unknown", message=f"Task {task_id} has an unknown status: {task_schema.status}", request_id=task_id)
    except Exception as e:
        logger.error(f"Error retrieving LlamaFactory task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks/{task_id}/logs", response_model=Dict[str, Any])
async def get_llamafactory_task_logs(
    task_id: str,
    n: int = Query(100, description="返回的日志行数"),
    service: LlamaFactoryService = Depends(get_llamafactory_service)
):
    """
    获取LlamaFactory任务日志
    """
    try:
        logs = await service.get_task_logs(task_id, n)
        return {"status": "success", "task_id": task_id, "logs": logs}
    except Exception as e:
        logger.error(f"Error getting LlamaFactory task logs for {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tasks/{task_id}/stop", response_model=BaseResponse)
async def stop_llamafactory_task(
    task_id: str,
    service: LlamaFactoryService = Depends(get_llamafactory_service),
    db: AsyncSession = Depends(get_async_db)
):
    """
    停止LlamaFactory任务
    """
    try:
        await service.stop_task(task_id, db)
        return BaseResponse(status="success", message=f"Task {task_id} stopped successfully", request_id=task_id)
    except Exception as e:
        logger.error(f"Error stopping LlamaFactory task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks", response_model=Dict[str, Any])
async def list_llamafactory_tasks(
    limit: int = Query(10, ge=1, description="返回的任务数量限制"),
    status_filter: Optional[str] = Query(None, description="按状态过滤任务 (e.g., 'pending', 'running', 'completed', 'failed')"),
    service: LlamaFactoryService = Depends(get_llamafactory_service),
    db: AsyncSession = Depends(get_async_db)
):
    """
    列出LlamaFactory任务
    """
    try:
        tasks = await service.list_tasks(limit, status_filter, db)
        return {"status": "success", "tasks": tasks}
    except Exception as e:
        logger.error(f"Error listing LlamaFactory tasks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/training", response_model=Dict[str, Any])
async def get_training_templates():
    """
    获取LlamaFactory训练模板
    """
    try:
        templates = llamafactory_config.scan_training_templates()
        return {"status": "success", "templates": templates}
    except Exception as e:
        logger.error(f"Error getting training templates: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/models", response_model=Dict[str, Any])
async def get_model_templates(
    service: LlamaFactoryService = Depends(get_llamafactory_service)
):
    """
    获取LlamaFactory模型模板
    """
    try:
        templates = await service.get_model_templates()
        return {"status": "success", "templates": templates}
    except Exception as e:
        logger.error(f"Error getting model templates: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/datasets/available", response_model=Dict[str, Any])
async def get_available_datasets(
    service: LlamaFactoryService = Depends(get_llamafactory_service)
):
    """
    获取LlamaFactory可用数据集
    """
    try:
        datasets = await service.get_available_datasets()
        return {"status": "success", "datasets": datasets}
    except Exception as e:
        logger.error(f"Error getting available datasets: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/examples/{example_path:path}", response_model=Dict[str, Any])
async def get_example_config(example_path: str):
    """获取示例配置文件"""
    try:
        config_path = llamafactory_config.get_config_path(f"examples/{example_path}")
        if not config_path.exists():
            raise HTTPException(status_code=404, detail="Example not found")
        
        import yaml
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = yaml.safe_load(f)
        
        return {
            "status": "success",
            "example_path": example_path,
            "config_data": config_data
        }
    except Exception as e:
        logger.error(f"Error loading example config: {e}")
        raise HTTPException(status_code=500, detail=str(e))
