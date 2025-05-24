import logging
from typing import Dict, Any, List, Optional, Type
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update as sqlalchemy_update, delete as sqlalchemy_delete, func
from sqlalchemy.future import select as future_select # For potential Pydantic v2 compatibility if needed later

# Import SQLAlchemy models
from .models import (
    ProjectConfig, # Renamed from Project
    # Dataset, # Removed as no direct ORM model for Dataset yet
    Task,
    FilteringTask as OrmFilter, # Renamed from Filter
    AssessmentTask as Evaluation, # Renamed from Evaluation
    LLMProvider as OrmModel, # Renamed from Model
    SeedData
)

# Import Pydantic schemas
import schemas # Changed to direct import as python-backend is the top-level when running main.py

logger = logging.getLogger(__name__)

# === Task Operations ===

async def create_task(db: AsyncSession, task_in: schemas.TaskCreate) -> Task: # Changed OrmTask to Task
    """
    Create a new task in the database.
    """
    # Ensure task_in.id is used if provided by the service layer,
    # otherwise the model's default (generate_uuid) will be used if task_in.id is None.
    # The TaskCreate schema should have `id: Optional[str] = Field(default_factory=generate_uuid_str)`
    # or similar to allow id to be passed or auto-generated.
    task_data = task_in.dict(exclude_unset=True) # exclude_unset to respect optional fields not provided
    if 'id' not in task_data and hasattr(task_in, 'id') and task_in.id is not None: # Ensure id from schema is used if present
        task_data['id'] = task_in.id
    
    # If status or progress are not in task_in, they will be None from .dict(), handle defaults explicitly
    if task_data.get('status') is None:
        task_data['status'] = "pending"
    if task_data.get('progress') is None:
        task_data['progress'] = 0.0

    db_task = Task(**task_data)
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task

async def get_task(db: AsyncSession, task_id: str) -> Optional[Task]: # Changed OrmTask to Task
    """
    Get a specific task by its ID.
    """
    result = await db.execute(select(Task).filter(Task.id == task_id)) # Changed OrmTask to Task
    return result.scalar_one_or_none()

async def get_tasks(
    db: AsyncSession, 
    skip: int = 0,
    limit: int = 100,
    task_type: Optional[str] = None,
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    task_type_like: Optional[str] = None # Added new parameter
) -> List[Task]: # Changed OrmTask to Task
    """
    Get a list of tasks, with optional filtering and pagination.
    """
    query = select(Task) # Changed OrmTask to Task
    if task_type:
        query = query.filter(Task.task_type == task_type) # Changed OrmTask to Task
    if task_type_like: # Added condition for task_type_like
        query = query.filter(Task.task_type.like(task_type_like)) # Changed OrmTask to Task
    if status:
        query = query.filter(Task.status == status) # Changed OrmTask to Task
    if project_id:
        query = query.filter(Task.project_id == project_id) # Changed OrmTask to Task
    
    query = query.order_by(Task.created_at.desc()).offset(skip).limit(limit) # Changed OrmTask to Task
    result = await db.execute(query)
    return result.scalars().all()

async def update_task(db: AsyncSession, task_id: str, task_in: schemas.TaskUpdate) -> Optional[Task]: # Changed OrmTask to Task
    """
    Update an existing task.
    """
    db_task = await get_task(db, task_id)
    if not db_task:
        return None
    
    update_data = task_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    
    db.add(db_task) # Add to session to mark as dirty
    await db.commit()
    await db.refresh(db_task)
    return db_task

async def delete_task(db: AsyncSession, task_id: str) -> Optional[Task]: # Changed OrmTask to Task
    """
    Delete a task by its ID.
    """
    db_task = await get_task(db, task_id)
    if not db_task:
        return None
    await db.delete(db_task)
    await db.commit()
    return db_task

# === ProjectConfig Operations (formerly Project) ===

async def create_project_config(db: AsyncSession, project_in: schemas.ProjectCreate) -> ProjectConfig: # Renamed function and return type
    db_project = ProjectConfig(
        id=project_in.id, # Ensure ID is passed if available from schema
        project_name=project_in.name, # Map name to project_name
        description=project_in.description,
        config_data=project_in.config
    )
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

async def get_project_config(db: AsyncSession, project_id: str) -> Optional[ProjectConfig]: # Renamed function and return type
    result = await db.execute(select(ProjectConfig).filter(ProjectConfig.id == project_id))
    return result.scalar_one_or_none()

