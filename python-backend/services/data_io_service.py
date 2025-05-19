from typing import List, Dict, Any, Optional, BinaryIO
import logging
import os
import json
import csv
import pandas as pd
import xml.etree.ElementTree as ET
import uuid
import aiofiles
from fastapi import UploadFile
import mimetypes
import io
import chardet
from config import get_settings

logger = logging.getLogger(__name__)

class DataIOService:
    """数据导入导出服务"""
    
    def __init__(self):
        """初始化数据IO服务"""
        self.settings = get_settings()
        # 确保导出目录存在
        self.export_dir = os.path.join(self.settings.data_dir, "exports")
        os.makedirs(self.export_dir, exist_ok=True)
        
        # 确保上传目录存在
        self.upload_dir = os.path.join(self.settings.data_dir, "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)
        
        # MIME类型映射
        mimetypes.init()
        # 添加额外的MIME类型
        mimetypes.add_type('application/json', '.json')
        mimetypes.add_type('text/csv', '.csv')
        mimetypes.add_type('application/vnd.ms-excel', '.xls')
        mimetypes.add_type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx')
        mimetypes.add_type('application/xml', '.xml')
    
    async def import_data(
        self,
        file: UploadFile,
        file_format: str = "auto",
        options: Dict[str, Any] = {}
    ) -> Dict[str, Any]:
        """
        导入数据文件
        
        Args:
            file: 要导入的文件对象
            file_format: 文件格式
            options: 导入选项
            
        Returns:
            包含导入数据和文件信息的字典
        """
        logger.debug(f"Importing file: {file.filename}, format: {file_format}")
        
        # 确定文件格式
        if file_format == "auto":
            file_format = self._detect_file_format(file.filename)
        
        # 保存上传文件
        file_id = str(uuid.uuid4())
        file_ext = os.path.splitext(file.filename)[1]
        saved_path = os.path.join(self.upload_dir, f"{file_id}{file_ext}")
        
        async with aiofiles.open(saved_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # 根据文件格式解析数据
        if file_format.lower() == "csv":
            data = await self._import_csv(saved_path, options)
        elif file_format.lower() == "json":
            data = await self._import_json(saved_path, options)
        elif file_format.lower() in ["excel", "xls", "xlsx"]:
            data = await self._import_excel(saved_path, options)
        elif file_format.lower() == "xml":
            data = await self._import_xml(saved_path, options)
        else:
            raise ValueError(f"Unsupported file format: {file_format}")
        
        # 生成文件信息
        file_info = {
            "filename": file.filename,
            "format": file_format,
            "size": len(content),
            "record_count": len(data)
        }
        
        # 生成数据摘要
        summary = self._generate_data_summary(data)
        
        # 推断数据模式
        schema = self._infer_data_schema(data)
        
        return {
            "data": data,
            "file_info": file_info,
            "summary": summary,
            "schema": schema
        }
    
    async def export_data(
        self,
        data: List[Dict[str, Any]],
        file_format: str,
        filename: Optional[str] = None,
        options: Dict[str, Any] = {}
    ) -> Dict[str, Any]:
        """
        导出数据到文件
        
        Args:
            data: 要导出的数据
            file_format: 导出格式
            filename: 自定义文件名
            options: 导出选项
            
        Returns:
            包含导出文件信息的字典
        """
        logger.debug(f"Exporting {len(data)} records to {file_format} format")
        
        # 生成文件名
        if not filename:
            filename = f"export_{str(uuid.uuid4())[:8]}"
        
        # 确保文件名有正确的扩展名
        if file_format.lower() == "csv" and not filename.lower().endswith(".csv"):
            filename = f"{filename}.csv"
        elif file_format.lower() == "json" and not filename.lower().endswith(".json"):
            filename = f"{filename}.json"
        elif file_format.lower() == "excel" and not filename.lower().endswith((".xls", ".xlsx")):
            filename = f"{filename}.xlsx"
        elif file_format.lower() == "xml" and not filename.lower().endswith(".xml"):
            filename = f"{filename}.xml"
        
        # 导出文件路径
        file_path = os.path.join(self.export_dir, filename)
        
        # 根据文件格式导出数据
        if file_format.lower() == "csv":
            await self._export_csv(data, file_path, options)
        elif file_format.lower() == "json":
            await self._export_json(data, file_path, options)
        elif file_format.lower() == "excel":
            await self._export_excel(data, file_path, options)
        elif file_format.lower() == "xml":
            await self._export_xml(data, file_path, options)
        else:
            raise ValueError(f"Unsupported export format: {file_format}")
        
        # 获取文件大小
        file_size = os.path.getsize(file_path)
        
        # 生成下载URL
        file_url = f"/data_io/download/{filename}"
        
        return {
            "file_url": file_url,
            "file_path": file_path,
            "file_size": file_size
        }
    
    async def get_file_path(self, filename: str) -> str:
        """获取文件的完整路径"""
        file_path = os.path.join(self.export_dir, filename)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {filename}")
        return file_path
    
    def get_media_type(self, filename: str) -> str:
        """获取文件的MIME类型"""
        media_type, _ = mimetypes.guess_type(filename)
        return media_type or "application/octet-stream"
    
    def get_supported_import_formats(self) -> List[str]:
        """获取支持的导入格式列表"""
        return ["csv", "json", "excel", "xml"]
    
    def get_supported_export_formats(self) -> List[str]:
        """获取支持的导出格式列表"""
        return ["csv", "json", "excel", "xml"]
    
    def _detect_file_format(self, filename: str) -> str:
        """根据文件名检测文件格式"""
        ext = os.path.splitext(filename)[1].lower()
        
        if ext in ['.csv']:
            return "csv"
        elif ext in ['.json']:
            return "json"
        elif ext in ['.xls', '.xlsx']:
            return "excel"
        elif ext in ['.xml']:
            return "xml"
        else:
            # 默认返回JSON
            return "json"
    
    async def _import_csv(self, file_path: str, options: Dict[str, Any]) -> List[Dict[str, Any]]:
        """导入CSV文件"""
        encoding = options.get("encoding", None)
        delimiter = options.get("delimiter", ",")
        has_header = options.get("has_header", True)
        
        # 如果未指定编码，尝试检测
        if not encoding:
            async with aiofiles.open(file_path, 'rb') as f:
                raw_data = await f.read()
                detected = chardet.detect(raw_data)
                encoding = detected['encoding']
        
        # 使用pandas读取CSV
        df = pd.read_csv(
            file_path, 
            delimiter=delimiter, 
            encoding=encoding,
            header=0 if has_header else None,
            skip_blank_lines=True,
            low_memory=False
        )
        
        # 转换为字典列表
        return df.to_dict(orient='records')
    
    async def _import_json(self, file_path: str, options: Dict[str, Any]) -> List[Dict[str, Any]]:
        """导入JSON文件"""
        encoding = options.get("encoding", "utf-8")
        
        async with aiofiles.open(file_path, 'r', encoding=encoding) as f:
            content = await f.read()
            data = json.loads(content)
            
            # 确保返回列表
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # 检查是否包含数据数组
                for key in ['data', 'records', 'items', 'results']:
                    if key in data and isinstance(data[key], list):
                        return data[key]
                # 如果是单个对象，封装为列表
                return [data]
            else:
                raise ValueError("Invalid JSON format: expected object or array")
    
    async def _import_excel(self, file_path: str, options: Dict[str, Any]) -> List[Dict[str, Any]]:
        """导入Excel文件"""
        sheet_name = options.get("sheet_name", 0)
        has_header = options.get("has_header", True)
        
        # 使用pandas读取Excel
        df = pd.read_excel(
            file_path,
            sheet_name=sheet_name,
            header=0 if has_header else None
        )
        
        # 转换为字典列表
        return df.to_dict(orient='records')
    
    async def _import_xml(self, file_path: str, options: Dict[str, Any]) -> List[Dict[str, Any]]:
        """导入XML文件"""
        root_element = options.get("root_element", None)
        item_element = options.get("item_element", None)
        
        # 解析XML
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # 如果指定了根元素，找到它
        if root_element:
            elements = root.findall(f".//{root_element}")
            if elements:
                root = elements[0]
        
        # 查找数据项
        if item_element:
            items = root.findall(f".//{item_element}")
        else:
            # 尝试猜测项目元素（第一个有多个同名子元素的元素）
            child_counts = {}
            for child in root:
                tag = child.tag
                child_counts[tag] = child_counts.get(tag, 0) + 1
            
            most_common_tag = max(child_counts.items(), key=lambda x: x[1])[0] if child_counts else None
            items = root.findall(f".//{most_common_tag}") if most_common_tag else []
        
        # 将XML元素转换为字典
        result = []
        for item in items:
            item_dict = {}
            for elem in item:
                # 处理嵌套元素
                if len(elem) > 0:
                    # 有子元素，递归处理
                    item_dict[elem.tag] = self._xml_element_to_dict(elem)
                else:
                    # 无子元素，直接获取文本
                    item_dict[elem.tag] = elem.text
            result.append(item_dict)
        
        return result
    
    def _xml_element_to_dict(self, element) -> Dict[str, Any]:
        """递归将XML元素转换为字典"""
        result = {}
        for child in element:
            if len(child) > 0:
                result[child.tag] = self._xml_element_to_dict(child)
            else:
                result[child.tag] = child.text
        return result
    
    async def _export_csv(self, data: List[Dict[str, Any]], file_path: str, options: Dict[str, Any]) -> None:
        """导出CSV文件"""
        encoding = options.get("encoding", "utf-8")
        delimiter = options.get("delimiter", ",")
        
        # 将数据转换为DataFrame
        df = pd.DataFrame(data)
        
        # 导出为CSV
        df.to_csv(
            file_path,
            index=False,
            encoding=encoding,
            sep=delimiter
        )
    
    async def _export_json(self, data: List[Dict[str, Any]], file_path: str, options: Dict[str, Any]) -> None:
        """导出JSON文件"""
        encoding = options.get("encoding", "utf-8")
        indent = options.get("indent", 2)
        include_metadata = options.get("include_metadata", False)
        
        # 准备JSON数据
        if include_metadata:
            export_data = {
                "metadata": {
                    "record_count": len(data),
                    "export_time": pd.Timestamp.now().isoformat()
                },
                "data": data
            }
        else:
            export_data = data
        
        # 写入JSON文件
        async with aiofiles.open(file_path, 'w', encoding=encoding) as f:
            await f.write(json.dumps(export_data, indent=indent, ensure_ascii=False))
    
    async def _export_excel(self, data: List[Dict[str, Any]], file_path: str, options: Dict[str, Any]) -> None:
        """导出Excel文件"""
        sheet_name = options.get("sheet_name", "Data")
        include_metadata = options.get("include_metadata", False)
        
        # 将数据转换为DataFrame
        df = pd.DataFrame(data)
        
        # 创建Excel writer
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            # 写入数据
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # 如果需要，添加元数据表
            if include_metadata:
                metadata = [
                    {"Property": "Record Count", "Value": len(data)},
                    {"Property": "Export Time", "Value": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")},
                    {"Property": "Field Count", "Value": len(df.columns)}
                ]
                
                meta_df = pd.DataFrame(metadata)
                meta_df.to_excel(writer, sheet_name="Metadata", index=False)
    
    async def _export_xml(self, data: List[Dict[str, Any]], file_path: str, options: Dict[str, Any]) -> None:
        """导出XML文件"""
        root_element = options.get("root_element", "root")
        item_element = options.get("item_element", "item")
        include_metadata = options.get("include_metadata", False)
        
        # 创建XML根元素
        root = ET.Element(root_element)
        
        # 添加元数据
        if include_metadata:
            metadata = ET.SubElement(root, "metadata")
            
            record_count = ET.SubElement(metadata, "record_count")
            record_count.text = str(len(data))
            
            export_time = ET.SubElement(metadata, "export_time")
            export_time.text = pd.Timestamp.now().isoformat()
        
        # 添加数据项
        data_element = ET.SubElement(root, "data")
        for item_data in data:
            item = ET.SubElement(data_element, item_element)
            self._dict_to_xml_element(item_data, item)
        
        # 生成XML树
        tree = ET.ElementTree(root)
        
        # 写入文件
        tree.write(file_path, encoding="utf-8", xml_declaration=True)
    
    def _dict_to_xml_element(self, data: Dict[str, Any], element) -> None:
        """递归将字典转换为XML元素"""
        for key, value in data.items():
            if value is None:
                # 跳过空值
                continue
                
            child = ET.SubElement(element, str(key))
            
            if isinstance(value, dict):
                # 递归处理嵌套字典
                self._dict_to_xml_element(value, child)
            elif isinstance(value, list):
                # 处理列表
                for item in value:
                    item_element = ET.SubElement(child, "item")
                    if isinstance(item, dict):
                        self._dict_to_xml_element(item, item_element)
                    else:
                        item_element.text = str(item)
            else:
                # 简单值
                child.text = str(value)
    
    def _generate_data_summary(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """生成数据摘要"""
        if not data:
            return {
                "record_count": 0,
                "field_count": 0
            }
        
        # 获取所有字段
        all_fields = set()
        for item in data:
            all_fields.update(item.keys())
        
        # 计算字段统计信息
        field_stats = {}
        for field in all_fields:
            field_values = [item.get(field) for item in data if field in item]
            non_null_values = [v for v in field_values if v is not None]
            
            stats = {
                "count": len(field_values),
                "present": len(field_values),
                "null_count": len(field_values) - len(non_null_values),
                "unique_count": len(set(str(v) for v in non_null_values if v is not None))
            }
            
            # 尝试确定数据类型
            if non_null_values:
                types = set(type(v).__name__ for v in non_null_values)
                if len(types) == 1:
                    stats["type"] = next(iter(types))
                else:
                    stats["type"] = "mixed"
                    stats["types"] = list(types)
            else:
                stats["type"] = "unknown"
            
            field_stats[field] = stats
        
        return {
            "record_count": len(data),
            "field_count": len(all_fields),
            "fields": field_stats
        }
    
    def _infer_data_schema(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """推断数据模式"""
        if not data:
            return {}
        
        schema = {"type": "object", "properties": {}}
        
        # 获取所有可能的字段
        all_fields = set()
        for item in data:
            all_fields.update(item.keys())
        
        # 分析每个字段
        for field in all_fields:
            # 收集非空值
            values = [item[field] for item in data if field in item and item[field] is not None]
            
            if not values:
                # 如果字段全为空，设为可为空的字符串
                schema["properties"][field] = {"type": "string", "nullable": True}
                continue
            
            # 确定类型
            types = set(type(v).__name__ for v in values)
            
            if len(types) == 1:
                # 单一类型
                type_name = next(iter(types))
                field_schema = {}
                
                if type_name == "str":
                    field_schema["type"] = "string"
                    
                    # 检查是否是特定格式
                    if all(self._is_email(v) for v in values if isinstance(v, str)):
                        field_schema["format"] = "email"
                    elif all(self._is_url(v) for v in values if isinstance(v, str)):
                        field_schema["format"] = "uri"
                    elif all(self._is_date(v) for v in values if isinstance(v, str)):
                        field_schema["format"] = "date"
                    
                    # 提取长度信息
                    lengths = [len(v) for v in values if isinstance(v, str)]
                    if lengths:
                        field_schema["minLength"] = min(lengths)
                        field_schema["maxLength"] = max(lengths)
                    
                elif type_name == "int":
                    field_schema["type"] = "integer"
                    field_schema["minimum"] = min(values)
                    field_schema["maximum"] = max(values)
                
                elif type_name == "float":
                    field_schema["type"] = "number"
                    field_schema["minimum"] = min(values)
                    field_schema["maximum"] = max(values)
                
                elif type_name == "bool":
                    field_schema["type"] = "boolean"
                
                elif type_name == "list":
                    field_schema["type"] = "array"
                    # 尝试推断数组项类型
                    item_types = set()
                    for v in values:
                        if v and isinstance(v, list):
                            item_types.update(type(item).__name__ for item in v)
                    
                    if len(item_types) == 1:
                        item_type = next(iter(item_types))
                        if item_type == "str":
                            field_schema["items"] = {"type": "string"}
                        elif item_type == "int":
                            field_schema["items"] = {"type": "integer"}
                        elif item_type == "float":
                            field_schema["items"] = {"type": "number"}
                        elif item_type == "bool":
                            field_schema["items"] = {"type": "boolean"}
                        else:
                            field_schema["items"] = {"type": "object"}
                    else:
                        field_schema["items"] = {"type": "object"}
                
                elif type_name == "dict":
                    field_schema["type"] = "object"
                    # 可以递归推断嵌套对象的结构，但这里简化处理
                
                else:
                    field_schema["type"] = "string"
                
            else:
                # 混合类型，使用oneOf
                field_schema = {"oneOf": []}
                
                if "str" in types:
                    field_schema["oneOf"].append({"type": "string"})
                if "int" in types:
                    field_schema["oneOf"].append({"type": "integer"})
                if "float" in types:
                    field_schema["oneOf"].append({"type": "number"})
                if "bool" in types:
                    field_schema["oneOf"].append({"type": "boolean"})
                if "list" in types:
                    field_schema["oneOf"].append({"type": "array", "items": {"type": "object"}})
                if "dict" in types:
                    field_schema["oneOf"].append({"type": "object"})
            
            # 检查是否有null值
            null_values = [item.get(field) for item in data if field in item and item[field] is None]
            if null_values:
                field_schema["nullable"] = True
            
            # 添加到模式
            schema["properties"][field] = field_schema
        
        return schema
    
    def _is_email(self, value: str) -> bool:
        """检查字符串是否是有效的电子邮件地址"""
        if not isinstance(value, str):
            return False
        
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, value))
    
    def _is_url(self, value: str) -> bool:
        """检查字符串是否是有效的URL"""
        if not isinstance(value, str):
            return False
        
        import re
        url_pattern = r'^(http|https)://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$'
        return bool(re.match(url_pattern, value))
    
    def _is_date(self, value: str) -> bool:
        """检查字符串是否是日期格式"""
        if not isinstance(value, str):
            return False
        
        import re
        date_patterns = [
            r'^\d{4}-\d{1,2}-\d{1,2}$',  # YYYY-MM-DD
            r'^\d{1,2}/\d{1,2}/\d{4}$',  # MM/DD/YYYY
            r'^\d{1,2}-\d{1,2}-\d{4}$'   # DD-MM-YYYY
        ]
        
        return any(bool(re.match(pattern, value)) for pattern in date_patterns)
