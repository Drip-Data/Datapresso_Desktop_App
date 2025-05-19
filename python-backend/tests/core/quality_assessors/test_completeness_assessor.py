import pytest
from typing import List, Dict, Any, Optional
import pandas as pd # Ensure pandas is available for the test, as the module uses it.
from core.quality_assessors.completeness_assessor import assess_completeness

# Sample data for testing completeness
SAMPLE_DATA_COMPLETENESS: List[Dict[str, Any]] = [
    {"id": 1, "name": "Alice", "age": 30, "city": "New York"},
    {"id": 2, "name": "Bob", "age": None, "city": "Los Angeles"}, # Missing age
    {"id": 3, "name": "Charlie", "age": 30, "city": None}, # Missing city
    {"id": 4, "name": None, "age": 45, "city": "Chicago"}, # Missing name
    {"id": 5, "name": "Eve", "age": 28, "city": "Chicago"},
    {"id": 6, "name": "Frank", "age": 35, "city": "New York", "extra_field": "present"}, # Extra field
    {"id": 7, "name": "Grace", "age": None, "city": None}, # Multiple missing
]

SAMPLE_SCHEMA: Optional[Dict[str, Any]] = {
    "properties": {
        "id": {"type": "integer"},
        "name": {"type": "string", "nullable": False}, # name is required
        "age": {"type": "integer", "nullable": True},  # age is optional
        "city": {"type": "string", "nullable": False} # city is required
    },
    "required": ["name", "city"] # Explicitly required
}

SAMPLE_SCHEMA_ALL_REQUIRED: Optional[Dict[str, Any]] = {
    "properties": {
        "id": {"type": "integer"},
        "name": {"type": "string", "nullable": False},
        "age": {"type": "integer", "nullable": False},
        "city": {"type": "string", "nullable": False}
    },
    "required": ["id", "name", "age", "city"]
}

@pytest.mark.asyncio
async def test_assess_completeness_empty_data():
    result = await assess_completeness([])
    assert result["score"] == 0
    assert "error" in result["details"]
    assert result["details"]["error"] == "空数据集"

@pytest.mark.asyncio
async def test_assess_completeness_full_data_no_schema():
    data = [{"a": 1, "b": 2}, {"a": 3, "b": 4}]
    result = await assess_completeness(data)
    assert result["score"] == 1.0
    assert len(result["issues"]) == 0
    assert result["details"]["field_scores"]["a"] == 1.0
    assert result["details"]["field_scores"]["b"] == 1.0

@pytest.mark.asyncio
async def test_assess_completeness_with_missing_values_no_schema():
    data = [{"a": 1, "b": None}, {"a": None, "b": 4}, {"a": 5, "b": 6}]
    result = await assess_completeness(data)
    # Expected scores: a: 2/3, b: 2/3. Overall: (2/3 + 2/3) / 2 = 2/3
    assert pytest.approx(result["score"]) == (2/3 + 2/3) / 2
    assert len(result["issues"]) == 2
    assert result["details"]["field_scores"]["a"] == pytest.approx(2/3)
    assert result["details"]["field_scores"]["b"] == pytest.approx(2/3)
    assert result["details"]["missing_rates"]["a"] == pytest.approx(1/3)
    assert result["details"]["missing_rates"]["b"] == pytest.approx(1/3)

