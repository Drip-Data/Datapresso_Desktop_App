import logging
import os
import json
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import aiofiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import UploadFile # Added UploadFile

import schemas
from db import models as db_models
from db import operations as crud
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class SeedDataService:
    def __init__(self):
        self.upload_dir = os.path.join(settings.data_dir, "seed_data_uploads")
        os.makedirs(self.upload_dir, exist_ok=True)
        logger.info(f"Seed data upload directory: {self.upload_dir}")

    async def upload_file(self, file: UploadFile, data_type: Optional[str], db: AsyncSession) -> Dict[str, Any]:
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        saved_filename = f"{file_id}{file_extension}"
        file_path = os.path.join(self.upload_dir, saved_filename)

        try:
            async with aiofiles.open(file_path, "wb") as out_file:
                while content := await file.read(1024):  # Read in chunks
                    await out_file.write(content)
            
            file_size = os.path.getsize(file_path)
            record_count = 0
            # Attempt to count records if it's a JSONL file
            if file_extension.lower() == '.jsonl':
                async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                    async for line in f:
                        record_count += 1

            seed_data_in = schemas.SeedDataCreate(
                id=file_id,
                filename=file.filename,
                saved_path=file_path,
                file_size=file_size,
                record_count=record_count,
                data_type=data_type,
                status="uploaded",
                upload_date=datetime.now()
            )
            await crud.create_seed_data(db, seed_data_in)

            return {
                "file_id": file_id,
                "filename": file.filename,
                "size": file_size,
                "record_count": record_count,
                "status": "uploaded",
                "upload_date": seed_data_in.upload_date.isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to save uploaded file {file.filename}: {e}", exc_info=True)
            # Clean up partially uploaded file if error occurs
            if os.path.exists(file_path):
                os.remove(file_path)
            raise

    async def list_seed_data(
        self, page: int, page_size: int, status_filter: Optional[str], db: AsyncSession
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = select(db_models.SeedData)
        if status_filter:
            query = query.where(db_models.SeedData.status == status_filter)
        
        # Get total count first
        total_count_query = select(func.count()).select_from(db_models.SeedData)
        if status_filter:
            total_count_query = total_count_query.where(db_models.SeedData.status == status_filter)
        total_count = (await db.execute(total_count_query)).scalar_one()

        # Apply pagination
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        result = await db.execute(query)
        seed_data_orms = result.scalars().all()
        
        seed_data_list = [schemas.SeedData.from_orm(item).dict() for item in seed_data_orms]
        
        return seed_data_list, total_count

    # TODO: Implement validate_seed_data and index_seed_data methods