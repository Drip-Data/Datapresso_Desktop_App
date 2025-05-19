from fastapi import Request
from fastapi.responses import JSONResponse
import logging
import traceback
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# 错误码定义
class ErrorCode:
    VALIDATION_ERROR = "VALIDATION_ERROR"
    PROCESSING_ERROR = "PROCESSING_ERROR"
    NOT_FOUND = "NOT_FOUND"
    PERMISSION_ERROR = "PERMISSION_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
    RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED"

def handle_exception(request: Request, exc: Exception) -> JSONResponse:
    """
    全局异常处理函数
    
    Args:
        request: FastAPI请求对象
        exc: 捕获的异常
        
    Returns:
        JSONResponse: 包含错误详情的JSON响应
    """
    # 提取请求信息
    path = request.url.path
    method = request.method
    
    # 生成请求ID(如果请求中没有)
    request_id = getattr(request.state, "request_id", f"err-{datetime.now().strftime('%Y%m%d%H%M%S')}")
    
    # 准备基本错误详情
    error_detail = str(exc)
    error_trace = traceback.format_exc()
    status_code = 500
    error_code = ErrorCode.INTERNAL_SERVER_ERROR
    
    # 根据异常类型确定状态码和错误码
    if hasattr(exc, "status_code"):
        status_code = exc.status_code
    
    # 处理不同类型的错误
    if "ValidationError" in exc.__class__.__name__:
        error_code = ErrorCode.VALIDATION_ERROR
        status_code = 400
        logger.warning(f"Validation error in {path}: {error_detail}")
    elif "NotFound" in exc.__class__.__name__:
        error_code = ErrorCode.NOT_FOUND
        status_code = 404
        logger.warning(f"Resource not found in {path}: {error_detail}")
    elif "Permission" in exc.__class__.__name__:
        error_code = ErrorCode.PERMISSION_ERROR
        status_code = 403
        logger.warning(f"Permission error in {path}: {error_detail}")
    elif "ValueError" == exc.__class__.__name__:
        error_code = ErrorCode.INVALID_INPUT
        status_code = 400
        logger.warning(f"Invalid input in {path}: {error_detail}")
    else:
        # 未分类的错误作为内部服务器错误处理
        logger.error(f"Unhandled exception in {method} {path}: {error_detail}")
        logger.debug(f"Error trace: {error_trace}")
    
    # 构建错误响应
    error_response = {
        "status": "error",
        "message": error_detail,
        "error_code": error_code,
        "request_id": request_id,
        "timestamp": datetime.now().isoformat(),
        "path": path
    }
    
    # 在开发环境中添加更多调试信息
    if logger.level <= logging.DEBUG:
        error_response["debug_info"] = {
            "error_type": exc.__class__.__name__,
            "error_location": _extract_error_location(error_trace)
        }
    
    return JSONResponse(
        status_code=status_code,
        content=error_response
    )

def _extract_error_location(trace: str) -> Optional[Dict[str, Any]]:
    """从错误堆栈中提取错误位置信息"""
    try:
        # 分析堆栈跟踪以查找最相关的错误位置
        lines = trace.strip().split('\n')
        
        # 寻找第一个应用代码相关的行
        for line in lines:
            if "File" in line and "site-packages" not in line:
                # 文件位置通常在第一个引号对之间
                file_start = line.find('"') + 1
                file_end = line.find('"', file_start)
                
                # 行号通常在"line"之后
                line_num_start = line.find("line") + 5
                line_num_end = line.find(",", line_num_start)
                
                # 返回位置信息
                return {
                    "file": line[file_start:file_end] if file_start > 0 else "unknown",
                    "line": int(line[line_num_start:line_num_end]) if line_num_start > 5 else 0
                }
        
        # 如果没有找到应用代码，返回最后一个错误位置
        if len(lines) >= 2:
            return {"trace": lines[-2:]}
        
        return None
    except Exception:
        return None
