import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

# Assuming schemas.py is in the python-backend directory and accessible.
# Adjust import paths if your project structure is different or if you use a src layout.
from schemas import FilterCondition, FilterOperation, DataFilteringRequest, TaskCreate, TaskUpdate, Task as TaskSchema
from services.data_filtering_service import DataFilteringService
from core.data_filters.filter_engine import apply_filters # For mocking its return value
from db import operations as crud # For mocking db operations
from db.models import Task as TaskOrmModel # For creating mock ORM objects

# Sample data for testing
SAMPLE_DATA = [
    {"id": 1, "name": "Alice", "age": 30, "city": "New York"},
    {"id": 2, "name": "Bob", "age": 24, "city": "Los Angeles"},
    {"id": 3, "name": "Charlie", "age": 30, "city": "New York"},
    {"id": 4, "name": "David", "age": 45, "city": "Chicago"},
]

@pytest.fixture
def service() -> DataFilteringService:
    return DataFilteringService()

@pytest.fixture
def mock_db_session() -> AsyncMock:
    return AsyncMock(spec=AsyncSession)

# Test filter_data method
@pytest.mark.asyncio
@patch('services.data_filtering_service.apply_filters') # Mock the core engine
async def test_filter_data_simple_filter(mock_apply_filters: MagicMock, service: DataFilteringService):
    mock_apply_filters.return_value = (
        [SAMPLE_DATA[0], SAMPLE_DATA[2]], # filtered_data
        {"summary_info": "some_summary"} # filter_summary
    )
    
    conditions = [FilterCondition(field="age", operation=FilterOperation.EQUALS, value=30)]
    
    result = await service.filter_data(
        data=SAMPLE_DATA,
        filter_conditions=conditions,
        combine_operation="AND"
    )
    
    mock_apply_filters.assert_called_once_with(SAMPLE_DATA, conditions, "AND")
    assert len(result["filtered_data_paginated"]) == 2
    assert result["original_data_count"] == 4
    assert result["filtered_count_total"] == 2
    assert result["summary"] == {"summary_info": "some_summary"}
    assert result["page_info"] is None # No pagination params provided

@pytest.mark.asyncio
@patch('services.data_filtering_service.apply_filters')
async def test_filter_data_with_pagination_and_ordering(mock_apply_filters: MagicMock, service: DataFilteringService):
    # Mock apply_filters to return all data initially, so sorting and pagination can be tested
    # Let's say filtering by city "New York" initially returns Alice and Charlie
    new_yorkers = [SAMPLE_DATA[0], SAMPLE_DATA[2]] # Alice, Charlie (both age 30)
    
    # If we sort by name desc, Charlie comes before Alice
    # Charlie (id 3), Alice (id 1)
    # If limit 1, offset 0 -> Charlie
    # If limit 1, offset 1 -> Alice
    
    mock_apply_filters.return_value = (new_yorkers, {"summary": "filtered by city"})

    conditions = [FilterCondition(field="city", operation=FilterOperation.EQUALS, value="New York")]
    
    # Test with ordering and pagination
    result = await service.filter_data(
        data=SAMPLE_DATA, # Original data passed to service
        filter_conditions=conditions,
        combine_operation="AND",
        limit=1,
        offset=0,
        order_by="name",
        order_direction="desc" # Charlie (name) > Alice (name)
    )
    
    mock_apply_filters.assert_called_once() # Called with SAMPLE_DATA, conditions, "AND"
    
    # apply_filters returns Alice, Charlie.
    # Sorted by name desc: Charlie, Alice
    # Paginated (limit 1, offset 0): Charlie
    assert len(result["filtered_data_paginated"]) == 1
    assert result["filtered_data_paginated"][0]["name"] == "Charlie"
    assert result["original_data_count"] == 4 # Original count before any filtering by apply_filters
    assert result["filtered_count_total"] == 2 # Count after apply_filters
    assert result["page_info"] == {"total": 2, "offset": 0, "limit": 1, "has_more": True}

    # Test another page
    # mock_apply_filters needs to be reset or re-mocked if called multiple times in one test,
    # or make the test more granular. For now, assume it's called once per service.filter_data call.
    mock_apply_filters.reset_mock()
    mock_apply_filters.return_value = (new_yorkers, {"summary": "filtered by city"})
    result_page2 = await service.filter_data(
        data=SAMPLE_DATA,
        filter_conditions=conditions,
        combine_operation="AND",
        limit=1,
        offset=1,
        order_by="name",
        order_direction="desc"
    )
    assert len(result_page2["filtered_data_paginated"]) == 1
    assert result_page2["filtered_data_paginated"][0]["name"] == "Alice"
    assert result_page2["page_info"] == {"total": 2, "offset": 1, "limit": 1, "has_more": False}


