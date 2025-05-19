from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Query
from typing import Dict, Any, List, Optional
import logging
import asyncio
import time
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession # Added
from db.database import get_async_db # Added

from core.llamafactory.llamafactory_service import LlamaFactoryService
from core.llamafactory_config import llamafactory_config

router = APIRouter()
logger = logging.getLogger(__name__)

# 全局LlamaFactory服务实例
llamafactory_service = None

# 依赖函数，获取LlamaFactory服务实例
def get_llamafactory_service():
    global llamafactory_service
    if llamafactory_service is None:
        llamafactory_service = LlamaFactoryService()
    return llamafactory_service

# Pydantic 模型定义
class ConfigRequest(BaseModel):
    config_data: Dict[str, Any]
    config_type: str

class TaskRequest(BaseModel):
    task_type: str
    config_name: str
    arguments: Optional[Dict[str, Any]] = None

@router.post("/run", response_model=Dict[str, Any])
async def run_llamafactory(
    request: Dict[str, Any],
    service: LlamaFactoryService = Depends(get_llamafactory_service),
    db: AsyncSession = Depends(get_async_db) # Added db session
):
    """
    运行LlamaFactory操作
    根据operation字段执行不同操作
    """
    try:
        operation = request.get("operation")
        
        if operation == "save_config":
            config_data = request.get("config_data")
            config_type = request.get("config_type")
            if not config_data or not config_type:
                if not config_data or not config_type:
                    raise HTTPException(status_code=400, detail="Missing config_data or config_type")
                return await service.create_config(config_data, config_type) # create_config might not need db
            
            elif operation == "run_task":
                task_type = request.get("task_type")
                config_name = request.get("config_name")
                arguments = request.get("arguments", {})
                project_id = request.get("project_id") # Assuming project_id might be passed in request
                if not task_type or not config_name:
                    raise HTTPException(status_code=400, detail="Missing task_type or config_name")
                return await service.start_task(task_type, config_name, arguments, db, project_id)
            
            elif operation == "get_task_status":
                task_id = request.get("task_id")
                if not task_id:
                    raise HTTPException(status_code=400, detail="Missing task_id")
                return await service.get_task_status(task_id, db)
            
            elif operation == "get_task_logs":
                task_id = request.get("task_id")
                n = request.get("n", 100)
                if not task_id:
                    raise HTTPException(status_code=400, detail="Missing task_id")
                return await service.get_task_logs(task_id, n) # Log reading might not need db directly
            
            elif operation == "stop_task":
                task_id = request.get("task_id")
                if not task_id:
                    raise HTTPException(status_code=400, detail="Missing task_id")
                return await service.stop_task(task_id, db)
            
            elif operation == "list_tasks":
                limit = request.get("limit", 10)
                status_filter = request.get("status") # Renamed to avoid conflict with status var
                return await service.list_tasks(limit, status_filter, db)
        elif operation == "get_training_templates":
            return {
                "status": "success",
                "templates": llamafactory_config.scan_training_templates()
            }
        
        elif operation == "get_model_templates":
            return await service.get_model_templates()
        
        elif operation == "get_available_datasets":
            return await service.get_available_datasets()
        
        else:
            return {"status": "error", "message": f"Unknown operation: {operation}"}
    
    except Exception as e:
        logger.error(f"Error in LlamaFactory operation: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/examples/{example_path:path}")
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
        return {"status": "error", "message": str(e)}
