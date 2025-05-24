from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List, Dict, Any, Optional
import logging
import os
import json
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_async_db
import schemas
from models.response_models import BaseResponse # Import BaseResponse
from services.seed_data_service import SeedDataService # Assuming this service will be created

router = APIRouter()
logger = logging.getLogger(__name__)

def get_seed_data_service():
    return SeedDataService()

@router.post("/upload", response_model=BaseResponse)
async def upload_seed_data(
    file: UploadFile = File(...),
    data_type: Optional[str] = None,
    service: SeedDataService = Depends(get_seed_data_service),
    db: AsyncSession = Depends(get_async_db)
):
    """
    上传种子数据文件。
    """
    try:
        logger.info(f"Received upload request for file: {file.filename}, type: {data_type}")
        file_info = await service.upload_file(file, data_type, db)
        return BaseResponse( # Changed to BaseResponse
            status="success",
            message="File uploaded successfully.",
            data=file_info
        )
    except Exception as e:
        logger.error(f"Error uploading file {file.filename}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.get("/", response_model=schemas.SeedDataListResponse)
async def list_seed_data(
    page: int = 1,
    page_size: int = 10,
    status_filter: Optional[str] = None,
    service: SeedDataService = Depends(get_seed_data_service),
    db: AsyncSession = Depends(get_async_db)
):
    """
    列出已上传的种子数据文件/集。
    """
    try:
        logger.info(f"Received request to list seed data (page: {page}, page_size: {page_size}, status: {status_filter})")
        seed_data_items, total_count = await service.list_seed_data(page, page_size, status_filter, db)
        return schemas.SeedDataListResponse(
            status="success",
            message="Seed data retrieved successfully.",
            data={
                "items": seed_data_items,
                "total_items": total_count,
                "current_page": page,
                "page_size": page_size
            }
        )
    except Exception as e:
        logger.error(f"Error listing seed data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list seed data: {str(e)}")

# TODO: Add /validate and /index routes later