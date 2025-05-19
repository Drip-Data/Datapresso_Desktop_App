import pytest
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from core.quality_assessors.accuracy_assessor import assess_accuracy, _assess_accuracy_without_reference
from schemas import QualityDimension # Assuming QualityDimension might be useful, or remove

# Sample data for testing accuracy
SAMPLE_DATA_ACCURACY: List[Dict[str, Any]] = [
    {"id": 1, "value_num": 10.0, "value_cat": "A", "text": "hello world"},
    {"id": 2, "value_num": 20.5, "value_cat": "B", "text": "foo bar"},
    {"id": 3, "value_num": 10.2, "value_cat": "A", "text": "hello world"}, # Slight numeric diff, same cat
    {"id": 4, "value_num": 30.0, "value_cat": "C", "text": "baz qux"},
    {"id": 5, "value_num": None, "value_cat": "B", "text": "foo bar baz"}, # Missing numeric
]

REFERENCE_DATA_ACCURACY: List[Dict[str, Any]] = [
    {"id": 1, "value_num": 10.0, "value_cat": "A", "text": "hello world"},
    {"id": 2, "value_num": 20.0, "value_cat": "B", "text": "foo bar"}, # Numeric diff
    {"id": 3, "value_num": 10.0, "value_cat": "X", "text": "hello world"}, # Cat diff
    {"id": 4, "value_num": 30.0, "value_cat": "C", "text": "baz quux"}, # Text diff
    {"id": 5, "value_num": 50.0, "value_cat": "B", "text": "foo bar baz"}, # Ref has value where data has None
]

# Schema for testing (can be more detailed if needed)
SAMPLE_SCHEMA_ACCURACY: Optional[Dict[str, Any]] = {
    "properties": {
        "id": {"type": "integer"},
        "value_num": {"type": "number"},
        "value_cat": {"type": "string", "enum": ["A", "B", "C", "X"]},
        "text": {"type": "string"}
    },
    "primary_key": "id" # For merging when lengths differ
}

@pytest.mark.asyncio
async def test_assess_accuracy_empty_data():
    result = await assess_accuracy([])
    assert result["score"] == 0
    assert "error" in result["details"]

@pytest.mark.asyncio
async def test_assess_accuracy_no_reference_data():
    # This will call _assess_accuracy_without_reference
    # We expect it to perform outlier detection for numeric and basic validation for others
    data_for_no_ref = [
        {"id": 1, "value": 10, "category": "A"},
        {"id": 2, "value": 12, "category": "A"},
        {"id": 3, "value": 11, "category": "B"},
        {"id": 4, "value": 100, "category": "A"}, # Outlier
        {"id": 5, "value": 9, "category": "C"},
    ]
    result = await assess_accuracy(data_for_no_ref, schema={"properties": {"value": {"type": "number"}, "category": {"type": "string"}}})
    assert 0 <= result["score"] <= 1
    assert "field_accuracy" in result["details"]
    assert "value" in result["details"]["field_accuracy"]
    assert "category" in result["details"]["field_accuracy"]
    # value field should have lower accuracy due to outlier
    assert result["details"]["field_accuracy"]["value"] < 1.0 
    # category field might be 1.0 if no schema validation fails it (e.g. enum)
    assert result["details"]["field_accuracy"]["category"] == 1.0 
    assert any(issue["field"] == "value" and issue["issue_type"] == "outliers" for issue in result["issues"])

@pytest.mark.asyncio
async def test_assess_accuracy_with_reference_data_perfect_match():
    data = [{"id": 1, "val": 10}, {"id": 2, "val": 20}]
    ref_data = [{"id": 1, "val": 10}, {"id": 2, "val": 20}]
    result = await assess_accuracy(data, ref_data)
    assert result["score"] == pytest.approx(1.0)
    assert len(result["issues"]) == 0
    assert result["details"]["field_accuracy"]["val"] == pytest.approx(1.0)

@pytest.mark.asyncio
async def test_assess_accuracy_with_reference_data_numeric_differences():
    data = [{"id": 1, "val": 10.0}, {"id": 2, "val": 25.0}] # 25.0 vs 20.0
    ref_data = [{"id": 1, "val": 10.0}, {"id": 2, "val": 20.0}]
    result = await assess_accuracy(data, ref_data, schema={"primary_key": "id"})
    assert result["score"] < 1.0
    assert result["details"]["field_accuracy"]["val"] < 1.0
    assert len(result["issues"]) > 0
    assert any(issue["field"] == "val" and issue["issue_type"] == "numeric_mismatch" for issue in result["issues"])

@pytest.mark.asyncio
async def test_assess_accuracy_with_reference_data_categorical_differences():
    data = [{"id": 1, "cat": "A"}, {"id": 2, "cat": "X"}] # X vs B
    ref_data = [{"id": 1, "cat": "A"}, {"id": 2, "cat": "B"}]
    result = await assess_accuracy(data, ref_data, schema={"primary_key": "id"})
    # Score for 'cat' will be 0.5 (1 match, 1 mismatch out of 2)
    # 'id' field will be 1.0. Overall score will be (1.0 + 0.5) / 2 = 0.75
    assert result["score"] == pytest.approx(0.75)
    assert result["details"]["field_accuracy"]["cat"] == pytest.approx(0.5)
    assert result["details"]["field_accuracy"]["id"] == pytest.approx(1.0) # id field should be perfect match
    assert len(result["issues"]) == 1
    assert result["issues"][0]["field"] == "cat"
    assert result["issues"][0]["issue_type"] == "mismatches"

