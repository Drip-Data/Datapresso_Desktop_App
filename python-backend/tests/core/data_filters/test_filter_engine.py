import pytest
import re
from typing import List, Dict, Any
# Ensure CommonValidators and AdvancedFilterParams are imported from the correct location
# Assuming they are in 'utils.validators' relative to the 'python-backend' root
from utils.validators import CommonValidators, AdvancedFilterParams
from core.data_filters.filter_engine import apply_filters, _create_filter_function
from schemas import FilterCondition, FilterOperation

# Sample data for testing
SAMPLE_DATA: List[Dict[str, Any]] = [
    {"id": 1, "name": "Alice", "age": 30, "city": "New York", "score": 8.5, "active": True, "description": "User A"},
    {"id": 2, "name": "Bob", "age": 24, "city": "Los Angeles", "score": 7.2, "active": False, "description": "User B"},
    {"id": 3, "name": "Charlie", "age": 30, "city": "New York", "score": 9.0, "active": True, "description": "User C"},
    {"id": 4, "name": "David", "age": 45, "city": "Chicago", "score": 6.5, "active": False, "description": "User D"},
    {"id": 5, "name": "Eve", "age": 28, "city": "Chicago", "score": None, "active": True, "description": "User E with null score"},
    {"id": 6, "name": "Frank", "age": 35, "city": "New York", "score": 8.8, "active": True, "description": "Another NY user"},
]

# --- Tests for _create_filter_function ---

@pytest.mark.parametrize("condition, item, expected", [
    (FilterCondition(field="age", operation=FilterOperation.EQUALS, value=30), SAMPLE_DATA[0], True),
    (FilterCondition(field="age", operation=FilterOperation.EQUALS, value=31), SAMPLE_DATA[0], False),
    (FilterCondition(field="name", operation=FilterOperation.EQUALS, value="Alice"), SAMPLE_DATA[0], True),
    (FilterCondition(field="name", operation=FilterOperation.EQUALS, value="alice", case_sensitive=False), SAMPLE_DATA[0], True),
    (FilterCondition(field="name", operation=FilterOperation.EQUALS, value="alice", case_sensitive=True), SAMPLE_DATA[0], False),
    (FilterCondition(field="age", operation=FilterOperation.NOT_EQUALS, value=30), SAMPLE_DATA[1], True),
    (FilterCondition(field="age", operation=FilterOperation.GREATER_THAN, value=25), SAMPLE_DATA[0], True),
    (FilterCondition(field="age", operation=FilterOperation.GREATER_THAN, value=30), SAMPLE_DATA[0], False),
    (FilterCondition(field="score", operation=FilterOperation.LESS_THAN, value=8.0), SAMPLE_DATA[1], True),
    (FilterCondition(field="score", operation=FilterOperation.LESS_THAN, value=7.0), SAMPLE_DATA[1], False),
    (FilterCondition(field="city", operation=FilterOperation.CONTAINS, value="York"), SAMPLE_DATA[0], True),
    (FilterCondition(field="city", operation=FilterOperation.CONTAINS, value="york", case_sensitive=False), SAMPLE_DATA[0], True),
    (FilterCondition(field="city", operation=FilterOperation.NOT_CONTAINS, value="San"), SAMPLE_DATA[0], True),
    (FilterCondition(field="name", operation=FilterOperation.STARTS_WITH, value="Al"), SAMPLE_DATA[0], True),
    (FilterCondition(field="name", operation=FilterOperation.ENDS_WITH, value="ice"), SAMPLE_DATA[0], True),
    (FilterCondition(field="age", operation=FilterOperation.IN_RANGE, value=[25, 35]), SAMPLE_DATA[0], True),
    (FilterCondition(field="age", operation=FilterOperation.IN_RANGE, value=[31, 35]), SAMPLE_DATA[0], False),
    (FilterCondition(field="age", operation=FilterOperation.NOT_IN_RANGE, value=[31, 35]), SAMPLE_DATA[0], True),
    (FilterCondition(field="description", operation=FilterOperation.REGEX_MATCH, value=r"^User [A-C]$"), SAMPLE_DATA[0], True),
    (FilterCondition(field="description", operation=FilterOperation.REGEX_MATCH, value=r"^User [D-F]$"), SAMPLE_DATA[0], False),
    (FilterCondition(field="score", operation=FilterOperation.IS_NULL, value=None), SAMPLE_DATA[4], True),
    (FilterCondition(field="score", operation=FilterOperation.IS_NULL, value=None), SAMPLE_DATA[0], False),
    (FilterCondition(field="score", operation=FilterOperation.IS_NOT_NULL, value=None), SAMPLE_DATA[0], True),
    (FilterCondition(field="score", operation=FilterOperation.IS_NOT_NULL, value=None), SAMPLE_DATA[4], False),
    (FilterCondition(field="active", operation=FilterOperation.EQUALS, value=True), SAMPLE_DATA[0], True),
])
def test_create_filter_function_various_operations(condition: FilterCondition, item: Dict[str, Any], expected: bool):
    filter_func = _create_filter_function(condition)
    assert filter_func(item) == expected

# Tests for AdvancedFilterParams (Pydantic model validation)

