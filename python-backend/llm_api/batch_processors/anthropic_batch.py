# datapresso/llm_api/batch_processors/anthropic_batch.py

import os
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
import aiofiles
import anthropic # Ensure anthropic is installed
import uuid

# Assuming constants.py is in the parent llm_api directory
# Adjust if constants are structured differently or part of a shared package
try:
    from ..constants import ANTHROPIC_PRICING # Relative import for sibling module
except ImportError:
    # Fallback for direct execution or different project structure
    from llm_api.constants import ANTHROPIC_PRICING


class AnthropicBatchProcessor:
    """Anthropic批量API专用处理器"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "claude-3-5-sonnet-20240620", # Updated model name from doc
                output_dir: str = "./batch_results"):
        """
        初始化Anthropic批量处理器
        
        Args:
            api_key: Anthropic API密钥
            model_name: 模型名称
            output_dir: 输出目录
        """
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("未提供Anthropic API密钥")
        
        self.model_name = model_name
        self.output_dir = output_dir
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
        # 初始化Anthropic客户端
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)
        
        # 日志配置
        self.logger = logging.getLogger("AnthropicBatchProcessor")
        
        # 统计信息
        self.stats = {
            "total_requests": 0,
            "completed_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
        }
    
    def calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """计算API调用成本"""
        if self.model_name not in ANTHROPIC_PRICING:
            self.logger.warning(f"Model {self.model_name} not found in ANTHROPIC_PRICING. Cost calculation might be inaccurate.")
            return 0.0
        
        pricing = ANTHROPIC_PRICING[self.model_name]
        input_cost = input_tokens * pricing["prompt"] / 1000000 # Pricing is often per million tokens
        output_cost = output_tokens * pricing["completion"] / 1000000 # Pricing is often per million tokens
        
        # Anthropic批量API提供50%折扣 (As per document, verify this with current Anthropic Batch API docs)
        # The document states "ANTHROPIC_PRICING" is per 1K tokens, so /1000 is correct.
        # The 50% discount for batch API is a specific detail that needs to be confirmed.
        # For now, following the document's structure.
        prompt_cost_1k = input_tokens * pricing["prompt"] / 1000
        completion_cost_1k = output_tokens * pricing["completion"] / 1000
        
        # Assuming the 50% discount applies to the total cost
        return (prompt_cost_1k + completion_cost_1k) * 0.5 # Apply 50% discount
    
    async def process_batch(self, items: List[Dict[str, Any]], 
                          prompt_template: str, 
                          system_prompt: Optional[str] = None,
                          pre_process_fn: Optional[Callable] = None,
                          post_process_fn: Optional[Callable] = None,
                          max_tokens: int = 4096, # Default from Anthropic docs
                          temperature: float = 0.7,
                          **kwargs) -> str:
        """
        使用Anthropic批量API处理请求
        
        Args:
            items: 要处理的数据项列表, each item should be a dict for prompt_template.format(**item)
            prompt_template: 提示词模板，使用{key}表示数据项中的字段
            system_prompt: 系统提示词
            pre_process_fn: 预处理函数，用于在发送到LLM前处理每个提示词
            post_process_fn: 后处理函数，用于处理LLM响应
            max_tokens: 最大生成token数
            temperature: 温度
            
        Returns:
            结果文件路径
        """
        # 重置统计信息
        self.stats = {
            "total_requests": len(items),
            "completed_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
            "start_time": datetime.now().isoformat(),
        }
        
        # 创建结果文件
        batch_file_id = str(uuid.uuid4()) # Unique ID for this batch file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # Input file for Anthropic Batch API
        input_file_name = f"anthropic_batch_input_{timestamp}_{batch_file_id}.jsonl"
        input_file_path = os.path.join(self.output_dir, input_file_name)
        
        # Output file where results will be stored by this processor
        result_file_name = f"anthropic_batch_results_{timestamp}_{batch_file_id}.jsonl"
        result_file_path = os.path.join(self.output_dir, result_file_name)

        # 准备批量请求并写入输入文件
        async with aiofiles.open(input_file_path, mode='w', encoding='utf-8') as f:
            for i, item_data in enumerate(items):
                # 应用提示词模板
                prompt = prompt_template.format(**item_data)
                
                # 应用预处理函数
                if pre_process_fn:
                    prompt = pre_process_fn(prompt, item_data)
                
                # 创建请求体 (Anthropic Batch API format)
                request_body = {
                    "model": self.model_name,
                    "max_tokens": max_tokens,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temperature,
                }
                if system_prompt:
                    request_body["system"] = system_prompt
                
                # Add any other kwargs to the request body if they are valid for Anthropic API
                request_body.update(kwargs)

                anthropic_request = {
                    "custom_id": f"request_{i}", # custom_id for matching later
                    "method": "POST",
                    "url": "/v1/messages", # Endpoint for messages API
                    "body": request_body
                }
                await f.write(json.dumps(anthropic_request, ensure_ascii=False) + '\n')
        
        try:
            # 1. 上传输入文件
            self.logger.info(f"Uploading Anthropic batch input file: {input_file_path}")
            with open(input_file_path, "rb") as f_sync:
                uploaded_file = await self.client.files.create(
                    file=f_sync,
                    purpose="batch"
                )
            self.logger.info(f"Anthropic batch input file uploaded: ID {uploaded_file.id}")

            # 2. 创建批量作业
            self.logger.info(f"Creating Anthropic batch job with input file ID: {uploaded_file.id}")
            batch_job = await self.client.batches.create(
                input_file_id=uploaded_file.id,
                endpoint="/v1/messages", # Must match the URL in the input file
                completion_window="24h" # Example, adjust as needed
            )
            self.logger.info(f"Anthropic batch job created: ID {batch_job.id}, Status: {batch_job.status}")
            
            # 3. 轮询批量作业状态
            while batch_job.status not in ["completed", "failed", "cancelled", "expired"]: # Corrected status checks
                await asyncio.sleep(30) # Anthropic recommends polling every 30-60 seconds
                batch_job = await self.client.batches.retrieve(batch_id=batch_job.id)
                self.logger.info(f"Anthropic batch job {batch_job.id} status: {batch_job.status}, Progress: {batch_job.request_counts.completed}/{batch_job.request_counts.total if batch_job.request_counts else 'N/A'}")

            if batch_job.status != "completed":
                self.logger.error(f"Anthropic batch job {batch_job.id} did not complete successfully. Status: {batch_job.status}")
                self.stats["end_time"] = datetime.now().isoformat()
                self.stats["failed_requests"] = len(items) # Mark all as failed if job failed
                # Write stats and return error or partial results path
                stats_file = os.path.join(self.output_dir, f"anthropic_batch_stats_{timestamp}_{batch_file_id}.json")
                async with aiofiles.open(stats_file, mode='w', encoding='utf-8') as f_stats:
                    await f_stats.write(json.dumps(self.stats, indent=2, ensure_ascii=False))
                raise Exception(f"Anthropic batch job failed with status: {batch_job.status}")

            # 4. 获取批量作业结果 (if output_file_id is present)
            if batch_job.output_file_id:
                self.logger.info(f"Fetching results for Anthropic batch job {batch_job.id} from output file ID: {batch_job.output_file_id}")
                output_content_response = await self.client.files.content(file_id=batch_job.output_file_id)
                
                async with aiofiles.open(result_file_path, mode='w', encoding='utf-8') as f_results:
                    # The content is directly the JSONL string
                    await f_results.write(output_content_response) # output_content_response is already a string

                # Process the downloaded result file
                async with aiofiles.open(result_file_path, mode='r', encoding='utf-8') as f_results_read:
                    for line in f_results_read:
                        try:
                            result_item = json.loads(line)
                            custom_id_str = result_item.get("custom_id")
                            if not custom_id_str or not custom_id_str.startswith("request_"):
                                self.logger.warning(f"Skipping result item with invalid custom_id: {custom_id_str}")
                                continue
                            
                            idx = int(custom_id_str.split("_")[1])
                            original_item_data = items[idx] # Get original item data for context

                            if result_item.get("response") and result_item["response"].get("body"):
                                response_body = result_item["response"]["body"]
                                response_text = response_body.get("content", [{}])[0].get("text", "")
                                usage_data = response_body.get("usage", {})
                                
                                usage = {
                                    "prompt_tokens": usage_data.get("input_tokens", 0),
                                    "completion_tokens": usage_data.get("output_tokens", 0),
                                    "total_tokens": usage_data.get("input_tokens", 0) + usage_data.get("output_tokens", 0),
                                    "cost": self.calculate_cost(usage_data.get("input_tokens", 0), usage_data.get("output_tokens", 0))
                                }
                                
                                processed_result = {
                                    "item": original_item_data,
                                    "response": response_text,
                                    "usage": usage
                                }
                                if post_process_fn:
                                    processed_result = post_process_fn({"text": response_text, "usage": usage}, original_item_data)
                                
                                self.stats["completed_requests"] += 1
                                self.stats["total_tokens"] += usage["total_tokens"]
                                self.stats["total_cost"] += usage["cost"]
                            else: # Error case for this specific item
                                self.stats["failed_requests"] += 1
                                processed_result = {
                                    "item": original_item_data,
                                    "error": result_item.get("error", {"message": "Unknown error in batch item response"})
                                }
                            # The result_file_path already contains these lines, so no need to rewrite them here.
                            # This loop is for calculating stats.
                        except json.JSONDecodeError:
                            self.logger.error(f"Failed to parse JSON line from Anthropic batch result: {line.strip()}")
                            self.stats["failed_requests"] +=1 # Count unparseable lines as failed
                        except Exception as e_item:
                            self.logger.error(f"Error processing item from Anthropic batch result: {e_item}")
                            self.stats["failed_requests"] +=1


            else: # No output file ID, something went wrong
                 self.logger.error(f"Anthropic batch job {batch_job.id} completed but no output file ID was provided.")
                 self.stats["failed_requests"] = len(items) # Mark all as failed

            # 更新统计信息
            self.stats["end_time"] = datetime.now().isoformat()
            
            # 写入统计信息
            stats_file = os.path.join(self.output_dir, f"anthropic_batch_stats_{timestamp}_{batch_file_id}.json")
            async with aiofiles.open(stats_file, mode='w', encoding='utf-8') as f_stats:
                await f_stats.write(json.dumps(self.stats, indent=2, ensure_ascii=False))
            
            self.logger.info(f"Anthropic批处理完成. 总计: {self.stats['total_requests']}, "
                           f"成功: {self.stats['completed_requests']}, "
                           f"失败: {self.stats['failed_requests']}, "
                           f"总Token: {self.stats['total_tokens']}, "
                           f"总成本: ${self.stats['total_cost']:.4f}")
            
            return result_file_path # Return path to the file containing processed results
            
        except Exception as e:
            self.logger.error(f"Anthropic批处理请求失败: {e}", exc_info=True)
            self.stats["end_time"] = datetime.now().isoformat()
            self.stats["failed_requests"] = len(items) # Mark all as failed if outer try fails
            stats_file = os.path.join(self.output_dir, f"anthropic_batch_stats_{timestamp}_{batch_file_id}_error.json")
            async with aiofiles.open(stats_file, mode='w', encoding='utf-8') as f_stats:
                await f_stats.write(json.dumps(self.stats, indent=2, ensure_ascii=False))
            raise
        finally:
            # Clean up the input file
            if os.path.exists(input_file_path):
                try:
                    os.remove(input_file_path)
                    self.logger.info(f"Cleaned up Anthropic batch input file: {input_file_path}")
                except Exception as e_clean:
                    self.logger.error(f"Error cleaning up input file {input_file_path}: {e_clean}")