@pytest.mark.asyncio
async def test_assess_accuracy_with_reference_data_different_lengths_with_key():
    # Data has one extra record not in ref
    data = SAMPLE_DATA_ACCURACY.copy() 
    ref_data = REFERENCE_DATA_ACCURACY[:4] # Ref has 4 records, data has 5 (id 5 not in ref)
    
    result = await assess_accuracy(data, ref_data, schema=SAMPLE_SCHEMA_ACCURACY)
    # Only common records by 'id' will be compared.
    # id 1: num match, cat match, text match
    # id 2: num diff, cat match, text match
    # id 3: num diff, cat diff, text match
    # id 4: num match, cat match, text diff
    # value_num accuracy: (1 + exp(-|20.5-20|/range) * corr + exp(-|10.2-10|/range) * corr + 1) / 4 -> complex
    # value_cat accuracy: (1 + 1 + 0 + 1) / 4 = 3/4 = 0.75
    # text accuracy: (1 + 1 + 1 + 0) / 4 = 3/4 = 0.75
    # Overall score will be an average of these.
    assert 0 < result["score"] < 1.0
    assert result["details"]["field_accuracy"]["value_cat"] == 0.75
    assert result["details"]["field_accuracy"]["text"] == 0.75
    assert result["details"]["field_accuracy"]["value_num"] < 1.0 # Due to diffs
    assert len(result["issues"]) > 0 # Expect issues for value_num, value_cat, text

@pytest.mark.asyncio
async def test_assess_accuracy_no_common_fields():
    data = [{"a": 1}]
    ref_data = [{"b": 1}]
    result = await assess_accuracy(data, ref_data)
    assert result["score"] == 0
    assert "error" in result["details"]
    assert result["details"]["error"] == "数据和参考数据没有共同字段"

@pytest.mark.asyncio
async def test_assess_accuracy_detail_levels():
    data = [{"id":1, "val": 10}, {"id":2, "val": 25}] # val for id 2 is 25, ref is 20
    ref = [{"id":1, "val": 10}, {"id":2, "val": 20}]
    schema = {"primary_key": "id", "properties": {"val": {"type": "number"}}}

    res_low = await assess_accuracy(data, ref, schema, detail_level="low")
    assert "details" not in res_low # Only score and issues
    assert res_low["score"] < 1.0
    assert len(res_low["issues"]) > 0

    res_medium = await assess_accuracy(data, ref, schema, detail_level="medium")
    assert "details" in res_medium
    assert "field_accuracy" in res_medium["details"]
    assert "mismatch_examples" not in res_medium["details"] # Mismatch examples are for high

    res_high = await assess_accuracy(data, ref, schema, detail_level="high")
    assert "details" in res_high
    assert "mismatch_examples" in res_high["details"]
    assert "val" in res_high["details"]["mismatch_examples"]
    assert len(res_high["details"]["mismatch_examples"]["val"]) == 1
    assert res_high["details"]["mismatch_examples"]["val"][0]["key"] == 2
    assert res_high["details"]["mismatch_examples"]["val"][0]["data_value"] == 25
    assert res_high["details"]["mismatch_examples"]["val"][0]["reference_value"] == 20

# Tests for _assess_accuracy_without_reference (internal, but good to have specific tests)
@pytest.mark.asyncio
async def test_internal_assess_accuracy_no_ref_numeric_outlier():
    data = [{"val": 10}, {"val": 11}, {"val": 10}, {"val": 12}, {"val": 100}] # 100 is outlier
    schema = {"properties": {"val": {"type": "number"}}}
    result = await _assess_accuracy_without_reference(data, schema)
    assert result["score"] < 1.0 # Score should be penalized by outlier
    assert result["details"]["field_accuracy"]["val"] < 1.0
    assert any(i["field"] == "val" and i["issue_type"] == "outliers" for i in result["issues"])

@pytest.mark.asyncio
async def test_internal_assess_accuracy_no_ref_string_pattern_validation():
    data = [{"email": "test@example.com"}, {"email": "invalid"}, {"email": "another@test.co"}]
    schema = {"properties": {"email": {"type": "string", "pattern": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"}}}
    result = await _assess_accuracy_without_reference(data, schema)
    # 2 valid, 1 invalid. field_accuracy for email should be 2/3
    assert result["details"]["field_accuracy"]["email"] == pytest.approx(2/3)
    assert result["score"] == pytest.approx(2/3) # Only one field
    assert any(i["field"] == "email" and i["issue_type"] == "pattern_mismatch" for i in result["issues"])

@pytest.mark.asyncio
async def test_internal_assess_accuracy_no_ref_enum_validation():
    data = [{"status": "active"}, {"status": "inactive"}, {"status": "pending"}, {"status": "unknown"}]
    schema = {"properties": {"status": {"type": "string", "enum": ["active", "inactive", "pending"]}}}
    result = await _assess_accuracy_without_reference(data, schema)
    # 3 valid, 1 invalid. field_accuracy for status should be 3/4
    assert result["details"]["field_accuracy"]["status"] == 0.75
    assert result["score"] == 0.75
    assert any(i["field"] == "status" and i["issue_type"] == "invalid_enum_values" for i in result["issues"])