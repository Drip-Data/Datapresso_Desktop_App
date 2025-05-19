from typing import List, Dict, Any, Optional, Union
import logging
import asyncio
import uuid
import time
import random
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import schemas
from schemas import GenerationMethod, FieldConstraint, DataGenerationRequest
from core.data_generators.generator_engine import GeneratorEngine # Corrected DataGenerator to GeneratorEngine
from db import operations as crud

logger = logging.getLogger(__name__)

class DataGenerationService:
    """数据生成服务"""
    
    async def generate_data(
        self,
        seed_data: Optional[List[Dict[str, Any]]] = None,
        template: Optional[Dict[str, Any]] = None,
        generation_method: GenerationMethod = GenerationMethod.VARIATION,
        count: int = 10,
        field_constraints: Optional[List[FieldConstraint]] = None,
        variation_factor: Optional[float] = None,
        preserve_relationships: Optional[bool] = True,
        random_seed: Optional[int] = None,
        llm_prompt: Optional[str] = None,
        llm_model: Optional[str] = None,
        llm_params: Optional[Dict[str, Any]] = None # Added to accept other LLM parameters
    ) -> Dict[str, Any]:
        """
        生成数据
        
        Args:
            seed_data: 种子数据
            template: 数据模板
            generation_method: 生成方法
            count: 生成数量
            field_constraints: 字段约束
            variation_factor: 变异因子
            preserve_relationships: 保持字段间关系
            random_seed: 随机种子
            llm_prompt: LLM生成提示(LLM_BASED方法使用)
            llm_model: LLM模型名称(LLM_BASED方法使用)
            llm_params: 传递给LLM的其他参数 (e.g., temperature, top_p)
            
        Returns:
            包含生成结果和统计信息的字典
        """
        logger.debug(f"Generating {count} items using {generation_method} method")
        
        warnings = []
        
        # 参数验证和准备
        if generation_method == GenerationMethod.VARIATION and not seed_data:
            raise ValueError("Variation method requires seed_data")
        
        if generation_method == GenerationMethod.TEMPLATE and not template:
            raise ValueError("Template method requires template")
        
        if generation_method == GenerationMethod.LLM_BASED and not llm_prompt:
            raise ValueError("LLM-based method requires llm_prompt")
        
        # 创建生成器实例
        generator = GeneratorEngine()
        
        # 根据生成方法执行生成操作
        if generation_method == GenerationMethod.LLM_BASED:
            # 使用LLM生成数据
            try:
                from services.llm_api_service import LlmApiService
                llm_service = LlmApiService()
                
                effective_llm_params = llm_params or {}
                
                # 如果没有提供模型名称，使用默认值
                current_llm_model = llm_model or "gpt-3.5-turbo"
                if not llm_model:
                    warnings.append(f"No LLM model specified, using default: {current_llm_model}")
                
                # 构建系统提示词
                system_prompt_content = f"""
                你是一个数据生成助手。请生成{count}条符合以下要求的数据：
                - 每条数据必须是有效的JSON对象
                - 数据应该多样化且合理
                """
                
                if field_constraints:
                    system_prompt_content += "\n- 数据必须符合以下字段约束:\n"
                    for constraint in field_constraints:
                        system_prompt_content += f"  - {constraint.field}: 类型={constraint.type}"
                        if constraint.min_value is not None:
                            system_prompt_content += f", 最小值={constraint.min_value}"
                        if constraint.max_value is not None:
                            system_prompt_content += f", 最大值={constraint.max_value}"
                        if constraint.allowed_values:
                            system_prompt_content += f", 允许的值={constraint.allowed_values}"
                        system_prompt_content += "\n"
                
                # 如果有种子数据，添加到提示中作为参考
                if seed_data and len(seed_data) > 0:
                    import json
                    sample_count = min(3, len(seed_data))
                    sample_data = seed_data[:sample_count]
                    system_prompt_content += "\n参考数据示例:\n"
                    system_prompt_content += json.dumps(sample_data, ensure_ascii=False, indent=2)
                
                # 调用LLM服务生成数据
                response = await llm_service.invoke_llm(
                    prompt=llm_prompt,
                    system_message=system_prompt_content,
                    model=current_llm_model,
                    temperature=effective_llm_params.get("temperature", 0.7),
                    max_tokens=effective_llm_params.get("max_tokens", 4000),
                    top_p=effective_llm_params.get("top_p"),
                    frequency_penalty=effective_llm_params.get("frequency_penalty"),
                    presence_penalty=effective_llm_params.get("presence_penalty"),
                    stop_sequences=effective_llm_params.get("stop_sequences")
                )
                
                # 解析生成的数据
                import json
                import re
                
                # 尝试从LLM响应中提取JSON数组
                result_text = response["result"]
                json_matches = re.findall(r'\[[\s\S]*\]', result_text)
                
                if json_matches:
                    try:
                        generated_data = json.loads(json_matches[0])
                        
                        # 验证生成的数据是否为列表且包含足够数量的项
                        if not isinstance(generated_data, list):
                            generated_data = [generated_data]
                            warnings.append("LLM did not generate a list, converted single item to list")
                        
                        # 如果生成的数据不够，使用变异方法补齐
                        if len(generated_data) < count:
                            warnings.append(f"LLM generated only {len(generated_data)} items, using variation to reach {count}")
                            
                            # 如果至少生成了一项，使用它作为种子数据
                            if len(generated_data) > 0:
                                additional_items = await self._generate_variations(
                                    generator, 
                                    generated_data, 
                                    count - len(generated_data),
                                    variation_factor or 0.3
                                )
                                generated_data.extend(additional_items)
                            else:
                                # 如果没有生成任何项，回退到模板或变异方法
                                if template:
                                    generated_data = await self._generate_from_template(generator, template, count, field_constraints)
                                elif seed_data:
                                    generated_data = await self._generate_variations(generator, seed_data, count, variation_factor or 0.2)
                        
                        # 如果生成的数据过多，截断到请求的数量
                        if len(generated_data) > count:
                            generated_data = generated_data[:count]
                            warnings.append(f"LLM generated more than {count} items, truncated to {count}")
                    
                    except json.JSONDecodeError:
                        warnings.append("Failed to parse JSON from LLM response, falling back to alternative method")
                        # 回退到其他生成方法
                        if template:
                            generated_data = await self._generate_from_template(generator, template, count, field_constraints)
                        elif seed_data:
                            generated_data = await self._generate_variations(generator, seed_data, count, variation_factor or 0.2)
                        else:
                            raise ValueError("Cannot generate data: failed to parse LLM response and no fallback provided")
                else:
                    warnings.append("No JSON array found in LLM response, falling back to alternative method")
                    # 回退到其他生成方法
                    if template:
                        generated_data = await self._generate_from_template(generator, template, count, field_constraints)
                    elif seed_data:
                        generated_data = await self._generate_variations(generator, seed_data, count, variation_factor or 0.2)
                    else:
                        raise ValueError("Cannot generate data: no JSON array in LLM response and no fallback provided")
                
            except Exception as e:
                logger.error(f"Error in LLM-based generation: {str(e)}", exc_info=True)
                warnings.append(f"LLM generation failed: {str(e)}, falling back to alternative method")
                
                # 回退到其他生成方法
                if template:
                    generated_data = await self._generate_from_template(generator, template, count, field_constraints)
                elif seed_data:
                    generated_data = await self._generate_variations(generator, seed_data, count, variation_factor or 0.2)
                else:
                    raise ValueError(f"Cannot generate data: LLM generation failed with error: {str(e)}")
        else:
            # 使用传统方法生成数据
            engine_kwargs = {
                "seed_data": seed_data,
                "template": template,
                "field_constraints": field_constraints,
                "variation_factor": variation_factor or 0.2,
                "preserve_relationships": preserve_relationships,
                "random_seed": random_seed # Pass random_seed to kwargs for GeneratorEngine
            }
            generated_data, stats = await asyncio.to_thread(
                generator.generate_data,
                generation_method.value, # Pass enum's value (string)
                count,
                **engine_kwargs
            )
            
            logger.debug(f"Generated {len(generated_data)} items")
        
        # 计算统计信息
        if generation_method != GenerationMethod.LLM_BASED or 'stats' not in locals():
            stats = await asyncio.to_thread(generator._calculate_stats, generated_data)
        
        # 返回结果
        return {
            "generated_data": generated_data,
            "stats": stats,
            "warnings": warnings if warnings else None,
            "seed_used": random_seed,
            "processing_info": {
                "generation_method": generation_method.value,
                "count_requested": count,
                "count_generated": len(generated_data)
            }
        }
    
    async def _generate_variations(self, generator: GeneratorEngine, seed_data, count, variation_factor, random_seed_param: Optional[int] = None):
        """使用变异方法生成数据"""
        engine_kwargs = {
            "seed_data": seed_data,
            "variation_factor": variation_factor,
            "random_seed": random_seed_param
        }
        generated_data, _ = await asyncio.to_thread(
            generator.generate_data,
            GenerationMethod.VARIATION.value,
            count,
            **engine_kwargs
        )
        return generated_data
    
    async def _generate_from_template(self, generator: GeneratorEngine, template, count, field_constraints, random_seed_param: Optional[int] = None):
        """使用模板方法生成数据"""
        engine_kwargs = {
            "template": template,
            "field_constraints": field_constraints,
            "random_seed": random_seed_param
        }
        generated_data, _ = await asyncio.to_thread(
            generator.generate_data,
            GenerationMethod.TEMPLATE.value,
            count,
            **engine_kwargs
        )
        return generated_data
    
    async def start_async_generation_task(self, request_in: schemas.DataGenerationRequest, db: AsyncSession) -> str: # Renamed request to request_in
        """启动异步生成任务，返回任务ID"""
        task_id = str(uuid.uuid4())
        
        task_payload_for_db = schemas.TaskCreate(
            id=task_id,
            name=f"DataGenerationTask-{request_in.request_id or task_id}", # Use request_in
            task_type="data_generation",
            status="queued",
            parameters=request_in.dict(exclude_none=True) # Use request_in
        )
        # Assuming crud.create_task now correctly handles the id from task_payload_for_db
        # or that Task ORM model's id has default_factory and task_payload_for_db.id is used if provided.
        # The TaskCreate schema has id: Optional[str] = Field(default_factory=generate_uuid_str)
        # The Task ORM model has id = Column(String, primary_key=True, default=generate_uuid_str)
        # So, if task_payload_for_db.id is set, it should be used.
        await crud.create_task(db=db, task_in=task_payload_for_db)
        
        return task_id
    
    async def execute_async_generation_task(self, task_id: str, db: AsyncSession): # Added db
        """执行异步生成任务"""
        try:
            # 更新任务状态为运行中
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(status="running", started_at=datetime.now()))
            
            # 获取任务请求
            task_orm = await crud.get_task(db=db, task_id=task_id)
            if not task_orm or not task_orm.parameters:
                logger.error(f"Task {task_id} not found or has no parameters for generation.")
                await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(status="failed", error="Task data or parameters not found", completed_at=datetime.now()))
                return

            request_params = task_orm.parameters # This is a dict
            
            # Convert FieldConstraint dicts back to FieldConstraint objects if necessary
            field_constraints_dicts = request_params.get("field_constraints")
            field_constraints_obj_list = None
            if field_constraints_dicts:
                field_constraints_obj_list = [FieldConstraint(**fc) for fc in field_constraints_dicts]

            # 执行生成 (self.generate_data is the main method of this service, not the engine's)
            # The main self.generate_data method already handles random_seed correctly.
            # The parameters for self.generate_data are extracted from request_params.
            result = await self.generate_data(
                seed_data=request_params.get("seed_data"),
                template=request_params.get("template"),
                generation_method=GenerationMethod(request_params.get("generation_method", "variation")), # Provide default if missing
                count=request_params.get("count", 10),
                field_constraints=field_constraints_obj_list,
                variation_factor=request_params.get("variation_factor"),
                preserve_relationships=request_params.get("preserve_relationships", True),
                random_seed=request_params.get("random_seed"),
                llm_prompt=request_params.get("llm_prompt"),
                llm_model=request_params.get("llm_model")
            )
            
            # 构建任务结果的 payload
            task_result_payload = {
                "generated_data_preview": result["generated_data"][:min(5, len(result["generated_data"]))], # Store a preview
                "count_generated": len(result["generated_data"]),
                "stats": result.get("stats"),
                "warnings": result.get("warnings"),
                "seed_used": result.get("seed_used"),
                "processing_info": result.get("processing_info"),
                "status_message": "Data generated successfully in async task",
                "execution_time_ms": (datetime.now() - task_orm.started_at).total_seconds() * 1000 if task_orm.started_at else None,
                "original_request_id": request_params.get("request_id")
                # Note: Storing full generated_data in DB task result might be large.
                # Consider storing it to a file and putting path in result, or only a summary/preview.
                # For now, storing a preview.
            }
            
            # 更新任务状态为完成
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(
                status="completed",
                result=task_result_payload,
                completed_at=datetime.now(),
                progress=1.0
            ))
            
        except Exception as e:
            logger.error(f"Error in async generation task {task_id}: {str(e)}", exc_info=True)
            # 更新任务状态为失败
            await crud.update_task(db=db, task_id=task_id, task_in=schemas.TaskUpdate(
                status="failed",
                error=str(e),
                completed_at=datetime.now()
            ))
    
    async def get_task_status(self, task_id: str, db: AsyncSession) -> Optional[schemas.Task]: # Added db, changed return type
        """获取任务状态和结果"""
        task_orm = await crud.get_task(db=db, task_id=task_id)
        if not task_orm:
            return None
        
        return schemas.Task.from_orm(task_orm)
