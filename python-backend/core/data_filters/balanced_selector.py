import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging
from collections import defaultdict, Counter
import random
from .diversity_analyzer import DiversityAnalyzer

logger = logging.getLogger(__name__)

class BalancedSelector:
    """平衡数据选择器"""
    
    def __init__(self, 
                 quality_threshold: float = 0.6,
                 diversity_weight: float = 0.3,
                 quality_weight: float = 0.7,
                 max_domain_ratio: float = 0.4,
                 target_difficulty_distribution: Optional[Dict[str, float]] = None):
        """
        初始化平衡选择器
        
        Args:
            quality_threshold: 质量阈值，低于此值的样本将被过滤
            diversity_weight: 多样性权重
            quality_weight: 质量权重
            max_domain_ratio: 单个领域最大占比
            target_difficulty_distribution: 目标难度分布
        """
        self.quality_threshold = quality_threshold
        self.diversity_weight = diversity_weight
        self.quality_weight = quality_weight
        self.max_domain_ratio = max_domain_ratio
        self.target_difficulty_distribution = target_difficulty_distribution or {
            "easy": 0.3,
            "medium": 0.5,
            "hard": 0.2
        }
        self.diversity_analyzer = DiversityAnalyzer()
    
    def select_balanced_dataset(self, 
                               samples: List[Dict[str, Any]], 
                               target_size: int,
                               enable_quality_filter: bool = True,
                               enable_diversity_optimization: bool = True,
                               enable_domain_balance: bool = True,
                               enable_difficulty_balance: bool = True) -> Dict[str, Any]:
        """
        选择平衡的数据集
        
        Args:
            samples: 候选样本列表
            target_size: 目标数据集大小
            enable_quality_filter: 是否启用质量过滤
            enable_diversity_optimization: 是否启用多样性优化
            enable_domain_balance: 是否启用领域平衡
            enable_difficulty_balance: 是否启用难度平衡
            
        Returns:
            选择结果，包含选中的样本和统计信息
        """
        if not samples:
            return {"selected_samples": [], "error": "输入样本为空"}
        
        if target_size <= 0:
            return {"selected_samples": [], "error": "目标大小必须大于0"}
        
        try:
            # 第一步：质量过滤
            filtered_samples = samples
            if enable_quality_filter:
                filtered_samples = self._filter_by_quality(samples)
                logger.info(f"质量过滤：{len(samples)} -> {len(filtered_samples)}")
            
            if not filtered_samples:
                return {"selected_samples": [], "error": "质量过滤后无可用样本"}
            
            # 如果过滤后样本数量不足目标大小，直接返回所有样本
            if len(filtered_samples) <= target_size:
                return {
                    "selected_samples": filtered_samples,
                    "selection_stats": self._calculate_selection_stats(filtered_samples, samples),
                    "message": f"可用样本数量({len(filtered_samples)})不足目标大小({target_size})，返回所有可用样本"
                }
            
            # 第二步：计算选择分数
            scored_samples = self._calculate_selection_scores(
                filtered_samples, 
                enable_diversity_optimization
            )
            
            # 第三步：平衡选择
            selected_samples = self._balanced_selection(
                scored_samples,
                target_size,
                enable_domain_balance,
                enable_difficulty_balance
            )
            
            # 计算选择统计
            selection_stats = self._calculate_selection_stats(selected_samples, samples)
            
            return {
                "selected_samples": selected_samples,
                "selection_stats": selection_stats
            }
            
        except Exception as e:
            logger.error(f"平衡选择失败: {e}")
            return {"selected_samples": [], "error": str(e)}
    
    def _filter_by_quality(self, samples: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        根据质量阈值过滤样本
        
        Args:
            samples: 样本列表
            
        Returns:
            过滤后的样本列表
        """
        filtered = []
        for sample in samples:
            # 获取质量分数
            evaluations = sample.get("metadata", {}).get("evaluations", {})
            overall_score = evaluations.get("overall_score", 0)
            
            if overall_score >= self.quality_threshold:
                filtered.append(sample)
        
        return filtered
    
    def _calculate_selection_scores(self, 
                                   samples: List[Dict[str, Any]], 
                                   enable_diversity: bool = True) -> List[Tuple[Dict[str, Any], float]]:
        """
        计算样本的选择分数
        
        Args:
            samples: 样本列表
            enable_diversity: 是否考虑多样性
            
        Returns:
            (样本, 分数)的列表
        """
        scored_samples = []
        
        # 计算数据集统计信息（用于多样性计算）
        dataset_stats = None
        if enable_diversity:
            dataset_stats = self.diversity_analyzer.analyze_diversity(samples)
        
        for sample in samples:
            # 质量分数
            evaluations = sample.get("metadata", {}).get("evaluations", {})
            quality_score = evaluations.get("overall_score", 0)
            
            # 多样性分数
            diversity_score = 0.5  # 默认值
            if enable_diversity and dataset_stats:
                diversity_score = self.diversity_analyzer.calculate_diversity_contribution(
                    sample, dataset_stats
                )
            
            # 综合分数
            combined_score = (quality_score * self.quality_weight + 
                            diversity_score * self.diversity_weight)
            
            scored_samples.append((sample, combined_score))
        
        # 按分数排序
        scored_samples.sort(key=lambda x: x[1], reverse=True)
        
        return scored_samples
    
    def _balanced_selection(self, 
                           scored_samples: List[Tuple[Dict[str, Any], float]],
                           target_size: int,
                           enable_domain_balance: bool = True,
                           enable_difficulty_balance: bool = True) -> List[Dict[str, Any]]:
        """
        执行平衡选择
        
        Args:
            scored_samples: 评分后的样本列表
            target_size: 目标大小
            enable_domain_balance: 是否启用领域平衡
            enable_difficulty_balance: 是否启用难度平衡
            
        Returns:
            选中的样本列表
        """
        if not enable_domain_balance and not enable_difficulty_balance:
            # 简单选择：直接取前N个
            return [sample for sample, score in scored_samples[:target_size]]
        
        selected = []
        remaining_samples = scored_samples.copy()
        
        # 统计信息
        domain_counts = defaultdict(int)
        difficulty_counts = {"easy": 0, "medium": 0, "hard": 0}
        
        # 计算目标分布
        target_domain_max = int(target_size * self.max_domain_ratio)
        target_difficulty = {
            "easy": int(target_size * self.target_difficulty_distribution["easy"]),
            "medium": int(target_size * self.target_difficulty_distribution["medium"]),
            "hard": int(target_size * self.target_difficulty_distribution["hard"])
        }
        
        # 贪心选择
        while len(selected) < target_size and remaining_samples:
            best_idx = -1
            best_score = -1
            
            for i, (sample, score) in enumerate(remaining_samples):
                # 检查约束
                domain = sample.get("metadata", {}).get("domain", "未分类")
                difficulty = sample.get("metadata", {}).get("difficulty", 0.5)
                
                # 确定难度类别
                if difficulty <= 0.3:
                    difficulty_category = "easy"
                elif difficulty <= 0.7:
                    difficulty_category = "medium"
                else:
                    difficulty_category = "hard"
                
                # 检查领域约束
                domain_ok = True
                if enable_domain_balance and domain_counts[domain] >= target_domain_max:
                    domain_ok = False
                
                # 检查难度约束
                difficulty_ok = True
                if enable_difficulty_balance and difficulty_counts[difficulty_category] >= target_difficulty[difficulty_category]:
                    difficulty_ok = False
                
                # 如果满足约束且分数更高，选择此样本
                if domain_ok and difficulty_ok and score > best_score:
                    best_idx = i
                    best_score = score
            
            # 如果找到合适的样本
            if best_idx >= 0:
                sample, score = remaining_samples.pop(best_idx)
                selected.append(sample)
                
                # 更新统计
                domain = sample.get("metadata", {}).get("domain", "未分类")
                difficulty = sample.get("metadata", {}).get("difficulty", 0.5)
                
                domain_counts[domain] += 1
                
                if difficulty <= 0.3:
                    difficulty_counts["easy"] += 1
                elif difficulty <= 0.7:
                    difficulty_counts["medium"] += 1
                else:
                    difficulty_counts["hard"] += 1
            else:
                # 没有找到满足约束的样本，放松约束选择最佳样本
                if remaining_samples:
                    sample, score = remaining_samples.pop(0)
                    selected.append(sample)
                    
                    # 更新统计
                    domain = sample.get("metadata", {}).get("domain", "未分类")
                    difficulty = sample.get("metadata", {}).get("difficulty", 0.5)
                    
                    domain_counts[domain] += 1
                    
                    if difficulty <= 0.3:
                        difficulty_counts["easy"] += 1
                    elif difficulty <= 0.7:
                        difficulty_counts["medium"] += 1
                    else:
                        difficulty_counts["hard"] += 1
        
        logger.info(f"平衡选择完成：选中 {len(selected)} 个样本")
        logger.info(f"领域分布：{dict(domain_counts)}")
        logger.info(f"难度分布：{difficulty_counts}")
        
        return selected
    
    def _calculate_selection_stats(self, 
                                  selected_samples: List[Dict[str, Any]], 
                                  original_samples: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        计算选择统计信息
        
        Args:
            selected_samples: 选中的样本
            original_samples: 原始样本
            
        Returns:
            统计信息
        """
        if not selected_samples:
            return {"error": "没有选中的样本"}
        
        # 基本统计
        stats = {
            "total_original": len(original_samples),
            "total_selected": len(selected_samples),
            "selection_ratio": len(selected_samples) / len(original_samples) if original_samples else 0
        }
        
        # 质量统计
        quality_scores = []
        for sample in selected_samples:
            score = sample.get("metadata", {}).get("evaluations", {}).get("overall_score", 0)
            quality_scores.append(score)
        
        if quality_scores:
            stats["quality_stats"] = {
                "mean": np.mean(quality_scores),
                "std": np.std(quality_scores),
                "min": np.min(quality_scores),
                "max": np.max(quality_scores)
            }
        
        # 领域分布
        domain_counts = Counter()
        for sample in selected_samples:
            domain = sample.get("metadata", {}).get("domain", "未分类")
            domain_counts[domain] += 1
        
        stats["domain_distribution"] = dict(domain_counts)
        
        # 难度分布
        difficulty_distribution = {"easy": 0, "medium": 0, "hard": 0}
        for sample in selected_samples:
            difficulty = sample.get("metadata", {}).get("difficulty", 0.5)
            if difficulty <= 0.3:
                difficulty_distribution["easy"] += 1
            elif difficulty <= 0.7:
                difficulty_distribution["medium"] += 1
            else:
                difficulty_distribution["hard"] += 1
        
        stats["difficulty_distribution"] = difficulty_distribution
        
        # 多样性分析
        diversity_analysis = self.diversity_analyzer.analyze_diversity(selected_samples)
        stats["diversity_analysis"] = diversity_analysis
        
        return stats
    
    def optimize_selection(self, 
                          samples: List[Dict[str, Any]], 
                          target_size: int,
                          max_iterations: int = 10) -> Dict[str, Any]:
        """
        优化选择过程，尝试多次选择并返回最佳结果
        
        Args:
            samples: 候选样本
            target_size: 目标大小
            max_iterations: 最大迭代次数
            
        Returns:
            最佳选择结果
        """
        best_result = None
        best_score = -1
        
        for i in range(max_iterations):
            # 添加随机性
            shuffled_samples = samples.copy()
            random.shuffle(shuffled_samples)
            
            # 执行选择
            result = self.select_balanced_dataset(shuffled_samples, target_size)
            
            if "error" in result:
                continue
            
            # 计算综合评分
            stats = result.get("selection_stats", {})
            diversity_score = stats.get("diversity_analysis", {}).get("diversity_score", 0)
            quality_mean = stats.get("quality_stats", {}).get("mean", 0)
            
            combined_score = diversity_score * 0.4 + quality_mean * 0.6
            
            if combined_score > best_score:
                best_score = combined_score
                best_result = result
                best_result["optimization_score"] = combined_score
                best_result["optimization_iteration"] = i + 1
        
        if best_result is None:
            return {"selected_samples": [], "error": "优化选择失败"}
        
        logger.info(f"优化选择完成：最佳分数 {best_score:.3f}，迭代 {best_result['optimization_iteration']} 次")
        
        return best_result