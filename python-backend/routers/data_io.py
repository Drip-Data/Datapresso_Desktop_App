from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional, List, Dict, Any
from models.request_models import DataExportRequest
from models.response_models import DataImportResponse, DataExportResponse, BaseResponse
from services.data_io_service import DataIOService
import logging
import time
import json

router = APIRouter()
logger = logging.getLogger(__name__)

def get_data_io_service():
    """依赖注入：获取数据IO服务实例"""
    return DataIOService()

@router.post("/import", response_model=DataImportResponse)
async def import_data(
    file: UploadFile = File(...),
    file_format: Optional[str] = Form("auto"),
    options: Optional[str] = Form("{}"),
    service: DataIOService = Depends(get_data_io_service)
):
    """
    导入数据文件
    
    - **file**: 要导入的文件
    - **file_format**: 文件格式(auto, csv, json, excel, xml)
    - **options**: 导入选项的JSON字符串
    
    返回:
    - **data**: A导入的数据
    - **file_info**: 文件信息
    """
    try:
        logger.info(f"Received import request for file: {file.filename}")
        start_time = time.time()
        
        # 解析选项
        import_options = json.loads(options) if options else {}
        
        # 调用服务层处理导入
        result = await service.import_data(
            file=file,
            file_format=file_format,
            options=import_options
        )
        
        execution_time = (time.time() - start_time) * 1000
        logger.info(f"Import completed, loaded {len(result['data'])} records")
        
        # 构建响应
        return DataImportResponse(
            data=result["data"],
            file_info=result["file_info"],
            schema=result.get("schema"),
            summary=result.get("summary"),
            status="success",
            message="Data imported successfully",
            execution_time_ms=execution_time
        )
    except Exception as e:
        logger.error(f"Error in import_data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export", response_model=DataExportResponse)
async def export_data(
    request: DataExportRequest,
    service: DataIOService = Depends(get_data_io_service)
):
    """
    导出数据到文件
    
    - **data**: 要导出的数据
    - **file_format**: 导出格式(csv, json, excel, xml)
    - **filename**: 文件名
    - **options**: 导出选项
    
    返回:
    - **file_url**: 导出文件的URL
    """
    try:
        logger.info(f"Received export request for {len(request.data)} records in {request.file_format} format")
        start_time = time.time()
        
        # 调用服务层处理导出
        result = await service.export_data(
            data=request.data,
            file_format=request.file_format,
            filename=request.filename,
            options=request.options
        )
        
        execution_time = (time.time() - start_time) * 1000
        logger.info(f"Export completed, file saved at: {result['file_path']}")
        
        # 构建响应
        return DataExportResponse(
            file_url=result["file_url"],
            file_path=result["file_path"],
            file_size=result["file_size"],
            row_count=len(request.data),
            status="success",
            message="Data exported successfully",
            request_id=request.request_id,
            execution_time_ms=execution_time
        )
    except Exception as e:
        logger.error(f"Error in export_data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{filename}", response_class=FileResponse)
async def download_file(
    filename: str,
    service: DataIOService = Depends(get_data_io_service)
):
    """
    下载已导出的文件
    
    - **filename**: 文件名
    """
    try:
        # 获取文件路径
        file_path = await service.get_file_path(filename)
        
        # 返回文件响应
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type=service.get_media_type(filename)
        )
    except Exception as e:
        logger.error(f"Error in download_file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=404, detail="File not found")

@router.get("/formats", response_model=Dict[str, List[str]])
async def get_supported_formats(
    service: DataIOService = Depends(get_data_io_service)
):
    """获取支持的文件格式"""
    return {
        "import": service.get_supported_import_formats(),
        "export": service.get_supported_export_formats()
    }
