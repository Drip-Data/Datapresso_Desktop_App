from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

async def assess_completeness(
    data: List[Dict[str, Any]],
    schema: Optional[Dict[str, Any]] = None,
    detail_level: str = "medium"
) -> Dict[str, Any]:
    """
    评估数据完整性
    
    Args:
        data: 要评估的数据
        schema: 数据结构定义
        detail_level: 详细程度
        
    Returns:
        包含完整性评估结果的字典
    """
    if not data:
        return {
            "score": 0,
            "details": {"error": "空数据集"}
        }
    
    # 转换为DataFrame便于分析
    df = pd.DataFrame(data)
    
    # 计算每个字段的非空率
    non_null_rates = {}
    missing_rates = {}
    fields = df.columns
    
    for field in fields:
        non_null_count = df[field].notna().sum()
        total_count = len(df)
        non_null_rate = non_null_count / total_count if total_count > 0 else 0
        missing_rate = 1 - non_null_rate
        
        non_null_rates[field] = non_null_rate
        missing_rates[field] = missing_rate
    
    # 如果有模式定义，使用模式中定义的必填字段
    required_fields = []
    if schema and "properties" in schema:
        for field, props in schema["properties"].items():
            if props.get("nullable") is False or field in schema.get("required", []):
                required_fields.append(field)
    
    # 如果没有模式定义必填字段，假设所有字段都是必填的
    if not required_fields:
        required_fields = list(fields)
    
    # 计算整体完整性得分
    if required_fields:
        # 仅考虑必填字段的完整性
        required_non_null_rates = [non_null_rates.get(field, 0) for field in required_fields]
        overall_score = sum(required_non_null_rates) / len(required_fields) if required_fields else 0
    else:
        # 所有字段的平均完整性
        overall_score = sum(non_null_rates.values()) / len(non_null_rates) if non_null_rates else 0
    
    # 识别问题
    issues = []
    for field, missing_rate in missing_rates.items():
        if missing_rate > 0:
            if field in required_fields:
                if missing_rate > 0.1: # Required and more than 10% missing is high
                    severity = "high"
                else: # Required and some missing (<=10%) is medium
                    severity = "medium"
            else: # Not a required field
                if missing_rate > 0.2: # Optional and more than 20% missing is medium
                    severity = "medium"
                elif missing_rate > 0.05: # Optional and more than 5% missing is low
                    severity = "low"
                else: # Optional and very few missing might not even be an issue, or still low
                    severity = "low" # Default to low for any missing in optional if not meeting medium
            
            issues.append({
                "field": field,
                "issue_type": "missing_values",
                "missing_rate": missing_rate,
                "missing_count": int(missing_rate * len(df)),
                "severity": severity,
                "description": f"字段 '{field}' 有 {missing_rate:.1%} 的值缺失 ({int(missing_rate * len(df))} 条记录)"
            })
    
    # 根据详细程度返回不同级别的信息
    if detail_level == "low":
        return {
            "score": overall_score,
            "issues": issues
        }
    
    details = {
        "field_scores": non_null_rates,
        "missing_rates": missing_rates,
        "required_fields": required_fields,
        "total_records": len(df)
    }
    
    if detail_level == "high":
        # 为每个字段添加缺失值样例
        field_missing_examples = {}
        for field in fields:
            missing_indices = df[df[field].isna()].index.tolist()[:5]  # 最多5个例子
            if missing_indices:
                field_missing_examples[field] = [data[i] for i in missing_indices]
        
        details["missing_examples"] = field_missing_examples
    
    return {
        "score": overall_score,
        "issues": issues,
        "details": details,
        "field_scores": non_null_rates
    }
