from typing import List, Dict, Any, Tuple, Optional, Callable
import math
import numpy as np
import re
import json
from datetime import datetime

async def evaluate_metrics(
    data: List[Dict[str, Any]],
    reference_data: Optional[List[Dict[str, Any]]] = None,
    metrics: List[str] = [],
    custom_metric_code: Optional[str] = None,
    weights: Optional[Dict[str, float]] = None
) -> Tuple[List[Dict[str, Any]], float]:
    """
    评估数据质量和特性
    
    Args:
        data: 要评估的数据列表
        reference_data: 参考数据列表(可选)
        metrics: 要评估的指标列表
        custom_metric_code: 自定义指标代码(可选)
        weights: 指标权重字典(可选)
        
    Returns:
        (metric_scores, overall_score): 各指标得分列表和总体评分
    """
    if not data:
        return [], 0.0
    
    # 初始化结果
    metric_scores = []
    
    # 评估各指标
    for metric in metrics:
        if metric == "completeness":
            score_result = evaluate_completeness(data)
        elif metric == "accuracy" and reference_data:
            score_result = evaluate_accuracy(data, reference_data)
        elif metric == "consistency":
            score_result = evaluate_consistency(data)
        elif metric == "diversity":
            score_result = evaluate_diversity(data)
        elif metric == "relevance" and reference_data:
            score_result = evaluate_relevance(data, reference_data)
        elif metric == "custom" and custom_metric_code:
            score_result = evaluate_custom(data, custom_metric_code)
        else:
            # 如果指标无法评估（如缺少参考数据），跳过
            continue
        
        metric_scores.append({
            "metric": metric,
            "score": score_result["score"],
            "details": score_result.get("details", {}),
            "issues": score_result.get("issues", []),
            "recommendations": score_result.get("recommendations", [])
        })
    
    # 计算总体评分
    overall_score = calculate_overall_score(metric_scores, weights)
    
    return metric_scores, overall_score

def calculate_overall_score(metric_scores: List[Dict[str, Any]], weights: Optional[Dict[str, float]] = None) -> float:
    """计算总体评分"""
    if not metric_scores:
        return 0.0
    
    total_score = 0.0
    total_weight = 0.0
    
    # 如果未提供权重，使用平均权重
    if not weights:
        weights = {score["metric"]: 1.0 for score in metric_scores}
    
    for score_info in metric_scores:
        metric = score_info["metric"]
        score = score_info["score"]
        
        # 获取权重，默认为1
        weight = weights.get(metric, 1.0)
        total_score += score * weight
        total_weight += weight
    
    # 防止除以零
    if total_weight == 0:
        return 0.0
    
    # 返回加权平均分
    return total_score / total_weight

