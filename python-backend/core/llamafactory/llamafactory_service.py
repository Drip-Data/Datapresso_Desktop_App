import os
import sys
import json
import yaml
import asyncio
import subprocess
import logging
import time
import uuid
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Union, Tuple
from datetime import datetime

# Database and schema imports
from sqlalchemy.ext.asyncio import AsyncSession
import schemas # Assuming schemas.py is accessible
from db import operations as crud # Assuming db operations are accessible

from core.llamafactory_config import llamafactory_config

# 配置日志
logger = logging.getLogger(__name__)

class LlamaFactoryTask:
    """LlamaFactory任务类，用于存储任务信息"""
    
    def __init__(
        self,
        task_id: str,
        task_type: str,
        config_name: str,
        config_path: str,
        log_path: str,
        output_dir: str,
        arguments: Dict[str, Any] = None
    ):
        self.task_id = task_id
        self.task_type = task_type
        self.config_name = config_name
        self.config_path = config_path
        self.log_path = log_path
        self.output_dir = output_dir
        self.arguments = arguments or {}
        
        self.status = "pending"
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.process: Optional[asyncio.subprocess.Process] = None # Corrected type
        self.progress = 0.0 # Store as 0.0 to 1.0 for consistency with DB
        self.current_epoch = 0
        self.total_epochs = 0
        self.current_step = 0
        self.total_steps = 0
        self.metrics: Dict[str, Any] = {}
        self.error_message: Optional[str] = None
        self.last_progress_update_time: Optional[float] = None


    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "task_id": self.task_id,
            "task_type": self.task_type,
            "config_name": self.config_name,
            "status": self.status,
            "start_time": self.start_time.timestamp() if self.start_time else None,
            "end_time": self.end_time.timestamp() if self.end_time else None,
            "progress": self.progress, # This is 0-1 from LlamaFactoryTask internal state
            "current_epoch": self.current_epoch,
            "total_epochs": self.total_epochs,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "metrics": self.metrics,
            "error_message": self.error_message,
            "log_path": self.log_path,
            "output_dir": self.output_dir
        }

