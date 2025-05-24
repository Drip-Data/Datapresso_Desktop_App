"""
全局错误处理模块
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import logging
import traceback
from typing import Any, Dict

logger = logging.getLogger(__name__)


class DatapressoException(Exception):
    """Datapresso自定义异常基类"""
    
    def __init__(self, message: str, error_code: str = None, details: Dict[str, Any] = None):
        self.message = message
        self.error_code = error_code or "DATAPRESSO_ERROR"
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(DatapressoException):
    """数据验证错误"""
    
    def __init__(self, message: str, field: str = None, details: Dict[str, Any] = None):
        super().__init__(message, "VALIDATION_ERROR", details)
        self.field = field


class ProcessingError(DatapressoException):
    """数据处理错误"""
    
    def __init__(self, message: str, operation: str = None, details: Dict[str, Any] = None):
        super().__init__(message, "PROCESSING_ERROR", details)
        self.operation = operation


class LLMAPIError(DatapressoException):
    """LLM API调用错误"""
    
    def __init__(self, message: str, provider: str = None, details: Dict[str, Any] = None):
        super().__init__(message, "LLM_API_ERROR", details)
        self.provider = provider


class TaskError(DatapressoException):
    """任务执行错误"""
    
    def __init__(self, message: str, task_id: str = None, details: Dict[str, Any] = None):
        super().__init__(message, "TASK_ERROR", details)
        self.task_id = task_id


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """全局异常处理器"""
    
    # 记录详细错误信息
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    # 处理自定义异常
    if isinstance(exc, DatapressoException):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "status": "error",
                "message": exc.message,
                "error_code": exc.error_code,
                "details": exc.details
            }
        )
    
    # 处理HTTP异常
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "message": exc.detail,
                "error_code": "HTTP_ERROR"
            }
        )
    
    # 处理其他异常
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "Internal server error",
            "error_code": "INTERNAL_ERROR"
        }
    )


def handle_service_error(func):
    """服务层错误处理装饰器"""
    
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except DatapressoException:
            # 重新抛出自定义异常
            raise
        except Exception as e:
            logger.error(f"Service error in {func.__name__}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise ProcessingError(
                f"Service operation failed: {str(e)}",
                operation=func.__name__
            )
    
    return wrapper


def validate_required_fields(data: Dict[str, Any], required_fields: list) -> None:
    """验证必填字段"""
    missing_fields = []
    
    for field in required_fields:
        if field not in data or data[field] is None:
            missing_fields.append(field)
    
    if missing_fields:
        raise ValidationError(
            f"Missing required fields: {', '.join(missing_fields)}",
            details={"missing_fields": missing_fields}
        )


def validate_file_type(filename: str, allowed_extensions: list) -> None:
    """验证文件类型"""
    if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
        raise ValidationError(
            f"File type not allowed. Supported types: {', '.join(allowed_extensions)}",
            field="file",
            details={"filename": filename, "allowed_extensions": allowed_extensions}
        )


def validate_positive_integer(value: Any, field_name: str) -> int:
    """验证正整数"""
    try:
        int_value = int(value)
        if int_value <= 0:
            raise ValueError()
        return int_value
    except (ValueError, TypeError):
        raise ValidationError(
            f"{field_name} must be a positive integer",
            field=field_name,
            details={"value": value}
        )
