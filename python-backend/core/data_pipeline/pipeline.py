import logging
from typing import List, Dict, Any, Callable, Optional, Union
import time
import traceback
import uuid
import json
import os
import asyncio

logger = logging.getLogger(__name__)

class PipelineStage:
    """数据处理管道的单个阶段"""
    
    def __init__(self, name: str, processor: Callable, stage_config: Dict[str, Any] = None):
        """
        初始化处理阶段
        
        Args:
            name: 阶段名称
            processor: 处理函数，接收(data, config)参数并返回处理后的数据
            stage_config: 阶段配置参数
        """
        self.name = name
        self.processor = processor
        self.config = stage_config or {}
        
    async def process(self, data: Any, context: Dict[str, Any] = None) -> Any:
        """
        执行阶段处理
        
        Args:
            data: 输入数据
            context: 处理上下文
            
        Returns:
            处理后的数据
        """
        try:
            start_time = time.time()
            
            # 如果processor是协程函数
            if asyncio.iscoroutinefunction(self.processor):
                result = await self.processor(data, self.config, context or {})
            else:
                result = self.processor(data, self.config, context or {})
            
            execution_time = time.time() - start_time
            
            # 记录处理结果
            metric = {
                "stage_name": self.name,
                "execution_time": execution_time,
                "input_size": self._estimate_size(data),
                "output_size": self._estimate_size(result),
                "status": "success"
            }
            
            if context is not None:
                if "metrics" not in context:
                    context["metrics"] = []
                context["metrics"].append(metric)
                
                # 记录阶段历史
                if "stage_history" not in context:
                    context["stage_history"] = []
                context["stage_history"].append(self.name)
            
            return result
            
        except Exception as e:
            error_detail = {
                "stage_name": self.name,
                "error": str(e),
                "traceback": traceback.format_exc(),
                "status": "failed"
            }
            
            if context is not None:
                if "errors" not in context:
                    context["errors"] = []
                context["errors"].append(error_detail)
            
            logger.error(f"管道阶段 '{self.name}' 处理失败: {str(e)}")
            raise
    
    def _estimate_size(self, data: Any) -> int:
        """估计数据大小（字节）"""
        if data is None:
            return 0
            
        if isinstance(data, (list, dict)):
            try:
                return len(json.dumps(data).encode('utf-8'))
            except:
                pass
        
        if hasattr(data, "__len__"):
            return len(data)
        
        return 0


class DataPipeline:
    """数据处理管道，支持顺序执行多个处理阶段"""
    
    def __init__(self, name: str = None, description: str = None):
        """
        初始化数据处理管道
        
        Args:
            name: 管道名称
            description: 管道描述
        """
        self.name = name or f"pipeline_{uuid.uuid4().hex[:8]}"
        self.description = description
        self.stages: List[PipelineStage] = []
        
    def add_stage(self, stage: PipelineStage) -> 'DataPipeline':
        """
        添加处理阶段
        
        Args:
            stage: 处理阶段
            
        Returns:
            管道实例（链式调用）
        """
        self.stages.append(stage)
        return self
    
    def create_stage(self, name: str, processor: Callable, config: Dict[str, Any] = None) -> 'DataPipeline':
        """
        创建并添加处理阶段
        
        Args:
            name: 阶段名称
            processor: 处理函数
            config: 阶段配置
            
        Returns:
            管道实例（链式调用）
        """
        stage = PipelineStage(name, processor, config)
        return self.add_stage(stage)
    
    async def execute(self, input_data: Any, 
                    pipeline_context: Dict[str, Any] = None,
                    start_stage: Optional[str] = None,
                    end_stage: Optional[str] = None) -> Dict[str, Any]:
        """
        执行完整管道
        
        Args:
            input_data: 输入数据
            pipeline_context: 管道执行上下文
            start_stage: 开始执行的阶段名称（用于从中间开始执行）
            end_stage: 结束执行的阶段名称（用于在中间结束执行）
            
        Returns:
            包含处理结果和指标的字典
        """
        # 初始化上下文
        context = pipeline_context or {}
        context.update({
            "pipeline_id": uuid.uuid4().hex,
            "pipeline_name": self.name,
            "start_time": time.time(),
            "metrics": [],
            "stage_history": [],
            "errors": []
        })
        
        # 确定起始和结束阶段的索引
        start_idx = 0
        end_idx = len(self.stages) - 1
        
        if start_stage:
            for i, stage in enumerate(self.stages):
                if stage.name == start_stage:
                    start_idx = i
                    break
        
        if end_stage:
            for i, stage in enumerate(self.stages):
                if stage.name == end_stage:
                    end_idx = i
                    break
        
        # 只执行指定范围内的阶段
        selected_stages = self.stages[start_idx:end_idx+1]
        
        # 记录总体信息
        logger.info(f"开始执行管道 '{self.name}' (ID: {context['pipeline_id']})")
        logger.info(f"执行 {len(selected_stages)} 个阶段: {[s.name for s in selected_stages]}")
        
        # 顺序执行各阶段
        current_data = input_data
        success = True
        failed_stage = None
        
        try:
            for stage in selected_stages:
                logger.debug(f"执行阶段 '{stage.name}'")
                current_data = await stage.process(current_data, context)
                
                # 如果阶段处理后数据为None，中断管道
                if current_data is None:
                    logger.warning(f"阶段 '{stage.name}' 返回None，管道执行中止")
                    success = False
                    failed_stage = stage.name
                    break
                
        except Exception as e:
            success = False
            failed_stage = stage.name if 'stage' in locals() else "unknown"
            logger.error(f"管道执行失败，阶段 '{failed_stage}': {str(e)}")
            # 异常已被记录到上下文中，此处不重新抛出
        
        # 计算总执行时间
        execution_time = time.time() - context["start_time"]
        
        # 构建结果
        result = {
            "data": current_data,
            "context": context,
            "pipeline_id": context["pipeline_id"],
            "success": success,
            "execution_time": execution_time,
            "stages_executed": len(context.get("stage_history", [])),
            "failed_stage": failed_stage if not success else None,
            "errors": context.get("errors", [])
        }
        
        logger.info(f"管道 '{self.name}' 执行完成，耗时: {execution_time:.2f}秒，状态: {'成功' if success else '失败'}")
        
        return result