class LlamaFactoryService:
    """LlamaFactory服务类"""
    
    def __init__(self):
        """初始化服务"""
        llamafactory_config.add_to_python_path()
        self.tasks: Dict[str, LlamaFactoryTask] = {}
        logger.info("LlamaFactoryService initialized. Call load_existing_tasks_async if DB session is available for task recovery.")

    async def load_existing_tasks_async(self, db: AsyncSession):
        """从数据库加载状态为 'pending' 或 'running' 的 LlamaFactory 任务"""
        logger.info("Attempting to load existing LlamaFactory tasks from DB...")
        try:
            pending_tasks_orm = await crud.get_tasks(db, status="pending", task_type_like="llamafactory_%", limit=1000)
            running_tasks_orm = await crud.get_tasks(db, status="running", task_type_like="llamafactory_%", limit=1000)
            
            loaded_count = 0
            for task_orm in pending_tasks_orm + running_tasks_orm:
                if task_orm.id not in self.tasks and task_orm.parameters:
                    params = task_orm.parameters
                    task = LlamaFactoryTask(
                        task_id=task_orm.id,
                        task_type=params.get("task_type", task_orm.task_type.replace("llamafactory_", "")),
                        config_name=params.get("config_name", "unknown_config"),
                        config_path=params.get("config_path", ""),
                        log_path=params.get("log_path", llamafactory_config.get_log_path(task_orm.id).as_posix()),
                        output_dir=params.get("output_dir", llamafactory_config.get_output_path(task_orm.id).as_posix()),
                        arguments=params.get("arguments", {})
                    )
                    task.status = task_orm.status
                    task.start_time = task_orm.started_at
                    task.progress = task_orm.progress or 0.0 # DB stores 0-1
                    
                    if task.status == "running":
                        # For 'running' tasks, we can't recover the process. Mark as interrupted/unknown.
                        # Or, for simplicity, let the poller on frontend decide next steps based on this status.
                        # Alternatively, attempt to re-queue or mark as needing attention.
                        logger.warning(f"Task {task_orm.id} was 'running'. Its process is lost. Status remains '{task.status}' in memory.")
                        # We could change status to 'interrupted' here and in DB.
                        # await crud.update_task(db, task_orm.id, schemas.TaskUpdate(status="interrupted", error="Service restarted while task was running."))
                    
                    self.tasks[task_orm.id] = task
                    loaded_count += 1
            if loaded_count > 0:
                logger.info(f"Loaded {loaded_count} existing LlamaFactory tasks into memory.")
        except Exception as e:
            logger.error(f"Error loading existing LlamaFactory tasks: {e}", exc_info=True)
    
    async def create_config(
        self, 
        config_data: Dict[str, Any], 
        config_type: str
    ) -> Dict[str, Any]:
        try:
            timestamp = int(time.time())
            config_name = f"{config_type}_{timestamp}"
            config_path = llamafactory_config.get_config_path(config_name)
            
            if 'output_dir' not in config_data:
                config_data['output_dir'] = str(llamafactory_config.output_dir / config_name)
            
            with open(config_path, 'w', encoding='utf-8') as f:
                yaml.dump(config_data, f, default_flow_style=False)
            
            logger.info(f"创建配置文件: {config_path}")
            return {"status": "success", "config_name": config_name, "config_path": str(config_path), "output_dir": config_data.get('output_dir')}
        except Exception as e:
            logger.error(f"创建配置文件失败: {str(e)}")
            return {"status": "error", "message": f"创建配置文件失败: {str(e)}"}
    
    async def start_task(
        self, 
        task_type: str, 
        config_name: str,
        arguments: Dict[str, Any] = None,
        db: Optional[AsyncSession] = None,
        project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        try:
            config_path = llamafactory_config.get_config_path(config_name)
            if not config_path.exists():
                return {"status": "error", "message": f"配置文件不存在: {config_name}"}
            
            task_id = f"{task_type}_{int(time.time())}_{uuid.uuid4().hex[:6]}"
            output_dir = llamafactory_config.get_output_path(task_id)
            log_path = llamafactory_config.get_log_path(task_id)
            
            task = LlamaFactoryTask(
                task_id=task_id, task_type=task_type, config_name=config_name,
                config_path=str(config_path), log_path=str(log_path),
                output_dir=str(output_dir), arguments=arguments
            )
            self.tasks[task_id] = task

            if db:
                task_params_for_db = {
                    "task_type": task.task_type, "config_name": task.config_name,
                    "config_path": task.config_path, "log_path": task.log_path,
                    "output_dir": task.output_dir, "arguments": task.arguments,
                    "raw_request": arguments 
                }
                task_create_schema = schemas.TaskCreate(
                    id=task_id, name=f"LlamaFactory-{task.task_type}-{task.config_name[:20]}-{task_id[:8]}",
                    task_type=f"llamafactory_{task.task_type}", status="pending",
                    parameters=task_params_for_db, project_id=project_id
                )
                try:
                    await crud.create_task(db=db, task_in=task_create_schema)
                    logger.info(f"LlamaFactory task {task_id} saved to DB.")
                except Exception as db_exc:
                    logger.error(f"Failed to save LlamaFactory task {task_id} to DB: {db_exc}")
            
            asyncio.create_task(self._run_task(task, db))
            return {"status": "success", "task_id": task_id, "message": f"任务已启动: {task_id}"}
        except Exception as e:
            logger.error(f"启动任务失败: {str(e)}")
            return {"status": "error", "message": f"启动任务失败: {str(e)}"}
    
    async def _run_task(self, task: LlamaFactoryTask, db: Optional[AsyncSession] = None):
        try:
            task.status = "running"
            task.start_time = datetime.now()
            task.last_progress_update_time = time.time() 
            if db:
                try:
                    await crud.update_task(db, task.task_id, schemas.TaskUpdate(status="running", started_at=task.start_time, progress=0.0))
                except Exception as db_exc:
                    logger.error(f"Failed to update task {task.task_id} status to running in DB: {db_exc}")

            cmd = ["llamafactory-cli", task.task_type, task.config_path]
            for key, value in (task.arguments or {}).items():
                if value is True: cmd.append(f"--{key}")
                elif value is not False and value is not None: cmd.append(f"--{key}={value}")
            
            logger.info(f"执行命令: {' '.join(cmd)}")
            
            with open(task.log_path, 'w', encoding='utf-8') as log_file:
                task.process = await asyncio.create_subprocess_exec(
                    *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT, env=os.environ
                )
                
                while True:
                    if task.process.stdout is None: break
                    line = await task.process.stdout.readline()
                    if not line: break
                    
                    line_text = line.decode('utf-8', errors='replace')
                    log_file.write(line_text)
                    log_file.flush()
                    
                    self._parse_progress(task, line_text, db) # Pass db to _parse_progress
                
                await task.process.wait()
            
            task.end_time = datetime.now()
            final_status = "unknown"
            if task.process.returncode == 0:
                task.status = "completed"
                final_status = "completed"
                task.progress = 1.0 # Ensure progress is 1.0 on completion
                logger.info(f"任务完成: {task.task_id}")
            else:
                task.status = "failed"
                final_status = "failed"
                task.error_message = f"进程退出代码: {task.process.returncode}"
                logger.error(f"任务失败: {task.task_id}, 退出代码: {task.process.returncode}")
            
            if db:
                try:
                    task_update_schema = schemas.TaskUpdate(
                        status=final_status, completed_at=task.end_time, 
                        progress=task.progress, # Use the final progress from LlamaFactoryTask
                        result=task.metrics, 
                        error=task.error_message if final_status == "failed" else None
                    )
                    await crud.update_task(db, task.task_id, task_update_schema)
                except Exception as db_exc:
                    logger.error(f"Failed to update task {task.task_id} final status in DB: {db_exc}")
        
        except Exception as e:
            task.status = "failed"
            task.error_message = str(e)
            task.end_time = datetime.now()
            logger.error(f"任务执行异常: {task.task_id}, 错误: {str(e)}", exc_info=True)
            if db:
                try:
                    await crud.update_task(db, task.task_id, schemas.TaskUpdate(status="failed", error=str(e), completed_at=task.end_time))
                except Exception as db_exc:
                    logger.error(f"Failed to update task {task.task_id} status to failed (exception) in DB: {db_exc}")
        finally:
            task.process = None
    
    def _parse_progress(self, task: LlamaFactoryTask, line: str, db: Optional[AsyncSession] = None): # Add db
        try:
            epoch_match = re.search(r"Epoch (\d+)/(\d+)", line)
            if epoch_match:
                task.current_epoch = int(epoch_match.group(1))
                task.total_epochs = int(epoch_match.group(2))
                if task.total_epochs > 0:
                    base_progress = (task.current_epoch - 1) / task.total_epochs
                    if task.total_steps > 0 and task.current_step > 0 : # Check current_step to avoid division by zero if total_steps is known but current_step is not yet.
                        step_progress_in_epoch = (task.current_step / task.total_steps)
                        task.progress = min(0.99, base_progress + (step_progress_in_epoch / task.total_epochs) )
                    else:
                        task.progress = min(0.99, base_progress)
            
            step_match = re.search(r"(\d+)/(\d+) \[", line) # Matches "step/total_steps ["
            if step_match:
                current_step_in_epoch = int(step_match.group(1))
                total_steps_in_epoch = int(step_match.group(2))
                task.current_step = current_step_in_epoch # This is step within current epoch
                task.total_steps = total_steps_in_epoch # This is total steps for current epoch

                if task.total_epochs > 0: # If we know total epochs
                    base_progress = (task.current_epoch -1) / task.total_epochs if task.current_epoch > 0 else 0
                    epoch_fraction = 1 / task.total_epochs
                    task.progress = min(0.99, base_progress + (current_step_in_epoch / total_steps_in_epoch) * epoch_fraction)
                elif total_steps_in_epoch > 0: # If only steps are available (e.g. single epoch training)
                    task.progress = min(0.99, current_step_in_epoch / total_steps_in_epoch)

            percent_match = re.search(r"(\d+)%", line) # Matches "XX%"
            if percent_match and not step_match : # Only use if step_match didn't provide more precise info
                # This is a general percentage, could be overall or epoch.
                # We assume it's overall if other info is missing.
                # If we have epoch info, this might be epoch percentage.
                # Let's assume it's overall if total_epochs is not set.
                if not task.total_epochs and task.progress < (int(percent_match.group(1))/100):
                     task.progress = min(0.99, int(percent_match.group(1)) / 100.0)


            loss_match = re.search(r"loss=([0-9.]+)", line, re.IGNORECASE)
            if loss_match:
                loss = float(loss_match.group(1))
                if 'loss' not in task.metrics: task.metrics['loss'] = []
                task.metrics['loss'].append(loss)
            
            lr_match = re.search(r"lr=([0-9.e\-]+)", line, re.IGNORECASE)
            if lr_match:
                lr = float(lr_match.group(1))
                if 'learning_rate' not in task.metrics: task.metrics['learning_rate'] = []
                task.metrics['learning_rate'].append(lr)
            
            if "Training completed." in line or "train_model - Training completed." in line: # LlamaFactory specific log
                task.progress = 1.0
            
            if db and task.last_progress_update_time and (time.time() - task.last_progress_update_time > 30 or task.progress == 1.0):
                try:
                    asyncio.create_task(crud.update_task(db, task.task_id, schemas.TaskUpdate(progress=task.progress)))
                    task.last_progress_update_time = time.time()
                except Exception as db_exc:
                    logger.warning(f"Failed to update task {task.task_id} progress in DB during parsing: {db_exc}")
        except Exception as e:
            logger.error(f"Error parsing progress from line: '{line[:100]}...': {str(e)}")

    async def stop_task(self, task_id: str, db: Optional[AsyncSession] = None) -> Dict[str, Any]:
        if task_id not in self.tasks:
            return {"status": "error", "message": f"任务不存在: {task_id}"}
        task = self.tasks[task_id]
        if task.status != "running" or task.process is None:
            return {"status": "error", "message": f"任务未在运行: {task_id}"}
        try:
            task.process.terminate()
            try:
                await asyncio.wait_for(task.process.wait(), timeout=10.0)
            except asyncio.TimeoutError:
                task.process.kill()
            
            task.status = "stopped"
            task.end_time = datetime.now()
            if db:
                try:
                    await crud.update_task(db, task.task_id, schemas.TaskUpdate(status="stopped", completed_at=task.end_time, progress=task.progress))
                except Exception as db_exc:
                    logger.error(f"Failed to update task {task.task_id} status to stopped in DB: {db_exc}")
            return {"status": "success", "message": f"任务已停止: {task_id}"}
        except Exception as e:
            logger.error(f"停止任务失败: {task_id}, 错误: {str(e)}")
            return {"status": "error", "message": f"停止任务失败: {str(e)}"}
    
    async def get_task_status(self, task_id: str, db: Optional[AsyncSession] = None) -> Dict[str, Any]:
        if db:
            db_task_orm = await crud.get_task(db, task_id)
            if db_task_orm:
                task_schema = schemas.Task.from_orm(db_task_orm)
                task_dict = task_schema.dict()
                if task_id in self.tasks: # If task is active in memory, merge live info
                    mem_task = self.tasks[task_id]
                    task_dict["status"] = mem_task.status # Prefer in-memory status if running
                    task_dict["progress"] = mem_task.progress 
                    task_dict["current_epoch"] = mem_task.current_epoch
                    task_dict["total_epochs"] = mem_task.total_epochs
                    task_dict["current_step"] = mem_task.current_step
                    task_dict["total_steps"] = mem_task.total_steps
                    task_dict["metrics"] = mem_task.metrics
                return {"status": "success", "task": task_dict}

        if task_id in self.tasks:
            return {"status": "success", "task": self.tasks[task_id].to_dict()}
            
        return {"status": "error", "message": f"任务 {task_id} 不存在"}
    
    async def get_task_logs(self, task_id: str, n: int = 100) -> Dict[str, Any]:
        if task_id not in self.tasks: # Check in-memory first as log path is from LlamaFactoryTask
            # Could also try to construct log_path from task_id if task is only in DB
            db_task_orm = None
            # Placeholder: if db session were available here, we could try:
            # async with get_async_db_contextmanager() as db_session: # This is not ideal here
            #    db_task_orm = await crud.get_task(db_session, task_id)
            # if db_task_orm and db_task_orm.parameters and "log_path" in db_task_orm.parameters:
            #    log_path = db_task_orm.parameters["log_path"]
            # else:
            return {"status": "error", "message": f"任务 {task_id} 不在内存中，无法确定日志路径。"}

        task = self.tasks[task_id]
        log_path = task.log_path
        
        if not os.path.exists(log_path):
            return {"status": "error", "message": f"日志文件不存在: {log_path}"}
        
        try:
            with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
                lines = f.readlines()
                if len(lines) > n: lines = lines[-n:]
                return {"status": "success", "logs": [line.strip() for line in lines], "total_lines": len(lines)}
        except Exception as e:
            logger.error(f"读取日志失败: {task_id}, 错误: {str(e)}")
            return {"status": "error", "message": f"读取日志失败: {str(e)}"}
    
    async def list_tasks(self, limit: int = 10, status: Optional[str] = None, db: Optional[AsyncSession] = None) -> Dict[str, Any]:
        if db:
            try:
                db_tasks_orm = await crud.get_tasks(db, limit=limit, status=status, task_type_like="llamafactory_%")
                task_list_from_db = [schemas.Task.from_orm(task).dict() for task in db_tasks_orm]
                
                # Merge with in-memory tasks for more current status if running
                merged_tasks = []
                db_task_ids = {t['id'] for t in task_list_from_db}

                for db_task_dict in task_list_from_db:
                    if db_task_dict['id'] in self.tasks:
                        mem_task_dict = self.tasks[db_task_dict['id']].to_dict()
                        # Prefer in-memory for dynamic fields if task is active
                        if mem_task_dict['status'] in ["running", "pending"]:
                             merged_tasks.append(mem_task_dict)
                        else:
                             merged_tasks.append(db_task_dict)
                    else:
                        merged_tasks.append(db_task_dict)
                
                # Add in-memory tasks that might not be in the current DB query (e.g. just created)
                for mem_task_id, mem_task_obj in self.tasks.items():
                    if mem_task_id not in db_task_ids and mem_task_obj.task_type.startswith("llamafactory"):
                        if not status or mem_task_obj.status == status:
                             merged_tasks.append(mem_task_obj.to_dict())
                
                # Sort and limit again after merge
                merged_tasks.sort(key=lambda x: x.get('start_time') or x.get('created_at', 0) or 0, reverse=True)
                if limit > 0:
                    merged_tasks = merged_tasks[:limit]

                # Get total count from DB
                # total_count = await crud.count_tasks(db, task_type_like="llamafactory_%", status=status) # Assuming crud.count_tasks exists
                # For now, use a placeholder for total count from DB
                total_db_count_query = select(func.count(crud.TaskOrmModel.id)).filter(crud.TaskOrmModel.task_type.like("llamafactory_%"))
                if status:
                    total_db_count_query = total_db_count_query.filter(crud.TaskOrmModel.status == status)
                total_count_res = await db.execute(total_db_count_query)
                total_count = total_count_res.scalar_one_or_none() or 0

                return {"status": "success", "tasks": merged_tasks, "total": total_count }
            except Exception as e:
                logger.error(f"从数据库列出LlamaFactory任务失败: {str(e)}")
        
        # Fallback to in-memory listing
        try:
            tasks_in_memory = [task for task in self.tasks.values() if task.task_type.startswith("llamafactory")] # Ensure it's a llamafactory task
            if status: tasks_in_memory = [task for task in tasks_in_memory if task.status == status]
            tasks_in_memory.sort(key=lambda x: x.start_time if x.start_time else datetime.min, reverse=True)
            if limit > 0: tasks_in_memory = tasks_in_memory[:limit]
            task_list_dicts = [task.to_dict() for task in tasks_in_memory]
            return {"status": "success", "tasks": task_list_dicts, "total_in_memory": len([t for t in self.tasks.values() if t.task_type.startswith("llamafactory")])}
        except Exception as e:
            logger.error(f"列出内存中LlamaFactory任务失败: {str(e)}")
            return {"status": "error", "message": f"列出任务失败: {str(e)}"}

    async def get_model_templates(self) -> Dict[str, Any]:
        """获取可用的模型配置模板"""
        try:
            templates = llamafactory_config.scan_training_templates()
            return {"status": "success", "templates": templates}
        except Exception as e:
            logger.error(f"获取模型模板失败: {e}", exc_info=True)
            return {"status": "error", "message": f"获取模型模板失败: {str(e)}"}

    async def get_available_datasets(self) -> Dict[str, Any]:
        """获取LlamaFactory已知的数据集"""
        # This would typically involve LlamaFactory's internal dataset registration or scanning a predefined data directory.
        # For now, returning a placeholder.
        # This could also be populated from llamafactory_config.data_dir
        datasets = []
        try:
            data_example_dir = llamafactory_config.llamafactory_dir / "data" # Example path
            if data_example_dir.exists():
                for item in data_example_dir.iterdir():
                    if item.is_file() and (item.name.endswith(".json") or item.name.endswith(".jsonl")):
                        datasets.append({"id": item.stem, "name": item.name, "path": str(item)})
                    elif item.is_dir(): # If datasets are in subdirectories
                        datasets.append({"id": item.name, "name": item.name, "path": str(item), "type": "folder"})
            return {"status": "success", "datasets": datasets}
        except Exception as e:
            logger.error(f"获取可用数据集失败: {e}", exc_info=True)
            return {"status": "error", "message": f"获取可用数据集失败: {str(e)}"}

# 创建全局配置实例 - 确保 LlamaFactoryConfig 实例化以准备目录等。
# llamafactory_config 实例已在 core.llamafactory_config 中创建并导出
