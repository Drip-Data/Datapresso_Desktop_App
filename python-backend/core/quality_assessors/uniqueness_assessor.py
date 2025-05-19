from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from collections import Counter

async def assess_uniqueness(
    data: List[Dict[str, Any]],
    detail_level: str = "medium"
) -> Dict[str, Any]:
    """
    评估数据唯一性
    
    Args:
        data: 要评估的数据
        detail_level: 详细程度
        
    Returns:
        包含唯一性评估结果的字典
    """
    if not data:
        return {
            "score": 0,
            "details": {"error": "空数据集"}
        }
    
    # 转换为DataFrame便于分析
    df = pd.DataFrame(data)
    
    # 计算每个字段的唯一值比例
    field_uniqueness = {}
    duplicate_counts = {}
    fields = df.columns
    
    for field in fields:
        # 获取非空值
        non_null_values = df[field].dropna()
        
        if len(non_null_values) == 0:
            field_uniqueness[field] = 1.0  # 没有值，默认唯一
            duplicate_counts[field] = 0
            continue
        
        # 计算唯一值数量和重复值数量
        value_counts = non_null_values.value_counts()
        unique_count = (value_counts == 1).sum()
        duplicate_count = len(non_null_values) - unique_count
        
        # 计算唯一性得分
        field_uniqueness[field] = unique_count / len(non_null_values) if len(non_null_values) > 0 else 1.0
        duplicate_counts[field] = duplicate_count
    
    # 识别完全重复的记录
    if len(data) > 1:
        # 将记录转换为元组以便计数（字典不可哈希）
        record_tuples = []
        for item in data:
            # 排序键以确保一致性
            sorted_item = sorted(item.items())
            record_tuples.append(tuple(sorted_item))
        
        # 计数
        record_counter = Counter(record_tuples)
        duplicate_records = {record: count for record, count in record_counter.items() if count > 1}
        
        # 计算重复记录比例
        duplicate_record_count = sum(count - 1 for count in record_counter.values() if count > 1)
        record_uniqueness = (len(data) - duplicate_record_count) / len(data)
    else:
        duplicate_records = {}
        duplicate_record_count = 0
        record_uniqueness = 1.0
    
    # 计算整体唯一性得分
    # 我们计算字段唯一性的平均值，并与记录唯一性加权组合
    if field_uniqueness:
        field_uniqueness_avg = sum(field_uniqueness.values()) / len(field_uniqueness)
        overall_score = field_uniqueness_avg * 0.7 + record_uniqueness * 0.3
    else:
        overall_score = record_uniqueness
    
    # 识别问题
    issues = []
    
    # 字段重复问题
    for field, duplicate_count in duplicate_counts.items():
        if duplicate_count > 0:
            severity = "high" if duplicate_count > len(data) * 0.2 else \
                      "medium" if duplicate_count > len(data) * 0.05 else "low"
            
            issues.append({
                "field": field,
                "issue_type": "duplicate_values",
                "duplicate_count": duplicate_count,
                "severity": severity,
                "description": f"字段 '{field}' 存在 {duplicate_count} 个重复值"
            })
    
    # 记录重复问题
    if duplicate_record_count > 0:
        severity = "high" if duplicate_record_count > len(data) * 0.1 else \
                  "medium" if duplicate_record_count > len(data) * 0.01 else "low"
        
        issues.append({
            "field": None,
            "issue_type": "duplicate_records",
            "duplicate_count": duplicate_record_count,
            "severity": severity,
            "description": f"存在 {duplicate_record_count} 条完全重复的记录"
        })
    
    # 根据详细程度返回不同级别的信息
    if detail_level == "low":
        return {
            "score": overall_score,
            "issues": issues
        }
    
    details = {
        "field_uniqueness": field_uniqueness,
        "duplicate_counts": duplicate_counts,
        "duplicate_record_count": duplicate_record_count,
        "record_uniqueness": record_uniqueness,
        "total_records": len(data)
    }
    
    if detail_level == "high":
        # 添加重复值的示例
        duplicate_examples = {}
        for field in fields:
            # 如果字段有重复值
            if duplicate_counts.get(field, 0) > 0:
                # 找出出现次数大于1的值
                duplicate_values = df[field].value_counts()
                duplicate_values = duplicate_values[duplicate_values > 1]
                
                # 取前5个最常见的重复值
                top_duplicates = duplicate_values.head(5)
                examples = {}
                
                for value, count in top_duplicates.items():
                    # 找出包含这个值的记录索引
                    matching_indices = df[df[field] == value].index.tolist()[:3]  # 最多3个例子
                    examples[str(value)] = {
                        "count": int(count),
                        "examples": [data[i] for i in matching_indices]
                    }
                
                duplicate_examples[field] = examples
        
        # 添加完全重复记录的例子
        if duplicate_record_count > 0:
            duplicate_record_examples = []
            # 将重复记录转换回字典
            for record_tuple, count in list(duplicate_records.items())[:5]:  # 最多5个例子
                record_dict = dict(record_tuple)
                duplicate_record_examples.append({
                    "record": record_dict,
                    "count": count
                })
            
            details["duplicate_record_examples"] = duplicate_record_examples
        
        details["duplicate_examples"] = duplicate_examples
    
    return {
        "score": overall_score,
        "issues": issues,
        "details": details,
        "field_scores": field_uniqueness
    }
