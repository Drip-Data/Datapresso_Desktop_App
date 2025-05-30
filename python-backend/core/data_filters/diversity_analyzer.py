import numpy as np
from typing import List, Dict, Any, Optional
import logging
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

logger = logging.getLogger(__name__)

class DiversityAnalyzer:
    """数据多样性分析器"""
    
    def __init__(self, min_similarity_threshold: float = 0.8):
        """
        初始化多样性分析器
        
        Args:
            min_similarity_threshold: 最小相似度阈值，超过此值认为样本重复
        """
        self.min_similarity_threshold = min_similarity_threshold
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    def analyze_diversity(self, samples: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        分析样本集的多样性
        
        Args:
            samples: 样本列表
            
        Returns:
            多样性分析结果
        """
        if not samples:
            return {"diversity_score": 0, "error": "样本列表为空"}
        
        try:
            # 提取文本内容
            texts = []
            for sample in samples:
                text = ""
                if "instruction" in sample:
                    text += sample["instruction"] + " "
                
                response = sample.get("response", {})
                if isinstance(response, dict):
                    text += response.get("origin_text", "")
                elif isinstance(response, str):
                    text += response
                
                texts.append(text.strip())
            
            # 计算语义多样性
            semantic_diversity = self._calculate_semantic_diversity(texts)
            
            # 计算领域分布
            domain_counts = Counter()
            for sample in samples:
                domain = sample.get("metadata", {}).get("domain", "未分类")
                domain_counts[domain] += 1
            
            # 计算难度分布
            difficulty_distribution = {"easy": 0, "medium": 0, "hard": 0}
            for sample in samples:
                difficulty = sample.get("metadata", {}).get("difficulty", 0.5)
                if difficulty <= 0.3:
                    difficulty_distribution["easy"] += 1
                elif difficulty <= 0.7:
                    difficulty_distribution["medium"] += 1
                else:
                    difficulty_distribution["hard"] += 1
            
            # 计算领域均衡性
            domain_balance = self._calculate_distribution_balance(list(domain_counts.values()))
            
            # 计算难度均衡性
            difficulty_balance = self._calculate_distribution_balance([
                difficulty_distribution["easy"],
                difficulty_distribution["medium"],
                difficulty_distribution["hard"]
            ])
            
            # 综合多样性分数
            diversity_score = (semantic_diversity * 0.5 + 
                             domain_balance * 0.3 + 
                             difficulty_balance * 0.2)
            
            return {
                "diversity_score": diversity_score,
                "domain_distribution": dict(domain_counts),
                "domain_balance": domain_balance,
                "difficulty_distribution": difficulty_distribution,
                "difficulty_balance": difficulty_balance,
                "semantic_diversity": semantic_diversity,
                "sample_count": len(samples),
                "duplicate_pairs": self._find_duplicate_pairs(texts)
            }
            
        except Exception as e:
            logger.error(f"多样性分析失败: {e}")
            return {"diversity_score": 0, "error": str(e)}
    
    def calculate_diversity_contribution(self, sample: Dict[str, Any], 
                                        dataset_stats: Dict[str, Any]) -> float:
        """
        计算样本对多样性的贡献
        
        Args:
            sample: 数据样本
            dataset_stats: 数据集统计信息
            
        Returns:
            多样性贡献分数(0-1)
        """
        # 提取样本信息
        domain = sample.get("metadata", {}).get("domain", "未分类")
        difficulty = sample.get("metadata", {}).get("difficulty", 0.5)
        
        # 计算领域贡献
        domain_contribution = 0.0
        domain_distribution = dataset_stats.get("domain_distribution", {})
        total_samples = dataset_stats.get("sample_count", 1)
        
        if domain in domain_distribution:
            # 稀有领域贡献更大
            domain_ratio = domain_distribution[domain] / total_samples
            domain_contribution = 1.0 - domain_ratio
        else:
            # 新领域贡献最大
            domain_contribution = 1.0
        
        # 计算难度贡献
        difficulty_contribution = 0.0
        difficulty_distribution = dataset_stats.get("difficulty_distribution", {})
        
        if difficulty <= 0.3:
            difficulty_category = "easy"
        elif difficulty <= 0.7:
            difficulty_category = "medium"
        else:
            difficulty_category = "hard"
        
        difficulty_count = difficulty_distribution.get(difficulty_category, 0)
        difficulty_ratio = difficulty_count / total_samples if total_samples > 0 else 0
        difficulty_contribution = 1.0 - difficulty_ratio
        
        # 计算语义贡献（需要样本文本和数据集文本）
        semantic_contribution = 0.5  # 默认值
        
        # 组合贡献分数，可以根据需要调整权重
        combined_score = (domain_contribution * 0.4 + 
                         difficulty_contribution * 0.3 + 
                         semantic_contribution * 0.3)
        
        return combined_score
    
    def _calculate_semantic_diversity(self, texts: List[str]) -> float:
        """
        计算文本的语义多样性
        
        Args:
            texts: 文本列表
            
        Returns:
            语义多样性分数(0-1)
        """
        if len(texts) < 2:
            return 1.0
        
        try:
            # 使用TF-IDF向量化
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # 计算余弦相似度矩阵
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            # 计算平均相似度（排除对角线）
            n = len(texts)
            total_similarity = 0
            count = 0
            
            for i in range(n):
                for j in range(i + 1, n):
                    total_similarity += similarity_matrix[i][j]
                    count += 1
            
            avg_similarity = total_similarity / count if count > 0 else 0
            
            # 多样性 = 1 - 平均相似度
            diversity = 1.0 - avg_similarity
            
            return max(0, min(1, diversity))
            
        except Exception as e:
            logger.warning(f"语义多样性计算失败: {e}")
            return 0.5  # 默认值
    
    def _calculate_distribution_balance(self, counts: List[int]) -> float:
        """
        计算分布的均衡性，使用熵作为指标
        
        Args:
            counts: 各类别的计数列表
            
        Returns:
            均衡性分数(0-1)
        """
        total = sum(counts)
        if total == 0:
            return 0
        
        # 计算概率分布
        probs = [count / total for count in counts if count > 0]
        
        if len(probs) <= 1:
            return 0  # 只有一个类别，不均衡
        
        # 计算熵
        entropy = -sum(p * np.log2(p) for p in probs)
        
        # 最大熵（均匀分布）
        max_entropy = np.log2(len(probs))
        
        # 归一化熵（0-1之间，1表示完全均衡）
        normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0
        
        return normalized_entropy
    
    def _find_duplicate_pairs(self, texts: List[str]) -> List[Tuple[int, int, float]]:
        """
        找出高度相似的文本对
        
        Args:
            texts: 文本列表
            
        Returns:
            相似文本对列表，每个元素为(index1, index2, similarity)
        """
        duplicate_pairs = []
        
        if len(texts) < 2:
            return duplicate_pairs
        
        try:
            # 使用TF-IDF向量化
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # 计算余弦相似度矩阵
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            # 找出高相似度对
            n = len(texts)
            for i in range(n):
                for j in range(i + 1, n):
                    similarity = similarity_matrix[i][j]
                    if similarity >= self.min_similarity_threshold:
                        duplicate_pairs.append((i, j, similarity))
            
        except Exception as e:
            logger.warning(f"重复检测失败: {e}")
        
        return duplicate_pairs
    
    def remove_duplicates(self, samples: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        移除重复样本
        
        Args:
            samples: 样本列表
            
        Returns:
            去重后的样本列表
        """
        if not samples:
            return samples
        
        # 提取文本
        texts = []
        for sample in samples:
            text = ""
            if "instruction" in sample:
                text += sample["instruction"] + " "
            
            response = sample.get("response", {})
            if isinstance(response, dict):
                text += response.get("origin_text", "")
            elif isinstance(response, str):
                text += response
            
            texts.append(text.strip())
        
        # 找出重复对
        duplicate_pairs = self._find_duplicate_pairs(texts)
        
        # 标记要移除的索引
        to_remove = set()
        for i, j, similarity in duplicate_pairs:
            # 保留质量更高的样本
            score_i = samples[i].get("metadata", {}).get("evaluations", {}).get("overall_score", 0)
            score_j = samples[j].get("metadata", {}).get("evaluations", {}).get("overall_score", 0)
            
            if score_i >= score_j:
                to_remove.add(j)
            else:
                to_remove.add(i)
        
        # 返回去重后的样本
        deduplicated = [sample for i, sample in enumerate(samples) if i not in to_remove]
        
        logger.info(f"去重完成：原始 {len(samples)} 个样本，移除 {len(to_remove)} 个重复样本，剩余 {len(deduplicated)} 个样本")
        
        return deduplicated