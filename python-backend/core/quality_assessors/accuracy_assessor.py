from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error

async def assess_accuracy(
    data: List[Dict[str, Any]],
    reference_data: Optional[List[Dict[str, Any]]] = None,
    schema: Optional[Dict[str, Any]] = None,
    detail_level: str = "medium"
) -> Dict[str, Any]:
    """
    评估数据准确性
    
    Args:
        data: 要评估的数据
        reference_data: 参考数据(可选)
        schema: 数据结构定义(可选)
        detail_level: 详细程度
        
    Returns:
        包含准确性评估结果的字典
    """
    if not data:
        return {
            "score": 0,
            "details": {"error": "空数据集"}
        }
    
    # 转换为DataFrame便于分析
    df = pd.DataFrame(data)
    
    # 如果没有参考数据，只能进行异常值检测和基于规则的验证
    if reference_data is None:
        return await _assess_accuracy_without_reference(data, schema, detail_level)
    
    # 转换参考数据
    ref_df = pd.DataFrame(reference_data)
    
    # 检查共同字段
    common_fields = list(set(df.columns) & set(ref_df.columns))
    
    if not common_fields:
        return {
            "score": 0,
            "details": {"error": "数据和参考数据没有共同字段"}
        }
    
    # 计算每个共同字段的准确性
    field_accuracy = {}
    field_error_metrics = {}
    issues = []
    
    key_field_from_schema = None
    if schema and "primary_key" in schema:
        key_field_from_schema = schema["primary_key"]
    elif schema and "required" in schema:
        required_fields_list = schema["required"]
        if required_fields_list and required_fields_list[0] in common_fields:
            key_field_from_schema = required_fields_list[0]

    # Align dataframes using the key_field if lengths or indices differ
    # If key_field is not found or not applicable, direct comparison will be attempted if lengths match
    aligned_df = df.copy()
    aligned_ref_df = ref_df.copy()

    if key_field_from_schema and key_field_from_schema in common_fields and (len(df) != len(ref_df) or not df.index.equals(ref_df.index)):
        try:
            # Ensure key_field is suitable for merge (e.g., unique in both or handle duplicates)
            # For simplicity, assuming key_field is good for merging.
            # We merge all common_fields at once based on the key_field.
            merged_all = pd.merge(
                df[common_fields],
                ref_df[common_fields],
                on=key_field_from_schema,
                suffixes=('_data', '_ref'),
                how='inner' # Only compare rows that exist in both based on key
            )
            if merged_all.empty:
                logger.warning(f"No common records found using key_field '{key_field_from_schema}' for merging.")
                # Set all field accuracies to 0 if no common records
                for fld in common_fields:
                    if fld != key_field_from_schema : # Don't score the key field itself for accuracy typically
                         field_accuracy[fld] = 0.0
                overall_score = 0.0
                # Return early or handle as appropriate
                return {
                    "score": overall_score, "issues": issues,
                    "details": {"field_accuracy": field_accuracy, "error_metrics": field_error_metrics, "compared_fields": common_fields, "total_records": len(df), "merge_info": "No common records on key"}
                }
        except Exception as merge_err:
            logger.error(f"Error during merge on key_field '{key_field_from_schema}': {merge_err}")
            # Fallback to direct comparison if merge fails, but only if lengths match
            if len(df) != len(ref_df):
                 for fld in common_fields:
                    if fld != key_field_from_schema: field_accuracy[fld] = 0.0 # Cannot compare
                 return {"score": 0.0, "issues": issues, "details": {"error": "Merge failed and lengths differ."}}
            # If lengths match, proceed with direct comparison (aligned_df, aligned_ref_df are original df, ref_df)

    for field in common_fields:
        if key_field_from_schema and field == key_field_from_schema:
            # Typically, we don't assess accuracy of the key itself, but ensure it's present.
            # For simplicity, we can assign perfect accuracy or skip.
            field_accuracy[field] = 1.0
            continue

        if key_field_from_schema and 'merged_all' in locals() and not merged_all.empty:
            # Use data from the merged dataframe
            data_col_name = f"{field}_data"
            ref_col_name = f"{field}_ref"
            if data_col_name not in merged_all.columns or ref_col_name not in merged_all.columns:
                logger.warning(f"Field '{field}' not found in merged data after suffixing. Skipping.")
                field_accuracy[field] = 0.0 # Or some other indicator of non-comparability
                continue
            data_values = merged_all[data_col_name]
            ref_values = merged_all[ref_col_name]
        elif len(aligned_df) == len(aligned_ref_df): # Fallback to direct comparison if same length
            data_values = aligned_df[field]
            ref_values = aligned_ref_df[field]
        else:
            # Cannot compare if lengths differ and no key_field or merge failed
            logger.warning(f"Cannot compare field '{field}' due to differing lengths and no successful merge.")
            field_accuracy[field] = 0.0
            continue
        
        # Ensure data_values and ref_values are not empty before proceeding
        if data_values.empty or ref_values.empty:
            field_accuracy[field] = 0.0 # Or 1.0 if no data to compare means no errors? Depends on definition.
            continue

        #检查字段类型
        if pd.api.types.is_numeric_dtype(data_values) and pd.api.types.is_numeric_dtype(ref_values):
            # 数值类型 - 计算误差指标
            # 移除两个数据集中任一为NaN的行
            valid_mask = ~(data_values.isna() | ref_values.isna())
            data_values = data_values[valid_mask]
            ref_values = ref_values[valid_mask]
            
            if len(data_values) == 0:
                field_accuracy[field] = 0.0
                continue
            
            # 计算均方误差和平均绝对误差
            mse = mean_squared_error(ref_values, data_values)
            mae = mean_absolute_error(ref_values, data_values)
            
            # 计算相对误差
            ref_range = ref_values.max() - ref_values.min() if len(ref_values) > 1 else 1.0
            if ref_range != 0:
                normalized_mae = mae / ref_range
            else:
                # 避免除以零
                normalized_mae = 0.0 if mae == 0 else 1.0
            
            # 计算相关系数
            try:
                correlation = np.corrcoef(ref_values, data_values)[0, 1]
            except Exception:
                correlation = 0.0
            
            # 计算一个综合准确性得分 (0-1范围内，1表示完全准确)
            # 使用公式: exp(-normalized_mae) * correlation
            accuracy_score = np.exp(-normalized_mae) * abs(correlation) if not np.isnan(correlation) else np.exp(-normalized_mae)
            field_accuracy[field] = min(max(accuracy_score, 0.0), 1.0)  # 确保在0-1范围内
            
            # 保存误差指标
            field_error_metrics[field] = {
                "mse": mse,
                "mae": mae,
                "normalized_mae": normalized_mae,
                "correlation": correlation
            }
            
            # 识别数值差异
            # We'll consider any difference (beyond float precision) as an issue for accuracy.
            # A small tolerance for float comparisons
            tolerance = 1e-9
            mismatched_numeric_indices = data_values.index[np.abs(data_values - ref_values) > tolerance]
            mismatch_numeric_count = len(mismatched_numeric_indices)

            if mismatch_numeric_count > 0:
                severity = "high" if mismatch_numeric_count > len(data_values) * 0.1 else \
                           "medium" if mismatch_numeric_count > len(data_values) * 0.01 else "low"
                issues.append({
                    "field": field,
                    "issue_type": "numeric_mismatch", # Changed from significant_errors
                    "mismatch_count": int(mismatch_numeric_count),
                    "severity": severity,
                    "description": f"字段 '{field}' 有 {mismatch_numeric_count} 个数值与参考数据不完全匹配 (精度容忍: {tolerance})"
                })
        
        else:
            # 非数值类型 - 计算精确匹配率
            exact_matches = (data_values == ref_values).sum()
            match_rate = exact_matches / len(data_values) if len(data_values) > 0 else 0.0
            field_accuracy[field] = match_rate
            
            # 保存匹配指标
            field_error_metrics[field] = {
                "exact_match_rate": match_rate,
                "mismatch_count": len(data_values) - exact_matches
            }
            
            # 识别不匹配的记录
            if match_rate < 1.0:
                mismatch_count = len(data_values) - exact_matches
                severity = "high" if match_rate < 0.8 else "medium" if match_rate < 0.95 else "low"
                
                issues.append({
                    "field": field,
                    "issue_type": "mismatches",
                    "mismatch_count": int(mismatch_count),
                    "severity": severity,
                    "description": f"字段 '{field}' 有 {mismatch_count} 个值与参考数据不匹配"
                })
    
    # 计算整体准确性得分
    if field_accuracy:
        overall_score = sum(field_accuracy.values()) / len(field_accuracy)
    else:
        overall_score = 0.0
    
    # 根据详细程度返回不同级别的信息
    if detail_level == "low":
        return {
            "score": overall_score,
            "issues": issues
        }
    
    details = {
        "field_accuracy": field_accuracy,
        "error_metrics": field_error_metrics,
        "compared_fields": common_fields,
        "total_records": len(df)
    }
    
    if detail_level == "high":
        # 添加不匹配记录的样例
        mismatch_examples = {}
        
        for field in common_fields:
            if field in field_accuracy and field_accuracy[field] < 1.0:
                # 如果有主键，使用它来找出不匹配的记录
                key_field = None
                if schema and "primary_key" in schema:
                    key_field = schema["primary_key"]
                
                if key_field_from_schema and key_field_from_schema in common_fields and 'merged_all' in locals() and not merged_all.empty:
                    # Use the already merged dataframe 'merged_all'
                    data_col_name = f"{field}_data"
                    ref_col_name = f"{field}_ref"
                    
                    if data_col_name not in merged_all.columns or ref_col_name not in merged_all.columns:
                        continue # Should not happen if field is in common_fields and not key_field

                    # Find mismatches in the merged data
                    # Need to handle NaNs correctly in comparison, pandas `!=` treats NaN != NaN as True
                    mismatches_df = merged_all[
                        (merged_all[data_col_name] != merged_all[ref_col_name]) & \
                        ~(merged_all[data_col_name].isna() & merged_all[ref_col_name].isna()) # Exclude NaN == NaN
                    ]
                    
                    if not mismatches_df.empty:
                        examples = []
                        for _, row in mismatches_df.head(5).iterrows():
                            examples.append({
                                "key": row[key_field_from_schema], # The original key field value
                                "data_value": row[data_col_name],
                                "reference_value": row[ref_col_name]
                            })
                        mismatch_examples[field] = examples
                
                # If no key_field or merge wasn't successful but lengths match (fallback case)
                elif len(aligned_df) == len(aligned_ref_df):
                    # Fallback to index-based mismatch examples if lengths match
                    # This part is similar to the original else block
                    # Ensure data_values and ref_values are from aligned_df and aligned_ref_df for this path
                    current_data_values = aligned_df[field]
                    current_ref_values = aligned_ref_df[field]
                    
                    # Find mismatches using direct comparison (handle NaNs)
                    mismatch_mask = (current_data_values != current_ref_values) & \
                                    ~(current_data_values.isna() & current_ref_values.isna())
                    mismatch_indices = aligned_df.index[mismatch_mask].tolist()

                    if len(mismatch_indices) > 0:
                        examples = []
                        # Get the actual mismatched rows from aligned_df
                        mismatched_rows_df = aligned_df.iloc[mismatch_indices]
                        for idx, row_data in mismatched_rows_df.head(5).iterrows(): # Iterate over the mismatched rows
                            examples.append({
                                "index": int(idx),
                                "data_value": row_data[field], # Get value from the row
                                "reference_value": aligned_ref_df.loc[idx, field] # Get corresponding ref value
                            })
                        mismatch_examples[field] = examples
                
                # This 'else' corresponds to the 'if key_field_from_schema and ... and not merged_all.empty:'
                # It means either no key_field, or merge failed, or merged_all was empty.
                # The 'elif len(aligned_df) == len(aligned_ref_df):' above handles the case where lengths match.
                # This 'else' block might be for when lengths also differ and no key was used for merging.
                # However, the original logic for this 'else' (lines 298-312) seems to assume len(df) == len(ref_df)
                # which is already covered by the elif.
                # If lengths differ and no key-based merge happened, comparison for examples is tricky.
                # For now, let's assume the elif len(aligned_df) == len(aligned_ref_df) is the main fallback for examples.
                # The original code had a nested structure here that might have been slightly off.
                # The primary paths are: 1. Successful merge via key. 2. No key or failed merge, but lengths match for direct compare.
                # If neither, examples for mismatches are hard to generate reliably without alignment.
        
        details["mismatch_examples"] = mismatch_examples
    
    return {
        "score": overall_score,
        "issues": issues,
        "details": details,
        "field_scores": field_accuracy
    }

