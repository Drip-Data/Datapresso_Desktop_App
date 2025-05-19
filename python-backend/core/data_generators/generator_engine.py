import random
import copy
import logging
import string
import re
import math
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime, timedelta
import uuid
import faker

logger = logging.getLogger(__name__)

# 初始化Faker实例用于生成随机数据
fake = faker.Faker(['zh_CN', 'en_US'])

class GeneratorEngine:
    """数据生成引擎，提供多种数据生成策略"""
    
    def __init__(self):
        """初始化生成引擎"""
        # 注册数据类型生成器
        self.type_generators = {
            "string": self._generate_string,
            "integer": self._generate_integer,
            "float": self._generate_float,
            "boolean": self._generate_boolean,
            "date": self._generate_date,
            "datetime": self._generate_datetime,
            "email": self._generate_email,
            "phone": self._generate_phone,
            "name": self._generate_name,
            "address": self._generate_address,
            "company": self._generate_company,
            "url": self._generate_url,
            "ip": self._generate_ip,
            "choice": self._generate_choice,
            "uuid": self._generate_uuid
        }
        
        # 注册生成方法
        self.generation_methods = {
            "template": self.generate_from_template,
            "variation": self.generate_variations,
            "rule_based": self.generate_rule_based,
            "ml_based": self.generate_ml_based
        }
    
    def generate_data(
        self,
        generation_method: str,
        count: int,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        根据指定方法生成数据
        
        Args:
            generation_method: 生成方法
            count: 生成数据数量
            **kwargs: 其他参数
            
        Returns:
            生成的数据列表
        """
        if generation_method not in self.generation_methods:
            logger.warning(f"未知的生成方法: {generation_method}，使用模板生成替代")
            generation_method = "template"
        
        # 设置随机种子以确保可重复结果（如果提供）
        random_seed = kwargs.get('random_seed')
        if random_seed is not None:
            random.seed(random_seed)
            fake.seed_instance(random_seed)
        
        # 调用相应的生成方法
        generator_func = self.generation_methods[generation_method]
        generated_data = generator_func(count, **kwargs)
        
        # 应用约束条件（如果有）
        field_constraints = kwargs.get('field_constraints')
        if field_constraints:
            generated_data = self.apply_constraints(generated_data, field_constraints)
        
        # 重置随机种子
        if random_seed is not None:
            random.seed()
            fake.seed_instance()
        
        return generated_data
    
    def generate_from_template(
        self,
        count: int,
        template: Dict[str, Any],
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        基于模板生成数据
        
        Args:
            count: 生成数据数量
            template: 数据模板
            **kwargs: 其他参数
            
        Returns:
            生成的数据列表
        """
        if not template:
            raise ValueError("模板不能为空")
        
        generated_data = []
        for i in range(count):
            item = {}
            for field, field_template in template.items():
                if isinstance(field_template, dict) and "type" in field_template:
                    # 处理类型化模板
                    field_type = field_template["type"]
                    generator = self.type_generators.get(field_type)
                    if generator:
                        item[field] = generator(field_template)
                    else:
                        logger.warning(f"未知的字段类型: {field_type}")
                        item[field] = None
                elif isinstance(field_template, str) and "{{" in field_template and "}}" in field_template:
                    # 处理模板字符串
                    item[field] = self._process_template_string(field_template)
                else:
                    # 直接使用提供的值
                    item[field] = copy.deepcopy(field_template)
            
            generated_data.append(item)
        
        return generated_data
    
    def generate_variations(
        self,
        count: int,
        seed_data: List[Dict[str, Any]],
        variation_factor: float = 0.3,
        preserve_relationships: bool = True,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        基于种子数据生成变异数据
        
        Args:
            count: 生成数据数量
            seed_data: 种子数据
            variation_factor: 变异因子(0.0-1.0)
            preserve_relationships: 保持字段间关系
            **kwargs: 其他参数 (可包含 random_seed)
            
        Returns:
            生成的数据列表
        """
        if not seed_data:
            raise ValueError("种子数据不能为空")

        current_random_seed = kwargs.get('random_seed')
        original_random_state = None
        # original_faker_state = None # Removed faker state saving/restoring

        if current_random_seed is not None:
            original_random_state = random.getstate()
            # original_faker_state = fake.random.getstate() # Removed
            random.seed(current_random_seed)
            fake.seed_instance(current_random_seed)
        
        generated_data = []
        seed_count = len(seed_data)
        
        # 分析字段类型和关系
        field_types = {}
        field_relationships = {}
        
        if preserve_relationships:
            # 分析字段类型
            for item in seed_data:
                for field, value in item.items():
                    if field not in field_types:
                        field_types[field] = type(value)
            
            # 计算字段间的关联关系
            field_relationships = self._analyze_field_relationships(seed_data)
        
        # 生成变异数据
        for i in range(count):
            # 随机选择一个种子
            seed_item = seed_data[random.randint(0, seed_count - 1)]
            new_item = copy.deepcopy(seed_item)
            
            # 应用变异
            self._apply_variation(new_item, variation_factor, field_types, field_relationships)
            
            generated_data.append(new_item)

        if current_random_seed is not None and original_random_state is not None:
            random.setstate(original_random_state)
            # fake.random.setstate(original_faker_state) # Removed
        
        return generated_data
    
    def generate_rule_based(
        self,
        count: int,
        rules: Dict[str, Any],
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        基于规则生成数据
        
        Args:
            count: 生成数据数量
            rules: 生成规则
            **kwargs: 其他参数
            
        Returns:
            生成的数据列表
        """
        if not rules:
            raise ValueError("规则不能为空")
        
        generated_data = []
        for i in range(count):
            item = {}
            for field, rule in rules.items():
                # 根据规则生成字段值
                if isinstance(rule, dict):
                    rule_type = rule.get("type")
                    if rule_type and rule_type in self.type_generators:
                        item[field] = self.type_generators[rule_type](rule)
                    elif "formula" in rule:
                        # 基于其他字段的计算公式
                        formula = rule["formula"]
                        try:
                            # 构建本地变量字典
                            locals_dict = {k: item.get(k) for k in item}
                            item[field] = eval(formula, {"__builtins__": {}}, locals_dict)
                        except Exception as e:
                            logger.warning(f"公式计算失败 '{formula}': {e}")
                            item[field] = None
                    else:
                        item[field] = None
                else:
                    item[field] = rule
            
            generated_data.append(item)
        
        return generated_data
    
    def generate_ml_based(
        self,
        count: int,
        seed_data: Optional[List[Dict[str, Any]]] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        基于机器学习生成数据
        
        Args:
            count: 生成数据数量
            seed_data: 种子数据（用于训练）
            **kwargs: 其他参数
            
        Returns:
            生成的数据列表
        """
        # 这是一个简单的实现，实际上可能需要集成更复杂的ML模型
        if not seed_data or len(seed_data) < 10:
            logger.warning("种子数据不足，使用变异生成替代")
            return self.generate_variations(count, seed_data or [], **kwargs)
        
        # 使用变异生成作为基础，但尝试保留统计特性
        generated_data = []
        
        # 分析种子数据的统计特性
        field_stats = self._analyze_field_statistics(seed_data)
        
        for i in range(count):
            item = {}
            
            # 对每个字段应用统计特性生成值
            for field, stats in field_stats.items():
                field_type = stats["type"]
                
                if field_type == "numeric":
                    # 使用正态分布生成数值
                    mean = stats["mean"]
                    std_dev = stats["std_dev"]
                    value = random.gauss(mean, std_dev)
                    # 确保值在最小值和最大值范围内
                    value = max(stats["min"], min(stats["max"], value))
                    # 如果原始类型是整数，转换为整数
                    if stats["original_type"] == int:
                        value = int(round(value))
                    item[field] = value
                    
                elif field_type == "categorical":
                    # 根据频率随机选择
                    options = list(stats["distribution"].keys())
                    weights = list(stats["distribution"].values())
                    item[field] = random.choices(options, weights=weights, k=1)[0]
                    
                elif field_type == "text":
                    # 生成随机文本（简单实现）
                    if stats["values"]:
                        # 从现有值中选择并小幅度变异
                        base_text = random.choice(stats["values"])
                        item[field] = self._mutate_text(base_text, 0.2)
                    else:
                        item[field] = "".join(random.choices(
                            string.ascii_letters + string.digits + " ", 
                            k=random.randint(stats["min_length"], stats["max_length"])
                        ))
                else:
                    # 如果无法确定类型，直接从种子数据中随机选择
                    if stats["values"]:
                        item[field] = random.choice(stats["values"])
                    else:
                        item[field] = None
            
            generated_data.append(item)
        
        return generated_data
    
    def apply_constraints(
        self,
        data: List[Dict[str, Any]],
        constraints: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        应用字段约束
        
        Args:
            data: 数据列表
            constraints: 约束条件列表
            
        Returns:
            应用约束后的数据列表
        """
        # 构建字段约束字典
        # constraints is List[FieldConstraint], where FieldConstraint is a Pydantic model
        field_constraints_map: Dict[str, FieldConstraint] = {constraint.field: constraint for constraint in constraints}
        
        # 应用约束
        for item in data:
            for field, constraint_model in field_constraints_map.items(): # Iterate over the map
                if field not in item:
                    continue
                
                value = item[field]
                # Use constraint_model.type, constraint_model.min_value etc.
                field_type = constraint_model.type
                
                # 类型检查和转换
                if field_type == "string" and not isinstance(value, str):
                    item[field] = str(value)
                elif field_type == "integer" and not isinstance(value, int):
                    try:
                        item[field] = int(value)
                    except (ValueError, TypeError):
                        item[field] = 0 # Default or log error
                elif field_type == "float" and not isinstance(value, float):
                    try:
                        item[field] = float(value)
                    except (ValueError, TypeError):
                        item[field] = 0.0 # Default or log error
                elif field_type == "boolean" and not isinstance(value, bool):
                    item[field] = bool(value)
                
                # 值范围约束
                if constraint_model.min_value is not None and constraint_model.max_value is not None:
                    if isinstance(value, (int, float)): # Check if value is numeric before comparison
                        # Ensure min_value and max_value from constraint are also numeric if applicable
                        try:
                            min_val = float(constraint_model.min_value)
                            max_val = float(constraint_model.max_value)
                            if isinstance(value, int) and field_type == "integer":
                                min_val = int(min_val)
                                max_val = int(max_val)
                            item[field] = max(min_val, min(max_val, value))
                        except (ValueError, TypeError):
                            logger.warning(f"Invalid min/max_value for numeric constraint on field {field}")


                # 允许的值列表
                if constraint_model.allowed_values: # Check if list is not None and not empty
                    if value not in constraint_model.allowed_values:
                        item[field] = random.choice(constraint_model.allowed_values)
                
                # 正则表达式格式
                if constraint_model.regex_pattern and isinstance(value, str):
                    pattern = constraint_model.regex_pattern
                    try:
                        if not re.match(pattern, value):
                            # 尝试生成符合模式的值
                            if field_type and field_type in self.type_generators:
                                # Pass the Pydantic model 'constraint_model' directly
                                item[field] = self.type_generators[field_type](constraint_model.model_dump())
                    except re.error:
                        logger.warning(f"无效的正则表达式: {pattern} for field {field}")
                
                # 空值处理
                if constraint_model.nullable is False and (value is None or (isinstance(value, str) and not value.strip())):
                    if field_type and field_type in self.type_generators:
                         # Pass the Pydantic model 'constraint_model' directly
                        item[field] = self.type_generators[field_type](constraint_model.model_dump())
        
        # 处理唯一性约束
        # Convert constraints (List[FieldConstraint]) to a list of dicts for this part if needed, or access attributes
        unique_fields = [c.field for c in constraints if c.unique]
        for field in unique_fields:
            values = [item_val.get(field) for item_val in data] # item_val is a dict
            for i, item_dict in enumerate(data): # item_dict is a dict
                current_value = item_dict.get(field)
                if values.count(current_value) > 1:
                    # 尝试生成唯一值
                    constraint_model_for_unique = field_constraints_map.get(field)
                    if constraint_model_for_unique:
                        field_type_for_unique = constraint_model_for_unique.type
                        if field_type_for_unique and field_type_for_unique in self.type_generators:
                            new_value = self.type_generators[field_type_for_unique](constraint_model_for_unique.model_dump())
                            attempts = 10
                            while attempts > 0 and new_value in values:
                                new_value = self.type_generators[field_type_for_unique](constraint_model_for_unique.model_dump())
                                attempts -= 1
                                
                            if new_value not in values or attempts == 0: # If still duplicate after attempts, it remains.
                                item_dict[field] = new_value
                                values[i] = new_value # Update our local list of values
        
        return data
    
    def _process_template_string(self, template_str: str) -> str:
        """处理模板字符串中的占位符"""
        
        def replace_placeholder(match):
            placeholder = match.group(1).strip()
            
            # 解析占位符类型和参数
            parts = placeholder.split(":")
            placeholder_type = parts[0].lower()
            params = parts[1] if len(parts) > 1 else ""
            
            # 处理不同类型的占位符
            if placeholder_type == "int" or placeholder_type == "integer":
                # 整数
                if "-" in params:
                    min_val, max_val = map(int, params.split("-"))
                    return str(random.randint(min_val, max_val))
                else:
                    return str(random.randint(0, 100))
                    
            elif placeholder_type == "float":
                # 浮点数
                if "-" in params:
                    min_val, max_val = map(float, params.split("-"))
                    return str(round(random.uniform(min_val, max_val), 2))
                else:
                    return str(round(random.uniform(0, 100), 2))
                    
            elif placeholder_type == "name":
                # 姓名
                return fake.name()
                
            elif placeholder_type == "firstname":
                # 名
                return fake.first_name()
                
            elif placeholder_type == "lastname":
                # 姓
                return fake.last_name()
                
            elif placeholder_type == "email":
                # 电子邮件
                return fake.email()
                
            elif placeholder_type == "phone":
                # 电话号码
                return fake.phone_number()
                
            elif placeholder_type == "date":
                # 日期
                format_str = params or "%Y-%m-%d"
                return fake.date(pattern=format_str)
                
            elif placeholder_type == "address":
                # 地址
                return fake.address()
                
            elif placeholder_type == "city":
                # 城市
                return fake.city()
                
            elif placeholder_type == "company":
                # 公司
                return fake.company()
                
            elif placeholder_type == "text":
                # 随机文本
                if params.isdigit():
                    word_count = int(params)
                    return fake.text(max_nb_chars=word_count)
                return fake.sentence()
                
            elif placeholder_type == "choice":
                # 从选项中随机选择
                options = [opt.strip() for opt in params.split(",")]
                return random.choice(options)
                
            elif placeholder_type == "uuid":
                # UUID
                return str(uuid.uuid4())
                
            else:
                # 未知类型，返回原始占位符
                return f"{{{{{placeholder}}}}}"
        
        # 替换所有占位符
        return re.sub(r"\{\{(.*?)\}\}", replace_placeholder, template_str)
    
    def _apply_variation(
        self,
        item: Dict[str, Any],
        variation_factor: float,
        field_types: Dict[str, type],
        field_relationships: Dict[str, Dict[str, float]]
    ):
        """应用变异到数据项"""
        
        # 跟踪已变异的字段
        mutated_fields = set()
        
        # 第一次传递：根据变异因子随机选择要变异的字段
        for field, value in list(item.items()):
            # 根据变异因子决定是否变异此字段
            if random.random() < variation_factor:
                # 根据字段类型应用不同的变异策略
                if isinstance(value, (int, float)):
                    # 数值变异：在原值基础上加减一个比例
                    variation_range = abs(value) * variation_factor if value != 0 else 1
                    delta = random.uniform(-variation_range, variation_range)
                    
                    # 如果字段是整数类型，确保结果也是整数
                    if isinstance(value, int) or field_types.get(field) == int:
                        item[field] = int(value + round(delta))
                    else:
                        item[field] = value + delta
                
                elif isinstance(value, str):
                    # 字符串变异：修改、添加或删除字符
                    if len(value) > 0:
                        item[field] = self._mutate_text(value, variation_factor)
                
                elif isinstance(value, bool):
                    # 布尔值变异：有一定概率翻转
                    if random.random() < variation_factor:
                        item[field] = not value
                
                elif isinstance(value, (list, tuple)) and value:
                    # 列表变异：修改、添加或删除元素
                    new_value = list(value)
                    mutation_type = random.choice(["modify", "add", "remove"])
                    
                    if mutation_type == "modify" and new_value:
                        idx = random.randint(0, len(new_value) - 1)
                        element = new_value[idx]
                        if isinstance(element, (int, float, str, bool)):
                            # 递归应用变异
                            if isinstance(element, (int, float)):
                                variation_range = abs(element) * variation_factor if element != 0 else 1
                                new_value[idx] = element + random.uniform(-variation_range, variation_range)
                            elif isinstance(element, str):
                                new_value[idx] = self._mutate_text(element, variation_factor)
                            elif isinstance(element, bool):
                                new_value[idx] = not element
                    
                    elif mutation_type == "add" and new_value:
                        # 添加与现有元素类似的新元素
                        if new_value:
                            reference = random.choice(new_value)
                            if isinstance(reference, (int, float)):
                                variation_range = abs(reference) * variation_factor if reference != 0 else 1
                                new_element = reference + random.uniform(-variation_range, variation_range)
                            elif isinstance(reference, str):
                                new_element = self._mutate_text(reference, variation_factor)
                            elif isinstance(reference, bool):
                                new_element = not reference
                            else:
                                new_element = reference
                            new_value.append(new_element)
                    
                    elif mutation_type == "remove" and len(new_value) > 1:
                        # 删除随机元素
                        idx = random.randint(0, len(new_value) - 1)
                        new_value.pop(idx)
                    
                    item[field] = tuple(new_value) if isinstance(value, tuple) else new_value
                
                # 标记字段已变异
                mutated_fields.add(field)
        
        # 第二次传递：处理相关字段
        if field_relationships:
            for field in mutated_fields:
                # 查找与变异字段相关的其他字段
                if field in field_relationships:
                    for related_field, strength in field_relationships[field].items():
                        if related_field in item and random.random() < strength:
                            # 根据关联强度和已经变异的字段调整关联字段
                            related_value = item[related_field]
                            if isinstance(related_value, (int, float)):
                                # 计算新的变异值，考虑到与原字段的关系
                                original_value = item[field]
                                if isinstance(original_value, (int, float)):
                                    # 根据关系强度调整关联字段
                                    change_ratio = (item[field] / original_value - 1) * strength
                                    item[related_field] = related_value * (1 + change_ratio)
                                    
                                    # 如果字段是整数类型，确保结果也是整数
                                    if isinstance(related_value, int) or field_types.get(related_field) == int:
                                        item[related_field] = int(round(item[related_field]))
    
    def _mutate_text(self, text: str, mutation_rate: float) -> str:
        """变异文本字符串"""
        if not text:
            return text
        
        # 确定变异操作类型
        mutation_type = random.choices(
            ["modify", "add", "remove"],
            weights=[0.5, 0.3, 0.2],
            k=1
        )[0]
        
        if mutation_type == "modify":
            # 修改字符
            chars = list(text)
            positions = random.sample(range(len(chars)), min(
                max(1, int(len(chars) * mutation_rate)),
                len(chars)
            ))
            
            for pos in positions:
                # 替换为随机字符
                chars[pos] = random.choice(string.ascii_letters + string.digits + ",.!? ")
            
            return "".join(chars)
        
        elif mutation_type == "add" and len(text) > 0:
            # 添加字符
            chars = list(text)
            positions = random.sample(range(len(chars) + 1), min(
                max(1, int(len(chars) * mutation_rate)),
                len(chars) + 1
            ))
            
            for i, pos in enumerate(sorted(positions)):
                # 插入随机字符
                chars.insert(pos + i, random.choice(string.ascii_letters + string.digits + ",.!? "))
            
            return "".join(chars)
        
        elif mutation_type == "remove" and len(text) > 3:
            # 删除字符
            chars = list(text)
            positions = random.sample(range(len(chars)), min(
                max(1, int(len(chars) * mutation_rate)),
                len(chars) - 1  # 保留至少一个字符
            ))
            
            # 从后向前删除，避免索引问题
            for pos in sorted(positions, reverse=True):
                chars.pop(pos)
            
            return "".join(chars)
        
        return text
    
    def _analyze_field_relationships(self, data: List[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
        """分析字段间的关联性"""
        # 需要足够的样本量
        if len(data) < 10:
            return {}
        
        # 提取所有数值型字段
        numeric_fields = set()
        for item in data[:10]:  # 取前10个样本分析字段类型
            for field, value in item.items():
                if isinstance(value, (int, float)):
                    numeric_fields.add(field)
        
        if len(numeric_fields) < 2:
            return {}
        
        # 计算字段间的相关系数
        relationships = {}
        numeric_fields = list(numeric_fields)
        
        # 提取字段值
        field_values = {}
        for field in numeric_fields:
            field_values[field] = []
            
        for item in data:
            for field in numeric_fields:
                if field in item and isinstance(item[field], (int, float)):
                    field_values[field].append(item[field])
                else:
                    field_values[field].append(0)  # 使用0作为默认值
        
        # 计算相关系数（简化版）
        for i, field1 in enumerate(numeric_fields):
            if field1 not in relationships:
                relationships[field1] = {}
                
            for j, field2 in enumerate(numeric_fields[i+1:], i+1):
                if len(field_values[field1]) != len(field_values[field2]):
                    continue
                    
                # 计算皮尔逊相关系数
                try:
                    correlation = self._calculate_correlation(field_values[field1], field_values[field2])
                    
                    # 只保留强相关关系
                    if abs(correlation) > 0.5:
                        relationships[field1][field2] = correlation
                        
                        if field2 not in relationships:
                            relationships[field2] = {}
                        relationships[field2][field1] = correlation
                except:
                    pass
        
        return relationships
    
    def _calculate_correlation(self, x: List[float], y: List[float]) -> float:
        """计算两个数据序列的皮尔逊相关系数"""
        n = len(x)
        if n != len(y) or n == 0:
            return 0
            
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(a * b for a, b in zip(x, y))
        sum_x2 = sum(a * a for a in x)
        sum_y2 = sum(b * b for b in y)
        
        numerator = n * sum_xy - sum_x * sum_y
        denominator = math.sqrt((n * sum_x2 - sum_x ** 2) * (n * sum_y2 - sum_y ** 2))
        
        if denominator == 0:
            return 0
            
        return numerator / denominator
    
    def _analyze_field_statistics(self, data: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """分析字段的统计特性"""
        if not data:
            return {}
            
        field_stats = {}
        
        # 找出所有字段
        fields = set()
        for item in data:
            fields.update(item.keys())
        
        for field in fields:
            # 收集字段值
            values = [item.get(field) for item in data if field in item and item[field] is not None]
            
            if not values:
                field_stats[field] = {
                    "type": "unknown",
                    "values": []
                }
                continue
            
            # 确定字段类型
            if all(isinstance(v, (int, float)) for v in values):
                # 数值型字段
                numeric_values = [float(v) for v in values]
                mean = sum(numeric_values) / len(numeric_values)
                variance = sum((v - mean) ** 2 for v in numeric_values) / len(numeric_values)
                std_dev = math.sqrt(variance)
                
                field_stats[field] = {
                    "type": "numeric",
                    "original_type": type(values[0]),
                    "mean": mean,
                    "median": sorted(numeric_values)[len(numeric_values) // 2],
                    "std_dev": std_dev,
                    "min": min(numeric_values),
                    "max": max(numeric_values),
                    "values": values
                }
            elif all(isinstance(v, str) for v in values):
                # 字符串字段
                # 检查是否是分类变量
                unique_values = set(values)
                if len(unique_values) <= min(10, len(values) // 2):
                    # 分类变量
                    distribution = {}
                    for v in values:
                        distribution[v] = distribution.get(v, 0) + 1
                    
                    # 转换为概率
                    total = len(values)
                    distribution = {k: v / total for k, v in distribution.items()}
                    
                    field_stats[field] = {
                        "type": "categorical",
                        "distribution": distribution,
                        "values": list(unique_values)
                    }
                else:
                    # 文本变量
                    lengths = [len(v) for v in values]
                    field_stats[field] = {
                        "type": "text",
                        "min_length": min(lengths),
                        "max_length": max(lengths),
                        "avg_length": sum(lengths) / len(lengths),
                        "values": values
                    }
            elif all(isinstance(v, bool) for v in values):
                # 布尔型字段
                true_count = sum(1 for v in values if v)
                false_count = len(values) - true_count
                
                field_stats[field] = {
                    "type": "boolean",
                    "distribution": {
                        True: true_count / len(values),
                        False: false_count / len(values)
                    },
                    "values": [True, False]
                }
            else:
                # 混合类型，作为分类变量处理
                unique_values = set(str(v) for v in values)
                distribution = {}
                for v in values:
                    str_v = str(v)
                    distribution[str_v] = distribution.get(str_v, 0) + 1
                
                # 转换为概率
                total = len(values)
                distribution = {k: v / total for k, v in distribution.items()}
                
                field_stats[field] = {
                    "type": "mixed",
                    "distribution": distribution,
                    "values": values
                }
        
        return field_stats
    
    # 各种数据类型生成器
    def _generate_string(self, params: Dict[str, Any]) -> str:
        """生成字符串"""
        min_length = params.get("min_length", 5)
        max_length = params.get("max_length", 10)
        length = random.randint(min_length, max_length)
        
        if "pattern" in params:
            # 基于正则模式生成
            pattern = params["pattern"]
            try:
                import exrex
                return exrex.getone(pattern)
            except ImportError:
                logger.warning("exrex库未安装，无法基于正则表达式生成字符串")
        
        if "charset" in params:
            charset = params["charset"]
            if charset == "alpha":
                chars = string.ascii_letters
            elif charset == "alphanumeric":
                chars = string.ascii_letters + string.digits
            elif charset == "numeric":
                chars = string.digits
            elif charset == "lowercase":
                chars = string.ascii_lowercase
            elif charset == "uppercase":
                chars = string.ascii_uppercase
            elif charset == "hex":
                chars = string.hexdigits
            else:
                chars = charset
        else:
            chars = string.ascii_letters + string.digits
        
        return "".join(random.choice(chars) for _ in range(length))
    
    def _generate_integer(self, params: Dict[str, Any]) -> int:
        """生成整数"""
        min_val = params.get("min_value", 0)
        max_val = params.get("max_value", 100)

        if not isinstance(min_val, int):
            min_val = 0
        if not isinstance(max_val, int):
            max_val = 100
        
        if min_val > max_val: # Swap if min > max
            min_val, max_val = max_val, min_val
            
        return random.randint(min_val, max_val)
    
    def _generate_float(self, params: Dict[str, Any]) -> float:
        """生成浮点数"""
        min_val = params.get("min_value", 0.0)
        max_val = params.get("max_value", 1.0) # Default to 0.0-1.0 if not specified
        precision = params.get("precision")

        # Ensure min_val and max_val are numbers
        if not isinstance(min_val, (int, float)):
            min_val = 0.0
        if not isinstance(max_val, (int, float)):
            max_val = min_val + 1.0 # Ensure max_val is greater than min_val

        if min_val > max_val: # Swap if min > max
            min_val, max_val = max_val, min_val
        
        val = random.uniform(min_val, max_val)
        
        if precision is not None and isinstance(precision, int) and precision >= 0:
            return round(val, precision)
        return val # Return unrounded if precision is not valid
    
    def _generate_boolean(self, params: Dict[str, Any]) -> bool:
        """生成布尔值"""
        true_probability = params.get("true_probability", 0.5)
        return random.random() < true_probability
    
    def _generate_date(self, params: Dict[str, Any]) -> str:
        """生成日期"""
        start_date_str = params.get("min_value", "1970-01-01") # Use min_value
        end_date_str = params.get("max_value", "2050-12-31")   # Use max_value
        format_str = params.get("format", "%Y-%m-%d")
        
        try:
            # Attempt to parse min/max dates with common formats if they don't match format_str
            # This is a bit heuristic; ideally min/max should also adhere to a known format or be datetime objects
            parsed_start_date = None
            parsed_end_date = None
            common_parse_formats = ["%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y"]

            for fmt_try in [format_str] + common_parse_formats:
                try:
                    if parsed_start_date is None:
                        parsed_start_date = datetime.strptime(start_date_str, fmt_try)
                except ValueError:
                    pass
                try:
                    if parsed_end_date is None:
                        parsed_end_date = datetime.strptime(end_date_str, fmt_try)
                except ValueError:
                    pass
                if parsed_start_date and parsed_end_date:
                    break
            
            if not parsed_start_date or not parsed_end_date:
                raise ValueError("Could not parse min/max date strings with common formats.")

            if parsed_start_date > parsed_end_date:
                parsed_start_date, parsed_end_date = parsed_end_date, parsed_start_date

            days_diff = (parsed_end_date - parsed_start_date).days
            random_days = random.randint(0, max(0, days_diff))
            
            random_date = parsed_start_date + timedelta(days=random_days)
            return random_date.strftime(format_str) # Always output with the specified format
        except ValueError as e:
            logger.warning(f"日期生成错误 for format '{format_str}': {e}. Falling back to Faker.")
            # Fallback to faker using the desired output format if possible
            try:
                return fake.date_object().strftime(format_str)
            except: # If format_str is too exotic for strftime after faker's date_object
                logger.warning(f"Faker could not format date with '{format_str}', using ISO format.")
                return fake.date() # Default ISO format YYYY-MM-DD
    
    def _generate_datetime(self, params: Dict[str, Any]) -> str:
        """生成日期时间"""
        start_datetime_str = params.get("min_value", "1970-01-01T00:00:00")
        end_datetime_str = params.get("max_value", "2050-12-31T23:59:59")
        format_str = params.get("format", "%Y-%m-%d %H:%M:%S")

        try:
            parsed_start_dt = None
            parsed_end_dt = None
            common_dt_parse_formats = [
                format_str, # Try target format first for min/max
                "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d %H:%M:%S%z", "%Y-%m-%d %H:%M:%S",
                "%Y/%m/%dT%H:%M:%S%z", "%Y/%m/%dT%H:%M:%S",
                "%Y/%m/%d %H:%M:%S%z", "%Y/%m/%d %H:%M:%S",
            ]
            
            for fmt_try in common_dt_parse_formats:
                try:
                    if parsed_start_dt is None:
                        # Handle potential 'Z' for UTC
                        temp_start_str = start_datetime_str.replace("Z", "+00:00") if start_datetime_str.endswith("Z") else start_datetime_str
                        parsed_start_dt = datetime.fromisoformat(temp_start_str) if '+' in temp_start_str or 'Z' in temp_start_str and fmt_try == "%Y-%m-%dT%H:%M:%S%z" else datetime.strptime(temp_start_str, fmt_try)
                except ValueError:
                    pass # Try next format
                try:
                    if parsed_end_dt is None:
                        temp_end_str = end_datetime_str.replace("Z", "+00:00") if end_datetime_str.endswith("Z") else end_datetime_str
                        parsed_end_dt = datetime.fromisoformat(temp_end_str) if '+' in temp_end_str or 'Z' in temp_end_str and fmt_try == "%Y-%m-%dT%H:%M:%S%z" else datetime.strptime(temp_end_str, fmt_try)
                except ValueError:
                    pass
                if parsed_start_dt and parsed_end_dt:
                    break
            
            if not parsed_start_dt or not parsed_end_dt:
                logger.warning(f"无法使用预设格式解析min/max日期时间字符串 ('{start_datetime_str}', '{end_datetime_str}')，将使用Faker生成。")
                # Fallback to faker if parsing min/max fails, try to use the target format
                try:
                    return fake.date_time_this_century().strftime(format_str)
                except:
                    logger.warning(f"Faker无法使用格式 '{format_str}' 生成日期时间，将使用ISO格式。")
                    return fake.iso8601()


            if parsed_start_dt > parsed_end_dt:
                parsed_start_dt, parsed_end_dt = parsed_end_dt, parsed_start_dt

            time_diff_seconds = (parsed_end_dt - parsed_start_dt).total_seconds()
            random_seconds = random.uniform(0, max(0, time_diff_seconds))
            
            random_dt = parsed_start_dt + timedelta(seconds=random_seconds)
            return random_dt.strftime(format_str) # Always output with the specified format
            
        except Exception as e: # Catch broader exceptions during generation
            logger.warning(f"日期时间生成时发生错误: {e}. 使用Faker默认日期时间格式 {format_str}.")
            try:
                return fake.date_time_this_century().strftime(format_str)
            except:
                logger.warning(f"Faker无法使用格式 '{format_str}' 生成日期时间，将使用ISO格式。")
                return fake.iso8601() # Final fallback
    
    def _generate_email(self, params: Dict[str, Any]) -> str:
        """生成电子邮件"""
        return fake.email()
    
    def _generate_phone(self, params: Dict[str, Any]) -> str:
        """生成电话号码"""
        return fake.phone_number()
    
    def _generate_name(self, params: Dict[str, Any]) -> str:
        """生成姓名"""
        return fake.name()
    
    def _generate_address(self, params: Dict[str, Any]) -> str:
        """生成地址"""
        return fake.address()
    
    def _generate_company(self, params: Dict[str, Any]) -> str:
        """生成公司名称"""
        return fake.company()
    
    def _generate_url(self, params: Dict[str, Any]) -> str:
        """生成URL"""
        return fake.url()
    
    def _generate_ip(self, params: Dict[str, Any]) -> str:
        """生成IP地址"""
        return fake.ipv4()
    
    def _generate_choice(self, params: Dict[str, Any]) -> Any:
        """从选项中随机选择"""
        options = params.get("options", []) # Changed from "choices" to "options"
        if not options:
            logger.warning("Choice generation called with no options.")
            return None # Or raise ValueError if options are strictly required
            
        weights = params.get("weights")
        if weights and len(weights) == len(options): # Check against len(options)
            return random.choices(options, weights=weights, k=1)[0]
        else:
            if weights: # Log if weights were provided but not used due to length mismatch
                logger.warning("Weights provided for choice generation but length did not match options length. Using uniform choice.")
            return random.choice(options)
    
    def _generate_uuid(self, params: Dict[str, Any]) -> str:
        """生成UUID"""
        return str(uuid.uuid4())

# 创建全局生成引擎实例
generator_engine = GeneratorEngine()

def generate_data(
    generation_method: str,
    count: int,
    **kwargs
) -> List[Dict[str, Any]]:
    """
    生成数据的快捷函数
    
    Args:
        generation_method: 生成方法
        count: 生成数据数量
        **kwargs: 其他参数
        
    Returns:
        生成的数据列表
    """
    return generator_engine.generate_data(generation_method, count, **kwargs)