# Test start_async_filter_task
@pytest.mark.asyncio
@patch('services.data_filtering_service.crud.create_task')
async def test_start_async_filter_task(mock_create_task: AsyncMock, service: DataFilteringService, mock_db_session: AsyncMock):
    request_data = DataFilteringRequest(
        request_id="test-req-id", # Pydantic v2 might need default_factory for BaseRequest fields
        data=SAMPLE_DATA,
        filter_conditions=[FilterCondition(field="age", operation=FilterOperation.EQUALS, value=30)]
    )
    
    # Mock create_task to simulate successful DB operation
    # mock_create_task.return_value = TaskOrmModel(id="generated-task-id", name="DataFilteringTask-test-req-id", task_type="data_filtering", status="queued")
    # create_task itself is async, so its return_value should be awaitable if it returns an ORM model directly.
    # However, crud.create_task is already an async function.
    
    task_id = await service.start_async_filter_task(request_data, mock_db_session)
    
    assert isinstance(task_id, str)
    mock_create_task.assert_called_once()
    
    # Check the TaskCreate payload passed to crud.create_task
    call_args = mock_create_task.call_args
    assert call_args is not None
    task_in_arg = call_args.kwargs.get('task_in')
    assert isinstance(task_in_arg, TaskCreate)
    assert task_in_arg.id == task_id
    assert task_in_arg.name == f"DataFilteringTask-{request_data.request_id or task_id}"
    assert task_in_arg.task_type == "data_filtering"
    assert task_in_arg.status == "queued"
    assert task_in_arg.parameters == request_data.dict(exclude_none=True)