# 预定义处理器示例
async def filter_data_processor(data, config, context):
    """过滤数据处理器"""
    from core.data_filters.advanced_filter import AdvancedFilterEngine
    
    filter_engine = AdvancedFilterEngine()
    result = filter_engine.filter_data(data, config)
    
    # 添加处理细节
    context["filter_details"] = {
        "input_count": len(data),
        "output_count": len(result),
        "rejection_rate": (len(data) - len(result)) / len(data) if data else 0
    }
    
    return result

async def transform_data_processor(data, config, context):
    """数据转换处理器"""
    import pandas as pd
    
    # 将数据转换为DataFrame
    df = pd.DataFrame(data)
    
    # 应用转换
    transformations = config.get("transformations", [])
    for transform in transformations:
        field = transform.get("field")
        operation = transform.get("operation")
        
        if not field or not operation:
            continue
            
        try:
            if operation == "uppercase" and field in df.columns:
                df[field] = df[field].astype(str).str.upper()
            elif operation == "lowercase" and field in df.columns:
                df[field] = df[field].astype(str).str.lower()
            elif operation == "round" and field in df.columns:
                precision = transform.get("precision", 2)
                df[field] = pd.to_numeric(df[field], errors='coerce').round(precision)
            elif operation == "format" and field in df.columns:
                format_str = transform.get("format")
                if format_str:
                    df[field] = df[field].apply(lambda x: format_str.format(x) if x is not None else x)
            elif operation == "replace" and field in df.columns:
                old_value = transform.get("old_value")
                new_value = transform.get("new_value")
                df[field] = df[field].replace(old_value, new_value)
            elif operation == "extract" and field in df.columns:
                pattern = transform.get("pattern")
                if pattern:
                    df[field] = df[field].astype(str).str.extract(pattern, expand=False)
            elif operation == "date_format" and field in df.columns:
                input_format = transform.get("input_format")
                output_format = transform.get("output_format")
                if input_format and output_format:
                    df[field] = pd.to_datetime(df[field], format=input_format, errors='coerce').dt.strftime(output_format)
        except Exception as e:
            context.setdefault("transform_errors", []).append({
                "field": field,
                "operation": operation,
                "error": str(e)
            })
    
    # 转回字典列表
    return df.to_dict('records')

async def sort_data_processor(data, config, context):
    """数据排序处理器"""
    sort_field = config.get("field")
    reverse = config.get("reverse", False)
    
    if not sort_field:
        return data
    
    sorted_data = sorted(
        data,
        key=lambda x: x.get(sort_field, 0) if x.get(sort_field) is not None else (0 if reverse else float('inf')),
        reverse=reverse
    )
    
    return sorted_data

async def deduplicate_processor(data, config, context):
    """数据去重处理器"""
    fields = config.get("fields", [])
    
    if not fields:
        # 按整个记录去重
        seen = set()
        result = []
        
        for item in data:
            item_json = json.dumps(item, sort_keys=True)
            if item_json not in seen:
                seen.add(item_json)
                result.append(item)
    else:
        # 按指定字段去重
        seen = set()
        result = []
        
        for item in data:
            key = tuple(item.get(field) for field in fields)
            if key not in seen:
                seen.add(key)
                result.append(item)
    
    # 添加处理细节
    context["dedup_details"] = {
        "input_count": len(data),
        "output_count": len(result),
        "duplicate_count": len(data) - len(result)
    }
    
    return result
