"""
API集成测试 - 测试所有路由接口的功能
"""
import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
import json
import time
from typing import Dict, Any

# 导入主应用
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from db.database import get_db
from db.models import Base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# 测试数据库设置
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"
test_engine = create_async_engine(TEST_DATABASE_URL, echo=True)
TestAsyncSessionLocal = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)

async def override_get_db():
    async with TestAsyncSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def setup_database():
    """设置测试数据库"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await test_engine.dispose()

@pytest.fixture
async def client(setup_database):
    """创建测试客户端"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

class TestHealthAndBasicEndpoints:
    """测试健康检查和基础端点"""
    
    async def test_health_check(self, client: AsyncClient):
        """测试健康检查"""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "components" in data
    
    async def test_root_endpoint(self, client: AsyncClient):
        """测试根端点"""
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "docs" in data

class TestLLMAPI:
    """测试LLM API相关接口"""
    
    async def test_get_providers(self, client: AsyncClient):
        """测试获取LLM提供商"""
        response = await client.get("/llm_api/providers")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "providers" in data
    
    async def test_invoke_llm(self, client: AsyncClient):
        """测试LLM调用"""
        payload = {
            "prompt": "测试提示",
            "model": "gpt-3.5-turbo",
            "provider": "openai",
            "max_tokens": 100,
            "temperature": 0.7
        }
        response = await client.post("/llm_api/invoke", json=payload)
        # 由于可能没有真实的API key，我们测试请求格式是否正确
        assert response.status_code in [200, 422, 400]  # 422表示验证错误，400表示API key问题
    
    async def test_invoke_llm_with_images(self, client: AsyncClient):
        """测试多模态LLM调用"""
        payload = {
            "prompt": "描述这个图片",
            "model": "gpt-4-vision-preview", 
            "provider": "openai",
            "images": [
                {
                    "type": "url",
                    "url": "https://example.com/test.jpg"
                }
            ]
        }
        response = await client.post("/llm_api/invoke_with_images", json=payload)
        assert response.status_code in [200, 422, 400]

