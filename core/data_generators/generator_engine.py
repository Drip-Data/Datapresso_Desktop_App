import random
import copy
import json
import re
import math
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional, Union
import uuid

from models.request_models import GenerationMethod, FieldConstraint

class DataGenerator:
    """数据生成引擎，提供多种生成策略"""
    
    def __init__(self, random_seed: Optional[int] = None):
        """初始化生成器"""
        self.random_seed = random_seed
        if random_seed is not None:
            random.seed(random_seed)
            np.random.seed(random_seed)
        
        # 内部状态
        self._field_dependencies = {}  # 字段之间的依赖关系
        self._value_distributions = {}  # 字段值分布
    
    def generate_data(
        self,
        seed_data: Optional[List[Dict[str, Any]]] = None,
        template: Optional[Dict[str, Any]] = None,
        generation_method: GenerationMethod = GenerationMethod.VARIATION,
        count: int = 10,
        field_constraints: Optional[List[FieldConstraint]] = None,
        variation_factor: float = 0.2,
        preserve_relationships: bool = True
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        生成数据
        
        Args:
            seed_data: 种子数据，用于变异和学习
            template: 数据模板，用于基于模板生成
            generation_method: 生成方法
            count: 生成数量
            field_constraints: 字段约束
            variation_factor: 变异因子 (0-1之间的浮点数)，越大变异越明显
            preserve_relationships: 是否保持字段间关系
            
        Returns:
            (generated_data, stats): 生成的数据和统计信息
        """
        # 验证输入
        if generation_method == GenerationMethod.VARIATION and not seed_data:
            raise ValueError("Variation method requires seed_data")
        if generation_method == GenerationMethod.TEMPLATE and not template:
            raise ValueError("Template method requires template")
        
        # 进行生成
        if generation_method == GenerationMethod.VARIATION:
            # 如果保持字段关系，则首先分析字段依赖
            if preserve_relationships and seed_data:
                self._analyze_field_dependencies(seed_data)
            
            # 基于种子数据生成变异数据
            generated_data = self._generate_variations(
                seed_data, 
                count, 
                variation_factor, 
                preserve_relationships
            )
            
        elif generation_method == GenerationMethod.TEMPLATE:
            # 基于模板生成数据
            generated_data = self._generate_from_template(
                template, 
                count, 
                field_constraints
            )
            
        elif generation_method == GenerationMethod.RULE_BASED:
            # 基于规则生成数据
            generated_data = self._generate_with_rules(
                seed_data, 
                count, 
                field_constraints
            )
        
        # 应用字段约束
        if field_constraints:
            generated_data = self._apply_constraints(generated_data, field_constraints)
        
        # 计算统计数据
        stats = self._calculate_stats(generated_data)
        
        return generated_data, stats
    
    def _generate_variations(
        self, 
        seed_data: List[Dict[str, Any]], 
        count: int, 
        variation_factor: float,
        preserve_relationships: bool
    ) -> List[Dict[str, Any]]:
        """基于种子数据生成变异数据"""
        result = []
        seed_count = len(seed_data)
        
        if seed_count == 0:
            return []
        
        # 分析值分布，用于智能变异
        self._analyze_value_distributions(seed_data)
        
        # 生成变异数据
        for _ in range(count):
            # 随机选择一个种子项作为基础
            seed_item = random.choice(seed_data)
            new_item = copy.deepcopy(seed_item)
            
            # 对每个字段应用变异
            for key, value in new_item.items():
                # 防止主键重复，若有id或类似字段，生成新的
                if key.lower() in ('id', 'uuid', 'guid', '_id', 'key'):
                    new_item[key] = self._generate_id_value(value)
                    continue
                
                # 根据字段类型应用变异
                if isinstance(value, (int, float)):
                    # 数值型字段：在原值基础上添加随机变异
                    new_item[key] = self._vary_numeric(value, variation_factor)
                    
                elif isinstance(value, str):
                    # 字符串型字段：根据内容类型应用不同变异
                    new_item[key] = self._vary_string(value, key, variation_factor)
                    
                elif isinstance(value, bool):
                    # 布尔型字段：有小概率翻转
                    if random.random() < variation_factor / 2:
                        new_item[key] = not value
                        
                elif isinstance(value, list):
                    # 列表型字段：变异列表内容
                    new_item[key] = self._vary_list(value, variation_factor)
                    
                elif isinstance(value, dict):
                    # 字典型字段：递归变异
                    new_item[key] = self._vary_dict(value, variation_factor)
            
            # 如果需要保持字段间关系，应用关系约束
            if preserve_relationships:
                new_item = self._apply_field_relationships(new_item)
            
            result.append(new_item)
        
        return result
    
    def _generate_from_template(
        self, 
        template: Dict[str, Any], 
        count: int,
        field_constraints: Optional[List[FieldConstraint]] = None
    ) -> List[Dict[str, Any]]:
        """基于模板生成数据"""
        result = []
        
        # 解析模板
        parsed_template = self._parse_template(template)
        
        # 根据模板生成数据
        for i in range(count):
            item = {}
            
            # 为每个字段生成值
            for field, field_template in parsed_template.items():
                item[field] = self._generate_field_value(field, field_template, i, count)
            
            # 处理字段间关系
            for dependency in self._field_dependencies.values():
                if dependency['dependent_field'] in item and dependency['source_field'] in item:
                    item[dependency['dependent_field']] = self._apply_dependency(
                        item[dependency['source_field']],
                        dependency['relation_type'],
                        dependency['params']
                    )
            
            result.append(item)
        
        return result
    
    def _generate_with_rules(
        self, 
        seed_data: Optional[List[Dict[str, Any]]],
        count: int,
        field_constraints: Optional[List[FieldConstraint]] = None
    ) -> List[Dict[str, Any]]:
        """基于规则生成数据"""
        result = []
        
        # 从种子数据中提取字段信息
        fields_info = self._extract_fields_info(seed_data) if seed_data else {}
        
        # 从约束中获取字段信息
        if field_constraints:
            for constraint in field_constraints:
                if constraint.field not in fields_info:
                    fields_info[constraint.field] = {
                        'type': constraint.type,
                        'min_value': constraint.min_value,
                        'max_value': constraint.max_value,
                        'allowed_values': constraint.allowed_values
                    }
        
        # 生成数据
        for i in range(count):
            item = {}
            
            # 为每个字段生成值
            for field, info in fields_info.items():
                item[field] = self._generate_field_by_type(field, info, i)
            
            result.append(item)
        
        return result
    
    def _parse_template(self, template: Dict[str, Any]) -> Dict[str, Any]:
        """解析模板，转换为易于处理的内部表示"""
        parsed = {}
        
        for field, value in template.items():
            if isinstance(value, dict) and '$type' in value:
                # 这是一个特殊模板字段
                parsed[field] = value
            elif isinstance(value, dict) and ('type' in value or 'pattern' in value):
                # 这是一个配置型字段
                parsed[field] = value
            else:
                # 普通值，直接作为常量模板
                parsed[field] = {'$type': 'constant', 'value': value}
        
        return parsed
    
    def _generate_field_value(self, field: str, template: Dict[str, Any], index: int, total: int) -> Any:
        """根据字段模板生成值"""
        # 处理特殊类型模板
        if '$type' in template:
            template_type = template['$type']
            
            if template_type == 'constant':
                return template['value']
                
            elif template_type == 'sequence':
                start = template.get('start', 1)
                step = template.get('step', 1)
                return start + index * step
                
            elif template_type == 'random_int':
                min_val = template.get('min', 1)
                max_val = template.get('max', 100)
                return random.randint(min_val, max_val)
                
            elif template_type == 'random_float':
                min_val = template.get('min', 0.0)
                max_val = template.get('max', 1.0)
                precision = template.get('precision', 2)
                val = min_val + random.random() * (max_val - min_val)
                return round(val, precision)
                
            elif template_type == 'random_choice':
                choices = template.get('choices', [])
                if not choices:
                    return None
                return random.choice(choices)
                
            elif template_type == 'random_date':
                start_date = template.get('start', '2020-01-01')
                end_date = template.get('end', '2023-12-31')
                
                if isinstance(start_date, str):
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                if isinstance(end_date, str):
                    end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    
                delta = end_date - start_date
                random_days = random.randint(0, delta.days)
                random_date = start_date + timedelta(days=random_days)
                
                format_str = template.get('format', '%Y-%m-%d')
                return random_date.strftime(format_str)
                
            elif template_type == 'formula':
                formula = template.get('expression', '')
                # 简单的公式计算，支持基本算术表达式
                try:
                    # 提供一些有用的变量
                    i = index
                    n = total
                    rand = random.random()
                    # 注意：这里使用eval可能有安全隐患，实际系统中应限制表达式
                    return eval(formula)
                except Exception as e:
                    return f"Error in formula: {str(e)}"
                    
            elif template_type == 'uuid':
                return str(uuid.uuid4())
            
            # 如果类型未知，返回None
            return None
        
        # 处理配置型字段
        elif 'type' in template:
            field_type = template['type']
            
            if field_type == 'string':
                pattern = template.get('pattern')
                if pattern:
                    return self._generate_string_from_pattern(pattern)
                
                length = template.get('length', 10)
                charset = template.get('charset', 'alphanumeric')
                return self._generate_random_string(length, charset)
                
            elif field_type == 'integer':
                min_val = template.get('min', 1)
                max_val = template.get('max', 100)
                return random.randint(min_val, max_val)
                
            elif field_type == 'float':
                min_val = template.get('min', 0.0)
                max_val = template.get('max', 1.0)
                precision = template.get('precision', 2)
                val = min_val + random.random() * (max_val - min_val)
                return round(val, precision)
                
            elif field_type == 'boolean':
                probability = template.get('true_probability', 0.5)
                return random.random() < probability
                
            elif field_type == 'date':
                start_date = template.get('start', '2020-01-01')
                end_date = template.get('end', '2023-12-31')
                
                if isinstance(start_date, str):
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                if isinstance(end_date, str):
                    end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    
                delta = end_date - start_date
                random_days = random.randint(0, delta.days)
                random_date = start_date + timedelta(days=random_days)
                
                format_str = template.get('format', '%Y-%m-%d')
                return random_date.strftime(format_str)
                
            elif field_type == 'choice':
                choices = template.get('choices', [])
                if not choices:
                    return None
                return random.choice(choices)
                
            elif field_type == 'array':
                min_length = template.get('min_length', 0)
                max_length = template.get('max_length', 5)
                items_template = template.get('items', {})
                
                length = random.randint(min_length, max_length)
                result = []
                
                for j in range(length):
                    item_value = self._generate_field_value(f"{field}[{j}]", items_template, j, length)
                    result.append(item_value)
                
                return result
                
            elif field_type == 'object':
                properties = template.get('properties', {})
                result = {}
                
                for prop, prop_template in properties.items():
                    result[prop] = self._generate_field_value(f"{field}.{prop}", prop_template, index, total)
                
                return result
        
        # 如果无法确定类型，返回原始模板
        return template
    
    def _generate_string_from_pattern(self, pattern: str) -> str:
        """根据模式生成字符串"""
        # 处理常见的模式
        if pattern.startswith('[') and pattern.endswith(']'):
            # 字符集模式 [A-Za-z0-9]
            chars = []
            i = 1
            while i < len(pattern) - 1:
                if i + 2 < len(pattern) - 1 and pattern[i + 1] == '-':
                    # 字符范围，如A-Z
                    start = ord(pattern[i])
                    end = ord(pattern[i + 2])
                    chars.extend([chr(c) for c in range(start, end + 1)])
                    i += 3
                else:
                    # 单个字符
                    chars.append(pattern[i])
                    i += 1
            
            length = random.randint(5, 10)
            return ''.join(random.choice(chars) for _ in range(length))
            
        elif '{' in pattern and '}' in pattern:
            # 重复模式，如 [A-Z]{3}[0-9]{4}
            parts = re.split(r'(\{[^}]+\})', pattern)
            result = ''
            i = 0
            
            while i < len(parts):
                if i + 1 < len(parts) and parts[i + 1].startswith('{') and parts[i + 1].endswith('}'):
                    # 解析重复次数
                    repeat_part = parts[i + 1].strip('{}')
                    if ',' in repeat_part:
                        min_repeat, max_repeat = map(int, repeat_part.split(','))
                        repeats = random.randint(min_repeat, max_repeat)
                    else:
                        repeats = int(repeat_part)
                    
                    # 处理前一部分
                    part_pattern = parts[i]
                    for _ in range(repeats):
                        result += self._generate_string_from_pattern(part_pattern)
                    
                    i += 2
                else:
                    # 没有重复模式
                    result += self._generate_string_from_pattern(parts[i])
                    i += 1
            
            return result
        
        # 一些特殊模式
        elif pattern == 'email':
            domains = ['example.com', 'example.org', 'example.net', 'test.com']
            username = self._generate_random_string(random.randint(5, 10), 'alphanumeric').lower()
            domain = random.choice(domains)
            return f"{username}@{domain}"
        
        elif pattern == 'url':
            protocols = ['http', 'https']
            domains = ['example.com', 'example.org', 'example.net', 'test.com']
            paths = ['', 'path', 'test', 'api', 'docs']
            
            protocol = random.choice(protocols)
            domain = random.choice(domains)
            path = random.choice(paths)
            
            if path:
                return f"{protocol}://{domain}/{path}"
            else:
                return f"{protocol}://{domain}"
        
        elif pattern == 'ipv4':
            return '.'.join(str(random.randint(0, 255)) for _ in range(4))
        
        elif pattern == 'uuid':
            return str(uuid.uuid4())
        
        elif pattern == 'phone':
            country_code = random.choice(['', '+1', '+44', '+86'])
            number = ''.join(str(random.randint(0, 9)) for _ in range(10))
            if country_code:
                return f"{country_code} {number[:3]}-{number[3:6]}-{number[6:]}"
            else:
                return f"{number[:3]}-{number[3:6]}-{number[6:]}"
        
        # 如果无法识别模式，返回原始模式
        return pattern
    
    def _generate_random_string(self, length: int, charset: str) -> str:
        """生成随机字符串"""
        if charset == 'alphanumeric':
            chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        elif charset == 'alpha':
            chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
        elif charset == 'lowercase':
            chars = 'abcdefghijklmnopqrstuvwxyz'
        elif charset == 'uppercase':
            chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        elif charset == 'numeric':
            chars = '0123456789'
        elif charset == 'hex':
            chars = '0123456789abcdef'
        else:
            chars = charset
        
        return ''.join(random.choice(chars) for _ in range(length))
    
    def _generate_field_by_type(self, field: str, field_info: Dict[str, Any], index: int) -> Any:
        """根据字段类型生成值"""
        field_type = field_info.get('type', 'string')
        
        if field_type == 'string':
            allowed_values = field_info.get('allowed_values')
            if allowed_values:
                return random.choice(allowed_values)
            
            # 根据字段名推断特殊类型
            field_lower = field.lower()
            if 'email' in field_lower:
                return self._generate_string_from_pattern('email')
            elif 'url' in field_lower or 'website' in field_lower:
                return self._generate_string_from_pattern('url')
            elif 'phone' in field_lower or 'mobile' in field_lower:
                return self._generate_string_from_pattern('phone')
            elif 'ip' in field_lower:
                return self._generate_string_from_pattern('ipv4')
            elif 'uuid' in field_lower or 'guid' in field_lower:
                return self._generate_string_from_pattern('uuid')
            elif 'name' in field_lower:
                # 假名字
                first_names = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah']
                last_names = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Taylor']
                return f"{random.choice(first_names)} {random.choice(last_names)}"
            else:
                # 通用字符串
                return self._generate_random_string(random.randint(5, 15), 'alphanumeric')
        
        elif field_type == 'integer':
            min_val = field_info.get('min_value', 0)
            max_val = field_info.get('max_value', 1000)
            allowed_values = field_info.get('allowed_values')
            
            if allowed_values:
                return random.choice(allowed_values)
            
            return random.randint(min_val, max_val)
        
        elif field_type == 'float' or field_type == 'number':
            min_val = field_info.get('min_value', 0.0)
            max_val = field_info.get('max_value', 1.0)
            allowed_values = field_info.get('allowed_values')
            
            if allowed_values:
                return random.choice(allowed_values)
            
            val = min_val + random.random() * (max_val - min_val)
            precision = field_info.get('precision', 2)
            return round(val, precision)
        
        elif field_type == 'boolean':
            allowed_values = field_info.get('allowed_values')
            if allowed_values:
                return random.choice(allowed_values)
            
            return random.choice([True, False])
        
        elif field_type == 'date' or 'date' in field.lower():
            min_date = field_info.get('min_value', '2020-01-01')
            max_date = field_info.get('max_value', '2023-12-31')
            
            if isinstance(min_date, str):
                min_date = datetime.fromisoformat(min_date.replace('Z', '+00:00'))
            if isinstance(max_date, str):
                max_date = datetime.fromisoformat(max_date.replace('Z', '+00:00'))
                
            delta = max_date - min_date
            random_days = random.randint(0, delta.days)
            random_date = min_date + timedelta(days=random_days)
            
            return random_date.strftime('%Y-%m-%d')
        
        elif field_type == 'array' or field_type == 'list':
            min_length = field_info.get('min_length', 0)
            max_length = field_info.get('max_length', 5)
            item_type = field_info.get('item_type', 'string')
            
            length = random.randint(min_length, max_length)
            result = []
            
            for _ in range(length):
                item_value = self._generate_field_by_type(f"{field}_item", {'type': item_type}, index)
                result.append(item_value)
            
            return result
        
        # 默认返回None
        return None
    
    def _analyze_field_dependencies(self, seed_data: List[Dict[str, Any]]) -> None:
        """分析字段之间的依赖关系"""
        self._field_dependencies = {}
        
        if len(seed_data) < 2:
            return
        
        fields = set()
        for item in seed_data:
            fields.update(item.keys())
        
        # 对每对字段进行相关性分析
        for source_field in fields:
            for dependent_field in fields:
                if source_field == dependent_field:
                    continue
                
                # 提取两个字段的值
                valid_pairs = []
                for item in seed_data:
                    if source_field in item and dependent_field in item:
                        valid_pairs.append((item[source_field], item[dependent_field]))
                
                if len(valid_pairs) < 2:
                    continue
                
                # 检测直接相等关系
                if all(src == dep for src, dep in valid_pairs):
                    self._field_dependencies[f"{source_field}_eq_{dependent_field}"] = {
                        'source_field': source_field,
                        'dependent_field': dependent_field,
                        'relation_type': 'equal',
                        'params': {}
                    }
                    continue
                
                # 检测数值关系
                if all(isinstance(src, (int, float)) and isinstance(dep, (int, float)) 
                      for src, dep in valid_pairs):
                    # 检测线性关系 (y = ax + b)
                    x = np.array([src for src, _ in valid_pairs])
                    y = np.array([dep for _, dep in valid_pairs])
                    
                    # 使用最小二乘法估计参数
                    n = len(x)
                    if n > 2:
                        a = (n * np.sum(x * y) - np.sum(x) * np.sum(y)) / (n * np.sum(x * x) - np.sum(x) ** 2)
                        b = (np.sum(y) - a * np.sum(x)) / n
                        
                        # 计算R方值衡量拟合质量
                        y_pred = a * x + b
                        ss_tot = np.sum((y - np.mean(y)) ** 2)
                        ss_res = np.sum((y - y_pred) ** 2)
                        r_squared = 1 - (ss_res / ss_tot)
                        
                        # R方大于0.9认为有强线性关系
                        if r_squared > 0.9:
                            self._field_dependencies[f"{source_field}_linear_{dependent_field}"] = {
                                'source_field': source_field,
                                'dependent_field': dependent_field,
                                'relation_type': 'linear',
                                'params': {'a': a, 'b': b, 'r_squared': r_squared}
                            }
    
    def _analyze_value_distributions(self, seed_data: List[Dict[str, Any]]) -> None:
        """分析字段值的分布"""
        self._value_distributions = {}
        
        if not seed_data:
            return
        
        # 提取所有字段
        fields = set()
        for item in seed_data:
            fields.update(item.keys())
        
        # 对每个字段分析分布
        for field in fields:
            values = [item[field] for item in seed_data if field in item]
            
            if not values:
                continue
            
            # 根据值类型进行不同的分析
            if all(isinstance(v, (int, float)) for v in values):
                # 数值型字段
                numeric_values = [v for v in values if v is not None]
                if numeric_values:
                    self._value_distributions[field] = {
                        'type': 'numeric',
                        'min': min(numeric_values),
                        'max': max(numeric_values),
                        'mean': sum(numeric_values) / len(numeric_values),
                        'std': np.std(numeric_values) if len(numeric_values) > 1 else 0
                    }
            
            elif all(isinstance(v, str) for v in values):
                # 字符串型字段
                # 分析是否是枚举类型
                unique_values = set(values)
                if len(unique_values) <= len(values) * 0.3 or len(unique_values) <= 10:
                    # 可能是枚举类型
                    value_counts = {}
                    for v in values:
                        value_counts[v] = value_counts.get(v, 0) + 1
                    
                    self._value_distributions[field] = {
                        'type': 'enum',
                        'values': value_counts
                    }
                else:
                    # 一般字符串
                    lengths = [len(v) for v in values if v]
                    self._value_distributions[field] = {
                        'type': 'string',
                        'min_length': min(lengths) if lengths else 0,
                        'max_length': max(lengths) if lengths else 0,
                        'mean_length': sum(lengths) / len(lengths) if lengths else 0
                    }
            
            elif all(isinstance(v, bool) for v in values):
                # 布尔型字段
                true_count = sum(1 for v in values if v)
                self._value_distributions[field] = {
                    'type': 'boolean',
                    'true_probability': true_count / len(values)
                }
            
            elif all(isinstance(v, list) for v in values):
                # 列表型字段
                lengths = [len(v) for v in values]
                self._value_distributions[field] = {
                    'type': 'array',
                    'min_length': min(lengths) if lengths else 0,
                    'max_length': max(lengths) if lengths else 0,
                    'mean_length': sum(lengths) / len(lengths) if lengths else 0
                }
    
    def _vary_numeric(self, value: Union[int, float], variation_factor: float) -> Union[int, float]:
        """变异数值型字段"""
        # 获取字段分布信息(如果有)
        field_info = self._value_distributions.get('field_name', {})
        
        if field_info.get('type') == 'numeric':
            # 使用正态分布进行变异
            std = field_info.get('std', abs(value * variation_factor))
            new_value = random.gauss(value, std)
            
            # 确保在合理范围内
            min_val = field_info.get('min', value * 0.5)
            max_val = field_info.get('max', value * 1.5)
            new_value = max(min_val, min(max_val, new_value))
        else:
            # 简单变异：在原值基础上添加随机变异
            variation = value * variation_factor * (random.random() * 2 - 1)
            new_value = value + variation
        
        # 保持值类型
        if isinstance(value, int):
            return round(new_value)
        return new_value
    
    def _vary_string(self, value: str, field_name: str, variation_factor: float) -> str:
        """变异字符串型字段"""
        if not value:
            return value
        
        # 获取字段分布信息(如果有)
        field_info = self._value_distributions.get(field_name, {})
        
        # 处理枚举类型
        if field_info.get('type') == 'enum':
            values = list(field_info.get('values', {}).keys())
            if values and random.random() < variation_factor:
                return random.choice(values)
            return value
        
        # 检测常见格式
        if '@' in value and '.' in value.split('@')[-1]:
            # 电子邮件地址
            username, domain = value.split('@')
            if random.random() < variation_factor:
                # 变异用户名部分
                username_chars = list(username)
                change_count = max(1, int(len(username) * variation_factor))
                for _ in range(change_count):
                    pos = random.randint(0, len(username_chars) - 1)
                    username_chars[pos] = random.choice('abcdefghijklmnopqrstuvwxyz0123456789')
                username = ''.join(username_chars)
            
            return f"{username}@{domain}"
        
        elif value.count('-') == 2 and all(part.isdigit() for part in value.split('-')):
            # 电话号码格式
            parts = value.split('-')
            if random.random() < variation_factor:
                # 变异号码部分
                part_to_vary = random.randint(0, len(parts) - 1)
                parts[part_to_vary] = ''.join(random.choice('0123456789') for _ in range(len(parts[part_to_vary])))
            
            return '-'.join(parts)
        
        else:
            # 一般字符串
            # 确定要变异的字符数量
            change_count = max(1, int(len(value) * variation_factor))
            
            # 变异方式
            variation_type = random.choice(['substitute', 'insert', 'delete', 'swap'])
            
            if variation_type == 'substitute' or len(value) <= 2:
                # 替换字符
                chars = list(value)
                for _ in range(change_count):
                    if not chars:
                        break
                    pos = random.randint(0, len(chars) - 1)
                    chars[pos] = random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')
                return ''.join(chars)
            
            elif variation_type == 'insert' and len(value) > 2:
                # 插入字符
                chars = list(value)
                for _ in range(change_count):
                    pos = random.randint(0, len(chars))
                    chars.insert(pos, random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'))
                return ''.join(chars)
            
            elif variation_type == 'delete' and len(value) > change_count + 1:
                # 删除字符
                chars = list(value)
                for _ in range(change_count):
                    pos = random.randint(0, len(chars) - 1)
                    chars.pop(pos)
                return ''.join(chars)
            
            elif variation_type == 'swap' and len(value) > 2:
                # 交换相邻字符
                chars = list(value)
                for _ in range(change_count):
                    pos = random.randint(0, len(chars) - 2)
                    chars[pos], chars[pos + 1] = chars[pos + 1], chars[pos]
                return ''.join(chars)
            
            # 默认返回原值
            return value
    
    def _vary_list(self, value: list, variation_factor: float) -> list:
        """变异列表型字段"""
        # 如果列表为空，保持为空
        if not value:
            return []
        
        # 复制原列表
        new_list = value.copy()
        
        # 随机选择变异方式
        mutation_type = random.choices(
            ['keep', 'add', 'remove', 'replace', 'reorder'],
            weights=[1 - variation_factor, variation_factor, variation_factor, variation_factor, variation_factor]
        )[0]
        
        if mutation_type == 'keep' or len(value) == 0:
            # 不做变异
            return new_list
        
        elif mutation_type == 'add':
            # 添加新项 (复制并变异一个现有项)
            item_to_duplicate = random.choice(value)
            
            # 根据类型变异
            if isinstance(item_to_duplicate, (int, float)):
                new_item = self._vary_numeric(item_to_duplicate, variation_factor)
            elif isinstance(item_to_duplicate, str):
                new_item = self._vary_string(item_to_duplicate, '_list_item', variation_factor)
            elif isinstance(item_to_duplicate, bool):
                new_item = not item_to_duplicate
            elif isinstance(item_to_duplicate, list):
                new_item = self._vary_list(item_to_duplicate, variation_factor)
            elif isinstance(item_to_duplicate, dict):
                new_item = self._vary_dict(item_to_duplicate, variation_factor)
            else:
                new_item = item_to_duplicate
            
            # 插入到随机位置
            new_list.insert(random.randint(0, len(new_list)), new_item)
            
        elif mutation_type == 'remove' and len(value) > 1:
            # 删除一项
            new_list.pop(random.randint(0, len(new_list) - 1))
            
        elif mutation_type == 'replace':
            # 替换一项
            pos = random.randint(0, len(new_list) - 1)
            item_to_replace = new_list[pos]
            
            # 根据类型变异
            if isinstance(item_to_replace, (int, float)):
                new_list[pos] = self._vary_numeric(item_to_replace, variation_factor)
            elif isinstance(item_to_replace, str):
                new_list[pos] = self._vary_string(item_to_replace, '_list_item', variation_factor)
            elif isinstance(item_to_replace, bool):
                new_list[pos] = not item_to_replace
            elif isinstance(item_to_replace, list):
                new_list[pos] = self._vary_list(item_to_replace, variation_factor)
            elif isinstance(item_to_replace, dict):
                new_list[pos] = self._vary_dict(item_to_replace, variation_factor)
            
        elif mutation_type == 'reorder' and len(value) > 1:
            # 重新排序
            random.shuffle(new_list)
        
        return new_list
    
    def _vary_dict(self, value: dict, variation_factor: float) -> dict:
        """变异字典型字段"""
        # 如果字典为空，保持为空
        if not value:
            return {}
        
        # 复制原字典
        new_dict = value.copy()
        
        # 随机选择变异方式
        mutation_type = random.choices(
            ['keep', 'modify_values', 'add_key', 'remove_key'],
            weights=[1 - variation_factor, variation_factor, variation_factor * 0.5, variation_factor * 0.3]
        )[0]
        
        if mutation_type == 'keep':
            # 不做变异
            return new_dict
        
        elif mutation_type == 'modify_values':
            # 变异部分值
            for key in new_dict:
                if random.random() < variation_factor:
                    if isinstance(new_dict[key], (int, float)):
                        new_dict[key] = self._vary_numeric(new_dict[key], variation_factor)
                    elif isinstance(new_dict[key], str):
                        new_dict[key] = self._vary_string(new_dict[key], key, variation_factor)
                    elif isinstance(new_dict[key], bool):
                        new_dict[key] = not new_dict[key]
                    elif isinstance(new_dict[key], list):
                        new_dict[key] = self._vary_list(new_dict[key], variation_factor)
                    elif isinstance(new_dict[key], dict):
                        new_dict[key] = self._vary_dict(new_dict[key], variation_factor)
        
        elif mutation_type == 'add_key' and len(value) > 0:
            # 添加新键 (基于现有键)
            existing_keys = list(value.keys())
            existing_values = list(value.values())
            
            # 创建新键
            base_key = random.choice(existing_keys)
            new_key = f"{base_key}_var"
            
            i = 1
            while new_key in new_dict:
                new_key = f"{base_key}_var{i}"
                i += 1
            
            # 为新键创建值
            base_value = random.choice(existing_values)
            if isinstance(base_value, (int, float)):
                new_value = self._vary_numeric(base_value, variation_factor * 2)
            elif isinstance(base_value, str):
                new_value = self._vary_string(base_value, base_key, variation_factor * 2)
            elif isinstance(base_value, bool):
                new_value = not base_value
            elif isinstance(base_value, list):
                new_value = self._vary_list(base_value, variation_factor)
            elif isinstance(base_value, dict):
                new_value = self._vary_dict(base_value, variation_factor)
            else:
                new_value = base_value
            
            # 添加新键值对
            new_dict[new_key] = new_value
        
        elif mutation_type == 'remove_key' and len(value) > 1:
            # 删除一个键
            key_to_remove = random.choice(list(new_dict.keys()))
            del new_dict[key_to_remove]
        
        return new_dict
    
    def _apply_field_relationships(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """应用字段之间的关系约束"""
        # 复制输入项
        result = item.copy()
        
        # 应用所有依赖关系
        for dependency in self._field_dependencies.values():
            source_field = dependency['source_field']
            dependent_field = dependency['dependent_field']
            relation_type = dependency['relation_type']
            
            # 只处理输入项中存在源字段的情况
            if source_field not in result:
                continue
            
            # 根据关系类型应用约束
            if relation_type == 'equal':
                # 直接相等
                result[dependent_field] = result[source_field]
                
            elif relation_type == 'linear':
                # 线性关系
                if isinstance(result[source_field], (int, float)):
                    params = dependency['params']
                    a = params.get('a', 1)
                    b = params.get('b', 0)
                    
                    # 计算y = ax + b
                    value = a * result[source_field] + b
                    
                    # 如果原来是整数，则取整
                    original_type = type(item.get(dependent_field, 0))
                    if original_type == int:
                        value = round(value)
                    
                    result[dependent_field] = value
        
        return result
    
    def _apply_constraints(
        self, 
        data: List[Dict[str, Any]], 
        constraints: List[FieldConstraint]
    ) -> List[Dict[str, Any]]:
        """应用字段约束"""
        # 为每个约束创建合适的转换函数
        transformers = []
        for constraint in constraints:
            transformer = self._create_constraint_transformer(constraint)
            if transformer:
                transformers.append((constraint.field, transformer))
        
        # 应用所有转换
        result = []
        for item in data:
            new_item = item.copy()
            
            for field, transformer in transformers:
                if field in new_item:
                    new_item[field] = transformer(new_item[field])
            
            result.append(new_item)
        
        return result
    
    def _create_constraint_transformer(self, constraint: FieldConstraint) -> Optional[Callable]:
        """为字段约束创建转换函数"""
        field = constraint.field
        
        def transformer(value: Any) -> Any:
            # 跳过None值
            if value is None:
                return None
                
            # 处理类型转换
            if constraint.type == 'string' and not isinstance(value, str):
                value = str(value)
            elif constraint.type == 'integer' and not isinstance(value, int):
                try:
                    value = int(float(value))
                except (ValueError, TypeError):
                    value = 0
            elif constraint.type == 'float' and not isinstance(value, float):
                try:
                    value = float(value)
                except (ValueError, TypeError):
                    value = 0.0
            elif constraint.type == 'boolean' and not isinstance(value, bool):
                value = bool(value)
            
            # 处理值约束
            if constraint.allowed_values is not None and len(constraint.allowed_values) > 0:
                if value not in constraint.allowed_values:
                    # 选择最接近的允许值
                    if isinstance(value, (int, float)):
                        # 数值，找最近的
                        closest = min(
                            [v for v in constraint.allowed_values if isinstance(v, (int, float))], 
                            key=lambda x: abs(x - value),
                            default=constraint.allowed_values[0]
                        )
                        value = closest
                    else:
                        # 非数值，随机选择
                        value = random.choice(constraint.allowed_values)
            
            # 处理范围约束
            if isinstance(value, (int, float)):
                if constraint.min_value is not None and value < constraint.min_value:
                    value = constraint.min_value
                if constraint.max_value is not None and value > constraint.max_value:
                    value = constraint.max_value
            
            return value
        
        return transformer
    
    def _generate_id_value(self, original_value: Any) -> Any:
        """为ID字段生成一个新值"""
        # 对于字符串ID，优先使用UUID
        if isinstance(original_value, str):
            # 检测常见ID格式
            if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', original_value, re.I):
                # UUID格式
                return str(uuid.uuid4())
            elif re.match(r'^[0-9a-f]{24}$', original_value, re.I):
                # MongoDB ObjectId格式
                return ''.join(random.choice('0123456789abcdef') for _ in range(24))
            else:
                # 其他字符串ID
                return str(uuid.uuid4())
        
        # 对于数值ID，递增或随机生成
        elif isinstance(original_value, int):
            # 简单递增
            return original_value + random.randint(1, 1000)
        
        # 对于其他类型，保持原样
        return original_value
    
    def _extract_fields_info(self, data: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """从数据中提取字段信息"""
        if not data:
            return {}
        
        fields_info = {}
        
        # 提取所有字段
        all_fields = set()
        for item in data:
            all_fields.update(item.keys())
        
        # 分析每个字段
        for field in all_fields:
            values = [item[field] for item in data if field in item and item[field] is not None]
            
            if not values:
                continue
            
            # 确定字段类型
            types = set(type(v) for v in values)
            
            if len(types) == 1:
                # 单一类型
                value_type = next(iter(types))
                
                if value_type == int:
                    fields_info[field] = {
                        'type': 'integer',
                        'min_value': min(values),
                        'max_value': max(values)
                    }
                elif value_type == float:
                    fields_info[field] = {
                        'type': 'float',
                        'min_value': min(values),
                        'max_value': max(values)
                    }
                elif value_type == str:
                    # 检查是否是有限集合
                    unique_values = set(values)
                    if len(unique_values) <= 10:
                        fields_info[field] = {
                            'type': 'string',
                            'allowed_values': list(unique_values)
                        }
                    else:
                        fields_info[field] = {
                            'type': 'string'
                        }
                elif value_type == bool:
                    fields_info[field] = {
                        'type': 'boolean'
                    }
                elif value_type == list:
                    fields_info[field] = {
                        'type': 'array',
                        'min_length': min(len(v) for v in values),
                        'max_length': max(len(v) for v in values)
                    }
                elif value_type == dict:
                    fields_info[field] = {
                        'type': 'object'
                    }
            else:
                # 混合类型，选择最常见的类型
                type_counts = {}
                for v in values:
                    t = type(v).__name__
                    type_counts[t] = type_counts.get(t, 0) + 1
                
                most_common_type = max(type_counts.items(), key=lambda x: x[1])[0]
                fields_info[field] = {
                    'type': most_common_type
                }
        
        return fields_info
    
    def _apply_dependency(self, source_value: Any, relation_type: str, params: Dict[str, Any]) -> Any:
        """应用依赖关系"""
        if relation_type == 'equal':
            return source_value
            
        elif relation_type == 'linear':
            if isinstance(source_value, (int, float)):
                a = params.get('a', 1)
                b = params.get('b', 0)
                
                # 计算y = ax + b
                value = a * source_value + b
                
                # 根据参数中的类型确定返回类型
                output_type = params.get('output_type', type(source_value).__name__)
                if output_type == 'int':
                    return round(value)
                return value
        
        # 默认返回源值
        return source_value
    
    def _calculate_stats(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """计算数据统计信息"""
        if not data:
            return {}
        
        # 提取所有字段
        fields = set()
        for item in data:
            fields.update(item.keys())
        
        field_stats = {}
        
        # 分析每个字段
        for field in fields:
            # 提取字段值
            values = [item.get(field) for item in data]
            non_null_values = [v for v in values if v is not None]
            
            if not non_null_values:
                continue
            
            # 计算基本统计信息
            field_stats[field] = {
                'count': len(non_null_values),
                'null_count': len(values) - len(non_null_values),
                'unique_count': len(set(str(v) for v in non_null_values))
            }
            
            # 根据类型计算特定统计信息
            if all(isinstance(v, (int, float)) for v in non_null_values):
                numeric_values = [float(v) for v in non_null_values]
                field_stats[field].update({
                    'min': min(numeric_values),
                    'max': max(numeric_values),
                    'mean': sum(numeric_values) / len(numeric_values),
                    'std': np.std(numeric_values) if len(numeric_values) > 1 else 0,
                    'quartiles': {
                        '25%': np.percentile(numeric_values, 25),
                        '50%': np.percentile(numeric_values, 50),
                        '75%': np.percentile(numeric_values, 75)
                    }
                })
            
            elif all(isinstance(v, str) for v in non_null_values):
                # 字符串字段
                lengths = [len(v) for v in non_null_values]
                field_stats[field].update({
                    'min_length': min(lengths),
                    'max_length': max(lengths),
                    'avg_length': sum(lengths) / len(lengths)
                })
                
                # 如果唯一值较少，计算频率分布
                unique_values = set(non_null_values)
                if len(unique_values) <= 10 or len(unique_values) <= len(non_null_values) * 0.2:
                    value_counts = {}
                    for v in non_null_values:
                        value_counts[v] = value_counts.get(v, 0) + 1
                    
                    field_stats[field]['value_distribution'] = {
                        k: v / len(non_null_values) for k, v in value_counts.items()
                    }
            
            elif all(isinstance(v, bool) for v in non_null_values):
                # 布尔字段
                true_count = sum(1 for v in non_null_values if v)
                field_stats[field].update({
                    'true_ratio': true_count / len(non_null_values),
                    'false_ratio': 1 - (true_count / len(non_null_values))
                })
        
        # 计算整体统计信息
        stats = {
            'record_count': len(data),
            'field_count': len(fields),
            'field_distributions': field_stats,
            'unique_values_count': {
                field: field_stats[field]['unique_count'] for field in field_stats
            },
            'null_counts': {
                field: field_stats[field]['null_count'] for field in field_stats
            }
        }
        
        # 计算两个数值字段间相关性
        numeric_fields = [field for field in fields 
                         if field in field_stats 
                         and 'mean' in field_stats[field]]
        
        if len(numeric_fields) >= 2:
            correlation_matrix = {}
            for field1 in numeric_fields:
                correlation_matrix[field1] = {}
                for field2 in numeric_fields:
                    if field1 == field2:
                        correlation_matrix[field1][field2] = 1.0
                        continue
                    
                    values1 = [float(item.get(field1, 0)) for item in data if field1 in item and field2 in item]
                    values2 = [float(item.get(field2, 0)) for item in data if field1 in item and field2 in item]
                    
                    if len(values1) >= 2:
                        correlation = np.corrcoef(values1, values2)[0, 1]
                        correlation_matrix[field1][field2] = correlation
                    else:
                        correlation_matrix[field1][field2] = 0
            
            stats['correlation_matrix'] = correlation_matrix
        
        return stats
