import os
import json
import logging
import uuid
import time
import asyncio
import shutil
from typing import List, Dict, Any, Optional, Union, BinaryIO
import aiofiles
import pandas as pd
import aiofiles.os
from fastapi import UploadFile
from datetime import datetime

logger = logging.getLogger(__name__)

class DataService:
    """数据服务：处理数据导入、导出、存储和检索"""
    
    def __init__(self, data_dir: str = "./data"):
        """
        初始化数据服务
        
        Args:
            data_dir: 数据存储目录
        """
        self.data_dir = data_dir
        self._ensure_directories()
    
    def _ensure_directories(self):
        """确保所需目录存在"""
        directories = [
            self.data_dir,
            os.path.join(self.data_dir, "raw"),
            os.path.join(self.data_dir, "processed"),
            os.path.join(self.data_dir, "temp"),
            os.path.join(self.data_dir, "exports")
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
    
    async def save_data(self, data: Union[List[Dict[str, Any]], pd.DataFrame], 
                      data_id: Optional[str] = None,
                      metadata: Optional[Dict[str, Any]] = None,
                      data_type: str = "processed") -> Dict[str, Any]:
        """
        保存数据集
        
        Args:
            data: 要保存的数据（字典列表或DataFrame）
            data_id: 数据ID（如果没有提供，将生成新ID）
            metadata: 数据元信息
            data_type: 数据类型（raw/processed）
            
        Returns:
            保存结果信息
        """
        # 生成数据ID
        data_id = data_id or f"data_{uuid.uuid4().hex}"
        
        # 确定存储目录
        storage_dir = os.path.join(self.data_dir, data_type)
        os.makedirs(storage_dir, exist_ok=True)
        
        # 准备数据
        if isinstance(data, pd.DataFrame):
            data_json = data.to_dict('records')
        else:
            data_json = data
        
        # 创建元数据
        meta = metadata or {}
        meta.update({
            "data_id": data_id,
            "created_at": datetime.now().isoformat(),
            "record_count": len(data_json),
            "data_type": data_type,
            "field_names": list(data_json[0].keys()) if data_json else []
        })
        
        # 保存数据
        data_path = os.path.join(storage_dir, f"{data_id}.json")
        meta_path = os.path.join(storage_dir, f"{data_id}.meta.json")
        
        async with aiofiles.open(data_path, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(data_json, ensure_ascii=False, indent=2))
        
        async with aiofiles.open(meta_path, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(meta, ensure_ascii=False, indent=2))
        
        # 返回结果信息
        return {
            "success": True,
            "data_id": data_id,
            "record_count": len(data_json),
            "storage_path": data_path,
            "metadata": meta
        }
    
    async def load_data(self, data_id: str, data_type: str = "processed") -> Dict[str, Any]:
        """
        加载数据集
        
        Args:
            data_id: 数据ID
            data_type: 数据类型（raw/processed）
            
        Returns:
            加载的数据和元数据
        """
        # 确定存储路径
        storage_dir = os.path.join(self.data_dir, data_type)
        data_path = os.path.join(storage_dir, f"{data_id}.json")
        meta_path = os.path.join(storage_dir, f"{data_id}.meta.json")
        
        # 检查文件是否存在
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"找不到数据文件: {data_path}")
        
        # 加载数据
        async with aiofiles.open(data_path, 'r', encoding='utf-8') as f:
            data_content = await f.read()
            data = json.loads(data_content)
        
        # 加载元数据（如果存在）
        metadata = {}
        if os.path.exists(meta_path):
            async with aiofiles.open(meta_path, 'r', encoding='utf-8') as f:
                meta_content = await f.read()
                metadata = json.loads(meta_content)
        
        return {
            "data": data,
            "metadata": metadata,
            "data_id": data_id
        }
    
    async def import_file(self, file: UploadFile, 
                         file_type: Optional[str] = None,
                         params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        导入数据文件
        
        Args:
            file: 上传的文件
            file_type: 文件类型（如果为None，将从文件扩展名推断）
            params: 导入参数
            
        Returns:
            导入结果信息
        """
        params = params or {}
        
        # 确定文件类型
        if file_type is None:
            file_type = os.path.splitext(file.filename)[1].lower().lstrip('.')
        
        # 保存上传的文件
        temp_dir = os.path.join(self.data_dir, "temp")
        temp_file_path = os.path.join(temp_dir, f"upload_{uuid.uuid4().hex}.{file_type}")
        
        async with aiofiles.open(temp_file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        try:
            # 根据文件类型读取数据
            data = None
            if file_type in ['csv', 'tsv', 'txt']:
                encoding = params.get('encoding', 'utf-8')
                delimiter = params.get('delimiter', ',' if file_type == 'csv' else '\t')
                header = params.get('header', 0)
                
                # 使用pandas读取
                df = pd.read_csv(temp_file_path, encoding=encoding, delimiter=delimiter, 
                               header=header, skip_blank_lines=True, error_bad_lines=False)
                data = df.to_dict('records')
                
            elif file_type in ['xlsx', 'xls']:
                sheet_name = params.get('sheet_name', 0)
                header = params.get('header', 0)
                
                # 使用pandas读取Excel
                df = pd.read_excel(temp_file_path, sheet_name=sheet_name, header=header)
                data = df.to_dict('records')
                
            elif file_type == 'json':
                # 读取JSON文件
                async with aiofiles.open(temp_file_path, 'r', encoding='utf-8') as f:
                    content = await f.read()
                    data = json.loads(content)
                
                # 如果数据不是列表，则进行转换
                if isinstance(data, dict):
                    # 尝试从常见字段中提取数据
                    for field in ['data', 'records', 'items', 'results']:
                        if field in data and isinstance(data[field], list):
                            data = data[field]
                            break
                    else:
                        # 如果没有找到列表字段，将单个对象包装成列表
                        data = [data]
            
            elif file_type == 'xml':
                # 使用pandas从XML读取
                try:
                    df = pd.read_xml(temp_file_path)
                    data = df.to_dict('records')
                except Exception as e:
                    raise ValueError(f"无法解析XML文件: {str(e)}")
            
            elif file_type == 'parquet':
                # 读取Parquet文件
                df = pd.read_parquet(temp_file_path)
                data = df.to_dict('records')
            
            elif file_type == 'feather':
                # 读取Feather文件
                df = pd.read_feather(temp_file_path)
                data = df.to_dict('records')
            
            else:
                raise ValueError(f"不支持的文件类型: {file_type}")
            
            if not data:
                raise ValueError("导入的数据为空")
            
            # 保存数据
            result = await self.save_data(
                data=data,
                metadata={
                    "original_filename": file.filename,
                    "file_type": file_type,
                    "import_time": datetime.now().isoformat(),
                    "import_params": params
                },
                data_type="raw"
            )
            
            return result
            
        finally:
            # 清理临时文件
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
    async def export_data(self, data: List[Dict[str, Any]], 
                        format: str = "json",
                        params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        导出数据
        
        Args:
            data: 要导出的数据
            format: 导出格式
            params: 导出参数
            
        Returns:
            导出结果信息
        """
        params = params or {}
        
        # 创建导出目录
        export_dir = os.path.join(self.data_dir, "exports")
        os.makedirs(export_dir, exist_ok=True)
        
        # 生成导出文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        export_id = f"export_{timestamp}_{uuid.uuid4().hex[:8]}"
        file_path = os.path.join(export_dir, f"{export_id}.{format}")
        
        # 转换为DataFrame
        df = pd.DataFrame(data)
        
        # 根据格式导出
        if format == "csv":
            encoding = params.get('encoding', 'utf-8')
            delimiter = params.get('delimiter', ',')
            df.to_csv(file_path, index=False, encoding=encoding, sep=delimiter)
        
        elif format == "xlsx":
            sheet_name = params.get('sheet_name', 'Sheet1')
            df.to_excel(file_path, index=False, sheet_name=sheet_name)
        
        elif format == "json":
            orient = params.get('orient', 'records')
            indent = params.get('indent', 2)
            
            async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                if orient == 'records':
                    await f.write(json.dumps(data, ensure_ascii=False, indent=indent))
                else:
                    await f.write(df.to_json(orient=orient, force_ascii=False, indent=indent))
        
        elif format == "parquet":
            df.to_parquet(file_path, index=False)
        
        elif format == "feather":
            df.to_feather(file_path)
        
        elif format == "html":
            template = params.get('template')
            if template:
                # 使用自定义模板
                import jinja2
                
                async with aiofiles.open(template, 'r', encoding='utf-8') as f:
                    template_content = await f.read()
                
                env = jinja2.Environment()
                template = env.from_string(template_content)
                html = template.render(data=data, title=params.get('title', 'Exported Data'))
                
                async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                    await f.write(html)
            else:
                # 使用pandas默认HTML导出
                async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                    await f.write(df.to_html(index=False))
        
        else:
            raise ValueError(f"不支持的导出格式: {format}")
        
        # 返回结果
        return {
            "success": True,
            "export_id": export_id,
            "file_path": file_path,
            "format": format,
            "record_count": len(data)
        }
    
    async def get_data_list(self, data_type: str = "all", limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """
        获取数据集列表
        
        Args:
            data_type: 数据类型 (raw/processed/all)
            limit: 返回数量限制
            offset: 偏移量
            
        Returns:
            数据集列表
        """
        result = []
        
        # 确定要搜索的目录
        dirs_to_search = []
        if data_type == "all":
            dirs_to_search = ["raw", "processed"]
        else:
            dirs_to_search = [data_type]
        
        # 收集元数据文件
        meta_files = []
        for dir_name in dirs_to_search:
            dir_path = os.path.join(self.data_dir, dir_name)
            if not os.path.exists(dir_path):
                continue
                
            for file in os.listdir(dir_path):
                if file.endswith('.meta.json'):
                    meta_files.append(os.path.join(dir_path, file))
        
        # 排序元数据文件（按修改时间倒序）
        meta_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        
        # 应用分页
        paged_files = meta_files[offset:offset+limit]
        
        # 加载元数据
        for meta_file in paged_files:
            try:
                async with aiofiles.open(meta_file, 'r', encoding='utf-8') as f:
                    content = await f.read()
                    metadata = json.loads(content)
                    
                    # 添加文件信息
                    data_file = meta_file.replace('.meta.json', '.json')
                    file_size = os.path.getsize(data_file) if os.path.exists(data_file) else 0
                    metadata['file_size'] = file_size
                    metadata['file_path'] = data_file
                    
                    result.append(metadata)
            except Exception as e:
                logger.error(f"读取元数据文件失败 {meta_file}: {str(e)}")
        
        return result
    
    async def delete_data(self, data_id: str, data_type: str = "all") -> Dict[str, Any]:
        """
        删除数据集
        
        Args:
            data_id: 数据ID
            data_type: 数据类型 (raw/processed/all)
            
        Returns:
            删除结果信息
        """
        # 确定要搜索的目录
        dirs_to_search = []
        if data_type == "all":
            dirs_to_search = ["raw", "processed"]
        else:
            dirs_to_search = [data_type]
        
        deleted_files = []
        for dir_name in dirs_to_search:
            dir_path = os.path.join(self.data_dir, dir_name)
            data_file = os.path.join(dir_path, f"{data_id}.json")
            meta_file = os.path.join(dir_path, f"{data_id}.meta.json")
            
            # 删除数据文件
            if os.path.exists(data_file):
                await aiofiles.os.remove(data_file)
                deleted_files.append(data_file)
                
            # 删除元数据文件
            if os.path.exists(meta_file):
                await aiofiles.os.remove(meta_file)
                deleted_files.append(meta_file)
        
        return {
            "success": True,
            "data_id": data_id,
            "deleted_files": deleted_files
        }

# 创建单例实例
data_service = DataService()