def test_advanced_filter_params_valid():
    params = AdvancedFilterParams(min_value=10, max_value=20)
    assert params.min_value == 10
    assert params.max_value == 20

    params_no_min = AdvancedFilterParams(max_value=20)
    assert params_no_min.max_value == 20
    
    params_no_max = AdvancedFilterParams(min_value=5)
    assert params_no_max.min_value == 5

    # According to the validator `v <= values['min_value']` for error,
    # max_value == min_value should raise an error.
    # This test case is now covered by test_advanced_filter_params_max_equal_to_min_invalid

def test_advanced_filter_params_invalid_max_less_than_min():
    from pydantic import ValidationError # Ensure ValidationError is imported for this scope if not globally
    with pytest.raises(ValidationError, match="max_value must be greater than min_value"): # Pydantic v1 might raise ValueError, v2 ValidationError
        AdvancedFilterParams(min_value=20, max_value=10)

def test_advanced_filter_params_max_equal_to_min_invalid():
    from pydantic import ValidationError
    with pytest.raises(ValidationError, match="max_value must be greater than min_value"):
        AdvancedFilterParams(min_value=10, max_value=10)

# --- Tests for apply_filters ---

def test_apply_filters_no_conditions():
    filtered_data, summary = apply_filters(SAMPLE_DATA, [])
    assert filtered_data == SAMPLE_DATA
    assert summary["filtered_items"] == len(SAMPLE_DATA)
    assert summary["applied_conditions"] == 0

def test_apply_filters_single_condition():
    conditions = [FilterCondition(field="city", operation=FilterOperation.EQUALS, value="New York")]
    filtered_data, summary = apply_filters(SAMPLE_DATA, conditions)
    expected_data = [SAMPLE_DATA[0], SAMPLE_DATA[2], SAMPLE_DATA[5]]
    assert filtered_data == expected_data
    assert summary["filtered_items"] == 3
    assert summary["condition_matches"]["city_equals"] == 3

def test_apply_filters_multiple_conditions_and_operator():
    conditions = [
        FilterCondition(field="city", operation=FilterOperation.EQUALS, value="New York"),
        FilterCondition(field="age", operation=FilterOperation.EQUALS, value=30)
    ]
    filtered_data, summary = apply_filters(SAMPLE_DATA, conditions, combine_operation="AND")
    expected_data = [SAMPLE_DATA[0], SAMPLE_DATA[2]]
    assert filtered_data == expected_data
    assert summary["filtered_items"] == 2
    assert summary["condition_matches"]["city_equals"] == 3 # Matches 3 before AND
    assert summary["condition_matches"]["age_equals"] == 2  # Matches 2 before AND

def test_apply_filters_multiple_conditions_or_operator():
    conditions = [
        FilterCondition(field="city", operation=FilterOperation.EQUALS, value="Los Angeles"), # Bob
        FilterCondition(field="age", operation=FilterOperation.GREATER_THAN, value=40) # David
    ]
    filtered_data, summary = apply_filters(SAMPLE_DATA, conditions, combine_operation="OR")
    # Expected: Bob (id 2), David (id 4)
    assert len(filtered_data) == 2
    assert any(item["id"] == 2 for item in filtered_data)
    assert any(item["id"] == 4 for item in filtered_data)
    assert summary["filtered_items"] == 2
    assert summary["condition_matches"]["city_equals"] == 1
    assert summary["condition_matches"]["age_greater_than"] == 1

def test_apply_filters_case_insensitivity():
    conditions = [FilterCondition(field="name", operation=FilterOperation.EQUALS, value="alice", case_sensitive=False)]
    filtered_data, _ = apply_filters(SAMPLE_DATA, conditions)
    assert len(filtered_data) == 1
    assert filtered_data[0]["name"] == "Alice"

def test_apply_filters_no_matches():
    conditions = [FilterCondition(field="age", operation=FilterOperation.EQUALS, value=100)]
    filtered_data, summary = apply_filters(SAMPLE_DATA, conditions)
    assert filtered_data == []
    assert summary["filtered_items"] == 0
    assert summary["condition_matches"]["age_equals"] == 0

def test_apply_filters_empty_data():
    conditions = [FilterCondition(field="age", operation=FilterOperation.EQUALS, value=30)]
    filtered_data, summary = apply_filters([], conditions)
    assert filtered_data == []
    assert summary["total_items"] == 0
    assert summary["filtered_items"] == 0

def test_apply_filters_summary_details():
    conditions = [
        FilterCondition(field="city", operation=FilterOperation.EQUALS, value="New York"),
        FilterCondition(field="active", operation=FilterOperation.EQUALS, value=True)
    ]
    _, summary = apply_filters(SAMPLE_DATA, conditions, combine_operation="AND")
    assert summary["total_items"] == len(SAMPLE_DATA)
    assert summary["applied_conditions"] == 2
    assert summary["combine_operation"] == "AND"
    assert "city_equals" in summary["condition_matches"]
    assert "active_equals" in summary["condition_matches"]
    assert set(summary["fields_analyzed"]) == {"city", "active"}
    assert summary["rejection_rate"] == (len(SAMPLE_DATA) - summary["filtered_items"]) / len(SAMPLE_DATA)