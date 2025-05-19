# datapresso/llm_api/batch_processor.py

import os
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
import aiofiles
import uuid

class BatchProcessor:
    """批量处理LLM请求的基类"""
    
    def __init__(self, provider_id: str, model_name: str, max_concurrent_requests: int = 5, 
                output_dir: str = "./batch_results", **provider_kwargs):
        """
        初始化批量处理器
        
        Args:
            provider_id: LLM提供商ID
            model_name: 模型名称
            max_concurrent_requests: 最大并发请求数
            output_dir: 输出目录
            provider_kwargs: 传递给LLM提供商的额外参数
        """
        # Adjusted import to be relative to python-backend if this file is directly under llm_api
        # If llm_api is a sub-package of datapresso, then from datapresso.llm_api... is fine
        # Assuming this file is in python-backend/llm_api/batch_processor.py
        # and provider_factory is in python-backend/llm_api/provider_factory.py
        from llm_api.provider_factory import LLMProviderFactory # Corrected import path
        
        self.provider_id = provider_id
        self.model_name = model_name
        self.max_concurrent_requests = max_concurrent_requests
        self.output_dir = output_dir
        self.provider_kwargs = provider_kwargs
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
        # 初始化LLM提供商
        self.provider = LLMProviderFactory.create_provider(
            provider_id=provider_id,
            model_name=model_name,
            **provider_kwargs
        )
        
        # 日志配置
        self.logger = logging.getLogger(f"BatchProcessor-{provider_id}")
        
        # 统计信息
        self.stats = {
            "total_requests": 0,
            "completed_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
        }
    
    async def process_batch(self, items: List[Dict[str, Any]], 
                          prompt_template: str, 
                          system_prompt: Optional[str] = None,
                          pre_process_fn: Optional[Callable] = None,
                          post_process_fn: Optional[Callable] = None,
                          **generate_kwargs) -> str:
        """
        批量处理请求
        
        Args:
            items: 要处理的数据项列表
            prompt_template: 提示词模板，使用{key}表示数据项中的字段
            system_prompt: 系统提示词
            pre_process_fn: 预处理函数，用于在发送到LLM前处理每个提示词
            post_process_fn: 后处理函数，用于处理LLM响应
            generate_kwargs: 传递给generate方法的额外参数
            
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
        
        # 创建信号量限制并发数
        semaphore = asyncio.Semaphore(self.max_concurrent_requests)
        
        # 创建结果文件
        batch_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = os.path.join(self.output_dir, f"{self.provider_id}_{timestamp}_{batch_id}.jsonl")
        
        # 定义处理单个请求的函数
        async def process_item(item, index):
            try:
                # 应用提示词模板
                prompt = prompt_template.format(**item)
                
                # 应用预处理函数
                if pre_process_fn:
                    prompt = pre_process_fn(prompt, item)
                
                # 限制并发请求数
                async with semaphore:
                    response = await self.provider.generate(
                        prompt=prompt,
                        system_prompt=system_prompt,
                        **generate_kwargs
                    )
                
                # 应用后处理函数
                if post_process_fn:
                    result = post_process_fn(response, item)
                else:
                    result = {
                        "item": item,
                        "response": response["text"],
                        "usage": response["usage"]
                    }
                
                # 更新统计信息
                self.stats["completed_requests"] += 1
                self.stats["total_tokens"] += response["usage"]["total_tokens"]
                self.stats["total_cost"] += response["usage"]["cost"]
                
                # 写入结果
                async with aiofiles.open(result_file, mode='a', encoding='utf-8') as f: # Added encoding
                    await f.write(json.dumps({
                        "index": index,
                        **result
                    }, ensure_ascii=False) + '\n') # Added ensure_ascii=False
                
                return result
                
            except Exception as e:
                self.logger.error(f"处理项 {index} 时出错: {e}")
                self.stats["failed_requests"] += 1
                
                # 写入错误信息
                async with aiofiles.open(result_file, mode='a', encoding='utf-8') as f: # Added encoding
                    await f.write(json.dumps({
                        "index": index,
                        "item": item,
                        "error": str(e)
                    }, ensure_ascii=False) + '\n') # Added ensure_ascii=False
                
                return {"index": index, "item": item, "error": str(e)}
        
        # 创建所有任务
        tasks = []
        for i, item_data in enumerate(items): # Renamed item to item_data to avoid conflict
            tasks.append(process_item(item_data, i))
        
        # 执行所有任务并等待完成
        results = await asyncio.gather(*tasks)
        
        # 更新统计信息
        self.stats["end_time"] = datetime.now().isoformat()
        
        # 写入统计信息
        stats_file = os.path.join(self.output_dir, f"{self.provider_id}_{timestamp}_{batch_id}_stats.json")
        async with aiofiles.open(stats_file, mode='w', encoding='utf-8') as f: # Added encoding
            await f.write(json.dumps(self.stats, indent=2, ensure_ascii=False)) # Added ensure_ascii=False
        
        self.logger.info(f"批处理完成. 总计: {self.stats['total_requests']}, "
                       f"成功: {self.stats['completed_requests']}, "
                       f"失败: {self.stats['failed_requests']}, "
                       f"总Token: {self.stats['total_tokens']}, "
                       f"总成本: ${self.stats['total_cost']:.4f}")
        
        return result_file