async def get_project_configs(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[ProjectConfig]: # Renamed function and return type
    query = select(ProjectConfig).order_by(ProjectConfig.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def update_project_config(db: AsyncSession, project_id: str, project_in: schemas.ProjectUpdate) -> Optional[ProjectConfig]: # Renamed function and return type
    db_project = await get_project_config(db, project_id)
    if not db_project:
        return None
    update_data = project_in.dict(exclude_unset=True)
    if 'name' in update_data:
        db_project.project_name = update_data.pop('name') # Map name back to project_name
    if 'config' in update_data:
        db_project.config_data = update_data.pop('config') # Map config back to config_data
    
    for key, value in update_data.items():
        setattr(db_project, key, value)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

async def delete_project_config(db: AsyncSession, project_id: str) -> Optional[ProjectConfig]: # Renamed function and return type
    db_project = await get_project_config(db, project_id)
    if not db_project:
        return None
    await db.delete(db_project) # Cascading delete should handle related items if configured in models
    await db.commit()
    return db_project

# === Dataset Operations (Placeholder - ORM model not yet defined) ===
# If Dataset ORM model is created in models.py, uncomment and implement these.
# For now, these operations are commented out to avoid errors.

# async def create_dataset(db: AsyncSession, dataset_in: schemas.DatasetCreate) -> Dataset:
#     pass # Implement after Dataset ORM model is defined

# async def get_dataset(db: AsyncSession, dataset_id: str) -> Optional[Dataset]:
#     pass # Implement after Dataset ORM model is defined

# async def get_datasets_for_project(db: AsyncSession, project_id: str, skip: int = 0, limit: int = 100) -> List[Dataset]:
#     pass # Implement after Dataset ORM model is defined

# async def update_dataset(db: AsyncSession, dataset_id: str, dataset_in: schemas.DatasetUpdate) -> Optional[Dataset]:
#     pass # Implement after Dataset ORM model is defined

# async def delete_dataset(db: AsyncSession, dataset_id: str) -> Optional[Dataset]:
#     pass # Implement after Dataset ORM model is defined

# === SeedData Operations ===

async def create_seed_data(db: AsyncSession, seed_data_in: schemas.SeedDataCreate) -> SeedData:
    """
    Create a new seed data entry in the database.
    """
    db_seed_data = SeedData(**seed_data_in.dict(exclude_unset=True))
    db.add(db_seed_data)
    await db.commit()
    await db.refresh(db_seed_data)
    return db_seed_data

async def get_seed_data(db: AsyncSession, seed_data_id: str) -> Optional[SeedData]:
    """
    Get a specific seed data entry by its ID.
    """
    result = await db.execute(select(SeedData).filter(SeedData.id == seed_data_id))
    return result.scalar_one_or_none()

async def get_seed_data_list(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    data_type: Optional[str] = None
) -> List[SeedData]:
    """
    Get a list of seed data entries, with optional filtering and pagination.
    """
    query = select(SeedData)
    if status:
        query = query.filter(SeedData.status == status)
    if data_type:
        query = query.filter(SeedData.data_type == data_type)
    
    query = query.order_by(SeedData.upload_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def get_seed_data_count(
    db: AsyncSession,
    status: Optional[str] = None,
    data_type: Optional[str] = None
) -> int:
    """
    Get the total count of seed data entries, with optional filtering.
    """
    query = select(func.count()).select_from(SeedData)
    if status:
        query = query.where(SeedData.status == status)
    if data_type:
        query = query.where(SeedData.data_type == data_type)
    result = await db.execute(query)
    return result.scalar_one()

async def update_seed_data(db: AsyncSession, seed_data_id: str, seed_data_in: schemas.SeedDataUpdate) -> Optional[SeedData]:
    """
    Update an existing seed data entry.
    """
    db_seed_data = await get_seed_data(db, seed_data_id)
    if not db_seed_data:
        return None
    
    update_data = seed_data_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_seed_data, key, value)
    
    db.add(db_seed_data)
    await db.commit()
    await db.refresh(db_seed_data)
    return db_seed_data

async def delete_seed_data(db: AsyncSession, seed_data_id: str) -> Optional[SeedData]:
    """
    Delete a seed data entry by its ID.
    """
    db_seed_data = await get_seed_data(db, seed_data_id)
    if not db_seed_data:
        return None
    await db.delete(db_seed_data)
    await db.commit()
    return db_seed_data

# Placeholder for Filter, Evaluation, Model CRUD operations if needed later
# For now, the old init_db and its related direct sqlite3 operations for config and llm_usage are removed.
# If those tables are still needed, they should be defined as SQLAlchemy models in models.py
# and corresponding CRUD operations and Pydantic schemas should be created.

# The old init_db function is removed as table creation is now handled by
# create_db_and_tables in database.py using SQLAlchemy metadata.

# The old save_config, get_config, record_llm_usage, get_llm_usage_stats functions
# are removed as they operated on tables not defined in the SQLAlchemy models.
# If these functionalities are required, new SQLAlchemy models, Pydantic schemas,
# and corresponding ORM-based operations need to be implemented.
