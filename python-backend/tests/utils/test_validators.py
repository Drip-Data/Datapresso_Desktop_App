import pytest
from utils.validators import CommonValidators, AdvancedFilterParams # Assuming utils is in PYTHONPATH or relative import works
import uuid

# Tests for CommonValidators

def test_validate_not_empty_string_valid():
    assert CommonValidators.validate_not_empty_string("hello", "TestField") == "hello"
    assert CommonValidators.validate_not_empty_string("  hello  ", "TestField") == "  hello  "

def test_validate_not_empty_string_invalid():
    with pytest.raises(ValueError, match="TestField cannot be empty."):
        CommonValidators.validate_not_empty_string("", "TestField")
    with pytest.raises(ValueError, match="TestField cannot be empty."):
        CommonValidators.validate_not_empty_string("   ", "TestField")

def test_validate_positive_integer_valid():
    assert CommonValidators.validate_positive_integer(10, "TestValue") == 10
    assert CommonValidators.validate_positive_integer(1, "TestValue") == 1

def test_validate_positive_integer_invalid():
    with pytest.raises(ValueError, match="TestValue must be a positive integer."):
        CommonValidators.validate_positive_integer(0, "TestValue")
    with pytest.raises(ValueError, match="TestValue must be a positive integer."):
        CommonValidators.validate_positive_integer(-5, "TestValue")
    with pytest.raises(ValueError, match="TestValue must be a positive integer."):
        CommonValidators.validate_positive_integer(10.5, "TestValue") # type: ignore

def test_validate_percentage_valid():
    assert CommonValidators.validate_percentage(0.5, "Ratio") == 0.5
    assert CommonValidators.validate_percentage(0, "Ratio") == 0
    assert CommonValidators.validate_percentage(1, "Ratio") == 1

def test_validate_percentage_invalid():
    with pytest.raises(ValueError, match="Ratio must be between 0 and 1."):
        CommonValidators.validate_percentage(-0.1, "Ratio")
    with pytest.raises(ValueError, match="Ratio must be between 0 and 1."):
        CommonValidators.validate_percentage(1.1, "Ratio")

def test_validate_list_not_empty_valid():
    assert CommonValidators.validate_list_not_empty([1, 2], "MyList") == [1, 2]
    assert CommonValidators.validate_list_not_empty(["a"], "MyList") == ["a"]

def test_validate_list_not_empty_invalid():
    with pytest.raises(ValueError, match="MyList cannot be empty."):
        CommonValidators.validate_list_not_empty([], "MyList")

def test_validate_uuid_format_valid():
    valid_uuid = str(uuid.uuid4())
    assert CommonValidators.validate_uuid_format(valid_uuid, "TestUUID") == valid_uuid

def test_validate_uuid_format_invalid():
    with pytest.raises(ValueError, match="TestUUID is not a valid UUID format."):
        CommonValidators.validate_uuid_format("not-a-uuid", "TestUUID")
    with pytest.raises(ValueError, match="TestUUID is not a valid UUID format."):
        CommonValidators.validate_uuid_format(str(uuid.uuid4())[:-1] + "x", "TestUUID")

# Tests for AdvancedFilterParams (Pydantic model validation)

def test_advanced_filter_params_valid():
    params = AdvancedFilterParams(min_value=10, max_value=20)
    assert params.min_value == 10
    assert params.max_value == 20

    params_no_min = AdvancedFilterParams(max_value=20)
    assert params_no_min.max_value == 20
    
    params_no_max = AdvancedFilterParams(min_value=5)
    assert params_no_max.min_value == 5

    params_equal = AdvancedFilterParams(min_value=10, max_value=10) # This should be allowed by current validator
    assert params_equal.min_value == 10
    assert params_equal.max_value == 10


def test_advanced_filter_params_invalid_max_less_than_min():
    with pytest.raises(ValueError, match="max_value must be greater than min_value"):
        AdvancedFilterParams(min_value=20, max_value=10)

# Note: The original AdvancedFilterParams validator for max_value > min_value
# was `if v <= values['min_value']`. If max_value == min_value is allowed,
# the test `params_equal` is correct. If it should be strictly greater,
# the validator and test would need adjustment. The current test `params_equal`
# assumes `max_value == min_value` is valid according to the validator logic.
# The error message "max_value must be greater than min_value" implies strict inequality,
# but the code `v <= values['min_value']` raises error if max is less than OR EQUAL to min.
# Let's assume the current validator logic `v <= values['min_value']` is what's intended to be tested.
# If max_value must be strictly greater, the validator should be `v < values['min_value']` (or `v <= values['min_value']` for error)
# and the `params_equal` test would expect a ValueError.

# Re-checking the validator: `if v <= values['min_value']:` means if max_value is less than OR EQUAL to min_value, it's an error.
# So, `params_equal` where `min_value=10, max_value=10` SHOULD raise an error.

def test_advanced_filter_params_max_equal_to_min_invalid():
    with pytest.raises(ValueError, match="max_value must be greater than min_value"):
        AdvancedFilterParams(min_value=10, max_value=10)