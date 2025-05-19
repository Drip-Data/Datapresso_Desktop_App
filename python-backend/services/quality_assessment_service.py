from typing import List, Dict, Any, Optional, Union
import logging
import asyncio
import uuid
import time
import math
import os
import json
import pandas as pd
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from schemas import QualityDimension, TaskCreate, TaskUpdate, Task as TaskSchema # Added Task schemas
from core.quality_assessors.completeness_assessor import assess_completeness
from core.quality_assessors.accuracy_assessor import assess_accuracy
from core.quality_assessors.consistency_assessor import assess_consistency
from core.quality_assessors.validity_assessor import assess_validity
from core.quality_assessors.uniqueness_assessor import assess_uniqueness
from core.quality_assessors.diversity_assessor import assess_diversity
# from core.quality_assessors.relevance_assessor import assess_relevance # Commented out missing module
# from core.quality_assessors.timeliness_assessor import assess_timeliness # Commented out missing module
# from core.quality_assessors.readability_assessor import assess_readability # Commented out missing module
# from core.quality_assessors.ethical_assessor import assess_ethical # Commented out missing module
from db import operations as crud # Changed import
from config import get_settings

logger = logging.getLogger(__name__)

class QualityAssessmentService:
    """数据质量评估服务"""
    
    def __init__(self):
        """初始化质量评估服务"""
        self.settings = get_settings()
        # 确保报告目录存在
        self.reports_dir = os.path.join(self.settings.results_dir, "quality_reports")
        os.makedirs(self.reports_dir, exist_ok=True)
    
    async def assess_quality(
        self,
        data: List[Dict[str, Any]],
        dimensions: List[QualityDimension],
        schema: Optional[Dict[str, Any]] = None,
        reference_data: Optional[List[Dict[str, Any]]] = None,
        weights: Optional[Dict[str, float]] = None,
        threshold_scores: Optional[Dict[str, float]] = None,
        generate_report: bool = True,
        report_format: str = "json",
        detail_level: str = "medium",
        custom_rules: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        评估数据质量
        
        Args:
            data: 要评估的数据
            dimensions: 评估维度列表
            schema: 数据结构定义
            reference_data: 参考数据
            weights: 维度权重
            threshold_scores: 维度阈值
            generate_report: 是否生成报告
            report_format: 报告格式
            detail_level: 详细程度
            custom_rules: 自定义评估规则
            
        Returns:
            包含评估结果的字典
        """
        logger.debug(f"Starting quality assessment for {len(data)} items in {len(dimensions)} dimensions")
        
        # 检查输入
        if not data:
            return {
                "overall_score": 0,
                "dimension_scores": [],
                "summary": {"message": "Empty dataset"},
                "passed_threshold": False
            }
        
        # 初始化默认权重
        if not weights:
            weights = {dim.value: 1.0/len(dimensions) for dim in dimensions}
        else:
            # 归一化权重
            total_weight = sum(weights.values())
            weights = {dim: weight/total_weight for dim, weight in weights.items()}
        
        # 初始化默认阈值
        if not threshold_scores:
            threshold_scores = {dim.value: 0.7 for dim in dimensions}
        
        # 评估各维度
        dimension_assessments = []
        total_weighted_score = 0
        
        # 保存字段得分
        field_scores = {}
        
        for dimension in dimensions:
            dim_value = dimension.value
            
            # 根据维度调用相应的评估函数
            if dimension == QualityDimension.COMPLETENESS:
                assessment = await assess_completeness(data, schema, detail_level)
                # 保存字段完整性得分
                if "field_scores" in assessment:
                    for field, score in assessment["field_scores"].items():
                        if field not in field_scores:
                            field_scores[field] = {}
                        field_scores[field]["completeness"] = score
            
            elif dimension == QualityDimension.ACCURACY:
                assessment = await assess_accuracy(data, reference_data, schema, detail_level)
                # 保存字段准确性得分
                if "field_scores" in assessment:
                    for field, score in assessment["field_scores"].items():
                        if field not in field_scores:
                            field_scores[field] = {}
                        field_scores[field]["accuracy"] = score
            
            elif dimension == QualityDimension.CONSISTENCY:
                assessment = await assess_consistency(data, schema, detail_level)
                # 保存字段一致性得分
                if "field_scores" in assessment:
                    for field, score in assessment["field_scores"].items():
                        if field not in field_scores:
                            field_scores[field] = {}
                        field_scores[field]["consistency"] = score
            
            elif dimension == QualityDimension.VALIDITY:
                assessment = await assess_validity(data, schema, custom_rules, detail_level)
                # 保存字段有效性得分
                if "field_scores" in assessment:
                    for field, score in assessment["field_scores"].items():
                        if field not in field_scores:
                            field_scores[field] = {}
                        field_scores[field]["validity"] = score
            
            elif dimension == QualityDimension.UNIQUENESS:
                assessment = await assess_uniqueness(data, detail_level)
                # 保存字段唯一性得分
                if "field_scores" in assessment:
                    for field, score in assessment["field_scores"].items():
                        if field not in field_scores:
                            field_scores[field] = {}
                        field_scores[field]["uniqueness"] = score
            
            elif dimension == QualityDimension.DIVERSITY:
                assessment = await assess_diversity(data, detail_level)
                # 保存字段多样性得分
                if "field_scores" in assessment:
                    for field, score in assessment["field_scores"].items():
                        if field not in field_scores:
                            field_scores[field] = {}
                        field_scores[field]["diversity"] = score
            
            # elif dimension == QualityDimension.RELEVANCE: # Commented out call to missing function
            #     assessment = await assess_relevance(data, reference_data, detail_level)
            
            # elif dimension == QualityDimension.TIMELINESS: # Commented out call to missing function
            #     assessment = await assess_timeliness(data, custom_rules, detail_level)
            #     # 保存字段时效性得分
            #     if "field_scores" in assessment:
            #         for field, score in assessment["field_scores"].items():
            #             if field not in field_scores:
            #                 field_scores[field] = {}
            #             field_scores[field]["timeliness"] = score
            
            # elif dimension == QualityDimension.READABILITY: # Commented out call to missing function
            #     assessment = await assess_readability(data, detail_level)
            #     # 保存字段可读性得分
            #     if "field_scores" in assessment:
            #         for field, score in assessment["field_scores"].items():
            #             if field not in field_scores:
            #                 field_scores[field] = {}
            #             field_scores[field]["readability"] = score
            
            # elif dimension == QualityDimension.ETHICAL: # Commented out call to missing function
            #     assessment = await assess_ethical(data, custom_rules, detail_level)
            
            else:
                assessment = {"score": 0, "details": {"error": f"不支持的维度: {dim_value}"}}
                logger.warning(f"Unsupported quality dimension: {dim_value}")
            
            # 检查是否通过阈值
            threshold = threshold_scores.get(dim_value, 0.7)
            passed_threshold = assessment["score"] >= threshold
            
            # 计算加权得分
            weight = weights.get(dim_value, 1.0/len(dimensions))
            weighted_score = assessment["score"] * weight
            total_weighted_score += weighted_score
            
            # 添加到评估结果
            dimension_assessments.append({
                "dimension": dim_value,
                "score": assessment["score"],
                "weighted_score": weighted_score,
                "weight": weight,
                "passed": passed_threshold,
                "threshold": threshold,
                "issues": assessment.get("issues", []),
                "recommendations": self._generate_recommendations(dim_value, assessment)
            })
        
        # 计算总体得分
        overall_score = total_weighted_score
        
        # 检查是否通过总体阈值
        overall_threshold = 0.7  # 默认总体阈值
        passed_overall = overall_score >= overall_threshold
        
        # 生成评估摘要
        summary = {
            "assessed_items": len(data),
            "assessed_dimensions": len(dimensions),
            "passed_dimensions": sum(1 for dim in dimension_assessments if dim["passed"]),
            "failed_dimensions": sum(1 for dim in dimension_assessments if not dim["passed"]),
            "top_issues": self._extract_top_issues(dimension_assessments, limit=5)
        }
        
        # 生成改进优先级
        improvement_priority = sorted(
            dimension_assessments,
            key=lambda x: (not x["passed"], x["weight"], -x["score"])
        )
        improvement_priority = [{
            "dimension": dim["dimension"],
            "current_score": dim["score"],
            "target_score": max(dim["threshold"], dim["score"] + 0.1),
            "impact": dim["weight"] * (max(dim["threshold"], dim["score"] + 0.1) - dim["score"])
        } for dim in improvement_priority]
        
        # 计算字段总体质量得分
        overall_field_scores = {}
        for field, dim_scores in field_scores.items():
            # 对每个字段计算加权平均得分
            field_total_score = 0
            field_total_weight = 0
            
            for dim, score in dim_scores.items():
                dim_weight = weights.get(dim, 1.0/len(dimensions))
                field_total_score += score * dim_weight
                field_total_weight += dim_weight
            
            if field_total_weight > 0:
                overall_field_scores[field] = field_total_score / field_total_weight
            else:
                overall_field_scores[field] = 0
        
        # 生成可视化数据
        visualizations = await self._generate_visualizations(dimension_assessments, field_scores)
        
        # 如果需要生成报告，创建报告URL
        report_url = None
        if generate_report:
            report_url = await self._generate_quality_report(
                data, dimension_assessments, overall_score, summary, overall_field_scores,
                report_format=report_format
            )
        
        # 返回完整评估结果
        return {
            "overall_score": overall_score,
            "passed_threshold": passed_overall,
            "dimension_scores": dimension_assessments,
            "summary": summary,
            "improvement_priority": improvement_priority,
            "field_scores": overall_field_scores,
            "visualizations": visualizations,
            "report_url": report_url
        }

    def _generate_recommendations(self, dimension: str, assessment: Dict[str, Any]) -> List[str]:
        """根据评估结果生成改进建议"""
        recommendations = []
        
        # 通用建议
        common_recommendations = {
            "completeness": [
                "补全缺失值以提高数据完整性",
                "考虑使用缺失值处理技术(如均值/众数填充)"
            ],
            "accuracy": [
                "验证异常值是否真实",
                "通过交叉验证提高数据准确性"
            ],
            "consistency": [
                "统一数据格式",
                "规范化数据录入流程",
                "定义清晰的字段类型和取值范围"
            ],
            "validity": [
                "应用数据验证规则",
                "确保数据符合业务规则"
            ],
            "uniqueness": [
                "识别并移除重复记录",
                "实施唯一键约束"
            ],
            "diversity": [
                "增加样本多样性",
                "确保数据覆盖更广的取值范围"
            ]
        }
        
        if dimension in common_recommendations:
            recommendations.extend(common_recommendations[dimension])
        
        # 基于特定问题的建议
        issues = assessment.get("issues", [])
        if issues:
            if dimension == "completeness":
                if any("missing_rate" in issue for issue in issues if isinstance(issue, dict)):
                    high_missing_fields = [
                        issue.get("field") for issue in issues 
                        if isinstance(issue, dict) and issue.get("missing_rate", 0) > 0.3
                    ]
                    if high_missing_fields:
                        recommendations.append(f"优先处理以下字段的缺失值: {', '.join(high_missing_fields)}")
            
            elif dimension == "consistency":
                type_issues = [
                    issue.get("field") for issue in issues 
                    if isinstance(issue, dict) and issue.get("issue_type") == "inconsistent_type"
                ]
                if type_issues:
                    recommendations.append(f"规范化以下字段的数据类型: {', '.join(type_issues)}")
            
            elif dimension == "validity":
                invalid_fields = [
                    issue.get("field") for issue in issues 
                    if isinstance(issue, dict) and issue.get("invalid_count", 0) > 0
                ]
                if invalid_fields:
                    recommendations.append(f"检查以下字段的数据有效性: {', '.join(invalid_fields)}")
        
        # 评分相关建议
        score = assessment.get("score", 0)
        if score < 0.6:
            if dimension == "completeness":
                recommendations.append("考虑实施严格的数据录入验证以减少缺失值")
            elif dimension == "accuracy":
                recommendations.append("建立定期的数据质量审核流程")
            elif dimension == "consistency":
                recommendations.append("制定全面的数据标准并确保所有数据源遵循")
        
        return recommendations[:5]  # 限制建议数量
    
    def _extract_top_issues(self, dimension_assessments: List[Dict[str, Any]], limit: int = 5) -> List[Dict[str, Any]]:
        """提取最重要的问题"""
        all_issues = []
        
        for dim_assessment in dimension_assessments:
            dimension = dim_assessment["dimension"]
            
            for issue in dim_assessment.get("issues", []):
                if isinstance(issue, dict):
                    issue_with_dim = {
                        "dimension": dimension,
                        "severity": issue.get("severity", "medium"),
                        "field": issue.get("field", "unknown"),
                        "issue_type": issue.get("issue_type", "unknown"),
                        "description": issue.get("description", "No description"),
                        "impact": dim_assessment["weight"] * (1 - dim_assessment["score"])
                    }
                    all_issues.append(issue_with_dim)
        
        # 按影响排序
        sorted_issues = sorted(all_issues, key=lambda x: (
            {"high": 0, "medium": 1, "low": 2}.get(x["severity"], 3),
            -x["impact"]
        ))
        
        return sorted_issues[:limit]
    
    async def _generate_visualizations(self, dimension_assessments: List[Dict[str, Any]], 
                                     field_scores: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
        """生成可视化数据"""
        # 雷达图数据
        radar_data = {
            "dimensions": [dim["dimension"] for dim in dimension_assessments],
            "scores": [dim["score"] for dim in dimension_assessments]
        }
        
        # 各维度得分柱状图
        bar_chart_data = {
            "dimensions": [dim["dimension"] for dim in dimension_assessments],
            "scores": [dim["score"] for dim in dimension_assessments],
            "thresholds": [dim["threshold"] for dim in dimension_assessments]
        }
        
        # 字段质量热图数据
        heatmap_data = {
            "fields": list(field_scores.keys()),
            "dimensions": list(set(dim for scores in field_scores.values() for dim in scores.keys())),
            "scores": []
        }
        
        for field in heatmap_data["fields"]:
            field_data = []
            for dim in heatmap_data["dimensions"]:
                score = field_scores.get(field, {}).get(dim, None)
                field_data.append(score)
            heatmap_data["scores"].append(field_data)
        
        # 改进优先级可视化
        priority_data = {
            "dimensions": [dim["dimension"] for dim in dimension_assessments],
            "gaps": [max(dim["threshold"] - dim["score"], 0) for dim in dimension_assessments],
            "weights": [dim["weight"] for dim in dimension_assessments]
        }
        
        return {
            "radar_chart": radar_data,
            "dimension_bar_chart": bar_chart_data,
            "field_quality_heatmap": heatmap_data,
            "improvement_priority": priority_data
        }
    
    async def _generate_quality_report(self, data: List[Dict[str, Any]], 
                                     dimension_assessments: List[Dict[str, Any]],
                                     overall_score: float,
                                     summary: Dict[str, Any],
                                     field_scores: Dict[str, float],
                                     report_format: str = "json") -> str:
        """生成质量评估报告"""
        report_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        report_data = {
            "report_id": report_id,
            "timestamp": timestamp,
            "overall_score": overall_score,
            "summary": summary,
            "dimension_assessments": dimension_assessments,
            "field_scores": field_scores,
            "data_sample": data[:10] if len(data) > 10 else data,
            "record_count": len(data)
        }
        
        if report_format == "json":
            report_path = os.path.join(self.reports_dir, f"quality_report_{timestamp}_{report_id}.json")
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        elif report_format == "html":
            report_path = os.path.join(self.reports_dir, f"quality_report_{timestamp}_{report_id}.html")
            await self._generate_html_report(report_data, report_path)
        
        elif report_format == "csv":
            report_path = os.path.join(self.reports_dir, f"quality_report_{timestamp}_{report_id}.csv")
            # 将评估结果转换为扁平结构
            df_data = []
            for dim in dimension_assessments:
                row = {
                    "dimension": dim["dimension"],
                    "score": dim["score"],
                    "weight": dim["weight"],
                    "passed": dim["passed"],
                    "threshold": dim["threshold"]
                }
                df_data.append(row)
            
            df = pd.DataFrame(df_data)
            df.to_csv(report_path, index=False)
        
        else:
            # 默认JSON格式
            report_path = os.path.join(self.reports_dir, f"quality_report_{timestamp}_{report_id}.json")
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        # 返回报告URL (相对路径)
        return f"/quality_reports/{os.path.basename(report_path)}"
    
    async def _generate_html_report(self, report_data: Dict[str, Any], report_path: str) -> None:
        """生成HTML格式的质量评估报告"""
        # 构建HTML模板
        html_content = f"""
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>数据质量评估报告</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }}
                h1, h2, h3 {{ color: #2c3e50; }}
                .report-header {{ text-align: center; margin-bottom: 30px; }}
                .score-card {{ display: flex; justify-content: center; margin-bottom: 20px; }}
                .score-box {{ 
                    width: 150px; height: 150px; display: flex; flex-direction: column;
                    justify-content: center; align-items: center; margin: 0 15px;
                    border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }}
                .overall-score {{ background-color: {self._get_score_color(report_data['overall_score'])}; color: white; }}
                .score-value {{ font-size: 48px; font-weight: bold; }}
                .score-label {{ font-size: 14px; margin-top: 10px; }}
                .summary-section {{ margin-bottom: 30px; }}
                .dimension-table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
                .dimension-table th, .dimension-table td {{ padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }}
                .dimension-table th {{ background-color: #f2f2f2; }}
                .passed {{ color: green; }}
                .failed {{ color: red; }}
                .field-table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
                .field-table th, .field-table td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
                .field-table th {{ background-color: #f2f2f2; }}
                .issues-list {{ list-style-type: none; padding-left: 0; }}
                .issues-list li {{ margin-bottom: 10px; padding: 10px; background-color: #f9f9f9; border-radius: 5px; }}
                .recommendations {{ padding-left: 20px; }}
                .recommendations li {{ margin-bottom: 5px; }}
                .data-sample {{ margin-top: 30px; overflow-x: auto; }}
                .data-table {{ width: 100%; border-collapse: collapse; }}
                .data-table th, .data-table td {{ padding: 8px; text-align: left; border: 1px solid #ddd; }}
                .data-table th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="report-header">
                <h1>数据质量评估报告</h1>
                <p>报告生成时间: {report_data['timestamp']}</p>
                <p>记录数量: {report_data['record_count']}</p>
            </div>
            
            <div class="score-card">
                <div class="score-box overall-score">
                    <div class="score-value">{report_data['overall_score']:.2f}</div>
                    <div class="score-label">总体得分</div>
                </div>
                <div class="score-box" style="background-color: #3498db; color: white;">
                    <div class="score-value">{report_data['summary']['assessed_dimensions']}</div>
                    <div class="score-label">评估维度</div>
                </div>
                <div class="score-box" style="background-color: #2ecc71; color: white;">
                    <div class="score-value">{report_data['summary']['passed_dimensions']}</div>
                    <div class="score-label">通过维度</div>
                </div>
                <div class="score-box" style="background-color: #e74c3c; color: white;">
                    <div class="score-value">{report_data['summary']['failed_dimensions']}</div>
                    <div class="score-label">未通过维度</div>
                </div>
            </div>
            
            <div class="summary-section">
                <h2>评估摘要</h2>
                <p>评估了 {report_data['record_count']} 条记录，覆盖 {report_data['summary']['assessed_dimensions']} 个质量维度。</p>
                
                <h3>主要问题</h3>
                <ul class="issues-list">
        """
        
        # 添加主要问题
        for issue in report_data['summary'].get('top_issues', []):
            html_content += f"""
                    <li>
                        <strong>{issue['dimension']} - {issue['field']}:</strong> {issue['description']}
                        <br><small>严重程度: {issue['severity']}, 类型: {issue['issue_type']}</small>
                    </li>
            """
        
        html_content += """
                </ul>
            </div>
            
            <h2>维度评估详情</h2>
            <table class="dimension-table">
                <thead>
                    <tr>
                        <th>维度</th>
                        <th>得分</th>
                        <th>权重</th>
                        <th>阈值</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        # 添加维度详情
        for dim in report_data['dimension_assessments']:
            status_class = "passed" if dim['passed'] else "failed"
            status_text = "通过" if dim['passed'] else "未通过"
            
            html_content += f"""
                    <tr>
                        <td>{dim['dimension']}</td>
                        <td>{dim['score']:.2f}</td>
                        <td>{dim['weight']:.2f}</td>
                        <td>{dim['threshold']:.2f}</td>
                        <td class="{status_class}">{status_text}</td>
                    </tr>
            """
        
        html_content += """
                </tbody>
            </table>
            
            <h2>字段质量得分</h2>
            <table class="field-table">
                <thead>
                    <tr>
                        <th>字段</th>
                        <th>质量得分</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        # 添加字段质量得分
        for field, score in sorted(report_data['field_scores'].items(), key=lambda x: -x[1]):
            color = self._get_score_color(score)
            html_content += f"""
                    <tr>
                        <td>{field}</td>
                        <td style="background-color: {color}; color: white;">{score:.2f}</td>
                    </tr>
            """
        
        html_content += """
                </tbody>
            </table>
            
            <h2>详细建议</h2>
        """
        
        # 添加详细建议
        for dim in report_data['dimension_assessments']:
            if dim.get('recommendations'):
                html_content += f"""
                <h3>{dim['dimension']} (得分: {dim['score']:.2f})</h3>
                <ul class="recommendations">
                """
                
                for rec in dim['recommendations']:
                    html_content += f"<li>{rec}</li>"
                
                html_content += "</ul>"
        
        # 添加数据样本
        html_content += """
            <div class="data-sample">
                <h2>数据样本</h2>
                <table class="data-table">
                    <thead>
                        <tr>
        """
        
        # 提取字段列表
        if report_data['data_sample']:
            fields = list(report_data['data_sample'][0].keys())
            
            # 表头
            for field in fields:
                html_content += f"<th>{field}</th>"
            
            html_content += """
                        </tr>
                    </thead>
                    <tbody>
            """
            
            # 数据行
            for item in report_data['data_sample']:
                html_content += "<tr>"
                for field in fields:
                    value = item.get(field, "")
                    # 将复杂对象转换为字符串表示
                    if isinstance(value, (dict, list)):
                        value = str(value)
                    html_content += f"<td>{value}</td>"
                html_content += "</tr>"
        
        html_content += """
                    </tbody>
                </table>
            </div>
            
            <footer style="margin-top: 30px; text-align: center; color: #777; border-top: 1px solid #eee; padding-top: 20px;">
                <p>由 Datapresso 质量评估服务生成</p>
                <p>报告ID: {report_id}</p>
            </footer>
        </body>
        </html>
        """.format(report_id=report_data['report_id'])
        
        # 写入HTML文件
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
    
    def _get_score_color(self, score: float) -> str:
        """根据得分获取颜色"""
        if score >= 0.8:
            return "#27ae60"  # 绿色
        elif score >= 0.6:
            return "#f39c12"  # 橙色
        else:
            return "#e74c3c"  # 红色
    
    async def start_async_assessment_task(self, request) -> str:
        """启动异步评估任务，返回任务ID"""
        task_id = str(uuid.uuid4())
        
        # 保存任务信息到数据库
        task_create_payload = schemas.TaskCreate(
            id=task_id,
            name=f"QualityAssessmentTask-{request.request_id or task_id}",
            task_type="quality_assessment",
            status="queued",
            parameters=request.dict(exclude_none=True)
        )
        await crud.create_task(db=None, task_in=task_create_payload) # db session needs to be passed here
                                                                    # This service method needs db session if it calls crud
        
        return task_id
    
    async def execute_async_assessment_task(self, task_id: str, db: Optional[AsyncSession] = None): # Added db parameter
        """执行异步评估任务"""
        # This method will need a DB session if it's to use CRUD operations.
        # Assuming it will be called by a background task that provides a session.
        # If db is None, it implies this method might need to create its own session,
        # or the calling background task wrapper must provide it.
        # For now, let's assume the caller (background task in router) will provide `db`.
        if db is None:
            # This is a fallback, ideally the caller provides the session
            from db.database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                return await self._execute_async_assessment_task_impl(task_id, session)
        else:
            return await self._execute_async_assessment_task_impl(task_id, db)

    async def _execute_async_assessment_task_impl(self, task_id: str, db: AsyncSession):
        try:
            # 更新任务状态为运行中
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(status="running", started_at=datetime.now(), progress=0.0))
            
            # 获取任务请求
            task_orm = await crud.get_task(db=db, task_id=task_id)
            if not task_orm or not task_orm.parameters:
                logger.error(f"Task {task_id} not found or has no parameters for quality assessment.")
                await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(status="failed", error="Task data or parameters not found", completed_at=datetime.now()))
                return

            request_params = task_orm.parameters # This is a dict from QualityAssessmentRequest
            
            # 逐步更新进度
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(progress=0.1))
            
            # 执行评估
            # Ensure QualityDimension is correctly passed if it's an Enum
            dimensions_enums = [QualityDimension(dim_val) for dim_val in request_params.get("dimensions", [])]

            result = await self.assess_quality(
                data=request_params["data"], # Corrected: use request_params
                dimensions=dimensions_enums, # Pass enum members
                schema=request_params.get("schema_definition"), # Use aliased field name 'schema' which maps to schema_definition
                reference_data=request_params.get("reference_data"),
                weights=request_params.get("weights"),
                threshold_scores=request_params.get("threshold_scores"),
                generate_report=request_params.get("generate_report", True),
                report_format=request_params.get("report_format", "json"),
                detail_level=request_params.get("detail_level", "medium"),
                custom_rules=request_params.get("custom_rules")
            )
            
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(progress=0.9)) # Corrected: use crud.update_task
            
            # 构建响应
            response_payload = { # Renamed to avoid conflict
                "overall_score": result["overall_score"],
                "dimension_scores": result["dimension_scores"],
                "summary": result["summary"],
                "passed_threshold": result.get("passed_threshold"),
                "report_url": result.get("report_url"),
                "field_scores": result.get("field_scores"),
                "improvement_priority": result.get("improvement_priority"),
                "visualizations": result.get("visualizations"),
                "status": "success",
                "message": "质量评估完成",
                "request_id": request_params.get("request_id"), # Get from stored params
                "execution_time_ms": (datetime.now() - (task_orm.started_at if task_orm.started_at else datetime.now())).total_seconds() * 1000
            }
            
            # 更新任务状态为完成
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(
                status="completed",
                result=response_payload, # Use renamed variable
                completed_at=datetime.now(),
                progress=1.0
            ))
            
        except Exception as e:
            logger.error(f"异步评估任务出错 {task_id}: {str(e)}", exc_info=True)
            # 更新任务状态为失败
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(
                status="failed",
                error=str(e),
                completed_at=datetime.now()
            ))
    
    async def get_task_status(self, task_id: str, db: AsyncSession) -> Optional[TaskSchema]: # db is not optional, ensure router passes it
        """获取任务状态和结果"""
        task_orm = await crud.get_task(db=db, task_id=task_id)
        if not task_orm:
            return None
        
        return TaskSchema.from_orm(task_orm)
