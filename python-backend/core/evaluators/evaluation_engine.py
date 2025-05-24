from typing import List, Dict, Any, Optional, Union
import logging
import statistics
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class EvaluationEngine:
    """评估引擎核心类"""
    
    def __init__(self):
        self.supported_metrics = {
            "accuracy", "precision", "recall", "f1_score", "completeness", 
            "consistency", "uniqueness", "validity", "timeliness", "relevance"
        }
    
    def evaluate_data_quality(
        self,
        data: List[Dict[str, Any]],
        quality_metrics: List[str],
        reference_data: Optional[List[Dict[str, Any]]] = None,
        custom_rules: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        评估数据质量
        
        Args:
            data: 要评估的数据
            quality_metrics: 质量指标列表
            reference_data: 参考数据（可选）
            custom_rules: 自定义规则（可选）
            
        Returns:
            评估结果字典
        """
        logger.info(f"Evaluating data quality for {len(data)} records with metrics: {quality_metrics}")
        
        results = {}
        
        for metric in quality_metrics:
            if metric not in self.supported_metrics:
                logger.warning(f"Unsupported metric: {metric}")
                continue
                
            try:
                if metric == "completeness":
                    results[metric] = self._evaluate_completeness(data)
                elif metric == "consistency":
                    results[metric] = self._evaluate_consistency(data)
                elif metric == "uniqueness":
                    results[metric] = self._evaluate_uniqueness(data)
                elif metric == "validity":
                    results[metric] = self._evaluate_validity(data, custom_rules)
                elif metric == "accuracy":
                    results[metric] = self._evaluate_accuracy(data, reference_data)
                else:
                    results[metric] = {"score": 0.0, "details": f"Metric {metric} not implemented yet"}
                    
            except Exception as e:
                logger.error(f"Error evaluating metric {metric}: {str(e)}")
                results[metric] = {"score": 0.0, "error": str(e)}
        
        # 计算总体质量分数
        valid_scores = [r["score"] for r in results.values() if "score" in r and "error" not in r]
        overall_score = statistics.mean(valid_scores) if valid_scores else 0.0
        
        return {
            "overall_score": overall_score,
            "metrics": results,
            "data_count": len(data),
            "evaluated_at": datetime.now().isoformat()
        }
    
    def _evaluate_completeness(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """评估数据完整性"""
        if not data:
            return {"score": 0.0, "details": "No data to evaluate"}
        
        total_fields = 0
        filled_fields = 0
        field_completeness = {}
        
        # 获取所有可能的字段
        all_fields = set()
        for record in data:
            all_fields.update(record.keys())
        
        for field in all_fields:
            field_total = len(data)
            field_filled = sum(1 for record in data if field in record and record[field] is not None and str(record[field]).strip() != "")
            field_completeness[field] = field_filled / field_total if field_total > 0 else 0.0
            total_fields += field_total
            filled_fields += field_filled
        
        overall_completeness = filled_fields / total_fields if total_fields > 0 else 0.0
        
        return {
            "score": overall_completeness,
            "details": {
                "overall_completeness": overall_completeness,
                "field_completeness": field_completeness,
                "total_records": len(data),
                "total_fields": len(all_fields)
            }
        }
    
    def _evaluate_consistency(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """评估数据一致性"""
        if not data:
            return {"score": 0.0, "details": "No data to evaluate"}
        
        consistency_issues = []
        field_types = {}
        
        # 检查字段类型一致性
        for record in data:
            for field, value in record.items():
                if value is not None:
                    value_type = type(value).__name__
                    if field not in field_types:
                        field_types[field] = {}
                    if value_type not in field_types[field]:
                        field_types[field][value_type] = 0
                    field_types[field][value_type] += 1
        
        # 计算一致性分数
        consistency_scores = []
        for field, types in field_types.items():
            if len(types) > 1:
                # 多种类型存在，计算主要类型的占比
                total_count = sum(types.values())
                max_count = max(types.values())
                consistency_score = max_count / total_count
                consistency_scores.append(consistency_score)
                if consistency_score < 0.9:  # 如果一致性低于90%
                    consistency_issues.append({
                        "field": field,
                        "types": types,
                        "consistency_score": consistency_score
                    })
            else:
                consistency_scores.append(1.0)  # 只有一种类型，完全一致
        
        overall_consistency = statistics.mean(consistency_scores) if consistency_scores else 1.0
        
        return {
            "score": overall_consistency,
            "details": {
                "overall_consistency": overall_consistency,
                "field_types": field_types,
                "issues": consistency_issues
            }
        }
    
    def _evaluate_uniqueness(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """评估数据唯一性"""
        if not data:
            return {"score": 0.0, "details": "No data to evaluate"}
        
        # 将记录转换为字符串进行比较
        record_strings = []
        for record in data:
            # 排序键以确保一致的字符串表示
            sorted_items = sorted(record.items())
            record_string = json.dumps(sorted_items, sort_keys=True, default=str)
            record_strings.append(record_string)
        
        unique_records = len(set(record_strings))
        total_records = len(data)
        uniqueness_score = unique_records / total_records if total_records > 0 else 0.0
        
        duplicates = total_records - unique_records
        
        return {
            "score": uniqueness_score,
            "details": {
                "uniqueness_score": uniqueness_score,
                "total_records": total_records,
                "unique_records": unique_records,
                "duplicate_count": duplicates
            }
        }
    
    def _evaluate_validity(self, data: List[Dict[str, Any]], custom_rules: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """评估数据有效性"""
        if not data:
            return {"score": 0.0, "details": "No data to evaluate"}
        
        valid_records = 0
        validation_errors = []
        
        for i, record in enumerate(data):
            record_valid = True
            record_errors = []
            
            # 基本有效性检查
            for field, value in record.items():
                if value is not None:
                    # 检查数值类型的合理性
                    if isinstance(value, (int, float)):
                        if not (-1e10 <= value <= 1e10):  # 合理的数值范围
                            record_valid = False
                            record_errors.append(f"Field '{field}' has unreasonable numeric value: {value}")
                    
                    # 检查字符串长度
                    elif isinstance(value, str):
                        if len(value) > 10000:  # 字符串过长
                            record_valid = False
                            record_errors.append(f"Field '{field}' has overly long string value")
            
            # 应用自定义规则
            if custom_rules:
                for rule in custom_rules:
                    try:
                        field = rule.get("field")
                        rule_type = rule.get("type")
                        rule_value = rule.get("value")
                        
                        if field in record:
                            if rule_type == "min_value" and isinstance(record[field], (int, float)):
                                if record[field] < rule_value:
                                    record_valid = False
                                    record_errors.append(f"Field '{field}' below minimum value {rule_value}")
                            elif rule_type == "max_value" and isinstance(record[field], (int, float)):
                                if record[field] > rule_value:
                                    record_valid = False
                                    record_errors.append(f"Field '{field}' above maximum value {rule_value}")
                            elif rule_type == "pattern" and isinstance(record[field], str):
                                import re
                                if not re.match(rule_value, str(record[field])):
                                    record_valid = False
                                    record_errors.append(f"Field '{field}' does not match pattern {rule_value}")
                    except Exception as e:
                        logger.warning(f"Error applying custom rule: {e}")
            
            if record_valid:
                valid_records += 1
            else:
                validation_errors.append({
                    "record_index": i,
                    "errors": record_errors
                })
        
        validity_score = valid_records / len(data) if data else 0.0
        
        return {
            "score": validity_score,
            "details": {
                "validity_score": validity_score,
                "total_records": len(data),
                "valid_records": valid_records,
                "invalid_records": len(data) - valid_records,
                "validation_errors": validation_errors[:10]  # 只返回前10个错误
            }
        }
    
    def _evaluate_accuracy(self, data: List[Dict[str, Any]], reference_data: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """评估数据准确性（需要参考数据）"""
        if not reference_data:
            return {"score": 0.0, "details": "No reference data provided for accuracy evaluation"}
        
        if not data:
            return {"score": 0.0, "details": "No data to evaluate"}
        
        # 简单的准确性评估：比较数据结构和字段类型的相似性
        data_fields = set()
        ref_fields = set()
        
        for record in data:
            data_fields.update(record.keys())
        
        for record in reference_data:
            ref_fields.update(record.keys())
        
        common_fields = data_fields.intersection(ref_fields)
        field_similarity = len(common_fields) / len(data_fields.union(ref_fields)) if data_fields.union(ref_fields) else 0.0
        
        return {
            "score": field_similarity,
            "details": {
                "field_similarity": field_similarity,
                "data_fields": len(data_fields),
                "reference_fields": len(ref_fields),
                "common_fields": len(common_fields)
            }
        }
