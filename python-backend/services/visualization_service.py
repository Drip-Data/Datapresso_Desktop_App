from typing import List, Dict, Any, Optional
import logging
import uuid
import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
from config import get_settings

# 设置matplotlib中文字体支持
plt.rcParams['font.sans-serif'] = ['SimHei']  
plt.rcParams['axes.unicode_minus'] = False  

logger = logging.getLogger(__name__)

class VisualizationService:
    """数据可视化服务"""
    
    def __init__(self):
        """初始化可视化服务"""
        self.settings = get_settings()
        # 确保存储目录存在
        self.results_dir = self.settings.results_dir
        self.images_dir = os.path.join(self.results_dir, "visualizations")
        os.makedirs(self.images_dir, exist_ok=True)
    
    async def create_visualization(
        self,
        data: List[Dict[str, Any]],
        chart_type: str,
        config: Dict[str, Any],
        x_field: Optional[str] = None,
        y_field: Optional[str] = None,
        group_by: Optional[str] = None,
        aggregation: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        创建数据可视化
        
        Args:
            data: 要可视化的数据
            chart_type: 图表类型
            config: 可视化配置
            x_field: X轴字段
            y_field: Y轴字段
            group_by: 分组字段
            aggregation: 聚合方式
            
        Returns:
            包含图表数据和配置的字典
        """
        logger.debug(f"Creating {chart_type} visualization")
        
        # 将数据转换为DataFrame
        df = pd.DataFrame(data)
        
        # 生成唯一的可视化ID
        visualization_id = str(uuid.uuid4())
        
        # 根据图表类型构建不同的可视化
        if chart_type == "bar":
            chart_data = await self._create_bar_chart(df, x_field, y_field, group_by, aggregation, config)
        elif chart_type == "line":
            chart_data = await self._create_line_chart(df, x_field, y_field, group_by, aggregation, config)
        elif chart_type == "pie":
            chart_data = await self._create_pie_chart(df, x_field, y_field, config)
        elif chart_type == "scatter":
            chart_data = await self._create_scatter_chart(df, x_field, y_field, group_by, config)
        elif chart_type == "histogram":
            chart_data = await self._create_histogram(df, x_field, config)
        elif chart_type == "heatmap":
            chart_data = await self._create_heatmap(df, x_field, y_field, config)
        elif chart_type == "boxplot":
            chart_data = await self._create_boxplot(df, x_field, y_field, group_by, config)
        else:
            raise ValueError(f"Unsupported chart type: {chart_type}")
        
        # 生成图像URL
        image_url = await self._save_visualization_image(chart_data, visualization_id, config)
        
        # 返回结果
        return {
            "chart_data": chart_data,
            "chart_config": config,
            "visualization_id": visualization_id,
            "image_url": image_url
        }
    
    async def export_visualization(
        self,
        chart_type: str,
        chart_data: Any,
        chart_config: Dict[str, Any],
        format: str = "png"
    ) -> Dict[str, Any]:
        """
        导出可视化为图片或HTML
        
        Args:
            chart_type: 图表类型
            chart_data: 图表数据
            chart_config: 图表配置
            format: 导出格式
            
        Returns:
            包含导出结果的字典
        """
        logger.debug(f"Exporting visualization to {format}")
        
        visualization_id = str(uuid.uuid4())
        
        if format in ["png", "jpg", "svg", "pdf"]:
            # 导出为图片
            image_path = os.path.join(self.images_dir, f"{visualization_id}.{format}")
            
            if chart_type in ["bar", "line", "pie", "scatter", "histogram", "heatmap", "boxplot"]:
                if "plotly_figure" in chart_data:
                    fig = chart_data["plotly_figure"]
                    fig.write_image(image_path)
                else:
                    # 如果没有plotly图形，尝试使用matplotlib
                    plt.savefig(image_path, bbox_inches='tight', dpi=300)
                    plt.close()
            
            # 返回图片URL
            image_url = f"/static/visualizations/{visualization_id}.{format}"
            return {
                "image_url": image_url,
                "visualization_id": visualization_id
            }
        
        elif format == "html":
            # 导出为HTML
            html_path = os.path.join(self.images_dir, f"{visualization_id}.html")
            
            if chart_type in ["bar", "line", "pie", "scatter", "histogram", "heatmap", "boxplot"]:
                if "plotly_figure" in chart_data:
                    fig = chart_data["plotly_figure"]
                    html_content = fig.to_html(include_plotlyjs='cdn')
                    
                    with open(html_path, 'w', encoding='utf-8') as f:
                        f.write(html_content)
                else:
                    # 如果没有plotly图形，返回错误
                    raise ValueError("HTML export is only supported for Plotly charts")
            
            return {
                "html_content": html_content,
                "visualization_id": visualization_id
            }
        
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    async def _create_bar_chart(
        self, 
        df: pd.DataFrame, 
        x_field: str,
        y_field: str,
        group_by: Optional[str] = None,
        aggregation: str = "sum",
        config: Dict[str, Any] = {}
    ) -> Dict[str, Any]:
        """创建柱状图"""
        # 检查必要字段存在
        if x_field not in df.columns or y_field not in df.columns:
            raise ValueError(f"Required fields not found in data: {x_field}, {y_field}")
        
        # 如果有分组字段，确保其存在
        if group_by and group_by not in df.columns:
            raise ValueError(f"Group by field not found in data: {group_by}")
        
        # 聚合数据
        if group_by:
            if aggregation == "sum":
                agg_df = df.groupby([x_field, group_by])[y_field].sum().reset_index()
            elif aggregation == "mean":
                agg_df = df.groupby([x_field, group_by])[y_field].mean().reset_index()
            elif aggregation == "count":
                agg_df = df.groupby([x_field, group_by])[y_field].count().reset_index()
            else:
                raise ValueError(f"Unsupported aggregation method: {aggregation}")
            
            # 创建Plotly图表
            fig = px.bar(
                agg_df, 
                x=x_field, 
                y=y_field, 
                color=group_by,
                title=config.get("title", f"{y_field} by {x_field}"),
                labels={x_field: config.get("x_label", x_field), y_field: config.get("y_label", y_field)},
                barmode=config.get("barmode", "group")
            )
        else:
            if aggregation == "sum":
                agg_df = df.groupby(x_field)[y_field].sum().reset_index()
            elif aggregation == "mean":
                agg_df = df.groupby(x_field)[y_field].mean().reset_index()
            elif aggregation == "count":
                agg_df = df.groupby(x_field)[y_field].count().reset_index()
            else:
                raise ValueError(f"Unsupported aggregation method: {aggregation}")
            
            # 创建Plotly图表
            fig = px.bar(
                agg_df, 
                x=x_field, 
                y=y_field,
                title=config.get("title", f"{y_field} by {x_field}"),
                labels={x_field: config.get("x_label", x_field), y_field: config.get("y_label", y_field)}
            )
        
        # 更新布局
        fig.update_layout(
            height=config.get("height", 600),
            width=config.get("width", 800),
            template=config.get("template", "plotly"),
            colorway=config.get("colorway", None),
            margin=dict(l=50, r=50, t=50, b=50)
        )
        
        # 转换为前端可用的数据格式
        chart_data = {
            "x_values": agg_df[x_field].tolist(),
            "y_values": agg_df[y_field].tolist(),
            "plotly_figure": fig,
            "plotly_json": fig.to_json()
        }
        
        # 如果有分组，添加分组数据
        if group_by:
            chart_data["groups"] = agg_df[group_by].unique().tolist()
            chart_data["group_values"] = agg_df[group_by].tolist()
        
        return chart_data
    
    async def _create_line_chart(
        self, 
        df: pd.DataFrame, 
        x_field: str,
        y_field: str,
        group_by: Optional[str] = None,
        aggregation: str = "mean",
        config: Dict[str, Any] = {}
    ) -> Dict[str, Any]:
        """创建折线图"""
        # 检查必要字段存在
        if x_field not in df.columns or y_field not in df.columns:
            raise ValueError(f"Required fields not found in data: {x_field}, {y_field}")
        
        # 如果有分组字段，确保其存在
        if group_by and group_by not in df.columns:
            raise ValueError(f"Group by field not found in data: {group_by}")
        
        # 确保x轴数据是排序的
        if pd.api.types.is_numeric_dtype(df[x_field]):
            df = df.sort_values(by=x_field)
        
        # 聚合数据
        if group_by:
            if aggregation == "sum":
                agg_df = df.groupby([x_field, group_by])[y_field].sum().reset_index()
            elif aggregation == "mean":
                agg_df = df.groupby([x_field, group_by])[y_field].mean().reset_index()
            elif aggregation == "count":
                agg_df = df.groupby([x_field, group_by])[y_field].count().reset_index()
            else:
                raise ValueError(f"Unsupported aggregation method: {aggregation}")
            
            # 创建Plotly图表
            fig = px.line(
                agg_df, 
                x=x_field, 
                y=y_field, 
                color=group_by,
                title=config.get("title", f"{y_field} by {x_field}"),
                labels={x_field: config.get("x_label", x_field), y_field: config.get("y_label", y_field)},
                markers=config.get("show_markers", True)
            )
        else:
            if aggregation == "sum":
                agg_df = df.groupby(x_field)[y_field].sum().reset_index()
            elif aggregation == "mean":
                agg_df = df.groupby(x_field)[y_field].mean().reset_index()
            elif aggregation == "count":
                agg_df = df.groupby(x_field)[y_field].count().reset_index()
            else:
                raise ValueError(f"Unsupported aggregation method: {aggregation}")
            
            # 创建Plotly图表
            fig = px.line(
                agg_df, 
                x=x_field, 
                y=y_field,
                title=config.get("title", f"{y_field} by {x_field}"),
                labels={x_field: config.get("x_label", x_field), y_field: config.get("y_label", y_field)},
                markers=config.get("show_markers", True)
            )
        
        # 更新布局
        fig.update_layout(
            height=config.get("height", 600),
            width=config.get("width", 800),
            template=config.get("template", "plotly"),
            colorway=config.get("colorway", None),
            margin=dict(l=50, r=50, t=50, b=50)
        )
        
        # 转换为前端可用的数据格式
        chart_data = {
            "x_values": agg_df[x_field].tolist(),
            "y_values": agg_df[y_field].tolist(),
            "plotly_figure": fig,
            "plotly_json": fig.to_json()
        }
        
        # 如果有分组，添加分组数据
        if group_by:
            chart_data["groups"] = agg_df[group_by].unique().tolist()
            chart_data["group_values"] = agg_df[group_by].tolist()
        
        return chart_data
    
    async def _create_pie_chart(
        self, 
        df: pd.DataFrame, 
        x_field: str,
        y_field: str,
        config: Dict[str, Any] = {}
    ) -> Dict[str, Any]:
        """创建饼图"""
        # 检查必要字段存在
        if x_field not in df.columns or y_field not in df.columns:
            raise ValueError(f"Required fields not found in data: {x_field}, {y_field}")
        
        # 聚合数据
        agg_df = df.groupby(x_field)[y_field].sum().reset_index()
        
        # 创建Plotly图表
        fig = px.pie(
            agg_df, 
            names=x_field, 
            values=y_field,
            title=config.get("title", f"{y_field} distribution by {x_field}"),
            hole=config.get("hole", 0),  # 设置为大于0的值可创建环形图
            color_discrete_sequence=config.get("colorway", None)
        )
        
        # 更新布局
        fig.update_layout(
            height=config.get("height", 600),
            width=config.get("width", 800),
            template=config.get("template", "plotly"),
            margin=dict(l=50, r=50, t=50, b=50)
        )
        
        # 转换为前端可用的数据格式
        chart_data = {
            "labels": agg_df[x_field].tolist(),
            "values": agg_df[y_field].tolist(),
            "plotly_figure": fig,
            "plotly_json": fig.to_json()
        }
        
        return chart_data
    
    async def _create_scatter_chart(
        self, 
        df: pd.DataFrame, 
        x_field: str,
        y_field: str,
        group_by: Optional[str] = None,
        config: Dict[str, Any] = {}
    ) -> Dict[str, Any]:
        """创建散点图"""
        # 检查必要字段存在
        if x_field not in df.columns or y_field not in df.columns:
            raise ValueError(f"Required fields not found in data: {x_field}, {y_field}")
        
        # 如果有分组字段，确保其存在
        if group_by and group_by not in df.columns:
            raise ValueError(f"Group by field not found in data: {group_by}")
        
        # 创建Plotly图表
        if group_by:
            fig = px.scatter(
                df, 
                x=x_field, 
                y=y_field, 
                color=group_by,
                title=config.get("title", f"{y_field} vs {x_field}"),
                labels={x_field: config.get("x_label", x_field), y_field: config.get("y_label", y_field)},
                size=config.get("size_field", None),
                hover_data=config.get("hover_fields", None)
            )
        else:
            fig = px.scatter(
                df, 
                x=x_field, 
                y=y_field,
                title=config.get("title", f"{y_field} vs {x_field}"),
                labels={x_field: config.get("x_label", x_field), y_field: config.get("y_label", y_field)},
                size=config.get("size_field", None),
                hover_data=config.get("hover_fields", None)
            )
        
        # 更新布局
        fig.update_layout(
            height=config.get("height", 600),
            width=config.get("width", 800),
            template=config.get("template", "plotly"),
            colorway=config.get("colorway", None),
            margin=dict(l=50, r=50, t=50, b=50)
        )
        
        # 添加趋势线
        if config.get("add_trendline", False):
            fig.update_layout(showlegend=True)
            fig.add_trace(
                go.Scatter(
                    x=df[x_field],
                    y=df[y_field],
                    mode='lines',
                    name='Trend',
                    line=dict(color='rgba(0,0,0,0.3)', width=2, dash='dash')
                )
            )
        
        # 转换为前端可用的数据格式
        chart_data = {
            "x_values": df[x_field].tolist(),
            "y_values": df[y_field].tolist(),
            "plotly_figure": fig,
            "plotly_json": fig.to_json()
        }
        
        # 如果有分组，添加分组数据
        if group_by:
            chart_data["groups"] = df[group_by].unique().tolist()
            chart_data["group_values"] = df[group_by].tolist()
        
        return chart_data
    
    async def _create_histogram(
        self, 
        df: pd.DataFrame, 
        x_field: str,
        config: Dict[str, Any] = {}
    ) -> Dict[str, Any]:
        """创建直方图"""
        # 检查必要字段存在
        if x_field not in df.columns:
            raise ValueError(f"Required field not found in data: {x_field}")
        
        # 创建Plotly图表
        fig = px.histogram(
            df, 
            x=x_field,
            nbins=config.get("nbins", 30),
            title=config.get("title", f"Histogram of {x_field}"),
            labels={x_field: config.get("x_label", x_field)},
            opacity=config.get("opacity", 0.8),
            color=config.get("color_field", None)
        )
        
        # 更新布局
        fig.update_layout(
            height=config.get("height", 600),
            width=config.get("width", 800),
            template=config.get("template", "plotly"),
            colorway=config.get("colorway", None),
            margin=dict(l=50, r=50, t=50, b=50)
        )
        
        # 添加内核密度估计
        if config.get("add_kde", False):
            kde_data = df[x_field].dropna()
            kde_x = np.linspace(kde_data.min(), kde_data.max(), 100)
            kde = gaussian_kde(kde_data)
            kde_y = kde(kde_x) * len(kde_data) * (kde_data.max() - kde_data.min()) / config.get("nbins", 30)
            
            fig.add_trace(
                go.Scatter(
                    x=kde_x,
                    y=kde_y,
                    mode='lines',
                    name='KDE',
                    line=dict(color='rgba(255,0,0,0.6)', width=2)
                )
            )
        
        # 转换为前端可用的数据格式
        chart_data = {
            "x_values": df[x_field].tolist(),
            "plotly_figure": fig,
            "plotly_json": fig.to_json()
        }
        
        return chart_data
    
    async def _create_heatmap(
        self, 
        df: pd.DataFrame, 
        x_field: str,
        y_field: str,
        config: Dict[str, Any] = {}
    ) -> Dict[str, Any]:
        """创建热力图"""
        # 检查必要字段存在
        if x_field not in df.columns or y_field not in df.columns:
            raise ValueError(f"Required fields not found in data: {x_field}, {y_field}")
        
        # 获取要显示的值字段
        z_field = config.get("z_field", None)
        aggregation = config.get("aggregation", "count")
        
        # 根据聚合方式创建透视表
        if z_field and z_field in df.columns:
            if aggregation == "sum":
                pivot_df = df.pivot_table(index=y_field, columns=x_field, values=z_field, aggfunc='sum')
            elif aggregation == "mean":
                pivot_df = df.pivot_table(index=y_field, columns=x_field, values=z_field, aggfunc='mean')
            elif aggregation == "max":
                pivot_df = df.pivot_table(index=y_field, columns=x_field, values=z_field, aggfunc='max')
            elif aggregation == "min":
                pivot_df = df.pivot_table(index=y_field, columns=x_field, values=z_field, aggfunc='min')
            else:
                raise ValueError(f"Unsupported aggregation method: {aggregation}")
        else:
            # 如果没有值字段，则使用计数
            pivot_df = df.pivot_table(index=y_field, columns=x_field, aggfunc='size')
        
        # 填充缺失值
        pivot_df = pivot_df.fillna(0)
        
        # 创建Plotly图表
        fig = px.imshow(
            pivot_df,
            title=config.get("title", f"Heatmap of {z_field or 'count'} by {x_field} and {y_field}"),
            labels=dict(x=config.get("x_label", x_field), y=config.get("y_label", y_field), color=z_field or "count"),
            color_continuous_scale=config.get("colorscale", "Viridis"),
            aspect=config.get("aspect", "auto")
        )
        
        # 更新布局
        fig.update_layout(
            height=config.get("height", 600),
            width=config.get("width", 800),
            template=config.get("template", "plotly"),
            margin=dict(l=50, r=50, t=50, b=50)
        )
        
        # 转换为前端可用的数据格式
        chart_data = {
            "x_values": pivot_df.columns.tolist(),
            "y_values": pivot_df.index.tolist(),
            "z_values": pivot_df.values.tolist(),
            "plotly_figure": fig,
            "plotly_json": fig.to_json()
        }
        
        return chart_data
    
    async def _create_boxplot(
        self, 
        df: pd.DataFrame, 
        x_field: str,
        y_field: str,
        group_by: Optional[str] = None,
        config: Dict[str, Any] = {}
    ) -> Dict[str, Any]:
        """创建箱线图"""
        # 检查必要字段存在
        if x_field not in df.columns or y_field not in df.columns:
            raise ValueError(f"Required fields not found in data: {x_field}, {y_field}")
        
        # 如果有分组字段，确保其存在
        if group_by and group_by not in df.columns:
            raise ValueError(f"Group by field not found in data: {group_by}")
        
        # 创建Plotly图表
        if group_by:
            fig = px.box(
                df, 
                x=x_field, 
                y=y_field, 
                color=group_by,
                title=config.get("title", f"Boxplot of {y_field} by {x_field}"),
                labels={x_field: config.get("x_label", x_field), y_field: config.get("y_label", y_field)},
                notched=config.get("notched", False),
                points=config.get("points", "outliers")  # "all", "outliers", "suspected", False
            )
        else:
            fig = px.box(
                df, 
                x=x_field, 
                y=y_field,
                title=config.get("title", f"Boxplot of {y_field} by {x_field}"),
                labels={x_field: config.get("x_label", x_field), y_field: config.get("y_label", y_field)},
                notched=config.get("notched", False),
                points=config.get("points", "outliers")
            )
        
        # 更新布局
        fig.update_layout(
            height=config.get("height", 600),
            width=config.get("width", 800),
            template=config.get("template", "plotly"),
            colorway=config.get("colorway", None),
            margin=dict(l=50, r=50, t=50, b=50)
        )
        
        # 转换为前端可用的数据格式
        chart_data = {
            "x_values": df[x_field].unique().tolist(),
            "y_field": y_field,
            "plotly_figure": fig,
            "plotly_json": fig.to_json()
        }
        
        # 如果有分组，添加分组数据
        if group_by:
            chart_data["groups"] = df[group_by].unique().tolist()
        
        return chart_data
    
    async def _save_visualization_image(
        self,
        chart_data: Dict[str, Any],
        visualization_id: str,
        config: Dict[str, Any] = {}
    ) -> str:
        """保存可视化图表为图片文件"""
        # 保存图表为PNG文件
        image_path = os.path.join(self.images_dir, f"{visualization_id}.png")
        
        if "plotly_figure" in chart_data:
            fig = chart_data["plotly_figure"]
            fig.write_image(image_path, width=config.get("width", 800), height=config.get("height", 600))
        else:
            # 如果没有plotly图形，可能使用了matplotlib，需要特殊处理
            plt.savefig(image_path, bbox_inches='tight', dpi=300)
            plt.close()
        
        # 返回图片的相对URL
        return f"/static/visualizations/{visualization_id}.png"
