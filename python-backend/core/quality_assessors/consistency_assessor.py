from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from collections import Counter

async def assess_consistency(
    data: List[Dict[str, Any]],
    schema: Optional[Dict[str, Any]] = None,
    detail_level: str = "medium"
) -> Dict[str, Any]:
    """
    评估数据一致性
    
    Args:
        data: 要评估的数据
        schema: 数据结构定义
        detail_level: 详细程度
        
    Returns:
        包含一致性评估结果的字典
    """
    if not data:
        return {
            "score": 0,
            "details": {"error": "空数据集"}
        }
    
    # 转换为DataFrame便于分析
    df = pd.DataFrame(data)
    
    # 检查类型一致性
    type_consistency = {}
    format_consistency = {}
    fields = df.columns
    
    for field in fields:
        # 获取所有非空值
        non_null_values = df[field].dropna().tolist()
        
        if not non_null_values:
            type_consistency[field] = 1.0  # 没有值，默认一致
            format_consistency[field] = 1.0
            continue
        
        # 类型一致性
        value_types = [type(v).__name__ for v in non_null_values]
        type_counts = Counter(value_types)
        most_common_type, most_common_count = type_counts.most_common(1)[0]
        type_consistency_score = most_common_count / len(non_null_values)
        type_consistency[field] = type_consistency_score
        
        # 格式一致性 (仅针对字符串类型)
        if most_common_type == 'str':
            # 检查常见格式模式：日期、电子邮件、电话号码等
            format_patterns = {
                "date_1": r'\d{4}-\d{2}-\d{2}',            # YYYY-MM-DD
                "date_2": r'\d{2}/\d{2}/\d{4}',            # MM/DD/YYYY
                "email": r'[^@]+@[^@]+\.[^@]+',            # 简单邮箱
                "phone_1": r'\d{3}-\d{3}-\d{4}',           # 000-000-0000
                "phone_2": r'\(\d{3}\) \d{3}-\d{4}',       # (000) 000-0000
                "number_format": r'^-?\d+(\.\d+)?$',       # 数字格式
                "currency": r'^\$\d+(\.\d{2})?$'           # $金额
            }
            
            string_values = [v for v in non_null_values if isinstance(v, str)]
            if not string_values:
                format_consistency[field] = 1.0
                continue
            
            # 检查每个模式的匹配率
            import re
            pattern_matches = {}
            for pattern_name, pattern in format_patterns.items():
                matches = [bool(re.match(pattern, str(v))) for v in string_values]
                match_rate = sum(matches) / len(string_values)
                if match_rate > 0.1:  # 如果超过10%的值匹配某个模式
                    pattern_matches[pattern_name] = match_rate
            
            if pattern_matches:
                # 取最匹配的模式
                best_pattern, best_rate = max(pattern_matches.items(), key=lambda x: x[1])
                format_consistency[field] = best_rate
            else:
                # 没有明显的格式模式，考虑长度一致性
                lengths = [len(str(v)) for v in string_values]
                length_counts = Counter(lengths)
                most_common_length, most_common_count = length_counts.most_common(1)[0]
                format_consistency[field] = most_common_count / len(string_values)
        else:
            # 非字符串类型，格式一致性等于类型一致性
            format_consistency[field] = type_consistency_score
    
    # 检查字段间关系的一致性
    relationship_consistency = 1.0
    inconsistent_relationships = []
    
    # 如果有模式定义，检查字段间关系
    if schema and "dependencies" in schema:
        for field, dependencies in schema["dependencies"].items():
            if field not in df.columns:
                continue
                
            for dep_field in dependencies:
                if dep_field not in df.columns:
                    continue
                
                # 检查依赖字段存在时主字段是否也存在
                mask = df[dep_field].notna()
                if mask.sum() > 0:
                    consistency = df.loc[mask, field].notna().mean()
                    if consistency < 1.0:
                        inconsistent_relationships.append({
                            "field": field,
                            "depends_on": dep_field,
                            "consistency": consistency,
                            "description": f"当 '{dep_field}' 存在时，'{field}' 应该存在，但一致性只有 {consistency:.1%}"
                        })
    
    # 计算整体一致性得分
    field_scores = {}
    for field in fields:
        # 字段一致性得分为类型一致性和格式一致性的加权平均
        field_scores[field] = 0.6 * type_consistency.get(field, 0) + 0.4 * format_consistency.get(field, 0)
    
    overall_score = sum(field_scores.values()) / len(field_scores) if field_scores else 0
    
    # 如果有字段间关系不一致，适当降低总分
    if inconsistent_relationships:
        relationship_penalty = min(0.2, 0.05 * len(inconsistent_relationships))
        overall_score = max(0, overall_score - relationship_penalty)
    
    # 识别问题
    issues = []
    for field, consistency in field_scores.items():
        if consistency < 0.95:
            severity = "high" if consistency < 0.8 else "medium" if consistency < 0.9 else "low"
            
            type_issue = type_consistency.get(field, 1.0) < 0.95
            format_issue = format_consistency.get(field, 1.0) < 0.95
            
            issue_type = "inconsistent_type" if type_issue else "inconsistent_format"
            
            issues.append({
                "field": field,
                "issue_type": issue_type,
                "consistency": consistency,
                "severity": severity,
                "description": f"字段 '{field}' 的{'类型' if type_issue else '格式'}不一致，一致性评分为 {consistency:.1%}"
            })
    
    # 添加关系一致性问题
    for rel in inconsistent_relationships:
        issues.append({
            "field": f"{rel['field']}_{rel['depends_on']}",
            "issue_type": "inconsistent_relationship",
            "consistency": rel["consistency"],
            "severity": "high" if rel["consistency"] < 0.8 else "medium",
            "description": rel["description"]
        })
    
    # 根据详细程度返回不同级别的信息
    if detail_level == "low":
        return {
            "score": overall_score,
            "issues": issues
        }
    
    details = {
        "type_consistency": type_consistency,
        "format_consistency": format_consistency,
        "relationship_consistency": inconsistent_relationships,
        "total_records": len(df)
    }
    
    if detail_level == "high":
        # 为每个字段添加类型不一致的样例
        type_inconsistency_examples = {}
        for field in fields:
            if type_consistency.get(field, 1.0) < 1.0:
                # 获取该字段的所有值及其类型
                field_values = [(i, v, type(v).__name__) for i, v in enumerate(df[field].tolist()) if pd.notna(v)]
                
                # 按类型分组
                by_type = {}
                for idx, val, val_type in field_values:
                    if val_type not in by_type:
                        by_type[val_type] = []
                    by_type[val_type].append((idx, val))
                
                # 从每种类型中取一个例子
                examples = []
                for val_type, values in by_type.items():
                    if values:
                        idx, val = values[0]
                        examples.append({
                            "index": idx,
                            "value": val,
                            "type": val_type
                        })
                
                if len(examples) > 1:  # 只有当有多种类型时才添加例子
                    type_inconsistency_examples[field] = examples
        
        details["type_inconsistency_examples"] = type_inconsistency_examples
    
    return {
        "score": overall_score,
        "issues": issues,
        "details": details,
        "field_scores": field_scores
    }
