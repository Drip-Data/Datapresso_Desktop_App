from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_async_db
from schemas import DataFilteringRequest, Task as TaskSchema # Import Task schema for response model
from models.response_models import DataFilteringResponse, BaseResponse # These should ideally also move to schemas.py
from services.data_filtering_service import DataFilteringService
import logging
import time
from typing import Any, Union

router = APIRouter()
logger = logging.getLogger(__name__)

def get_data_filtering_service():
    """依赖注入：获取数据过滤服务实例"""
    return DataFilteringService()

@router.post("/filter", response_model=DataFilteringResponse)
async def filter_data(
    request: DataFilteringRequest,
    service: DataFilteringService = Depends(get_data_filtering_service)
):
    """
    对数据进行过滤处理
    
    - **data**: 需要过滤的数据列表
    - **filter_conditions**: 过滤条件列表
    - **combine_operation**: 条件组合方式('AND'或'OR')
    - **limit**: 结果限制数量(可选)
    - **offset**: 结果偏移量(可选)
    
    返回:
    - **filtered_data**: 过滤后的数据
    - **total_count**: 原始数据总数
    - **filtered_count**: 过滤后的数据数量
    - **filter_summary**: 过滤摘要
    """
    try:
        logger.info(f"Received filter request (id: {request.request_id}) with {len(request.data)} items")
        start_time = time.time()
        
        # 调用服务层处理过滤
        result = await service.filter_data(
            data=request.data,
            filter_conditions=request.filter_conditions,
            combine_operation=request.combine_operation,
            limit=request.limit,
            offset=request.offset,
            order_by=request.order_by,
            order_direction=request.order_direction
        )
        
        execution_time = (time.time() - start_time) * 1000
        logger.info(f"Filter completed (id: {request.request_id}), returning {len(result['filtered_data'])} items")
        
        # 构建响应
        return DataFilteringResponse(
            status="success",
            message="Data filtered successfully",
            request_id=request.request_id,
            execution_time_ms=execution_time,
            filtered_data=result["filtered_data_paginated"],
            total_count=result["original_data_count"],
            filtered_count=result["filtered_count_total"],
            filter_summary=result.get("filter_summary"),
            page_info=result.get("page_info")
        )
    except Exception as e:
        logger.error(f"Error in filter_data (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/async_filter", response_model=BaseResponse)
async def async_filter_data(
    request: DataFilteringRequest, # This should ideally be a schema from schemas.py if defined there
    background_tasks: BackgroundTasks,
    service: DataFilteringService = Depends(get_data_filtering_service),
    db: AsyncSession = Depends(get_async_db) # Added db session
):
    """
    异步执行数据过滤，适用于大数据集
    
    返回任务ID，可通过/task/{task_id}查询结果
    """
    try:
        logger.info(f"Received async filter request (id: {request.request_id}) with {len(request.data)} items")
        
        # 将过滤任务加入后台任务队列
        # Pass the db session to the service method
        task_id = await service.start_async_filter_task(request, db)
        # Pass the db session to the background task execution if the service method requires it.
        # This requires service.execute_async_filter_task to be callable with task_id and db session.
        # One way is to use a wrapper or functools.partial, or ensure the service method can fetch its own session if run in a truly detached background.
        # For now, assuming background_tasks.add_task can handle passing db, or execute_async_filter_task is adapted.
        # A common pattern for background tasks needing a DB session:
        # async def _execute_task_wrapper(task_id_param: str):
        #     async with AsyncSessionLocal() as session: # Get a new session for the background task
        #         await service.execute_async_filter_task(task_id_param, session)
        # background_tasks.add_task(_execute_task_wrapper, task_id)
        # For this diff, to keep it simpler, I'll assume execute_async_filter_task is adapted or doesn't need 'db' passed this way.
        # However, the service method now DOES require `db`. So the background task MUST provide it.

        async def execute_task_with_db_session(tid: str):
            async for session in get_async_db(): # Correct way to use dependency in background
                await service.execute_async_filter_task(tid, session)
                break # Important: break after first iteration for get_async_db

        background_tasks.add_task(execute_task_with_db_session, task_id)
        
        return BaseResponse(
            status="success",
            message=f"Async filter task started with ID: {task_id}",
            request_id=request.request_id
        )
    except Exception as e:
        logger.error(f"Error in async_filter_data (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/task/{task_id}", response_model=Union[TaskSchema, BaseResponse, DataFilteringResponse]) # Use aliased TaskSchema
async def get_filter_task_result(
    task_id: str,
    service: DataFilteringService = Depends(get_data_filtering_service),
    db: AsyncSession = Depends(get_async_db) # Added db session
):
    """获取异步过滤任务结果"""
    try:
        # 获取任务状态和结果
        task_schema = await service.get_task_status(task_id, db) # Pass db session
        
        if not task_schema:
            return BaseResponse(
                status="error",
                message=f"Task {task_id} not found",
                request_id=task_id, # task_id here acts as a reference
                error_code="TASK_NOT_FOUND"
            )

        if task_schema.status == "completed":
            # The result field in schemas.Task is a Dict[str, Any]
            # We need to ensure it matches DataFilteringResponse structure or adapt
            if task_schema.result:
                 # Assuming task_schema.result directly contains the fields for DataFilteringResponse
                 # This might need adjustment based on what's actually stored in task_schema.result
                try:
                    # Let's assume the 'result' field of the task_orm object (now in task_schema.result)
                    # was structured to be compatible with DataFilteringResponse.
                    # The service layer stored a dict in task_orm.result.
                    # If task_schema.result is that dict:
                    task_result_dict = task_schema.result
                    
                    # We need to reconstruct the DataFilteringResponse.
                    # The service.filter_data returned a dict with:
                    # "filtered_data_paginated", "summary", "page_info", "original_data_count", "filtered_count_total"
                    # The async task stored this as `task_result_payload`.
                    # Let's assume task_schema.result IS task_result_payload.
                    
                    return DataFilteringResponse(
                        status="success",
                        message=task_result_dict.get("status_message", "Task completed successfully"),
                        request_id=task_result_dict.get("original_request_id", task_id),
                        execution_time_ms=task_result_dict.get("execution_time_ms"),
                        filtered_data=task_result_dict.get("filtered_data_paginated", []),
                        total_count=task_result_dict.get("original_data_count", 0),
                        filtered_count=task_result_dict.get("filtered_count_total", 0),
                        filter_summary=task_result_dict.get("summary"),
                        page_info=task_result_dict.get("page_info")
                    )
                except Exception as e:
                    logger.error(f"Error parsing completed task result for {task_id}: {str(e)}")
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
        else: # Should not happen if status is one of the above
             return BaseResponse(
                status="unknown",
                message=f"Task {task_id} has an unknown status: {task_schema.status}",
                request_id=task_id
            )
    except Exception as e:
        logger.error(f"Error retrieving task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
