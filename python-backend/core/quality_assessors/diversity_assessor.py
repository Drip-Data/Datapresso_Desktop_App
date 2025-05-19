from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import math
from scipy import stats

async def assess_diversity(
    data: List[Dict[str, Any]],
    detail_level: str = "medium"
) -> Dict[str, Any]:
    """
    评估数据多样性
    
    Args:
        data: 要评估的数据
        detail_level: 详细程度
        
    Returns:
        包含多样性评估结果的字典
    """
    if not data:
        return {
            "score": 0,
            "details": {"error": "空数据集"}
        }
    
    # 转换为DataFrame便于分析
    df = pd.DataFrame(data)
    
    # 计算每个字段的多样性指标
    field_diversity = {}
    entropy_scores = {}
    unique_value_ratios = {}
    fields = df.columns
    
    for field in fields:
        # 获取非空值
        non_null_values = df[field].dropna()
        
        if len(non_null_values) == 0:
            field_diversity[field] = 0.0  # 没有值，没有多样性
            entropy_scores[field] = 0.0
            unique_value_ratios[field] = 0.0
            continue
        
        # 计算唯一值比例
        unique_values = non_null_values.nunique()
        unique_ratio = unique_values / len(non_null_values)
        unique_value_ratios[field] = unique_ratio
        
        # 计算熵 (信息熵是衡量数据多样性的好指标)
        value_counts = non_null_values.value_counts(normalize=True)
        entropy = stats.entropy(value_counts)
        
        # 归一化熵
        max_entropy = math.log(len(value_counts)) if len(value_counts) > 1 else 1.0
        normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0.0
        entropy_scores[field] = normalized_entropy
        
        # 计算总体多样性得分 (熵和唯一值比例的加权组合)
        field_diversity[field] = normalized_entropy * 0.7 + unique_ratio * 0.3
    
    # 计算整体多样性得分
    if field_diversity:
        # 去除极端的离群值
        values = list(field_diversity.values())
        q1, q3 = np.percentile(values, [25, 75])
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        filtered_values = [v for v in values if lower_bound <= v <= upper_bound]
        
        overall_score = sum(filtered_values) / len(filtered_values) if filtered_values else sum(values) / len(values)
    else:
        overall_score = 0.0
    
    # 识别问题
    issues = []
    for field, diversity_score in field_diversity.items():
        if diversity_score < 0.3:
            severity = "high" if diversity_score < 0.1 else "medium" if diversity_score < 0.2 else "low"
            
            # 获取字段的唯一值数量和总记录数
            unique_count = df[field].nunique()
            total_count = df[field].notna().sum()
            
            issues.append({
                "field": field,
                "issue_type": "low_diversity",
                "diversity_score": diversity_score,
                "entropy": entropy_scores.get(field, 0),
                "unique_values": unique_count,
                "total_values": total_count,
                "severity": severity,
                "description": f"字段 '{field}' 多样性不足, 得分: {diversity_score:.2f}, 只有 {unique_count} 个不同值 (占比 {unique_count/total_count if total_count > 0 else 0:.1%})"
            })
    
    # 根据详细程度返回不同级别的信息
    if detail_level == "low":
        return {
            "score": overall_score,
            "issues": issues
        }
    
    # 计算数值型字段的分布统计
    distribution_stats = {}
    for field in fields:
        # 检查是否为数值型
        if pd.api.types.is_numeric_dtype(df[field]):
            # 计算四分位数等统计量
            stats_dict = {}
            try:
                stats_dict = {
                    "min": float(df[field].min()),
                    "max": float(df[field].max()),
                    "mean": float(df[field].mean()),
                    "median": float(df[field].median()),
                    "std": float(df[field].std()),
                    "q1": float(df[field].quantile(0.25)),
                    "q3": float(df[field].quantile(0.75))
                }
                
                # 计算数据分布的偏度和峰度
                stats_dict["skewness"] = float(df[field].skew())
                stats_dict["kurtosis"] = float(df[field].kurt())
                
                # 添加分布类型估计
                if abs(stats_dict["skewness"]) < 0.5 and abs(stats_dict["kurtosis"]) < 0.5:
                    stats_dict["distribution"] = "normal"
                elif stats_dict["skewness"] > 1:
                    stats_dict["distribution"] = "right_skewed"
                elif stats_dict["skewness"] < -1:
                    stats_dict["distribution"] = "left_skewed"
                else:
                    stats_dict["distribution"] = "unknown"
                
                distribution_stats[field] = stats_dict
            except Exception:
                # 跳过计算失败的字段
                pass
    
    details = {
        "field_diversity": field_diversity,
        "entropy_scores": entropy_scores,
        "unique_value_ratios": unique_value_ratios,
        "distribution_stats": distribution_stats,
        "total_records": len(data)
    }
    
    if detail_level == "high":
        # 添加详细的分布信息
        value_distributions = {}
        for field in fields:
            # 字符串类型字段的值分布
            if pd.api.types.is_string_dtype(df[field]):
                # 计算前10个最常见的值
                value_counts = df[field].value_counts().head(10)
                value_distributions[field] = {
                    "type": "categorical",
                    "top_values": {str(k): int(v) for k, v in value_counts.items()},
                    "total_values": int(df[field].notna().sum())
                }
            
            # 数值型字段的分布直方图
            elif pd.api.types.is_numeric_dtype(df[field]):
                try:
                    # 计算直方图
                    hist, bin_edges = np.histogram(df[field].dropna(), bins=10)
                    
                    value_distributions[field] = {
                        "type": "numeric",
                        "histogram": {
                            "counts": hist.tolist(),
                            "bin_edges": bin_edges.tolist()
                        }
                    }
                except Exception:
                    pass
        
        details["value_distributions"] = value_distributions
    
    return {
        "score": overall_score,
        "issues": issues,
        "details": details,
        "field_scores": field_diversity
    }
