import pytest
import re # Added for snake_case test
from datetime import datetime, timezone
from utils import helpers # Assuming utils is in PYTHONPATH or relative import works

# Test generate_unique_id
def test_generate_unique_id_default_prefix():
    uid = helpers.generate_unique_id()
    assert uid.startswith("id-")
    assert len(uid) > 3 # "id-" + uuid

def test_generate_unique_id_custom_prefix():
    uid = helpers.generate_unique_id(prefix="task")
    assert uid.startswith("task-")

# Test serialize_datetime and deserialize_datetime
def test_datetime_serialization_deserialization():
    now = datetime.now(timezone.utc) # Use timezone-aware datetime
    iso_str = helpers.serialize_datetime(now)
    assert isinstance(iso_str, str)
    
    dt_obj = helpers.deserialize_datetime(iso_str)
    assert dt_obj is not None
    # For comparison, make sure both are offset-aware or both naive.
    # If `now` is offset-aware, `fromisoformat` will also produce offset-aware.
    assert dt_obj == now

def test_deserialize_invalid_datetime():
    assert helpers.deserialize_datetime("invalid-date-string") is None
    assert helpers.deserialize_datetime("") is None
    assert helpers.deserialize_datetime(None) is None # type: ignore

def test_serialize_none_datetime():
    assert helpers.serialize_datetime(None) == "" # type: ignore

# Test safe_json_loads and safe_json_dumps
def test_safe_json_loads_valid():
    json_str = '{"name": "test", "value": 123}'
    data = helpers.safe_json_loads(json_str)
    assert data == {"name": "test", "value": 123}

def test_safe_json_loads_invalid():
    json_str = '{"name": "test", "value": 123' # Invalid JSON
    data = helpers.safe_json_loads(json_str, default=[])
    assert data == []

def test_safe_json_loads_none_input():
    data = helpers.safe_json_loads(None, default="default")
    assert data == "default"

def test_safe_json_dumps_valid():
    data = {"name": "test", "value": 123}
    json_str = helpers.safe_json_dumps(data)
    # Order of keys might vary, so parse back to compare
    assert json.loads(json_str) == data # type: ignore

def test_safe_json_dumps_with_indent():
    data = {"name": "test", "value": 123}
    json_str = helpers.safe_json_dumps(data, indent=2)
    expected_str = '{\n  "name": "test",\n  "value": 123\n}' # Potential OS-dependent newlines
    assert json.loads(json_str) == data # type: ignore

def test_safe_json_dumps_invalid_type():
    # datetime is not directly JSON serializable without a custom encoder
    data = {"time": datetime.now()}
    json_str = helpers.safe_json_dumps(data, default="error")
    assert json_str == "error"

# Test get_nested_value
def test_get_nested_value():
    data = {
        "a": 1,
        "b": {
            "c": 2,
            "d": [
                {"e": 3},
                {"f": 4}
            ]
        }
    }
    assert helpers.get_nested_value(data, "a") == 1
    assert helpers.get_nested_value(data, "b.c") == 2
    assert helpers.get_nested_value(data, "b.d.0.e") == 3
    assert helpers.get_nested_value(data, "b.d.1.f") == 4
    assert helpers.get_nested_value(data, "b.d.1.g") is None
    assert helpers.get_nested_value(data, "b.d.2") is None
    assert helpers.get_nested_value(data, "x.y.z", default="not_found") == "not_found"
    assert helpers.get_nested_value(data, "b.d.0.g", default=100) == 100
    assert helpers.get_nested_value({}, "a.b") is None

# Test convert_to_camel_case
def test_convert_to_camel_case():
    assert helpers.convert_to_camel_case("snake_case_string") == "snakeCaseString"
    assert helpers.convert_to_camel_case("alreadyCamel") == "alreadyCamel"
    assert helpers.convert_to_camel_case("string") == "string"
    assert helpers.convert_to_camel_case("_leading_underscore") == "LeadingUnderscore"
    assert helpers.convert_to_camel_case("double__underscore") == "doubleUnderscore"
    assert helpers.convert_to_camel_case("") == ""

# Test convert_to_snake_case
def test_convert_to_snake_case():
    assert helpers.convert_to_snake_case("camelCaseString") == "camel_case_string"
    assert helpers.convert_to_snake_case("AlreadySnake_case") == "already_snake_case"
    assert helpers.convert_to_snake_case("String") == "string"
    assert helpers.convert_to_snake_case("leadingUnderscore") == "leading_underscore" # Based on current impl.
    assert helpers.convert_to_snake_case("HTTPRequest") == "http_request"
    assert helpers.convert_to_snake_case("") == ""
    # Need to import re for the original implementation of convert_to_snake_case
    # The implementation in helpers.py uses re.sub

# Test clean_dict_for_orm
def test_clean_dict_for_orm_no_allowed_fields():
    data = {"a": 1, "b": None, "c": "hello", "d": 0}
    cleaned = helpers.clean_dict_for_orm(data)
    assert cleaned == {"a": 1, "c": "hello", "d": 0} # None values removed

def test_clean_dict_for_orm_with_allowed_fields():
    data = {"a": 1, "b": "remove_me", "c": "keep_me", "d": None}
    allowed = ["a", "c", "d"] # d is None but allowed
    cleaned = helpers.clean_dict_for_orm(data, allowed_fields=allowed)
    assert cleaned == {"a": 1, "c": "keep_me", "d": None} # b removed, d (None) kept

def test_clean_dict_for_orm_empty_input():
    assert helpers.clean_dict_for_orm({}) == {}
    assert helpers.clean_dict_for_orm({}, allowed_fields=["a"]) == {}

# Add import for json if not already present at the top of the test file
import json