# Test execute_async_filter_task
@pytest.mark.asyncio
@patch('services.data_filtering_service.crud.get_task')
@patch('services.data_filtering_service.crud.update_task')
@patch('services.data_filtering_service.DataFilteringService.filter_data') # Mock the synchronous filter_data
async def test_execute_async_filter_task_success(
    mock_service_filter_data: AsyncMock,
    mock_update_task: AsyncMock,
    mock_get_task: AsyncMock,
    service: DataFilteringService,
    mock_db_session: AsyncMock
):
    task_id = "test-async-task-id"
    request_params_dict = {
        "data": SAMPLE_DATA,
        "filter_conditions": [{"field": "age", "operation": "equals", "value": 30}], # Simulating stored dict
        "combine_operation": "AND",
        "request_id": "original-req-id"
    }
    
    # Mock DB responses
    mock_task_orm = TaskOrmModel(
        id=task_id, 
        parameters=request_params_dict, 
        status="queued",
        started_at=datetime.now() # Will be set by the first update_task call
    )
    mock_get_task.return_value = mock_task_orm
    
    # Mock the result of the internal filter_data call
    mock_service_filter_data.return_value = {
        "filtered_data_paginated": [SAMPLE_DATA[0]],
        "original_data_count": len(SAMPLE_DATA),
        "filtered_count_total": 1,
        "summary": {"info": "filtered"},
        "page_info": None
    }
    
    await service.execute_async_filter_task(task_id, mock_db_session)
    
    # Assertions
    assert mock_get_task.call_count == 1 # Called once to get params
    mock_get_task.assert_any_call(db=mock_db_session, task_id=task_id)
    
    # Check that filter_data was called with correctly parsed FilterCondition
    mock_service_filter_data.assert_called_once()
    call_args_filter_data = mock_service_filter_data.call_args[1] # kwargs
    assert call_args_filter_data['data'] == SAMPLE_DATA
    assert isinstance(call_args_filter_data['filter_conditions'][0], FilterCondition)
    assert call_args_filter_data['filter_conditions'][0].field == "age"
    
    # Check update_task calls
    # First call: status="running"
    # Second call: status="completed" with results
    assert mock_update_task.call_count == 2
    
    # Check the first call to update_task (status to running)
    update_call_running_args = mock_update_task.call_args_list[0].kwargs
    assert update_call_running_args['task_id'] == task_id
    assert isinstance(update_call_running_args['task_in'], TaskUpdate)
    assert update_call_running_args['task_in'].status == "running"
    assert update_call_running_args['task_in'].started_at is not None
    
    # Check the second call to update_task (status to completed)
    update_call_completed_args = mock_update_task.call_args_list[1].kwargs
    assert update_call_completed_args['task_id'] == task_id
    assert isinstance(update_call_completed_args['task_in'], TaskUpdate)
    assert update_call_completed_args['task_in'].status == "completed"
    assert update_call_completed_args['task_in'].progress == 1.0
    assert update_call_completed_args['task_in'].completed_at is not None
    
    result_payload = update_call_completed_args['task_in'].result
    assert result_payload is not None
    assert result_payload["filtered_data_paginated"] == [SAMPLE_DATA[0]]
    assert result_payload["original_data_count"] == len(SAMPLE_DATA)
    assert result_payload["filtered_count_total"] == 1
    assert result_payload["original_request_id"] == "original-req-id"

@pytest.mark.asyncio
@patch('services.data_filtering_service.crud.get_task')
@patch('services.data_filtering_service.crud.update_task')
async def test_execute_async_filter_task_no_task_found(
    mock_update_task: AsyncMock,
    mock_get_task: AsyncMock,
    service: DataFilteringService,
    mock_db_session: AsyncMock
):
    task_id = "non-existent-task-id"
    mock_get_task.return_value = None # Simulate task not found
    
    await service.execute_async_filter_task(task_id, mock_db_session)
    
    mock_get_task.assert_called_once_with(db=mock_db_session, task_id=task_id)
    
    # Check that update_task was called to mark as failed
    mock_update_task.assert_any_call(
        db=mock_db_session,
        task_id=task_id,
        task_in=TaskUpdate(status="failed", error="Task data not found", completed_at=pytest.approx(datetime.now(), abs=1)) # type: ignore
    )


# Test get_task_status
@pytest.mark.asyncio
@patch('services.data_filtering_service.crud.get_task')
async def test_get_task_status_found(mock_get_task: AsyncMock, service: DataFilteringService, mock_db_session: AsyncMock):
    task_id = "existing-task-id"
    mock_orm_task = TaskOrmModel(
        id=task_id, 
        name="Test Task", 
        task_type="data_filtering", 
        status="completed",
        parameters={"some": "param"},
        result={"data": "some_result"}
    )
    mock_get_task.return_value = mock_orm_task
    
    task_schema = await service.get_task_status(task_id, mock_db_session)
    
    assert task_schema is not None
    assert isinstance(task_schema, TaskSchema)
    assert task_schema.id == task_id
    assert task_schema.status == "completed"
    assert task_schema.result == {"data": "some_result"}
    mock_get_task.assert_called_once_with(db=mock_db_session, task_id=task_id)

@pytest.mark.asyncio
@patch('services.data_filtering_service.crud.get_task')
async def test_get_task_status_not_found(mock_get_task: AsyncMock, service: DataFilteringService, mock_db_session: AsyncMock):
    task_id = "non-existent-task-id"
    mock_get_task.return_value = None
    
    task_schema = await service.get_task_status(task_id, mock_db_session)
    
    assert task_schema is None
    mock_get_task.assert_called_once_with(db=mock_db_session, task_id=task_id)