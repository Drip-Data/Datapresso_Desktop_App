import re
import re
from typing import Any, List, Optional, Dict
from pydantic import BaseModel, field_validator, Field, EmailStr, HttpUrl # Changed validator to field_validator
from enum import Enum
import logging # Added import logging
logger = logging.getLogger(__name__) # Assuming logger is configured elsewhere or add basicConfig

class CommonValidators(BaseModel):
    """一些通用的验证器可以放在这里，或者根据需要创建更具体的验证模型"""

    @staticmethod
    def validate_not_empty_string(value: str, field_name: str = "Field") -> str:
        if not value or not value.strip():
            raise ValueError(f"{field_name} cannot be empty.")
        return value

    @staticmethod
    def validate_positive_integer(value: int, field_name: str = "Value") -> int:
        if not isinstance(value, int) or value <= 0:
            raise ValueError(f"{field_name} must be a positive integer.")
        return value

    @staticmethod
    def validate_percentage(value: float, field_name: str = "Percentage") -> float:
        if not (0 <= value <= 1):
            raise ValueError(f"{field_name} must be between 0 and 1.")
        return value

    @staticmethod
    def validate_list_not_empty(value: List[Any], field_name: str = "List") -> List[Any]:
        if not value:
            raise ValueError(f"{field_name} cannot be empty.")
        return value

    @staticmethod
    def validate_uuid_format(value: str, field_name: str = "UUID") -> str:
        uuid_pattern = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
        if not uuid_pattern.match(value):
            raise ValueError(f"{field_name} is not a valid UUID format.")
        return value

# 可以在这里为特定的请求模型或数据结构定义更复杂的验证器
# 例如，如果 DataFilteringRequest 中的某些字段组合有特定约束，可以在这里实现
# 或者在各自的 schema 文件中使用 Pydantic 的 @validator

# 示例：一个更具体的验证模型 (如果需要)
class AdvancedFilterParams(BaseModel):
    min_value: Optional[int] = None
    max_value: Optional[int] = None

    @field_validator('max_value')
    def max_must_be_greater_than_min(cls, v, values): # Removed **kwargs, values is now FieldValidationInfo
        # For Pydantic V2, 'values' in a field_validator is FieldValidationInfo,
        # and to access other field values, you use values.data
        min_value = values.data.get('min_value')
        if min_value is not None and v is not None:
            if v <= min_value:
                raise ValueError('max_value must be greater than min_value')
        return v

logger.info("validators.py loaded")