async def _assess_accuracy_without_reference(
    data: List[Dict[str, Any]],
    schema: Optional[Dict[str, Any]] = None,
    detail_level: str = "medium"
) -> Dict[str, Any]:
    """
    在没有参考数据的情况下评估数据准确性（主要基于异常检测）
    
    Args:
        data: 要评估的数据
        schema: 数据结构定义(可选)
        detail_level: 详细程度
    
    Returns:
        包含准确性评估结果的字典
    """
    df = pd.DataFrame(data)
    
    # 主要基于异常值检测
    field_accuracy = {}
    outlier_counts = {}
    issues = []
    
    for field in df.columns:
        # 仅处理数值类型字段
        if pd.api.types.is_numeric_dtype(df[field]):
            # 获取非空值
            non_null_values = df[field].dropna()
            
            if len(non_null_values) < 5:  # 需要足够的数据点
                field_accuracy[field] = 1.0  # 默认为完全准确
                outlier_counts[field] = 0
                continue
            
            # 计算Z分数或使用IQR方法检测异常值
            # 这里使用IQR方法
            q1 = non_null_values.quantile(0.25)
            q3 = non_null_values.quantile(0.75)
            iqr = q3 - q1
            
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            # 检测超出范围的值
            outliers = (non_null_values < lower_bound) | (non_null_values > upper_bound)
            outlier_count = outliers.sum()
            outlier_rate = outlier_count / len(non_null_values) if len(non_null_values) > 0 else 0
            
            # 保存异常值计数
            outlier_counts[field] = outlier_count
            
            # 计算准确性得分 (异常值比例越低，准确性越高)
            field_accuracy[field] = max(0, 1.0 - outlier_rate)
            
            # 如果异常值比例高，添加问题
            if outlier_rate > 0:
                severity = "high" if outlier_rate > 0.1 else "medium" if outlier_rate > 0.05 else "low"
                
                issues.append({
                    "field": field,
                    "issue_type": "outliers",
                    "outlier_count": int(outlier_count),
                    "outlier_rate": float(outlier_rate),
                    "severity": severity,
                    "bounds": [float(lower_bound), float(upper_bound)],
                    "description": f"字段 '{field}' 有 {outlier_count} 个异常值，比例为 {outlier_rate:.1%}"
                })
        
        # 对于非数值类型字段，无法通过统计方法评估准确性
        else:
            # 使用有效性作为准确性的代理指标
            field_validity = 1.0  # 默认假设完全有效
            
            # 如果有模式定义，可以验证
            if schema and "properties" in schema and field in schema["properties"]:
                field_schema = schema["properties"][field]
                
                # 对字符串类型应用模式验证
                if field_schema.get("type") == "string" and "pattern" in field_schema:
                    pattern = field_schema["pattern"]
                    try:
                        # 验证与模式匹配的比例
                        str_values = df[field].dropna().astype(str)
                        matches = str_values.str.match(pattern)
                        match_rate = matches.mean() if len(matches) > 0 else 1.0
                        field_validity = match_rate
                        
                        # 识别不匹配的记录
                        mismatch_count = (~matches).sum()
                        if mismatch_count > 0:
                            severity = "high" if match_rate < 0.8 else "medium" if match_rate < 0.95 else "low"
                            
                            issues.append({
                                "field": field,
                                "issue_type": "pattern_mismatch",
                                "mismatch_count": int(mismatch_count),
                                "severity": severity,
                                "description": f"字段 '{field}' 有 {mismatch_count} 个值不符合定义的模式"
                            })
                    except Exception:
                        field_validity = 1.0  # 验证失败时默认为有效
                
                # 验证枚举值
                elif "enum" in field_schema:
                    allowed_values = field_schema["enum"]
                    non_null_values = df[field].dropna()
                    
                    # 检查符合枚举值的比例
                    valid_mask = non_null_values.isin(allowed_values)
                    valid_rate = valid_mask.mean() if len(valid_mask) > 0 else 1.0
                    field_validity = valid_rate
                    
                    # 识别无效值
                    invalid_count = (~valid_mask).sum()
                    if invalid_count > 0:
                        severity = "high" if valid_rate < 0.8 else "medium" if valid_rate < 0.95 else "low"
                        
                        issues.append({
                            "field": field,
                            "issue_type": "invalid_enum_values",
                            "invalid_count": int(invalid_count),
                            "severity": severity,
                            "description": f"字段 '{field}' 有 {invalid_count} 个值不在允许的枚举列表中"
                        })
            
            field_accuracy[field] = field_validity
    
    # 计算整体准确性得分
    if field_accuracy:
        # 应用字段权重
        # 如果有模式定义，可以设定某些字段更重要
        if schema and "required" in schema:
            required_fields = schema["required"]
            weights = {field: 2.0 if field in required_fields else 1.0 for field in field_accuracy}
            total_weight = sum(weights.values())
            overall_score = sum(field_accuracy[field] * weights[field] for field in field_accuracy) / total_weight
        else:
            overall_score = sum(field_accuracy.values()) / len(field_accuracy)
    else:
        overall_score = 0.0
    
    # 根据详细程度返回不同级别的信息
    if detail_level == "low":
        return {
            "score": overall_score,
            "issues": issues
        }
    
    details = {
        "field_accuracy": field_accuracy,
        "outlier_counts": outlier_counts,
        "assessed_method": "anomaly_detection",
        "total_records": len(df)
    }
    
    if detail_level == "high":
        # 添加异常值示例
        outlier_examples = {}
        
        for field in df.columns:
            if pd.api.types.is_numeric_dtype(df[field]) and outlier_counts.get(field, 0) > 0:
                # 计算界限
                non_null_values = df[field].dropna()
                q1 = non_null_values.quantile(0.25)
                q3 = non_null_values.quantile(0.75)
                iqr = q3 - q1
                
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                # 找出异常值
                low_outliers = df[df[field] < lower_bound].index.tolist()[:3]  # 最多3个例子
                high_outliers = df[df[field] > upper_bound].index.tolist()[:3]  # 最多3个例子
                
                examples = {
                    "low_outliers": [{"index": int(i), "value": float(df.loc[i, field])} for i in low_outliers],
                    "high_outliers": [{"index": int(i), "value": float(df.loc[i, field])} for i in high_outliers],
                    "bounds": [float(lower_bound), float(upper_bound)],
                    "q1_q3": [float(q1), float(q3)]
                }
                
                outlier_examples[field] = examples
        
        details["outlier_examples"] = outlier_examples
    
    return {
        "score": overall_score,
        "issues": issues,
        "details": details,
        "field_scores": field_accuracy
    }