def evaluate_completeness(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """评估数据完整性"""
    if not data:
        return {"score": 0, "details": {"error": "Empty dataset"}}
    
    # 获取所有可能的字段
    all_fields = set()
    for item in data:
        all_fields.update(item.keys())
    
    all_fields = list(all_fields)
    
    # 统计每个字段的非空值
    field_counts = {field: 0 for field in all_fields}
    
    for item in data:
        for field in all_fields:
            if field in item and item[field] is not None:
                field_counts[field] += 1
    
    # 计算每个字段的完整性得分
    field_scores = {}
    issues = []
    
    for field in all_fields:
        completeness = field_counts[field] / len(data)
        field_scores[field] = completeness
        
        # 识别问题字段
        if completeness < 0.8:
            severity = "high" if completeness < 0.5 else "medium"
            issues.append({
                "field": field,
                "description": f"字段 '{field}' 完整率低 ({completeness:.1%})",
                "severity": severity,
                "recommendation": f"考虑补充字段 '{field}' 的缺失值或移除该字段"
            })
    
    # 计算整体完整性得分
    total_score = sum(field_scores.values()) / len(field_scores) if field_scores else 0
    
    return {
        "score": total_score,
        "details": {
            "field_scores": field_scores,
            "fields_analyzed": len(field_scores)
        },
        "issues": issues,
        "recommendations": [
            "考虑移除完整率极低的字段",
            "对关键字段进行数据补全"
        ] if issues else []
    }

def evaluate_accuracy(data: List[Dict[str, Any]], reference_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """评估数据准确性（相对于参考数据）"""
    if not data or not reference_data:
        return {"score": 0, "details": {"error": "Empty dataset or reference"}}
    
    # 简单情况：匹配ID并比较
    if "id" in data[0] and "id" in reference_data[0]:
        return _evaluate_accuracy_by_id(data, reference_data)
    
    # 复杂情况：尝试基于共同字段匹配
    common_fields = set(data[0].keys()).intersection(set(reference_data[0].keys()))
    if not common_fields:
        return {"score": 0, "details": {"error": "No common fields between datasets"}}
    
    # 使用共同字段计算相似度
    similarity_scores = []
    issues = []
    
    for item in data:
        best_match_score = 0
        best_match = None
        
        for ref_item in reference_data:
            match_score = _calculate_item_similarity(item, ref_item, common_fields)
            if match_score > best_match_score:
                best_match_score = match_score
                best_match = ref_item
        
        similarity_scores.append(best_match_score)
        
        # 识别低相似度项
        if best_match_score < 0.7 and best_match:
            issues.append({
                "item_id": item.get("id", "unknown"),
                "description": f"数据项与参考数据相似度低 ({best_match_score:.1%})",
                "severity": "medium",
                "item_data": item,
                "best_match": best_match
            })
    
    # 计算平均相似度作为准确性得分
    accuracy_score = sum(similarity_scores) / len(similarity_scores) if similarity_scores else 0
    
    return {
        "score": accuracy_score,
        "details": {
            "similarity_scores": similarity_scores,
            "items_analyzed": len(data)
        },
        "issues": issues,
        "recommendations": [
            "检查并修正与参考数据差异较大的项",
            "考虑重新审视数据来源或收集方法"
        ] if issues else []
    }

def _evaluate_accuracy_by_id(data: List[Dict[str, Any]], reference_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """基于ID匹配评估准确性"""
    # 创建参考数据索引
    ref_index = {item["id"]: item for item in reference_data}
    
    matches = 0
    field_matches = {}
    issues = []
    
    for item in data:
        item_id = item.get("id")
        if item_id in ref_index:
            ref_item = ref_index[item_id]
            
            # 计算字段匹配度
            matched_fields = 0
            total_fields = 0
            
            for field in item:
                if field in ref_item:
                    total_fields += 1
                    if item[field] == ref_item[field]:
                        matched_fields += 1
                        
                        # 更新字段匹配统计
                        if field not in field_matches:
                            field_matches[field] = {"matched": 0, "total": 0}
                        field_matches[field]["matched"] += 1
                        field_matches[field]["total"] += 1
                    else:
                        # 更新字段匹配统计
                        if field not in field_matches:
                            field_matches[field] = {"matched": 0, "total": 0}
                        field_matches[field]["total"] += 1
                        
                        # 记录不匹配字段
                        issues.append({
                            "item_id": item_id,
                            "field": field,
                            "description": f"字段 '{field}' 值不匹配",
                            "actual": item[field],
                            "expected": ref_item[field],
                            "severity": "medium"
                        })
            
            if total_fields > 0:
                item_accuracy = matched_fields / total_fields
                matches += item_accuracy
    
    # 计算整体准确性得分
    accuracy_score = matches / len(data) if data else 0
    
    # 计算字段准确率
    field_accuracy = {}
    for field, counts in field_matches.items():
        field_accuracy[field] = counts["matched"] / counts["total"] if counts["total"] > 0 else 0
    
    return {
        "score": accuracy_score,
        "details": {
            "field_accuracy": field_accuracy,
            "items_analyzed": len(data),
            "items_matched": sum(1 for item in data if item.get("id") in ref_index)
        },
        "issues": issues,
        "recommendations": [
            "重点检查准确率低的字段",
            "审查数据收集过程中可能的系统性错误"
        ] if issues else []
    }

def _calculate_item_similarity(item1: Dict[str, Any], item2: Dict[str, Any], 
                             fields: Optional[set] = None) -> float:
    """计算两个数据项的相似度"""
    if fields is None:
        fields = set(item1.keys()).intersection(set(item2.keys()))
    
    if not fields:
        return 0.0
    
    matches = 0
    for field in fields:
        if field in item1 and field in item2:
            # 根据字段类型进行比较
            if isinstance(item1[field], (int, float)) and isinstance(item2[field], (int, float)):
                # 数值型：容忍小的差异
                max_val = max(abs(item1[field]), abs(item2[field]))
                if max_val == 0:
                    matches += 1 if item1[field] == item2[field] else 0
                else:
                    diff = abs(item1[field] - item2[field]) / max_val
                    matches += 1 - min(1, diff)
            elif isinstance(item1[field], str) and isinstance(item2[field], str):
                # 字符串：计算相似度
                if item1[field] == item2[field]:
                    matches += 1
                else:
                    # 简单字符串相似度
                    similarity = _string_similarity(item1[field], item2[field])
                    matches += similarity
            elif item1[field] == item2[field]:
                # 其他类型：精确匹配
                matches += 1
    
    return matches / len(fields) if fields else 0

def _string_similarity(s1: str, s2: str) -> float:
    """计算两个字符串的相似度"""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    
    # 使用较长字符串的长度作为分母
    max_len = max(len(s1), len(s2))
    
    # 计算编辑距离
    distance = _levenshtein_distance(s1, s2)
    
    # 转换为相似度
    return 1.0 - (distance / max_len)

def _levenshtein_distance(s1: str, s2: str) -> int:
    """计算两个字符串的编辑距离"""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]

def evaluate_consistency(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """评估数据一致性"""
    if not data:
        return {"score": 0, "details": {"error": "Empty dataset"}}
    
    # 检查字段存在的一致性
    fields = set()
    for item in data:
        fields.update(item.keys())
    
    field_presence = {field: 0 for field in fields}
    for item in data:
        for field in fields:
            if field in item:
                field_presence[field] += 1
    
    # 计算字段存在一致性
    field_consistency = {}
    issues = []
    
    for field, count in field_presence.items():
        consistency = count / len(data)
        field_consistency[field] = consistency
        
        # 识别不一致字段
        if consistency < 1.0:
            severity = "high" if consistency < 0.7 else "medium"
            issues.append({
                "field": field,
                "description": f"字段 '{field}' 在数据集中出现不一致 ({consistency:.1%})",
                "severity": severity,
                "recommendation": f"确保字段 '{field}' 在所有数据项中都存在"
            })
    
    # 检查数据类型一致性
    type_consistency = {}
    
    for field in fields:
        field_types = {}
        
        for item in data:
            if field in item and item[field] is not None:
                value_type = type(item[field]).__name__
                if value_type not in field_types:
                    field_types[value_type] = 0
                field_types[value_type] += 1
        
        # 计算主导类型的比例
        if field_types:
            dominant_type = max(field_types.items(), key=lambda x: x[1])
            type_consistency[field] = dominant_type[1] / sum(field_types.values())
            
            # 识别类型不一致的字段
            if type_consistency[field] < 1.0:
                severity = "high" if type_consistency[field] < 0.9 else "medium"
                issues.append({
                    "field": field,
                    "description": f"字段 '{field}' 的数据类型不一致",
                    "severity": severity,
                    "types": field_types,
                    "recommendation": f"统一字段 '{field}' 的数据类型为 {dominant_type[0]}"
                })
    
    # 计算整体一致性得分
    presence_score = sum(field_consistency.values()) / len(field_consistency) if field_consistency else 0
    type_score = sum(type_consistency.values()) / len(type_consistency) if type_consistency else 0
    
    overall_score = (presence_score + type_score) / 2
    
    return {
        "score": overall_score,
        "details": {
            "field_presence": field_consistency,
            "type_consistency": type_consistency
        },
        "issues": issues,
        "recommendations": [
            "确保所有字段在数据集中一致出现",
            "统一每个字段的数据类型"
        ] if issues else []
    }

def evaluate_diversity(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """评估数据多样性"""
    if not data:
        return {"score": 0, "details": {"error": "Empty dataset"}}
    
    # 获取所有字段
    fields = set()
    for item in data:
        fields.update(item.keys())
    
    field_diversity = {}
    issues = []
    
    for field in fields:
        # 收集非空值
        values = [item[field] for item in data if field in item and item[field] is not None]
        
        if not values:
            continue
        
        # 计算唯一值比例
        unique_values = set()
        try:
            for v in values:
                # 对对象类型进行JSON序列化以支持比较
                if isinstance(v, (dict, list)):
                    v = json.dumps(v, sort_keys=True)
                unique_values.add(v)
        except (TypeError, ValueError):
            # 如果无法序列化，跳过此字段
            continue
        
        unique_ratio = len(unique_values) / len(values)
        
        # 对于字符串类型，计算平均长度多样性
        length_diversity = 0
        if all(isinstance(v, str) for v in values):
            lengths = [len(v) for v in values]
            if lengths:
                avg_length = sum(lengths) / len(lengths)
                # 计算长度变异系数
                std_dev = math.sqrt(sum((l - avg_length) ** 2 for l in lengths) / len(lengths))
                length_diversity = min(1.0, std_dev / avg_length if avg_length > 0 else 0)
        
        # 计算信息熵
        entropy = 0
        value_counts = {}
        for v in values:
            if isinstance(v, (dict, list)):
                v = json.dumps(v, sort_keys=True)
            if v not in value_counts:
                value_counts[v] = 0
            value_counts[v] += 1
        
        for count in value_counts.values():
            p = count / len(values)
            entropy -= p * math.log2(p)
        
        # 归一化熵
        max_entropy = math.log2(len(values)) if len(values) > 1 else 1
        normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0
        
        # 计算总多样性得分（唯一比例、熵和长度多样性的加权平均）
        diversity_score = unique_ratio * 0.4 + normalized_entropy * 0.4 + length_diversity * 0.2
        field_diversity[field] = diversity_score
        
        # 识别多样性低的字段
        if diversity_score < 0.3:
            severity = "high" if diversity_score < 0.1 else "medium"
            issues.append({
                "field": field,
                "description": f"字段 '{field}' 的多样性低 ({diversity_score:.2f})",
                "severity": severity,
                "unique_ratio": unique_ratio,
                "entropy": normalized_entropy,
                "recommendation": f"考虑增加字段 '{field}' 的数据多样性"
            })
    
    # 计算整体多样性得分
    overall_diversity = sum(field_diversity.values()) / len(field_diversity) if field_diversity else 0
    
    return {
        "score": overall_diversity,
        "details": {
            "field_diversity": field_diversity,
            "fields_analyzed": len(field_diversity)
        },
        "issues": issues,
        "recommendations": [
            "增加数据样本的来源多样性",
            "对多样性低的字段增加变异"
        ] if issues else []
    }

def evaluate_relevance(data: List[Dict[str, Any]], reference_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """评估数据相关性（与参考数据相比）"""
    if not data or not reference_data:
        return {"score": 0, "details": {"error": "Empty dataset or reference"}}
    
    # 检查字段覆盖率
    data_fields = set()
    for item in data:
        data_fields.update(item.keys())
    
    ref_fields = set()
    for item in reference_data:
        ref_fields.update(item.keys())
    
    common_fields = data_fields.intersection(ref_fields)
    missing_fields = ref_fields - data_fields
    extra_fields = data_fields - ref_fields
    
    # 计算字段覆盖率得分
    field_coverage = len(common_fields) / len(ref_fields) if ref_fields else 0
    
    # 检查值分布相似度
    distribution_similarity = {}
    issues = []
    
    for field in common_fields:
        # 收集两个数据集中的值
        data_values = [item.get(field) for item in data if field in item]
        ref_values = [item.get(field) for item in reference_data if field in item]
        
        # 对于数值型字段，比较分布特征
        if all(isinstance(v, (int, float)) for v in data_values if v is not None) and \
           all(isinstance(v, (int, float)) for v in ref_values if v is not None):
            # 过滤掉None值
            data_values = [v for v in data_values if v is not None]
            ref_values = [v for v in ref_values if v is not None]
            
            if data_values and ref_values:
                # 比较基本统计特征
                data_mean = sum(data_values) / len(data_values)
                ref_mean = sum(ref_values) / len(ref_values)
                
                data_std = math.sqrt(sum((v - data_mean) ** 2 for v in data_values) / len(data_values)) if len(data_values) > 1 else 0
                ref_std = math.sqrt(sum((v - ref_mean) ** 2 for v in ref_values) / len(ref_values)) if len(ref_values) > 1 else 0
                
                # 计算均值相似度
                mean_diff = abs(data_mean - ref_mean)
                mean_scale = max(abs(data_mean), abs(ref_mean), 1)
                mean_similarity = 1 - min(1, mean_diff / mean_scale)
                
                # 计算标准差相似度
                std_diff = abs(data_std - ref_std)
                std_scale = max(data_std, ref_std, 1)
                std_similarity = 1 - min(1, std_diff / std_scale)
                
                # 综合得分
                similarity = (mean_similarity * 0.7 + std_similarity * 0.3)
                distribution_similarity[field] = similarity
                
                # 识别分布差异较大的字段
                if similarity < 0.7:
                    severity = "high" if similarity < 0.4 else "medium"
                    issues.append({
                        "field": field,
                        "description": f"字段 '{field}' 的数值分布与参考数据差异较大",
                        "severity": severity,
                        "data_stats": {"mean": data_mean, "std": data_std},
                        "reference_stats": {"mean": ref_mean, "std": ref_std},
                        "recommendation": f"检查字段 '{field}' 的数据收集方法与参考标准是否一致"
                    })
        
        # 对于类别型字段，比较值分布
        elif all(isinstance(v, str) for v in data_values if v is not None) and \
             all(isinstance(v, str) for v in ref_values if v is not None):
            # 计算两个数据集的值分布
            data_counts = {}
            for v in data_values:
                if v not in data_counts:
                    data_counts[v] = 0
                data_counts[v] += 1
            
            ref_counts = {}
            for v in ref_values:
                if v not in ref_counts:
                    ref_counts[v] = 0
                ref_counts[v] += 1
            
            # 计算分布差异
            all_values = set(data_counts.keys()).union(ref_counts.keys())
            distribution_diff = 0
            
            for v in all_values:
                data_prob = data_counts.get(v, 0) / len(data_values) if data_values else 0
                ref_prob = ref_counts.get(v, 0) / len(ref_values) if ref_values else 0
                distribution_diff += abs(data_prob - ref_prob)
            
            # 归一化差异为相似度
            similarity = 1 - min(1, distribution_diff / 2)  # 除以2是因为最大差异和为2
            distribution_similarity[field] = similarity
            
            # 识别分布差异较大的字段
            if similarity < 0.6:
                severity = "high" if similarity < 0.3 else "medium"
                issues.append({
                    "field": field,
                    "description": f"字段 '{field}' 的类别分布与参考数据差异较大",
                    "severity": severity,
                    "recommendation": f"检查字段 '{field}' 的采样是否有偏差"
                })
    
    # 识别缺失的关键字段
    for field in missing_fields:
        issues.append({
            "field": field,
            "description": f"缺少参考数据中的字段 '{field}'",
            "severity": "high",
            "recommendation": f"考虑添加字段 '{field}' 以提高与参考数据的相关性"
        })
    
    # 计算整体相关性得分
    field_similarity = sum(distribution_similarity.values()) / len(distribution_similarity) if distribution_similarity else 0
    relevance_score = field_coverage * 0.4 + field_similarity * 0.6
    
    return {
        "score": relevance_score,
        "details": {
            "field_coverage": field_coverage,
            "field_similarity": distribution_similarity,
            "common_fields": list(common_fields),
            "missing_fields": list(missing_fields),
            "extra_fields": list(extra_fields)
        },
        "issues": issues,
        "recommendations": [
            "添加缺失的关键字段",
            "调整数据采样方法以匹配参考分布"
        ] if issues else []
    }

def evaluate_custom(data: List[Dict[str, Any]], custom_code: str) -> Dict[str, Any]:
    """通过自定义代码评估数据"""
    if not data:
        return {"score": 0, "details": {"error": "Empty dataset"}}
    
    try:
        # 创建本地命名空间
        local_vars = {"data": data, "result": {"score": 0}}
        
        # 执行自定义代码
        exec(custom_code, {"np": np, "math": math, "re": re}, local_vars)
        
        # 获取结果
        result = local_vars.get("result", {"score": 0})
        
        # 确保结果包含score字段
        if "score" not in result:
            result["score"] = 0
        
        # 将分数限制在0-1范围内
        result["score"] = max(0, min(1, result["score"]))
        
        return result
    
    except Exception as e:
        # 自定义代码执行失败
        return {
            "score": 0,
            "details": {"error": f"Custom code execution failed: {str(e)}"},
            "issues": [{
                "description": f"自定义评估代码执行失败: {str(e)}",
                "severity": "high"
            }]
        }
