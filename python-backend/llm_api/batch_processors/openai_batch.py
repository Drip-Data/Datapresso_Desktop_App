import os
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
import aiofiles
import httpx
import uuid

from ..constants import OPENAI_PRICING # Changed to relative import

class OpenAIBatchProcessor:
    """OpenAI批量API专用处理器"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gpt-4o-mini", 
                output_dir: str = "./batch_results", base_url: str = "https://api.openai.com/v1"):
        """
        初始化OpenAI批量处理器
        
        Args:
            api_key: OpenAI API密钥
            model_name: 模型名称
            output_dir: 输出目录
            base_url: OpenAI API基础URL
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("未提供OpenAI API密钥")
        
        self.model_name = model_name
        self.output_dir = output_dir
        self.base_url = base_url
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
        # 日志配置
        self.logger = logging.getLogger("OpenAIBatchProcessor")
        
        # 统计信息
        self.stats = {
            "total_requests": 0,
            "completed_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
        }
    
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        if self.model_name not in OPENAI_PRICING:
            return 0.0
        
        pricing = OPENAI_PRICING[self.model_name]
        prompt_cost = prompt_tokens * pricing["prompt"] / 1000
        completion_cost = completion_tokens * pricing["completion"] / 1000
        
        # OpenAI批量API提供50%折扣
        return (prompt_cost + completion_cost) * 0.5
    
    async def _poll_batch_status(self, client: httpx.AsyncClient, batch_id: str) -> Dict:
        """轮询批量作业状态"""
        url = f"{self.base_url}/batches/{batch_id}"
        
        while True:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            status = data.get("status")
            if status in ["completed", "failed", "cancelled", "expired"]:
                return data
            
            # 等待一段时间后再次轮询
            await asyncio.sleep(5)
    
    async def _get_batch_results(self, client: httpx.AsyncClient, batch_id: str) -> List[Dict]:
        """获取批量作业结果"""
        url = f"{self.base_url}/batches/{batch_id}/results"
        
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        
        return data.get("data", [])
    
    async def process_batch(self, items: List[Dict[str, Any]], 
                          prompt_template: str, 
                          system_prompt: Optional[str] = None,
                          pre_process_fn: Optional[Callable] = None,
                          post_process_fn: Optional[Callable] = None,
                          max_tokens: int = 1000,
                          temperature: float = 0.7,
                          **kwargs) -> str:
        """
        使用OpenAI批量API处理请求
        
        Args:
            items: 要处理的数据项列表
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
        batch_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = os.path.join(self.output_dir, f"openai_batch_{timestamp}_{batch_id}.jsonl")
        
        # 准备批量请求
        batch_requests = []
        for i, item in enumerate(items):
            # 应用提示词模板
            prompt = prompt_template.format(**item)
            
            # 应用预处理函数
            if pre_process_fn:
                prompt = pre_process_fn(prompt, item)
            
            # 创建消息
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            
            messages.append({"role": "user", "content": prompt})
            
            # 创建请求
            batch_requests.append({
                "custom_id": str(i),
                "messages": messages,
                "model": self.model_name,
                "max_tokens": max_tokens,
                "temperature": temperature,
                **kwargs
            })
        
        # 创建批量请求
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                client.headers.update({
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                })
                
                # 提交批量请求
                create_batch_url = f"{self.base_url}/batches"
                response = await client.post(
                    create_batch_url,
                    json={
                        "requests": batch_requests
                    }
                )
                response.raise_for_status()
                batch_data = response.json()
                batch_id = batch_data["id"]
                
                self.logger.info(f"批量请求已提交，批次ID: {batch_id}")
                
                # 轮询批量作业状态
                batch_status = await self._poll_batch_status(client, batch_id)
                
                if batch_status["status"] == "completed":
                    # 获取批量作业结果
                    results = await self._get_batch_results(client, batch_id)
                    
                    # 处理结果
                    async with aiofiles.open(result_file, mode='w') as f:
                        for result in results:
                            idx = int(result["custom_id"])
                            item = items[idx]
                            
                            # 提取响应文本
                            response_text = result["response"]["choices"][0]["message"]["content"]
                            
                            # 应用后处理函数
                            if post_process_fn:
                                response_text = post_process_fn(response_text, item)
                            
                            # 更新统计信息
                            self.stats["completed_requests"] += 1
                            prompt_tokens = result["response"]["usage"]["prompt_tokens"]
                            completion_tokens = result["response"]["usage"]["completion_tokens"]
                            self.stats["total_tokens"] += prompt_tokens + completion_tokens
                            self.stats["total_cost"] += self.calculate_cost(prompt_tokens, completion_tokens)
                            
                            # 写入结果
                            result_obj = {
                                "index": idx,
                                "original_item": item,
                                "prompt": prompt_template.format(**item),
                                "response": response_text,
                                "usage": {
                                    "prompt_tokens": prompt_tokens,
                                    "completion_tokens": completion_tokens,
                                    "total_tokens": prompt_tokens + completion_tokens
                                }
                            }
                            await f.write(json.dumps(result_obj) + "\n")
                else:
                    self.logger.error(f"批量作业失败: {batch_status}")
                    self.stats["failed_requests"] = len(items)
                
                # 更新统计信息
                self.stats["end_time"] = datetime.now().isoformat()
                
                # 写入统计信息
                stats_file = os.path.join(self.output_dir, f"openai_batch_{timestamp}_{batch_id}_stats.json")
                async with aiofiles.open(stats_file, mode='w') as f:
                    await f.write(json.dumps(self.stats, indent=2))
                
                self.logger.info(f"批处理完成. 总计: {self.stats['total_requests']}, "
                               f"成功: {self.stats['completed_requests']}, "
                               f"总成本: ${self.stats['total_cost']:.4f}")
                
                return result_file
                
        except Exception as e:
            self.logger.error(f"批处理请求失败: {e}")
            raise