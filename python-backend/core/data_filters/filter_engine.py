from typing import List, Dict, Any, Tuple, Callable, Optional
import re
from schemas import FilterCondition, FilterOperation # Changed import to schemas

def apply_filters(
    data: List[Dict[str, Any]],
    filter_conditions: List[FilterCondition],
    combine_operation: str = "AND"
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    应用过滤条件到数据集
    
    Args:
        data: 要过滤的数据列表
        filter_conditions: 过滤条件列表
        combine_operation: 条件组合方式('AND'或'OR')
        
    Returns:
        (filtered_data, filter_summary): 过滤后的数据和过滤摘要
    """
    # 初始化过滤摘要
    summary = {
        "total_items": len(data),
        "applied_conditions": len(filter_conditions),
        "combine_operation": combine_operation,
        "condition_matches": {},
        "fields_analyzed": set()
    }
    
    # 如果没有过滤条件，返回所有数据
    if not filter_conditions:
        return data, {
            **summary,
            "filtered_items": len(data),
            "message": "No filter conditions provided"
        }
    
    # 将每个过滤条件转换为过滤函数
    filter_funcs = []
    for condition in filter_conditions:
        filter_func = _create_filter_function(condition)
        filter_funcs.append((condition, filter_func))
        summary["fields_analyzed"].add(condition.field)
    
    # 应用过滤条件
    filtered_data = []
    for item in data:
        matches = []
        
        for condition, filter_func in filter_funcs:
            condition_key = f"{condition.field}_{condition.operation.value}"
            result = filter_func(item)
            matches.append(result)
            
            # 更新条件匹配计数
            if condition_key not in summary["condition_matches"]:
                summary["condition_matches"][condition_key] = 0
            if result:
                summary["condition_matches"][condition_key] += 1
        
        # 基于组合操作决定是否包含项目
        include_item = all(matches) if combine_operation == "AND" else any(matches)
        
        # 如果满足条件，添加到过滤结果
        if include_item:
            filtered_data.append(item)
    
    # 构建最终摘要
    summary["filtered_items"] = len(filtered_data)
    summary["fields_analyzed"] = list(summary["fields_analyzed"])
    summary["rejection_rate"] = (len(data) - len(filtered_data)) / len(data) if data else 0
    
    return filtered_data, summary

def _create_filter_function(condition: FilterCondition) -> Callable:
    """
    为给定的过滤条件创建过滤函数
    
    Args:
        condition: 过滤条件对象
        
    Returns:
        返回一个接受数据项并返回布尔值的函数
    """
    field = condition.field
    operation = condition.operation
    value = condition.value
    case_sensitive = condition.case_sensitive
    
    def filter_func(item: Dict[str, Any]) -> bool:
        # 获取字段值，如果不存在则返回None
        item_value = item.get(field)
        
        # 字符串值处理大小写敏感性
        if isinstance(item_value, str) and isinstance(value, str) and not case_sensitive:
            item_value = item_value.lower()
            compare_value = value.lower()
        else:
            compare_value = value
        
        # 根据操作类型应用不同的比较
        if operation == FilterOperation.EQUALS:
            return item_value == compare_value
        elif operation == FilterOperation.NOT_EQUALS:
            return item_value != compare_value
        elif operation == FilterOperation.GREATER_THAN:
            return item_value > compare_value if item_value is not None else False
        elif operation == FilterOperation.GREATER_THAN_EQUALS: # Added
            return item_value >= compare_value if item_value is not None else False # Added
        elif operation == FilterOperation.LESS_THAN:
            return item_value < compare_value if item_value is not None else False
        elif operation == FilterOperation.LESS_THAN_EQUALS: # Added
            return item_value <= compare_value if item_value is not None else False # Added
        elif operation == FilterOperation.CONTAINS:
            return compare_value in item_value if isinstance(item_value, str) else False
        elif operation == FilterOperation.NOT_CONTAINS:
            return compare_value not in item_value if isinstance(item_value, str) else True
        elif operation == FilterOperation.STARTS_WITH:
            return item_value.startswith(compare_value) if isinstance(item_value, str) else False
        elif operation == FilterOperation.ENDS_WITH:
            return item_value.endswith(compare_value) if isinstance(item_value, str) else False
        elif operation == FilterOperation.IN_RANGE:
            return compare_value[0] <= item_value <= compare_value[1] if item_value is not None else False
        elif operation == FilterOperation.NOT_IN_RANGE:
            return not (compare_value[0] <= item_value <= compare_value[1]) if item_value is not None else True
        elif operation == FilterOperation.REGEX_MATCH:
            return bool(re.match(compare_value, item_value)) if isinstance(item_value, str) else False
        elif operation == FilterOperation.IS_NULL:
            return item_value is None
        elif operation == FilterOperation.IS_NOT_NULL:
            return item_value is not None
        else:
            raise ValueError(f"Unsupported filter operation: {operation}")
    
    return filter_func
