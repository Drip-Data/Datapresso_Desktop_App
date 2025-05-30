from typing import List, Dict, Any, Optional, Union
import logging
import statistics
import json
import os
import pickle
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
    
    def evaluate_metrics_with_checkpoint(self, 
                                       data: List[Dict[str, Any]],
                                       metrics: List[str],
                                       checkpoint_path: str = "evaluation_checkpoint.pkl",
                                       batch_size: int = 100) -> Dict[str, Any]:
        """支持断点续传的评估功能"""
        logger.info(f"Starting evaluation with checkpoint support for {len(data)} samples")
        
        # 尝试加载检查点
        start_index = 0
        results = {}
        
        if os.path.exists(checkpoint_path):
            try:
                with open(checkpoint_path, 'rb') as f:
                    checkpoint_data = pickle.load(f)
                    start_index = checkpoint_data.get('processed_count', 0)
                    results = checkpoint_data.get('results', {})
                logger.info(f"Resuming from checkpoint at index {start_index}")
            except Exception as e:
                logger.warning(f"Failed to load checkpoint: {e}")
                start_index = 0
                results = {}
        
        # 初始化结果结构
        if not results:
            results = {
                'processed_samples': [],
                'metric_scores': {metric: [] for metric in metrics},
                'failed_evaluations': [],
                'processing_stats': {
                    'total_samples': len(data),
                    'processed_count': 0,
                    'success_count': 0,
                    'failure_count': 0,
                    'start_time': datetime.now().isoformat()
                }
            }
        
        # 批量处理数据
        for i in range(start_index, len(data), batch_size):
            batch = data[i:i + batch_size]
            
            for j, sample in enumerate(batch):
                sample_index = i + j
                
                try:
                    # 评估单个样本
                    sample_results = self._evaluate_single_sample(sample, metrics)
                    
                    results['processed_samples'].append({
                        'index': sample_index,
                        'sample_id': sample.get('id', f'sample_{sample_index}'),
                        'metrics': sample_results
                    })
                    
                    # 更新指标分数
                    for metric, score in sample_results.items():
                        if isinstance(score, (int, float)):
                            results['metric_scores'][metric].append(score)
                    
                    results['processing_stats']['success_count'] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to evaluate sample {sample_index}: {e}")
                    results['failed_evaluations'].append({
                        'index': sample_index,
                        'error': str(e)
                    })
                    results['processing_stats']['failure_count'] += 1
                
                results['processing_stats']['processed_count'] = sample_index + 1
            
            # 保存检查点
            try:
                with open(checkpoint_path, 'wb') as f:
                    pickle.dump(results, f)
                logger.info(f"Checkpoint saved at index {i + len(batch)}")
            except Exception as e:
                logger.warning(f"Failed to save checkpoint: {e}")
        
        # 完成处理，删除检查点文件
        if os.path.exists(checkpoint_path):
            try:
                os.remove(checkpoint_path)
                logger.info("Checkpoint file removed after completion")
            except Exception as e:
                logger.warning(f"Failed to remove checkpoint file: {e}")
        
        results['processing_stats']['end_time'] = datetime.now().isoformat()
        return results
    
    def _evaluate_single_sample(self, sample: Dict[str, Any], metrics: List[str]) -> Dict[str, float]:
        """评估单个样本的指标"""
        sample_results = {}
        
        for metric in metrics:
            if metric == "instruction_complexity":
                sample_results[metric] = self._calculate_instruction_complexity(sample)
            elif metric == "response_quality":
                sample_results[metric] = self._calculate_response_quality(sample)
            elif metric == "domain_relevance":
                sample_results[metric] = self._calculate_domain_relevance(sample)
            elif metric == "difficulty_level":
                sample_results[metric] = self._calculate_difficulty_level(sample)
            else:
                # 使用现有的评估方法
                eval_result = self.evaluate_data_quality([sample], [metric])
                if metric in eval_result and 'score' in eval_result[metric]:
                    sample_results[metric] = eval_result[metric]['score']
                else:
                    sample_results[metric] = 0.0
        
        return sample_results
    
    def _calculate_instruction_complexity(self, sample: Dict[str, Any]) -> float:
        """计算指令复杂度"""
        instruction = sample.get('instruction', '')
        if not instruction:
            return 0.0
        
        # 基于指令长度、关键词数量等计算复杂度
        word_count = len(instruction.split())
        complexity_keywords = ['analyze', 'compare', 'evaluate', 'synthesize', 'create', 'design']
        keyword_count = sum(1 for keyword in complexity_keywords if keyword.lower() in instruction.lower())
        
        # 归一化复杂度分数 (0-1)
        complexity_score = min(1.0, (word_count / 100 + keyword_count / 10) / 2)
        return complexity_score
    
    def _calculate_response_quality(self, sample: Dict[str, Any]) -> float:
        """计算响应质量"""
        response = sample.get('output', '') or sample.get('response', '')
        if not response:
            return 0.0
        
        # 基于响应长度、结构化程度等计算质量
        word_count = len(response.split())
        sentence_count = len([s for s in response.split('.') if s.strip()])
        
        # 检查结构化元素
        structure_indicators = ['1.', '2.', '•', '-', '\n\n']
        structure_score = sum(1 for indicator in structure_indicators if indicator in response)
        
        # 归一化质量分数 (0-1)
        quality_score = min(1.0, (word_count / 200 + sentence_count / 20 + structure_score / 10) / 3)
        return quality_score
    
    def _calculate_domain_relevance(self, sample: Dict[str, Any]) -> float:
        """计算领域相关性"""
        domain = sample.get('domain', '')
        instruction = sample.get('instruction', '')
        
        if not domain or not instruction:
            return 0.5  # 默认中等相关性
        
        # 简单的关键词匹配
        domain_keywords = {
            'math': ['calculate', 'solve', 'equation', 'formula', 'number'],
            'science': ['experiment', 'hypothesis', 'theory', 'research', 'analysis'],
            'programming': ['code', 'function', 'algorithm', 'debug', 'implement'],
            'language': ['translate', 'grammar', 'vocabulary', 'sentence', 'word']
        }
        
        if domain.lower() in domain_keywords:
            keywords = domain_keywords[domain.lower()]
            matches = sum(1 for keyword in keywords if keyword.lower() in instruction.lower())
            relevance_score = min(1.0, matches / len(keywords))
        else:
            relevance_score = 0.5
        
        return relevance_score
    
    def _calculate_difficulty_level(self, sample: Dict[str, Any]) -> float:
        """计算难度等级"""
        difficulty = sample.get('difficulty', '')
        
        difficulty_mapping = {
            'easy': 0.2,
            'medium': 0.5,
            'hard': 0.8,
            'expert': 1.0
        }
        
        return difficulty_mapping.get(difficulty.lower(), 0.5)
    
    def generate_assessment_report(self, evaluation_results: Dict[str, Any], 
                                 output_path: str = None) -> Dict[str, Any]:
        """生成标准化的评估报告"""
        logger.info("Generating comprehensive assessment report")
        
        report = {
            "report_metadata": {
                "generation_time": datetime.now().isoformat(),
                "report_version": "1.0",
                "total_samples": len(evaluation_results.get('processed_samples', []))
            },
            "verification_summary": self._generate_verification_summary(evaluation_results),
            "score_distributions": self._generate_score_distributions(evaluation_results),
            "domain_performance": self._generate_domain_performance(evaluation_results),
            "quality_insights": self._generate_quality_insights(evaluation_results),
            "recommendations": self._generate_recommendations(evaluation_results)
        }
        
        # 保存报告到文件
        if output_path:
            try:
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(report, f, ensure_ascii=False, indent=2)
                logger.info(f"Assessment report saved to {output_path}")
            except Exception as e:
                logger.error(f"Failed to save report: {e}")
        
        return report
    
    def _generate_verification_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """生成验证摘要"""
        stats = results.get('processing_stats', {})
        
        total_samples = stats.get('total_samples', 0)
        success_count = stats.get('success_count', 0)
        failure_count = stats.get('failure_count', 0)
        
        pass_rate = (success_count / total_samples * 100) if total_samples > 0 else 0
        fail_rate = (failure_count / total_samples * 100) if total_samples > 0 else 0
        
        return {
            "total_samples": total_samples,
            "verification_pass_count": success_count,
            "verification_fail_count": failure_count,
            "pass_rate_percentage": round(pass_rate, 2),
            "fail_rate_percentage": round(fail_rate, 2)
        }
    
    def _generate_score_distributions(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """生成分数分布统计"""
        metric_scores = results.get('metric_scores', {})
        distributions = {}
        
        for metric, scores in metric_scores.items():
            if scores:
                distributions[metric] = {
                    "mean": round(statistics.mean(scores), 3),
                    "median": round(statistics.median(scores), 3),
                    "std_dev": round(statistics.stdev(scores) if len(scores) > 1 else 0, 3),
                    "min": round(min(scores), 3),
                    "max": round(max(scores), 3),
                    "sample_count": len(scores)
                }
            else:
                distributions[metric] = {
                    "mean": 0, "median": 0, "std_dev": 0,
                    "min": 0, "max": 0, "sample_count": 0
                }
        
        return distributions
    
    def _generate_domain_performance(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """生成领域性能分析"""
        processed_samples = results.get('processed_samples', [])
        domain_stats = {}
        
        for sample_result in processed_samples:
            # 从样本中提取领域信息（需要在原始数据中包含）
            domain = "unknown"  # 默认值，实际应从样本数据中获取
            
            if domain not in domain_stats:
                domain_stats[domain] = {
                    "sample_count": 0,
                    "avg_scores": {},
                    "total_scores": {}
                }
            
            domain_stats[domain]["sample_count"] += 1
            
            # 累计各指标分数
            metrics = sample_result.get('metrics', {})
            for metric, score in metrics.items():
                if isinstance(score, (int, float)):
                    if metric not in domain_stats[domain]["total_scores"]:
                        domain_stats[domain]["total_scores"][metric] = []
                    domain_stats[domain]["total_scores"][metric].append(score)
        
        # 计算平均分数
        for domain, stats in domain_stats.items():
            for metric, scores in stats["total_scores"].items():
                if scores:
                    stats["avg_scores"][metric] = round(statistics.mean(scores), 3)
            # 移除临时的total_scores
            del stats["total_scores"]
        
        return domain_stats
    
    def _generate_quality_insights(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """生成质量洞察"""
        metric_scores = results.get('metric_scores', {})
        insights = {}
        
        for metric, scores in metric_scores.items():
            if scores:
                avg_score = statistics.mean(scores)
                
                if avg_score >= 0.8:
                    quality_level = "excellent"
                elif avg_score >= 0.6:
                    quality_level = "good"
                elif avg_score >= 0.4:
                    quality_level = "fair"
                else:
                    quality_level = "poor"
                
                insights[metric] = {
                    "quality_level": quality_level,
                    "average_score": round(avg_score, 3),
                    "score_variance": round(statistics.variance(scores) if len(scores) > 1 else 0, 3)
                }
        
        return insights
    
    def _generate_recommendations(self, results: Dict[str, Any]) -> List[str]:
        """生成改进建议"""
        recommendations = []
        metric_scores = results.get('metric_scores', {})
        
        for metric, scores in metric_scores.items():
            if scores:
                avg_score = statistics.mean(scores)
                
                if avg_score < 0.5:
                    if metric == "instruction_complexity":
                        recommendations.append(f"指令复杂度偏低({avg_score:.2f})，建议增加更具挑战性的任务")
                    elif metric == "response_quality":
                        recommendations.append(f"响应质量需要改进({avg_score:.2f})，建议优化回答的结构和完整性")
                    elif metric == "domain_relevance":
                        recommendations.append(f"领域相关性较低({avg_score:.2f})，建议加强领域特定内容")
        
        failure_rate = results.get('processing_stats', {}).get('failure_count', 0)
        total_samples = results.get('processing_stats', {}).get('total_samples', 1)
        
        if failure_rate / total_samples > 0.1:
            recommendations.append(f"处理失败率较高({failure_rate/total_samples*100:.1f}%)，建议检查数据格式和处理逻辑")
        
        if not recommendations:
            recommendations.append("整体质量良好，建议继续保持当前标准")
        
        return recommendations