@pytest.mark.asyncio
async def test_assess_completeness_with_schema_optional_fields():
    result = await assess_completeness(SAMPLE_DATA_COMPLETENESS, schema=SAMPLE_SCHEMA)
    # Required fields by schema: name, city
    # name: 6/7 non-null
    # city: 5/7 non-null
    # age (optional): 5/7 non-null
    # id (not in schema properties for nullable check, but present): 7/7
    # extra_field (not in schema): 1/7 (or 1/1 if only considering rows where it exists)
    
    # Score calculation based on required fields: name, city
    # name non-null rate: 6/7
    # city non-null rate: 5/7
    # overall_score = ( (6/7) + (5/7) ) / 2 = (11/7) / 2 = 11/14
    expected_score = ( (6/7) + (5/7) ) / 2
    assert pytest.approx(result["score"]) == expected_score
    
    assert result["details"]["field_scores"]["name"] == 6/7
    assert result["details"]["field_scores"]["age"] == 5/7
    assert result["details"]["field_scores"]["city"] == 5/7
    assert result["details"]["field_scores"]["id"] == pytest.approx(1.0) # All present
    assert result["details"]["field_scores"]["extra_field"] == pytest.approx(1/7) # Based on all rows

    assert len(result["issues"]) == 4 # name, age, city, extra_field will have missing values
    
    name_issue = next(issue for issue in result["issues"] if issue["field"] == "name")
    city_issue = next(issue for issue in result["issues"] if issue["field"] == "city")
    age_issue = next(issue for issue in result["issues"] if issue["field"] == "age")

    assert name_issue["missing_rate"] == pytest.approx(1/7)
    assert name_issue["severity"] == "high" # Required field
    assert city_issue["missing_rate"] == pytest.approx(2/7)
    assert city_issue["severity"] == "high" # Required field
    assert age_issue["missing_rate"] == pytest.approx(2/7)
    # Age is nullable in schema, so severity might be lower if logic considers that.
    # Current logic: severity = "high" if field in required_fields and missing_rate > 0.2
    # Age is not in SAMPLE_SCHEMA["required"], so severity should not be high based on that.
    # Let's re-check severity logic:
    # severity = "high" if (field in required_fields and missing_rate > 0.2) else \
    #            "medium" if missing_rate > 0.1 else "low"
    # For age (not required, missing_rate = 2/7 ~ 0.28 > 0.1): severity should be "medium"
    assert age_issue["severity"] == "medium"


@pytest.mark.asyncio
async def test_assess_completeness_with_schema_all_required():
    result = await assess_completeness(SAMPLE_DATA_COMPLETENESS, schema=SAMPLE_SCHEMA_ALL_REQUIRED)
    # All fields (id, name, age, city) are required by this schema
    # id: 7/7
    # name: 6/7
    # age: 5/7
    # city: 5/7
    # overall_score = (1 + 6/7 + 5/7 + 5/7) / 4 = (7+6+5+5)/28 = 23/28
    expected_score = (1 + 6/7 + 5/7 + 5/7) / 4
    assert pytest.approx(result["score"]) == expected_score
    
    age_issue = next(issue for issue in result["issues"] if issue["field"] == "age")
    assert age_issue["missing_rate"] == pytest.approx(2/7)
    assert age_issue["severity"] == "high" # Age is now required and missing_rate > 0.2

@pytest.mark.asyncio
async def test_assess_completeness_detail_levels(service: Any = None): # service not used, can remove
    data = [{"a": 1, "b": None}]
    
    # Low detail
    result_low = await assess_completeness(data, detail_level="low")
    assert "details" not in result_low # Only score and issues
    assert "field_scores" not in result_low.get("details", {})
    assert result_low["score"] == (1.0 + 0.0) / 2 # a:1, b:0
    assert len(result_low["issues"]) == 1
    assert result_low["issues"][0]["field"] == "b"

    # Medium detail (default)
    result_medium = await assess_completeness(data, detail_level="medium")
    assert "details" in result_medium
    assert "field_scores" in result_medium["details"]
    assert "missing_examples" not in result_medium["details"]
    assert result_medium["details"]["field_scores"]["a"] == 1.0
    assert result_medium["details"]["field_scores"]["b"] == 0.0

    # High detail
    result_high = await assess_completeness(data, detail_level="high")
    assert "details" in result_high
    assert "missing_examples" in result_high["details"]
    assert "b" in result_high["details"]["missing_examples"]
    assert len(result_high["details"]["missing_examples"]["b"]) == 1
    assert result_high["details"]["missing_examples"]["b"][0] == {"a": 1, "b": None}