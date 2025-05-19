import pandas as pd
import numpy as np
from typing import List, Dict, Any, Union, Callable
import re
import logging

logger = logging.getLogger(__name__)

class AdvancedFilterEngine:
    """增强版数据过滤引擎，支持复杂条件和优化性能"""
    
    def __init__(self):
        self.registered_functions = {}
        self._register_default_functions()
    
    def _register_default_functions(self):
        """注册默认过滤函数"""
        # 文本处理函数
        self.register_function("contains", lambda x, y: x and y and str(y).lower() in str(x).lower())
        self.register_function("starts_with", lambda x, y: x and y and str(x).lower().startswith(str(y).lower()))
        self.register_function("ends_with", lambda x, y: x and y and str(x).lower().endswith(str(y).lower()))
        self.register_function("regex_match", lambda x, y: x and y and bool(re.search(y, str(x))))
        
        # 数值处理函数
        self.register_function("greater_than", lambda x, y: x is not None and y is not None and float(x) > float(y))
        self.register_function("less_than", lambda x, y: x is not None and y is not None and float(x) < float(y))
        self.register_function("in_range", lambda x, y: x is not None and y and len(y) == 2 and float(y[0]) <= float(x) <= float(y[1]))
        
        # 空值处理函数
        self.register_function("is_null", lambda x, _: x is None or x == "")
        self.register_function("is_not_null", lambda x, _: x is not None and x != "")
        
        # 列表处理函数
        self.register_function("in_list", lambda x, y: x is not None and y and x in y)
        self.register_function("not_in_list", lambda x, y: x is not None and y and x not in y)
    
    def register_function(self, name: str, func: Callable):
        """注册自定义过滤函数"""
        self.registered_functions[name] = func
    
    def filter_data(self, data: List[Dict[str, Any]], 
                   filter_config: Dict[str, Any],
                   use_pandas: bool = True) -> List[Dict[str, Any]]:
        """
        使用配置过滤数据
        
        Args:
            data: 要过滤的数据列表
            filter_config: 过滤配置
            use_pandas: 是否使用pandas优化（适用于大数据集）
            
        Returns:
            过滤后的数据列表
        """
        if not data or not filter_config:
            return data
        
        # 提取过滤条件
        conditions = filter_config.get("conditions", [])
        combine_mode = filter_config.get("combine_mode", "AND").upper()
        
        if not conditions:
            return data
        
        # 对于大数据集，使用pandas加速
        if use_pandas and len(data) > 1000:
            return self._filter_with_pandas(data, conditions, combine_mode)
        
        # 对于小数据集，直接使用Python列表处理
        return self._filter_with_python(data, conditions, combine_mode)
    
    def _filter_with_python(self, data: List[Dict[str, Any]], 
                           conditions: List[Dict[str, Any]],
                           combine_mode: str) -> List[Dict[str, Any]]:
        """使用纯Python处理过滤"""
        result = []
        
        for item in data:
            matches = []
            
            for condition in conditions:
                field = condition.get("field")
                operation = condition.get("operation")
                value = condition.get("value")
                
                # 跳过不完整的条件
                if not field or not operation:
                    continue
                
                # 获取字段值
                field_value = item.get(field)
                
                # 获取操作函数
                op_func = self.registered_functions.get(operation)
                if not op_func:
                    logger.warning(f"未知的操作类型: {operation}")
                    continue
                
                # 应用过滤器
                try:
                    match = op_func(field_value, value)
                    matches.append(match)
                except Exception as e:
                    logger.error(f"过滤操作错误 ({operation}): {e}")
                    matches.append(False)
            
            # 根据组合模式决定是否包含数据项
            if combine_mode == "AND" and all(matches):
                result.append(item)
            elif combine_mode == "OR" and any(matches):
                result.append(item)
        
        return result
    
    def _filter_with_pandas(self, data: List[Dict[str, Any]], 
                           conditions: List[Dict[str, Any]],
                           combine_mode: str) -> List[Dict[str, Any]]:
        """使用pandas加速过滤大数据集"""
        # 转换为DataFrame
        df = pd.DataFrame(data)
        if df.empty:
            return []
        
        # 创建过滤掩码
        if combine_mode == "AND":
            mask = pd.Series([True] * len(df))
            for condition in conditions:
                field = condition.get("field")
                operation = condition.get("operation")
                value = condition.get("value")
                
                # 跳过不完整的条件
                if not field or not operation:
                    continue
                
                # 跳过不存在的字段
                if field not in df.columns:
                    continue
                
                # 应用过滤器
                try:
                    if operation == "equals":
                        mask &= df[field] == value
                    elif operation == "not_equals":
                        mask &= df[field] != value
                    elif operation == "contains":
                        mask &= df[field].astype(str).str.contains(str(value), case=False, na=False)
                    elif operation == "starts_with":
                        mask &= df[field].astype(str).str.startswith(str(value), na=False)
                    elif operation == "ends_with":
                        mask &= df[field].astype(str).str.endswith(str(value), na=False)
                    elif operation == "greater_than":
                        mask &= pd.to_numeric(df[field], errors='coerce') > float(value)
                    elif operation == "less_than":
                        mask &= pd.to_numeric(df[field], errors='coerce') < float(value)
                    elif operation == "in_range":
                        if isinstance(value, list) and len(value) == 2:
                            numeric_column = pd.to_numeric(df[field], errors='coerce')
                            mask &= (numeric_column >= float(value[0])) & (numeric_column <= float(value[1]))
                    elif operation == "is_null":
                        mask &= df[field].isna() | (df[field] == "")
                    elif operation == "is_not_null":
                        mask &= df[field].notna() & (df[field] != "")
                    elif operation == "in_list":
                        mask &= df[field].isin(value)
                    elif operation == "not_in_list":
                        mask &= ~df[field].isin(value)
                    elif operation == "regex_match":
                        mask &= df[field].astype(str).str.match(value, na=False)
                except Exception as e:
                    logger.error(f"pandas过滤操作错误 ({operation}): {e}")
        
        elif combine_mode == "OR":
            mask = pd.Series([False] * len(df))
            for condition in conditions:
                field = condition.get("field")
                operation = condition.get("operation")
                value = condition.get("value")
                
                # 跳过不完整的条件
                if not field or not operation:
                    continue
                
                # 跳过不存在的字段
                if field not in df.columns:
                    continue
                
                # 应用过滤器
                try:
                    if operation == "equals":
                        mask |= df[field] == value
                    elif operation == "not_equals":
                        mask |= df[field] != value
                    elif operation == "contains":
                        mask |= df[field].astype(str).str.contains(str(value), case=False, na=False)
                    elif operation == "starts_with":
                        mask |= df[field].astype(str).str.startswith(str(value), na=False)
                    elif operation == "ends_with":
                        mask |= df[field].astype(str).str.endswith(str(value), na=False)
                    elif operation == "greater_than":
                        mask |= pd.to_numeric(df[field], errors='coerce') > float(value)
                    elif operation == "less_than":
                        mask |= pd.to_numeric(df[field], errors='coerce') < float(value)
                    elif operation == "in_range":
                        if isinstance(value, list) and len(value) == 2:
                            numeric_column = pd.to_numeric(df[field], errors='coerce')
                            mask |= (numeric_column >= float(value[0])) & (numeric_column <= float(value[1]))
                    elif operation == "is_null":
                        mask |= df[field].isna() | (df[field] == "")
                    elif operation == "is_not_null":
                        mask |= df[field].notna() & (df[field] != "")
                    elif operation == "in_list":
                        mask |= df[field].isin(value)
                    elif operation == "not_in_list":
                        mask |= ~df[field].isin(value)
                    elif operation == "regex_match":
                        mask |= df[field].astype(str).str.match(value, na=False)
                except Exception as e:
                    logger.error(f"pandas过滤操作错误 ({operation}): {e}")
        
        # 应用掩码并转回字典列表
        filtered_df = df[mask]
        return filtered_df.to_dict('records')
