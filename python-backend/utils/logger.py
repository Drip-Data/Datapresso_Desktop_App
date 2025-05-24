"""
日志配置模块
"""

import logging
import logging.handlers
import sys
from pathlib import Path
from config import get_settings

settings = get_settings()


def setup_logger():
    """设置应用日志配置"""
    
    # 创建日志目录
    log_file_path = Path(settings.log_file)
    log_file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 根日志配置
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.log_level.upper()))
    
    # 清除已有的处理器
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # 创建格式化器
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, settings.log_level.upper()))
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # 文件处理器（带轮转）
    file_handler = logging.handlers.RotatingFileHandler(
        filename=settings.log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(getattr(logging, settings.log_level.upper()))
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)
    
    # 设置特定模块的日志级别
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    
    logging.info("Logger configured successfully")


def get_logger(name: str) -> logging.Logger:
    """获取指定名称的日志器"""
    return logging.getLogger(name)


class APILogger:
    """API专用日志记录器"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(f"api.{name}")
    
    def log_request(self, method: str, url: str, params: dict = None, body: dict = None):
        """记录API请求"""
        self.logger.info(f"Request: {method} {url}")
        if params:
            self.logger.debug(f"Params: {params}")
        if body:
            self.logger.debug(f"Body: {self._sanitize_data(body)}")
    
    def log_response(self, status_code: int, response_time: float, response_data: dict = None):
        """记录API响应"""
        self.logger.info(f"Response: {status_code} - {response_time:.3f}s")
        if response_data:
            self.logger.debug(f"Response data: {self._sanitize_data(response_data)}")
    
    def log_error(self, error: Exception, context: dict = None):
        """记录错误"""
        self.logger.error(f"Error: {error}")
        if context:
            self.logger.error(f"Context: {context}")
    
    def _sanitize_data(self, data: dict) -> dict:
        """清理敏感数据"""
        sensitive_keys = ['api_key', 'password', 'token', 'secret']
        sanitized = data.copy()
        
        for key in sensitive_keys:
            if key in sanitized:
                sanitized[key] = "***REDACTED***"
        
        return sanitized


class TaskLogger:
    """任务专用日志记录器"""
    
    def __init__(self, task_id: str, task_type: str):
        self.task_id = task_id
        self.task_type = task_type
        self.logger = logging.getLogger(f"task.{task_type}")
    
    def log_start(self, config: dict = None):
        """记录任务开始"""
        self.logger.info(f"Task {self.task_id} started - Type: {self.task_type}")
        if config:
            self.logger.debug(f"Task config: {config}")
    
    def log_progress(self, progress: float, message: str = None):
        """记录任务进度"""
        self.logger.info(f"Task {self.task_id} progress: {progress:.1%}")
        if message:
            self.logger.info(f"Task {self.task_id}: {message}")
    
    def log_completion(self, result: dict = None):
        """记录任务完成"""
        self.logger.info(f"Task {self.task_id} completed successfully")
        if result:
            self.logger.debug(f"Task result: {result}")
    
    def log_failure(self, error: Exception, context: dict = None):
        """记录任务失败"""
        self.logger.error(f"Task {self.task_id} failed: {error}")
        if context:
            self.logger.error(f"Failure context: {context}")
