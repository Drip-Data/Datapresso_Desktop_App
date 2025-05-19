import os
import sys
import shutil
from pathlib import Path
from typing import Optional

class LlamaFactoryConfig:
    """LlamaFactory 配置管理类"""
    
    def __init__(self):
        # 基础目录设置
        self.user_home = Path(os.path.expanduser("~"))
        self.app_data_dir = self.user_home / ".datapresso"
        
        # LlamaFactory 相关目录
        self.llamafactory_dir = Path(__file__).parent / "llamafactory"
        self.llamafactory_bin = self.llamafactory_dir / "bin"
        
        # 工作目录设置
        self.working_dir = self.app_data_dir / "llamafactory"
        self.config_dir = self.working_dir / "configs"
        self.models_dir = self.working_dir / "models"
        self.data_dir = self.working_dir / "data"
        self.output_dir = self.working_dir / "outputs"
        self.logs_dir = self.working_dir / "logs"
        
        # 确保目录存在
        self._ensure_directories()
        
        # 检查和准备 LlamaFactory 环境
        self._prepare_environment()
    
    def _ensure_directories(self):
        """确保所有必要的目录存在"""
        self.app_data_dir.mkdir(exist_ok=True)
        self.working_dir.mkdir(exist_ok=True)
        self.config_dir.mkdir(exist_ok=True)
        self.models_dir.mkdir(exist_ok=True)
        self.data_dir.mkdir(exist_ok=True)
        self.output_dir.mkdir(exist_ok=True)
        self.logs_dir.mkdir(exist_ok=True)
    
    def _prepare_environment(self):
        """准备 LlamaFactory 运行环境"""
        # 复制示例配置到用户配置目录（如果不存在）
        examples_dir = self.llamafactory_dir / "examples"
        dest_examples_dir = self.config_dir / "examples"
        
        if examples_dir.exists() and not dest_examples_dir.exists():
            shutil.copytree(examples_dir, dest_examples_dir)
    
    def add_to_python_path(self):
        """将 LlamaFactory 目录添加到 Python 路径"""
        # 确保 LlamaFactory 目录在 Python 路径中
        llamafactory_path = str(self.llamafactory_dir)
        if llamafactory_path not in sys.path:
            sys.path.insert(0, llamafactory_path)
    
    def get_config_path(self, config_name: str) -> Path:
        """获取配置文件路径"""
        # 检查是否是示例配置
        if config_name.startswith("examples/"):
            return self.config_dir / config_name
        
        # 普通配置文件
        if not config_name.endswith('.yaml'):
            config_name = f"{config_name}.yaml"
        
        return self.config_dir / config_name
    
    def get_output_path(self, task_id: str) -> Path:
        """获取输出目录路径"""
        return self.output_dir / task_id
    
    def get_log_path(self, task_id: str) -> Path:
        """获取日志文件路径"""
        return self.logs_dir / f"{task_id}.log"
    
    def save_config(self, config_data: dict, config_name: str) -> Path:
        """保存配置到YAML文件"""
        import yaml
        
        config_path = self.get_config_path(config_name)
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config_data, f, default_flow_style=False)
        
        return config_path
    
    def scan_training_templates(self) -> dict:
        """扫描训练模板配置"""
        result = {
            "sft": [],
            "dpo": [],
            "ppo": [],
            "presso": [],
            "limr": []
        }
        
        templates_dir = self.config_dir / "examples"
        if not templates_dir.exists():
            return result
        
        # 扫描 SFT 模板
        sft_patterns = ["sft", "finetune", "full"]
        dpo_patterns = ["dpo", "preference"]
        ppo_patterns = ["ppo", "rlhf"]
        presso_patterns = ["presso"]
        limr_patterns = ["limr"]
        
        for yaml_file in templates_dir.glob("**/*.yaml"):
            file_name = yaml_file.name.lower()
            rel_path = yaml_file.relative_to(self.config_dir)
            str_path = str(rel_path).replace("\\", "/")
            
            if any(pattern in file_name for pattern in sft_patterns):
                result["sft"].append(str_path)
            elif any(pattern in file_name for pattern in dpo_patterns):
                result["dpo"].append(str_path)
            elif any(pattern in file_name for pattern in ppo_patterns):
                result["ppo"].append(str_path)
            elif any(pattern in file_name for pattern in presso_patterns):
                result["presso"].append(str_path)
            elif any(pattern in file_name for pattern in limr_patterns):
                result["limr"].append(str_path)
        
        return result

# 创建全局配置实例
llamafactory_config = LlamaFactoryConfig()
