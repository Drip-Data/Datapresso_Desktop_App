from fastapi import APIRouter, HTTPException, Depends
from models.request_models import VisualizationRequest
from models.response_models import VisualizationResponse
from services.visualization_service import VisualizationService
import logging
import time

router = APIRouter()
logger = logging.getLogger(__name__)

def get_visualization_service():
    """依赖注入：获取可视化服务实例"""
    return VisualizationService()

@router.post("/create", response_model=VisualizationResponse)
async def create_visualization(
    request: VisualizationRequest,
    service: VisualizationService = Depends(get_visualization_service)
):
    """
    创建数据可视化
    
    - **data**: 要可视化的数据
    - **chart_type**: 图表类型
    - **config**: 可视化配置
    
    返回:
    - **chart_data**: 图表数据
    - **chart_config**: 图表配置
    """
    try:
        logger.info(f"Received visualization request (id: {request.request_id}) with {len(request.data)} items")
        start_time = time.time()
        
        # 调用服务层处理可视化
        result = await service.create_visualization(
            data=request.data,
            chart_type=request.chart_type,
            config=request.config,
            x_field=request.x_field,
            y_field=request.y_field,
            group_by=request.group_by,
            aggregation=request.aggregation
        )
        
        execution_time = (time.time() - start_time) * 1000
        logger.info(f"Visualization created (id: {request.request_id})")
        
        # 构建响应
        return VisualizationResponse(
            chart_data=result["chart_data"],
            chart_config=result["chart_config"],
            chart_type=request.chart_type,
            visualization_id=result.get("visualization_id"),
            image_url=result.get("image_url"),
            html_content=result.get("html_content"),
            status="success",
            message="Visualization created successfully",
            request_id=request.request_id,
            execution_time_ms=execution_time
        )
    except Exception as e:
        logger.error(f"Error in create_visualization (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export", response_model=VisualizationResponse)
async def export_visualization(
    request: VisualizationRequest,
    service: VisualizationService = Depends(get_visualization_service)
):
    """
    导出数据可视化为图片或HTML
    
    返回:
    - **image_url**: 图片URL
    - **html_content**: HTML内容
    """
    try:
        start_time = time.time()
        
        # 调用服务层处理导出
        result = await service.export_visualization(
            chart_type=request.chart_type,
            chart_data=request.data,
            chart_config=request.config,
            format=request.export_format
        )
        
        execution_time = (time.time() - start_time) * 1000
        
        # 构建响应
        return VisualizationResponse(
            image_url=result.get("image_url"),
            html_content=result.get("html_content"),
            visualization_id=result.get("visualization_id"),
            status="success",
            message=f"Visualization exported to {request.export_format} successfully",
            request_id=request.request_id,
            execution_time_ms=execution_time
        )
    except Exception as e:
        logger.error(f"Error in export_visualization (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
