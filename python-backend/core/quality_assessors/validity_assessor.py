from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import re
from datetime import datetime
import json
import email_validator
import ipaddress
import urllib.parse

async def assess_validity(
    data: List[Dict[str, Any]],
    schema: Optional[Dict[str, Any]] = None,
    custom_rules: Optional[Dict[str, Any]] = None,
    detail_level: str = "medium"
) -> Dict[str, Any]:
    """
    评估数据有效性
    
    Args:
        data: 要评估的数据
        schema: 数据结构定义
        custom_rules: 自定义验证规则
        detail_level: 详细程度
        
    Returns:
        包含有效性评估结果的字典
    """
    if not data:
        return {
            "score": 0,
            "details": {"error": "空数据集"}
        }
    
    # 转换为DataFrame便于分析
    df = pd.DataFrame(data)
    
    # 字段有效性得分
    field_validity = {}
    invalid_counts = {}
    validation_failures = {}
    fields = df.columns
    
    # 如果有模式定义，使用模式中的规则验证
    if schema and "properties" in schema:
        for field in fields:
            if field in schema["properties"]:
                field_schema = schema["properties"][field]
                
                # 如果字段不在数据中，跳过
                if field not in df.columns:
                    continue
                
                # 非空值
                non_null_values = df[field].dropna()
                if len(non_null_values) == 0:
                    field_validity[field] = 1.0  # 没有值，默认有效
                    invalid_counts[field] = 0
                    continue
                
                # 验证规则
                invalid_rows = []
                
                # 根据模式类型验证
                field_type = field_schema.get("type")
                
                if field_type == "string":
                    # 字符串类型验证
                    string_values = [v for v in non_null_values if isinstance(v, str)]
                    non_string_count = len(non_null_values) - len(string_values)
                    
                    # 最小/最大长度
                    if "minLength" in field_schema:
                        min_length = field_schema["minLength"]
                        length_failures = [i for i, v in enumerate(string_values) if len(v) < min_length]
                        if length_failures:
                            invalid_rows.extend([df.index[i] for i in length_failures])
                            validation_failures.setdefault(field, []).append({
                                "rule": "minLength",
                                "count": len(length_failures)
                            })
                    
                    if "maxLength" in field_schema:
                        max_length = field_schema["maxLength"]
                        length_failures = [i for i, v in enumerate(string_values) if len(v) > max_length]
                        if length_failures:
                            invalid_rows.extend([df.index[i] for i in length_failures])
                            validation_failures.setdefault(field, []).append({
                                "rule": "maxLength",
                                "count": len(length_failures)
                            })
                    
                    # 正则模式
                    if "pattern" in field_schema:
                        pattern = field_schema["pattern"]
                        pattern_failures = [i for i, v in enumerate(string_values) if not re.match(pattern, v)]
                        if pattern_failures:
                            invalid_rows.extend([df.index[i] for i in pattern_failures])
                            validation_failures.setdefault(field, []).append({
                                "rule": "pattern",
                                "count": len(pattern_failures)
                            })
                    
                    # 枚举值
                    if "enum" in field_schema:
                        allowed_values = field_schema["enum"]
                        enum_failures = [i for i, v in enumerate(string_values) if v not in allowed_values]
                        if enum_failures:
                            invalid_rows.extend([df.index[i] for i in enum_failures])
                            validation_failures.setdefault(field, []).append({
                                "rule": "enum",
                                "count": len(enum_failures)
                            })
                    
                    # 日期格式
                    if "format" in field_schema and field_schema["format"] == "date":
                        def is_valid_date(date_str):
                            try:
                                # 尝试多种常见日期格式
                                formats = ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y"]
                                for fmt in formats:
                                    try:
                                        datetime.strptime(date_str, fmt)
                                        return True
                                    except ValueError:
                                        continue
                                return False
                            except Exception:
                                return False
                        
                        date_failures = [i for i, v in enumerate(string_values) if not is_valid_date(v)]
                        if date_failures:
                            invalid_rows.extend([df.index[i] for i in date_failures])
                            validation_failures.setdefault(field, []).append({
                                "rule": "date_format",
                                "count": len(date_failures)
                            })
                    
                    # 电子邮件格式
                    if "format" in field_schema and field_schema["format"] == "email":
                        def is_valid_email(email_str):
                            try:
                                email_validator.validate_email(email_str)
                                return True
                            except email_validator.EmailNotValidError:
                                return False
                        
                        email_failures = [i for i, v in enumerate(string_values) if not is_valid_email(v)]
                        if email_failures:
                            invalid_rows.extend([df.index[i] for i in email_failures])
                            validation_failures.setdefault(field, []).append({
                                "rule": "email_format",
                                "count": len(email_failures)
                            })
                    
                    # URL格式
                    if "format" in field_schema and field_schema["format"] == "uri":
                        def is_valid_url(url_str):
                            try:
                                result = urllib.parse.urlparse(url_str)
                                return all([result.scheme, result.netloc])
                            except Exception:
                                return False
                        
                        url_failures = [i for i, v in enumerate(string_values) if not is_valid_url(v)]
                        if url_failures:
                            invalid_rows.extend([df.index[i] for i in url_failures])
                            validation_failures.setdefault(field, []).append({
                                "rule": "uri_format",
                                "count": len(url_failures)
                            })
                    
                    # IP地址格式
                    if "format" in field_schema and field_schema["format"] == "ipv4":
                        def is_valid_ipv4(ip_str):
                            try:
                                ipaddress.IPv4Address(ip_str)
                                return True
                            except ValueError:
                                return False
                        
                        ip_failures = [i for i, v in enumerate(string_values) if not is_valid_ipv4(v)]
                        if ip_failures:
                            invalid_rows.extend([df.index[i] for i in ip_failures])
                            validation_failures.setdefault(field, []).append({
                                "rule": "ipv4_format",
                                "count": len(ip_failures)
                            })
                    
                    # 非字符串值计入无效
                    if non_string_count > 0:
                        validation_failures.setdefault(field, []).append({
                            "rule": "type",
                            "count": non_string_count
                        })
                
                elif field_type in ["integer", "number"]:
                    # 数值类型验证
                    numeric_values = pd.to_numeric(non_null_values, errors='coerce')
                    null_mask = numeric_values.isna()
                    non_numeric_count = null_mask.sum()
                    numeric_values = numeric_values[~null_mask]
                    
                    # 最小/最大值
                    if "minimum" in field_schema:
                        min_value = field_schema["minimum"]
                        min_failures = (numeric_values < min_value).sum()
                        if min_failures > 0:
                            validation_failures.setdefault(field, []).append({
                                "rule": "minimum",
                                "count": min_failures
                            })
                    
                    if "maximum" in field_schema:
                        max_value = field_schema["maximum"]
                        max_failures = (numeric_values > max_value).sum()
                        if max_failures > 0:
                            validation_failures.setdefault(field, []).append({
                                "rule": "maximum",
                                "count": max_failures
                            })
                    
                    # 整数验证
                    if field_type == "integer":
                        if not numeric_values.empty:
                            non_integer_count = (~numeric_values.apply(lambda x: x.is_integer() if hasattr(x, 'is_integer') else int(x) == x)).sum()
                            if non_integer_count > 0:
                                validation_failures.setdefault(field, []).append({
                                    "rule": "integer",
                                    "count": non_integer_count
                                })
                    
                    # 非数值计入无效
                    if non_numeric_count > 0:
                        validation_failures.setdefault(field, []).append({
                            "rule": "type",
                            "count": non_numeric_count
                        })
                
                elif field_type == "boolean":
                    # 布尔类型验证
                    bool_values = [v for v in non_null_values if isinstance(v, bool)]
                    non_bool_count = len(non_null_values) - len(bool_values)
                    
                    if non_bool_count > 0:
                        validation_failures.setdefault(field, []).append({
                            "rule": "type",
                            "count": non_bool_count
                        })
                
                # 计算无效记录数
                invalid_unique_rows = set(invalid_rows)
                invalid_count = len(invalid_unique_rows)
                invalid_counts[field] = invalid_count
                
                # 计算有效性得分
                valid_count = len(non_null_values) - invalid_count
                field_validity[field] = valid_count / len(non_null_values) if len(non_null_values) > 0 else 1.0
    
    # 应用自定义规则
    if custom_rules:
        for field, rules in custom_rules.items():
            if field not in df.columns:
                continue
            
            for rule in rules:
                rule_type = rule.get("type")
                rule_value = rule.get("value")
                
                if rule_type == "range":
                    min_val, max_val = rule_value
                    invalid_mask = ~df[field].between(min_val, max_val)
                    invalid_count = invalid_mask.sum()
                    
                    if invalid_count > 0:
                        validation_failures.setdefault(field, []).append({
                            "rule": "custom_range",
                            "count": invalid_count
                        })
                        
                        # 更新字段有效性
                        non_null_count = df[field].notna().sum()
                        field_validity[field] = max(0, (non_null_count - invalid_count) / non_null_count) if non_null_count > 0 else 1.0
                        invalid_counts[field] = invalid_count
                
                elif rule_type == "regex":
                    pattern = rule_value
                    # 只对字符串值应用正则表达式
                    str_values = df[field].apply(lambda x: isinstance(x, str))
                    if str_values.any():
                        str_df = df[str_values]
                        invalid_mask = ~str_df[field].str.match(pattern, na=False)
                        invalid_count = invalid_mask.sum()
                        
                        if invalid_count > 0:
                            validation_failures.setdefault(field, []).append({
                                "rule": "custom_regex",
                                "count": invalid_count
                            })
                            
                            # 更新字段有效性
                            non_null_count = df[field].notna().sum()
                            current_validity = field_validity.get(field, 1.0)
                            field_validity[field] = min(current_validity, max(0, (non_null_count - invalid_count) / non_null_count) if non_null_count > 0 else 1.0)
                            invalid_counts[field] = invalid_counts.get(field, 0) + invalid_count
                
                elif rule_type == "function":
                    # 自定义验证函数
                    func_name = rule_value
                    if func_name == "is_valid_json":
                        def is_valid_json(value):
                            if not isinstance(value, str):
                                return False
                            try:
                                json.loads(value)
                                return True
                            except Exception:
                                return False
                        
                        invalid_count = df[field].apply(lambda x: not is_valid_json(x) if pd.notna(x) else False).sum()
                    
                    elif func_name == "is_valid_phone":
                        def is_valid_phone(value):
                            if not isinstance(value, str):
                                return False
                            # 简单的电话号码模式匹配
                            phone_patterns = [
                                r'^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$',
                                r'^\d{3}-\d{3}-\d{4}$',
                                r'^\(\d{3}\)\s*\d{3}-\d{4}$',
                                r'^\d{10}$'
                            ]
                            return any(re.match(pattern, value) for pattern in phone_patterns)
                        
                        invalid_count = df[field].apply(lambda x: not is_valid_phone(x) if pd.notna(x) else False).sum()
                    
                    elif func_name == "is_valid_date":
                        def is_valid_date(value):
                            if not isinstance(value, str):
                                return False
                            # 尝试多种日期格式
                            date_formats = [
                                "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y",
                                "%Y/%m/%d", "%d-%b-%Y", "%Y.%m.%d"
                            ]
                            for fmt in date_formats:
                                try:
                                    datetime.strptime(value, fmt)
                                    return True
                                except ValueError:
                                    continue
                            return False
                        
                        invalid_count = df[field].apply(lambda x: not is_valid_date(x) if pd.notna(x) else False).sum()
                    
                    elif func_name == "is_valid_email":
                        def is_valid_email(value):
                            if not isinstance(value, str):
                                return False
                            # 简单的邮箱验证
                            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                            return bool(re.match(email_pattern, value))
                        
                        invalid_count = df[field].apply(lambda x: not is_valid_email(x) if pd.notna(x) else False).sum()
                    
                    elif func_name == "is_valid_url":
                        def is_valid_url(value):
                            if not isinstance(value, str):
                                return False
                            # URL验证
                            try:
                                result = urlparse(value)
                                return all([result.scheme, result.netloc])
                            except:
                                return False
                        
                        invalid_count = df[field].apply(lambda x: not is_valid_url(x) if pd.notna(x) else False).sum()
                    
                    else:
                        # 未知验证函数，跳过
                        continue
                    
                    if invalid_count > 0:
                        validation_failures.setdefault(field, []).append({
                            "rule": f"custom_function_{func_name}",
                            "count": invalid_count
                        })
                        
                        # 更新字段有效性
                        non_null_count = df[field].notna().sum()
                        current_validity = field_validity.get(field, 1.0)
                        field_validity[field] = min(current_validity, max(0, (non_null_count - invalid_count) / non_null_count) if non_null_count > 0 else 1.0)
                        invalid_counts[field] = invalid_counts.get(field, 0) + invalid_count
    
    # 从验证失败计算总体有效性得分
    if not field_validity:
        # 如果未进行任何验证，返回默认满分
        overall_score = 1.0
    else:
        # 计算所有字段的平均有效性得分
        overall_score = sum(field_validity.values()) / len(field_validity)
    
    # 构建问题列表
    issues = []
    for field, failures in validation_failures.items():
        total_failures = sum(failure["count"] for failure in failures)
        severity = "high" if total_failures > len(data) * 0.2 else "medium" if total_failures > len(data) * 0.05 else "low"
        
        issues.append({
            "field": field,
            "issue_type": "invalid_values",
            "invalid_count": total_failures,
            "severity": severity,
            "failures": failures,
            "description": f"字段 '{field}' 存在 {total_failures} 个无效值，违反了 {len(failures)} 条验证规则"
        })
    
    # 根据详细程度返回不同级别的信息
    if detail_level == "low":
        return {
            "score": overall_score,
            "issues": issues
        }
    
    details = {
        "field_scores": field_validity,
        "invalid_counts": invalid_counts,
        "validation_failures": validation_failures,
        "total_records": len(df)
    }
    
    if detail_level == "high":
        # 为每个字段添加无效值样例
        invalid_examples = {}
        for field, failures in validation_failures.items():
            field_examples = {}
            for failure in failures:
                rule = failure["rule"]
                
                # 对于不同的规则，提取示例的方式不同
                if rule == "type":
                    # 类型不匹配的样例
                    expected_type = None
                    if schema and "properties" in schema and field in schema["properties"]:
                        expected_type = schema["properties"][field].get("type")
                    
                    examples = []
                    for i, item in enumerate(data):
                        if field in item and item[field] is not None:
                            actual_type = type(item[field]).__name__
                            if expected_type == "string" and not isinstance(item[field], str):
                                examples.append({"index": i, "value": item[field], "actual_type": actual_type})
                            elif expected_type == "number" and not isinstance(item[field], (int, float)):
                                examples.append({"index": i, "value": item[field], "actual_type": actual_type})
                            elif expected_type == "integer" and not isinstance(item[field], int):
                                examples.append({"index": i, "value": item[field], "actual_type": actual_type})
                            elif expected_type == "boolean" and not isinstance(item[field], bool):
                                examples.append({"index": i, "value": item[field], "actual_type": actual_type})
                            
                            if len(examples) >= 3:
                                break
                    
                    field_examples[rule] = examples
                
                elif rule.startswith("custom_"):
                    # 自定义规则失败的样例
                    examples = []
                    if rule == "custom_range":
                        min_val, max_val = None, None
                        for rule_info in custom_rules.get(field, []):
                            if rule_info.get("type") == "range":
                                min_val, max_val = rule_info.get("value", [None, None])
                                break
                        
                        if min_val is not None and max_val is not None:
                            invalid_mask = ~df[field].between(min_val, max_val)
                            invalid_indices = df[invalid_mask].index.tolist()[:3]
                            for idx in invalid_indices:
                                value = df.loc[idx, field]
                                examples.append({"index": int(idx), "value": value, "range": [min_val, max_val]})
                    
                    elif rule == "custom_regex":
                        pattern = None
                        for rule_info in custom_rules.get(field, []):
                            if rule_info.get("type") == "regex":
                                pattern = rule_info.get("value")
                                break
                        
                        if pattern:
                            invalid_mask = ~df[field].astype(str).str.match(pattern, na=False)
                            invalid_indices = df[invalid_mask].index.tolist()[:3]
                            for idx in invalid_indices:
                                value = df.loc[idx, field]
                                examples.append({"index": int(idx), "value": value, "pattern": pattern})
                    
                    elif rule.startswith("custom_function_"):
                        func_name = rule.replace("custom_function_", "")
                        invalid_mask = None
                        
                        if func_name == "is_valid_json":
                            invalid_mask = df[field].apply(lambda x: not is_valid_json(x) if pd.notna(x) else False)
                        elif func_name == "is_valid_phone":
                            invalid_mask = df[field].apply(lambda x: not is_valid_phone(x) if pd.notna(x) else False)
                        elif func_name == "is_valid_date":
                            invalid_mask = df[field].apply(lambda x: not is_valid_date(x) if pd.notna(x) else False)
                        elif func_name == "is_valid_email":
                            invalid_mask = df[field].apply(lambda x: not is_valid_email(x) if pd.notna(x) else False)
                        elif func_name == "is_valid_url":
                            invalid_mask = df[field].apply(lambda x: not is_valid_url(x) if pd.notna(x) else False)
                        
                        if invalid_mask is not None:
                            invalid_indices = df[invalid_mask].index.tolist()[:3]
                            for idx in invalid_indices:
                                value = df.loc[idx, field]
                                examples.append({"index": int(idx), "value": value, "function": func_name})
                    
                    field_examples[rule] = examples
                
                elif rule in ["minLength", "maxLength", "minimum", "maximum", "pattern", "enum"]:
                    # 模式验证失败的样例
                    examples = []
                    if schema and "properties" in schema and field in schema["properties"]:
                        field_schema = schema["properties"][field]
                        
                        if rule == "minLength" and "minLength" in field_schema:
                            min_length = field_schema["minLength"]
                            invalid_mask = df[field].astype(str).str.len() < min_length
                            invalid_indices = df[invalid_mask].index.tolist()[:3]
                            for idx in invalid_indices:
                                value = df.loc[idx, field]
                                examples.append({"index": int(idx), "value": value, "min_length": min_length})
                        
                        elif rule == "maxLength" and "maxLength" in field_schema:
                            max_length = field_schema["maxLength"]
                            invalid_mask = df[field].astype(str).str.len() > max_length
                            invalid_indices = df[invalid_mask].index.tolist()[:3]
                            for idx in invalid_indices:
                                value = df.loc[idx, field]
                                examples.append({"index": int(idx), "value": value, "max_length": max_length})
                        
                        elif rule == "minimum" and "minimum" in field_schema:
                            min_value = field_schema["minimum"]
                            invalid_mask = df[field] < min_value
                            invalid_indices = df[invalid_mask].index.tolist()[:3]
                            for idx in invalid_indices:
                                value = df.loc[idx, field]
                                examples.append({"index": int(idx), "value": value, "minimum": min_value})
                        
                        elif rule == "maximum" and "maximum" in field_schema:
                            max_value = field_schema["maximum"]
                            invalid_mask = df[field] > max_value
                            invalid_indices = df[invalid_mask].index.tolist()[:3]
                            for idx in invalid_indices:
                                value = df.loc[idx, field]
                                examples.append({"index": int(idx), "value": value, "maximum": max_value})
                        
                        elif rule == "pattern" and "pattern" in field_schema:
                            pattern = field_schema["pattern"]
                            invalid_mask = ~df[field].astype(str).str.match(pattern, na=False)
                            invalid_indices = df[invalid_mask].index.tolist()[:3]
                            for idx in invalid_indices:
                                value = df.loc[idx, field]
                                examples.append({"index": int(idx), "value": value, "pattern": pattern})
                        
                        elif rule == "enum" and "enum" in field_schema:
                            allowed_values = field_schema["enum"]
                            invalid_mask = ~df[field].isin(allowed_values)
                            invalid_indices = df[invalid_mask].index.tolist()[:3]
                            for idx in invalid_indices:
                                value = df.loc[idx, field]
                                examples.append({"index": int(idx), "value": value, "allowed_values": allowed_values})
                    
                    field_examples[rule] = examples
            
            if field_examples:
                invalid_examples[field] = field_examples
        
        details["invalid_examples"] = invalid_examples
    
    return {
        "score": overall_score,
        "issues": issues,
        "details": details,
        "field_scores": field_validity
    }
