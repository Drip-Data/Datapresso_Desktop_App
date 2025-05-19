import logging
from typing import Dict, Any, List, Optional, Type
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update as sqlalchemy_update, delete as sqlalchemy_delete, func
from sqlalchemy.future import select as future_select # For potential Pydantic v2 compatibility if needed later

# Import SQLAlchemy models
from .models import Project, Dataset, Task, Filter as OrmFilter, Evaluation, Model as OrmModel 
# Renamed Filter to OrmFilter and Model to OrmModel to avoid conflict with Python built-ins if any in this scope

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

# === Project Operations ===

async def create_project(db: AsyncSession, project_in: schemas.ProjectCreate) -> Project:
    db_project = Project(**project_in.dict())
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

async def get_project(db: AsyncSession, project_id: str) -> Optional[Project]:
    result = await db.execute(select(Project).filter(Project.id == project_id))
    return result.scalar_one_or_none()

async def get_projects(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Project]:
    query = select(Project).order_by(Project.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def update_project(db: AsyncSession, project_id: str, project_in: schemas.ProjectUpdate) -> Optional[Project]:
    db_project = await get_project(db, project_id)
    if not db_project:
        return None
    update_data = project_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

async def delete_project(db: AsyncSession, project_id: str) -> Optional[Project]:
    db_project = await get_project(db, project_id)
    if not db_project:
        return None
    await db.delete(db_project) # Cascading delete should handle related items if configured in models
    await db.commit()
    return db_project

# === Dataset Operations ===

async def create_dataset(db: AsyncSession, dataset_in: schemas.DatasetCreate) -> Dataset:
    db_dataset = Dataset(**dataset_in.dict())
    db.add(db_dataset)
    await db.commit()
    await db.refresh(db_dataset)
    return db_dataset

async def get_dataset(db: AsyncSession, dataset_id: str) -> Optional[Dataset]:
    result = await db.execute(select(Dataset).filter(Dataset.id == dataset_id))
    return result.scalar_one_or_none()

async def get_datasets_for_project(db: AsyncSession, project_id: str, skip: int = 0, limit: int = 100) -> List[Dataset]:
    query = select(Dataset).filter(Dataset.project_id == project_id).order_by(Dataset.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def update_dataset(db: AsyncSession, dataset_id: str, dataset_in: schemas.DatasetUpdate) -> Optional[Dataset]:
    db_dataset = await get_dataset(db, dataset_id)
    if not db_dataset:
        return None
    update_data = dataset_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_dataset, key, value)
    db.add(db_dataset)
    await db.commit()
    await db.refresh(db_dataset)
    return db_dataset

async def delete_dataset(db: AsyncSession, dataset_id: str) -> Optional[Dataset]:
    db_dataset = await get_dataset(db, dataset_id)
    if not db_dataset:
        return None
    await db.delete(db_dataset)
    await db.commit()
    return db_dataset

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
