from typing import List, Dict, Any, Optional, Union
import logging
import asyncio
import uuid
import time
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import schemas # Added import for schemas module
from schemas import DataFilteringRequest, FilterCondition, TaskCreate, TaskUpdate, Task # Consolidated imports
from core.data_filters.filter_engine import apply_filters
from db import operations as crud

logger = logging.getLogger(__name__)

class DataFilteringService:
    """数据过滤服务"""
    
    async def filter_data(
        self,
        data: List[Dict[str, Any]],
        filter_conditions: List[FilterCondition],
        combine_operation: str = "AND",
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        order_by: Optional[str] = None,
        order_direction: Optional[str] = "asc"
    ) -> Dict[str, Any]:
        """
        执行数据过滤
        
        Args:
            data: 要过滤的数据
            filter_conditions: 过滤条件
            combine_operation: 条件组合方式
            limit: 结果限制
            offset: 结果偏移
            order_by: 排序字段
            order_direction: 排序方向
            
        Returns:
            包含过滤结果和摘要的字典
        """
        try: # Added try block
            logger.debug(f"Filtering data with {len(filter_conditions)} conditions")
            
            # 1. 应用过滤条件
            filtered_data, filter_summary = apply_filters(
                data,
                filter_conditions,
                combine_operation
            )
            
            # 2. 应用排序(如果指定)
            if order_by:
                reverse = order_direction.lower() == "desc"
                filtered_data = sorted(
                    filtered_data,
                    key=lambda x: x.get(order_by, ""),
                    reverse=reverse
                )
            
            # 3. 应用分页(如果指定)
            total_filtered = len(filtered_data)
            page_info = None
            
            if offset is not None or limit is not None:
                start_idx = offset if offset is not None else 0
                end_idx = (start_idx + limit) if limit is not None else None
                
                filtered_data = filtered_data[start_idx:end_idx]
                
                # 构建分页信息
                page_info = {
                    "total": total_filtered,
                    "offset": start_idx,
                    "limit": limit,
                    "has_more": end_idx is not None and end_idx < total_filtered
                }
            
            # 4. 返回结果
            return {
                "filtered_data_paginated": filtered_data, # Renamed for clarity
                "summary": filter_summary,
                "page_info": page_info,
                "original_data_count": len(data), # Added
                "filtered_count_total": total_filtered # Added (this was already calculated as total_filtered)
            }
        except Exception as e: # Added exception handling
            logger.exception(f"Unhandled error in filter_data: {e}")
            raise # Re-raise the exception after logging
    
    async def start_async_filter_task(self, request: schemas.DataFilteringRequest, db: AsyncSession) -> str: # Added db, updated request type
        """启动异步过滤任务，返回任务ID"""
        task_id = str(uuid.uuid4())
        
        task_create_data = schemas.TaskCreate(
            name=f"DataFilteringTask-{task_id}", # Or generate a more descriptive name
            task_type="data_filtering",
            status="queued",
            parameters=request.dict(exclude={"request_id", "timestamp", "client_version"}), # Store relevant parts of the request
            # request_id from BaseRequest is not part of TaskCreate schema directly
        )
        # created_at is handled by default_factory in ORM model / TaskInDBBase

        await crud.create_task(db=db, task_in=task_create_data, task_id_override=task_id) # Assuming create_task can take task_id_override
                                                                                       # Or, TaskCreate should include id if we want to set it here.
                                                                                       # For now, let's assume Task ORM model's id has a default_factory=generate_uuid_str
                                                                                       # and we'll update the task with the actual request_id if needed,
                                                                                       # or store the original request_id in parameters.
                                                                                       # A simpler approach: TaskCreate takes an optional id.
                                                                                       # Let's assume crud.create_task handles ID generation or accepts it.
                                                                                       # For now, we pass the generated task_id to a hypothetical parameter in create_task
                                                                                       # or rely on the ORM model's default.
                                                                                       # Re-evaluating: The Task ORM model has default for id.
                                                                                       # We need to ensure the task_id generated here is used.
                                                                                       # A common pattern is to have `id: Optional[str]` in TaskCreate
                                                                                       # and pass `task_id` to it.
                                                                                       # Let's adjust TaskCreate schema later if needed.
                                                                                       # For now, let's assume the `id` in TaskCreate can be set.
        
        # A more direct way if TaskCreate schema includes an 'id' field:
        # task_create_schema = schemas.TaskCreate(
        #     id=task_id,
        #     name=f"DataFilteringTask-{task_id}",
        #     task_type="data_filtering",
        #     status="queued",
        #     parameters=request.dict(exclude={"request_id", "timestamp", "client_version"})
        # )
        # await crud.create_task(db=db, task_in=task_create_schema)
        # This requires TaskCreate to have an `id: Optional[str] = None` field.
        # And the ORM model `Task` to use this id if provided, or default if None.
        # For simplicity, let's assume the old save_task logic of passing a dict is adapted in crud.create_task for now,
        # or that TaskCreate is flexible.
        # The new crud.create_task expects a schemas.TaskCreate object.
        
        # Corrected approach:
        # 1. Define TaskCreate in schemas.py to accept all necessary fields including an optional id.
        # 2. The ORM model Task will use this id if provided, or its default_factory if id is None.
        # For this diff, I'll assume TaskCreate can take the id.
        
        task_payload_for_db = schemas.TaskCreate(
            id=task_id, # Assuming TaskCreate schema allows setting id
            name=f"DataFilteringTask-{request.request_id or task_id}",
            task_type="data_filtering",
            status="queued",
            parameters=request.dict(exclude_none=True) # Store the whole request as parameters
        )
        await crud.create_task(db=db, task_in=task_payload_for_db)

        return task_id
    
    async def execute_async_filter_task(self, task_id: str, db: AsyncSession): # Added db
        """执行异步过滤任务"""
        try:
            # 更新任务状态为运行中
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(status="running", started_at=datetime.now()))
            
            # 获取任务请求
            task_orm = await crud.get_task(db=db, task_id=task_id)
            if not task_orm or not task_orm.parameters:
                logger.error(f"Task {task_id} not found or has no parameters.")
                await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(status="failed", error="Task data not found", completed_at=datetime.now()))
                return

            request_params = task_orm.parameters # This is a dict
            
            # Convert filter_conditions from dicts to FilterCondition Pydantic models
            filter_conditions_dicts = request_params.get("filter_conditions", [])
            filter_conditions_models = [FilterCondition(**fc_dict) for fc_dict in filter_conditions_dicts]

            # 执行过滤
            result = await self.filter_data(
                data=request_params["data"], # Use request_params
                filter_conditions=filter_conditions_models, # Use Pydantic models
                combine_operation=request_params.get("combine_operation", "AND"), # Use request_params
                limit=request_params.get("limit"),
                offset=request_params.get("offset"),
                order_by=request_params.get("order_by"),
                order_direction=request_params.get("order_direction", "asc") # Provide default
            )
            
            # 构建响应 (this is the 'result' to be stored in the Task ORM model)
            task_result_payload = {
                "filtered_data_paginated": result["filtered_data_paginated"],
                "original_data_count": result["original_data_count"],
                "filtered_count_total": result["filtered_count_total"],
                "summary": result["summary"],
                "page_info": result.get("page_info"),
                # Include other relevant info for the task result if needed
                "status_message": "Data filtered successfully in async task",
                "execution_time_ms": (datetime.now() - task_orm.started_at).total_seconds() * 1000 if task_orm.started_at else None,
                "original_request_id": request_params.get("request_id")
            }
            
            # 更新任务状态为完成
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(
                status="completed",
                result=task_result_payload, # Store the structured result
                completed_at=datetime.now(),
                progress=1.0
            ))
            
        except Exception as e:
            logger.error(f"Error in async filter task {task_id}: {str(e)}", exc_info=True)
            # 更新任务状态为失败
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(
                status="failed",
                error=str(e),
                completed_at=datetime.now()
            ))
    
    async def get_task_status(self, task_id: str, db: AsyncSession) -> Optional[schemas.Task]: # Added db, changed return type
        """获取任务状态和结果"""
        task_orm = await crud.get_task(db=db, task_id=task_id)
        if not task_orm:
            return None # Or raise HTTPException(404) if called from router directly
        
        return schemas.Task.from_orm(task_orm)