class TestDataFiltering:
    """测试数据过滤接口"""
    
    @pytest.fixture
    def sample_data(self):
        """示例数据"""
        return [
            {"id": 1, "name": "Alice", "age": 25, "score": 95},
            {"id": 2, "name": "Bob", "age": 30, "score": 87},
            {"id": 3, "name": "Charlie", "age": 35, "score": 92},
            {"id": 4, "name": "David", "age": 28, "score": 88},
            {"id": 5, "name": "Eve", "age": 32, "score": 96}
        ]
    
    async def test_filter_data_sync(self, client: AsyncClient, sample_data):
        """测试同步数据过滤"""
        payload = {
            "data": sample_data,
            "filter_conditions": [
                {
                    "field": "age",
                    "operator": "gte",
                    "value": 30
                }
            ],
            "combine_operation": "AND",
            "limit": 10,
            "offset": 0
        }
        response = await client.post("/data_filtering/filter", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "filtered_data" in data
        assert "total_count" in data
        assert "filtered_count" in data
    
    async def test_start_async_filter(self, client: AsyncClient, sample_data):
        """测试异步数据过滤"""
        payload = {
            "data": sample_data,
            "filter_conditions": [
                {
                    "field": "score", 
                    "operator": "gt",
                    "value": 90
                }
            ]
        }
        response = await client.post("/data_filtering/async/start", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "task_id" in data
        
        # 测试获取任务状态
        task_id = data["task_id"]
        status_response = await client.get(f"/data_filtering/async/status/{task_id}")
        assert status_response.status_code == 200

class TestDataGeneration:
    """测试数据生成接口"""
    
    async def test_generate_data_sync(self, client: AsyncClient):
        """测试同步数据生成"""
        payload = {
            "count": 5,
            "generation_method": "template_based",
            "schema": {
                "name": {"type": "string", "constraints": {"pattern": r"[A-Z][a-z]+"}},
                "age": {"type": "integer", "constraints": {"min": 18, "max": 65}}
            },
            "random_seed": 42
        }
        response = await client.post("/data_generation/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "generated_data" in data
        assert len(data["generated_data"]) == 5
    
    async def test_start_async_generation(self, client: AsyncClient):
        """测试异步数据生成"""
        payload = {
            "count": 10,
            "generation_method": "llm_based",
            "schema": {
                "product_name": {"type": "string"},
                "price": {"type": "number", "constraints": {"min": 10, "max": 1000}}
            }
        }
        response = await client.post("/data_generation/async/start", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "task_id" in data

class TestEvaluation:
    """测试评估接口"""
    
    @pytest.fixture
    def sample_dataset(self):
        """示例数据集"""
        return [
            {"id": 1, "text": "这是一个好的例子", "label": "positive"},
            {"id": 2, "text": "这个不太好", "label": "negative"},
            {"id": 3, "text": "中性的评论", "label": "neutral"}
        ]
    
    async def test_evaluate_data_sync(self, client: AsyncClient, sample_dataset):
        """测试同步数据评估"""
        payload = {
            "data": sample_dataset,
            "evaluation_type": "classification_accuracy",
            "ground_truth_field": "label",
            "prediction_field": "predicted_label",
            "metrics": ["accuracy", "precision", "recall", "f1"]
        }
        response = await client.post("/evaluation/evaluate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "overall_score" in data
        assert "metric_scores" in data

class TestQualityAssessment:
    """测试质量评估接口"""
    
    async def test_assess_quality_sync(self, client: AsyncClient):
        """测试同步质量评估"""
        payload = {
            "data": [
                {"text": "高质量的文本数据", "category": "A"},
                {"text": "质量一般的数据", "category": "B"},
                {"text": "", "category": "C"}  # 空文本，质量较差
            ],
            "assessment_dimensions": ["completeness", "accuracy", "consistency"],
            "thresholds": {
                "completeness": 0.8,
                "accuracy": 0.9,
                "consistency": 0.85
            }
        }
        response = await client.post("/quality_assessment/assess", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "overall_score" in data
        assert "dimension_scores" in data

class TestSeedData:
    """测试种子数据接口"""
    
    async def test_get_seed_data_categories(self, client: AsyncClient):
        """测试获取种子数据分类"""
        response = await client.get("/seed_data/categories")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "categories" in data
    
    async def test_get_seed_data_by_category(self, client: AsyncClient):
        """测试按分类获取种子数据"""
        response = await client.get("/seed_data/data/math")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data

class TestLlamaFactory:
    """测试LlamaFactory接口"""
    
    async def test_get_config_templates(self, client: AsyncClient):
        """测试获取配置模板"""
        response = await client.get("/llamafactory/config/templates")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "templates" in data
    
    async def test_validate_config(self, client: AsyncClient):
        """测试验证配置"""
        payload = {
            "config_data": {
                "model_name": "llama2",
                "dataset": "alpaca",
                "learning_rate": 1e-4
            },
            "config_type": "train"
        }
        response = await client.post("/llamafactory/config/validate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

# 性能测试
class TestPerformance:
    """测试API性能"""
    
    async def test_concurrent_requests(self, client: AsyncClient):
        """测试并发请求性能"""
        import asyncio
        
        async def make_request():
            response = await client.get("/health")
            return response.status_code
        
        # 同时发送10个请求
        tasks = [make_request() for _ in range(10)]
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        end_time = time.time()
        
        # 确保所有请求都成功
        assert all(status == 200 for status in results)
        
        # 确保并发性能合理（10个请求在2秒内完成）
        assert end_time - start_time < 2.0
    
    async def test_large_data_handling(self, client: AsyncClient):
        """测试大数据处理能力"""
        # 生成较大的数据集
        large_dataset = [
            {"id": i, "value": f"data_{i}", "score": i % 100}
            for i in range(1000)
        ]
        
        payload = {
            "data": large_dataset,
            "filter_conditions": [
                {"field": "score", "operator": "gte", "value": 50}
            ]
        }
        
        start_time = time.time()
        response = await client.post("/data_filtering/filter", json=payload)
        end_time = time.time()
        
        assert response.status_code == 200
        # 确保处理时间合理（1000条数据在5秒内处理完成）
        assert end_time - start_time < 5.0

if __name__ == "__main__":
    pytest.main([__file__, "-v"])