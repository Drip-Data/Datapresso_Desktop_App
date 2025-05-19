class LlamaFactoryTrainingComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isLoading = false;
        this.trainingTemplates = {};
        this.currentConfigType = 'sft';
        this.currentExample = null;
        this.currentTaskId = null;
        this.initialize();
    }
    
    initialize() {
        this.render();
        this.attachEventListeners();
        this.loadTrainingTemplates();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="module-card">
                <div class="card-header">
                    <h3>LlamaFactory 模型训练</h3>
                    <p>管理和训练大语言模型</p>
                </div>
                
                <div class="card-body">
                    <ul class="nav nav-tabs mb-3" id="trainingTypeTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="sft-tab" data-bs-toggle="tab" data-bs-target="#sft-panel" 
                                   type="button" role="tab" aria-controls="sft-panel" aria-selected="true">
                                SFT 监督微调
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="dpo-tab" data-bs-toggle="tab" data-bs-target="#dpo-panel" 
                                   type="button" role="tab" aria-controls="dpo-panel" aria-selected="false">
                                DPO 偏好优化
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="ppo-tab" data-bs-toggle="tab" data-bs-target="#ppo-panel" 
                                   type="button" role="tab" aria-controls="ppo-panel" aria-selected="false">
                                PPO 强化学习
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="presso-tab" data-bs-toggle="tab" data-bs-target="#presso-panel" 
                                   type="button" role="tab" aria-controls="presso-panel" aria-selected="false">
                                PRESSO 数据选择
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="limr-tab" data-bs-toggle="tab" data-bs-target="#limr-panel" 
                                   type="button" role="tab" aria-controls="limr-panel" aria-selected="false">
                                LIMR 在线学习
                            </button>
                        </li>
                    </ul>
                    
                    <div class="tab-content" id="trainingContent">
                        <!-- SFT 训练面板 -->
                        <div class="tab-pane fade show active" id="sft-panel" role="tabpanel" aria-labelledby="sft-tab">
                            <div class="row mb-3">
                                <div class="col-md-9">
                                    <h5>监督微调配置</h5>
                                </div>
                                <div class="col-md-3 text-end">
                                    <div class="btn-group" role="group">
                                        <button id="load-sft-example-btn" class="btn btn-outline-secondary btn-sm">
                                            <i class="bi bi-file-earmark-text"></i> 加载示例
                                        </button>
                                        <button id="save-sft-config-btn" class="btn btn-primary btn-sm">
                                            <i class="bi bi-save"></i> 保存配置
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="accordion" id="sftAccordion">
                                <!-- 基础配置 -->
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="sftBasicHeading">
                                        <button class="accordion-button" type="button" data-bs-toggle="collapse" 
                                                data-bs-target="#sftBasicCollapse" aria-expanded="true" 
                                                aria-controls="sftBasicCollapse">
                                            基础配置
                                        </button>
                                    </h2>
                                    <div id="sftBasicCollapse" class="accordion-collapse collapse show" 
                                         aria-labelledby="sftBasicHeading">
                                        <div class="accordion-body">
                                            <form id="sft-basic-form">
                                                <div class="row mb-3">
                                                    <div class="col-md-6">
                                                        <label for="sft-model-name" class="form-label">模型路径</label>
                                                        <input type="text" id="sft-model-name" class="form-control" 
                                                               placeholder="模型路径或Hugging Face ID" required>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="sft-output-dir" class="form-label">输出目录</label>
                                                        <div class="input-group">
                                                            <input type="text" id="sft-output-dir" class="form-control" 
                                                                   placeholder="训练输出目录" required>
                                                            <button class="btn btn-outline-secondary browse-button" 
                                                                    type="button" data-target="sft-output-dir">浏览</button>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div class="row mb-3">
                                                    <div class="col-md-12">
                                                        <label for="sft-dataset" class="form-label">训练数据集</label>
                                                        <div class="input-group">
                                                            <input type="text" id="sft-dataset" class="form-control" 
                                                                   placeholder="数据集路径或名称" required>
                                                            <button class="btn btn-outline-secondary browse-button" 
                                                                    type="button" data-target="sft-dataset">浏览</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 训练参数 -->
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="sftTrainingHeading">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                                                data-bs-target="#sftTrainingCollapse" aria-expanded="false" 
                                                aria-controls="sftTrainingCollapse">
                                            训练参数
                                        </button>
                                    </h2>
                                    <div id="sftTrainingCollapse" class="accordion-collapse collapse" 
                                         aria-labelledby="sftTrainingHeading">
                                        <div class="accordion-body">
                                            <form id="sft-training-form">
                                                <div class="row mb-3">
                                                    <div class="col-md-4">
                                                        <label for="sft-num-train-epochs" class="form-label">训练轮数</label>
                                                        <input type="number" id="sft-num-train-epochs" class="form-control" 
                                                               value="3" min="1" max="100">
                                                    </div>
                                                    <div class="col-md-4">
                                                        <label for="sft-learning-rate" class="form-label">学习率</label>
                                                        <input type="number" id="sft-learning-rate" class="form-control" 
                                                               value="2e-5" step="1e-6">
                                                    </div>
                                                    <div class="col-md-4">
                                                        <label for="sft-per-device-train-batch-size" class="form-label">批次大小</label>
                                                        <input type="number" id="sft-per-device-train-batch-size" class="form-control" 
                                                               value="4" min="1" max="128">
                                                    </div>
                                                </div>
                                                
                                                <div class="row mb-3">
                                                    <div class="col-md-6">
                                                        <div class="form-check form-switch">
                                                            <input class="form-check-input" type="checkbox" id="sft-use-lora" checked>
                                                            <label class="form-check-label" for="sft-use-lora">使用LoRA</label>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="form-check form-switch">
                                                            <input class="form-check-input" type="checkbox" id="sft-bf16">
                                                            <label class="form-check-label" for="sft-bf16">使用BF16精度</label>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div id="sft-lora-params" class="lora-params">
                                                    <div class="row mb-3">
                                                        <div class="col-md-4">
                                                            <label for="sft-lora-rank" class="form-label">LoRA Rank</label>
                                                            <input type="number" id="sft-lora-rank" class="form-control" 
                                                                   value="8" min="1" max="128">
                                                        </div>
                                                        <div class="col-md-4">
                                                            <label for="sft-lora-alpha" class="form-label">LoRA Alpha</label>
                                                            <input type="number" id="sft-lora-alpha" class="form-control" 
                                                                   value="16" min="1" max="128">
                                                        </div>
                                                        <div class="col-md-4">
                                                            <label for="sft-lora-dropout" class="form-label">LoRA Dropout</label>
                                                            <input type="number" id="sft-lora-dropout" class="form-control" 
                                                                   value="0.05" min="0" max="1" step="0.01">
                                                        </div>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 高级选项 -->
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="sftAdvancedHeading">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                                                data-bs-target="#sftAdvancedCollapse" aria-expanded="false" 
                                                aria-controls="sftAdvancedCollapse">
                                            高级选项
                                        </button>
                                    </h2>
                                    <div id="sftAdvancedCollapse" class="accordion-collapse collapse" 
                                         aria-labelledby="sftAdvancedHeading">
                                        <div class="accordion-body">
                                            <form id="sft-advanced-form">
                                                <div class="row mb-3">
                                                    <div class="col-md-6">
                                                        <label for="sft-model-max-length" class="form-label">最大序列长度</label>
                                                        <input type="number" id="sft-model-max-length" class="form-control" 
                                                               value="2048" min="128" max="32768">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="sft-gradient-accumulation-steps" class="form-label">梯度累积步数</label>
                                                        <input type="number" id="sft-gradient-accumulation-steps" class="form-control" 
                                                               value="1" min="1" max="128">
                                                    </div>
                                                </div>
                                                
                                                <div class="row mb-3">
                                                    <div class="col-md-6">
                                                        <label for="sft-save-strategy" class="form-label">保存策略</label>
                                                        <select id="sft-save-strategy" class="form-select">
                                                            <option value="steps">按步数</option>
                                                            <option value="epoch">按轮数</option>
                                                            <option value="no">不保存</option>
                                                        </select>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="sft-save-steps" class="form-label">保存步数</label>
                                                        <input type="number" id="sft-save-steps" class="form-control" 
                                                               value="500" min="1">
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 配置预览 -->
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="sftPreviewHeading">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                                                data-bs-target="#sftPreviewCollapse" aria-expanded="false" 
                                                aria-controls="sftPreviewCollapse">
                                            配置预览
                                        </button>
                                    </h2>
                                    <div id="sftPreviewCollapse" class="accordion-collapse collapse" 
                                         aria-labelledby="sftPreviewHeading">
                                        <div class="accordion-body">
                                            <div class="form-group">
                                                <textarea id="sft-config-preview" class="form-control code-editor" rows="15" readonly></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row mt-3">
                                <div class="col-md-12 text-end">
                                    <button id="run-sft-btn" class="btn btn-success">
                                        <i class="bi bi-play-fill"></i> 开始训练
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 简化了其他训练类型的面板，实际代码应该为每种类型创建完整配置面板 -->
                        <div class="tab-pane fade" id="dpo-panel" role="tabpanel" aria-labelledby="dpo-tab">
                            <div class="p-3">
                                <h5>DPO 偏好优化配置</h5>
                                <p>在这里添加DPO配置表单</p>
                            </div>
                        </div>
                        
                        <div class="tab-pane fade" id="ppo-panel" role="tabpanel" aria-labelledby="ppo-tab">
                            <div class="p-3">
                                <h5>PPO 强化学习配置</h5>
                                <p>在这里添加PPO配置表单</p>
                            </div>
                        </div>
                        
                        <div class="tab-pane fade" id="presso-panel" role="tabpanel" aria-labelledby="presso-tab">
                            <div class="p-3">
                                <h5>PRESSO 数据选择配置</h5>
                                <p>在这里添加PRESSO配置表单</p>
                            </div>
                        </div>
                        
                        <div class="tab-pane fade" id="limr-panel" role="tabpanel" aria-labelledby="limr-tab">
                            <div class="p-3">
                                <h5>LIMR 在线学习配置</h5>
                                <p>在这里添加LIMR配置表单</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 训练监控面板 -->
                    <div class="training-monitor mt-4 d-none" id="training-monitor">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">训练任务监控</h5>
                                <button id="close-monitor-btn" class="btn btn-sm btn-outline-secondary">
                                    <i class="bi bi-x"></i>
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <p><strong>任务ID:</strong> <span id="task-id-display"></span></p>
                                        <p><strong>状态:</strong> <span id="task-status-display"></span></p>
                                        <p><strong>已训练轮数:</strong> <span id="task-epoch-display">0/0</span></p>
                                    </div>
                                    <div class="col-md-6">
                                        <p><strong>开始时间:</strong> <span id="task-start-time-display"></span></p>
                                        <p><strong>运行时间:</strong> <span id="task-runtime-display">0分钟</span></p>
                                        <p><strong>当前损失:</strong> <span id="task-loss-display">N/A</span></p>
                                    </div>
                                </div>
                                
                                <div class="progress mb-3">
                                    <div id="task-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated" 
                                         role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" 
                                         aria-valuemax="100">0%</div>
                                </div>
                                
                                <h6>训练日志</h6>
                                <div class="log-container bg-dark text-light p-2 mb-3" style="height: 200px; overflow-y: auto;">
                                    <pre id="task-logs-content" class="mb-0"></pre>
                                </div>
                                
                                <div class="d-flex justify-content-end">
                                    <button id="stop-task-btn" class="btn btn-danger me-2">
                                        <i class="bi bi-stop-fill"></i> 停止训练
                                    </button>
                                    <button id="view-output-btn" class="btn btn-outline-primary">
                                        <i class="bi bi-folder2-open"></i> 查看输出
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        // 训练类型标签切换事件
        const trainingTabs = this.container.querySelectorAll('button[data-bs-toggle="tab"]');
        trainingTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetId = e.target.id.split('-')[0]; // 获取类型前缀 (sft, dpo, ppo等)
                this.currentConfigType = targetId;
                this.updateConfigPreview();
            });
        });
        
        // SFT表单变更事件
        const sftForms = [
            this.container.querySelector('#sft-basic-form'),
            this.container.querySelector('#sft-training-form'),
            this.container.querySelector('#sft-advanced-form')
        ];
        
        sftForms.forEach(form => {
            form.addEventListener('change', () => {
                this.updateConfigPreview();
            });
            
            // 为每个输入字段添加input事件
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    this.updateConfigPreview();
                });
            });
        });
        
        // LoRA开关事件
        const loraSwitch = this.container.querySelector('#sft-use-lora');
        const loraParams = this.container.querySelector('#sft-lora-params');
        
        loraSwitch.addEventListener('change', () => {
            loraParams.style.display = loraSwitch.checked ? 'block' : 'none';
            this.updateConfigPreview();
        });
        
        // 加载示例按钮
        const loadSftExampleBtn = this.container.querySelector('#load-sft-example-btn');
        loadSftExampleBtn.addEventListener('click', () => {
            this.loadExampleConfig('sft');
        });
        
        // 保存配置按钮
        const saveSftConfigBtn = this.container.querySelector('#save-sft-config-btn');
        saveSftConfigBtn.addEventListener('click', () => {
            this.saveConfig();
        });
        
        // 训练按钮
        const runSftBtn = this.container.querySelector('#run-sft-btn');
        runSftBtn.addEventListener('click', () => {
            this.startTraining();
        });
        
        // 训练监控相关事件
        const closeMonitorBtn = this.container.querySelector('#close-monitor-btn');
        closeMonitorBtn.addEventListener('click', () => {
            this.hideTrainingMonitor();
        });
        
        const stopTaskBtn = this.container.querySelector('#stop-task-btn');
        stopTaskBtn.addEventListener('click', () => {
            this.stopTraining();
        });
        
        const viewOutputBtn = this.container.querySelector('#view-output-btn');
        viewOutputBtn.addEventListener('click', () => {
            this.openOutputDirectory();
        });
        
        // 浏览按钮事件
        const browseButtons = this.container.querySelectorAll('.browse-button');
        browseButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetId = button.getAttribute('data-target');
                this.browseForPath(targetId);
            });
        });
    }
    
    async loadTrainingTemplates() {
        try {
            const response = await window.electronAPI.runLlamaFactory({
                operation: "get_training_templates"
            });
            
            if (response.status === 'success') {
                this.trainingTemplates = response.templates;
            } else {
                console.error('加载训练模板失败:', response.message);
            }
        } catch (error) {
            console.error('获取训练模板出错:', error);
        }
    }
    
    async loadExampleConfig(configType) {
        // 打开示例选择对话框
        if (!this.trainingTemplates || !this.trainingTemplates[configType] || this.trainingTemplates[configType].length === 0) {
            alert('没有可用的示例配置');
            return;
        }
        
        const examples = this.trainingTemplates[configType];
        const selectedExample = prompt('请选择一个示例配置:\n\n' + examples.join('\n'));
        
        if (!selectedExample || !examples.includes(selectedExample)) {
            return;
        }
        
        try {
            const response = await window.electronAPI.runLlamaFactory({
                operation: "get_example_config",
                example_path: selectedExample
            });
            
            if (response.status === 'success') {
                this.currentExample = selectedExample;
                
                // 加载配置到表单
                this.loadConfigToForm(configType, response.config_data);
                
                // 更新配置预览
                this.updateConfigPreview();
            } else {
                alert('加载示例配置失败: ' + response.message);
            }
        } catch (error) {
            console.error('加载示例配置出错:', error);
            alert('加载示例配置出错: ' + error.message);
        }
    }
    
    loadConfigToForm(configType, configData) {
        if (configType === 'sft') {
            // 加载基本配置
            this.setInputValue('sft-model-name', configData.model_name_or_path || '');
            this.setInputValue('sft-output-dir', configData.output_dir || '');
            this.setInputValue('sft-dataset', configData.dataset || '');
            
            // 加载训练参数
            this.setInputValue('sft-num-train-epochs', configData.num_train_epochs || 3);
            this.setInputValue('sft-learning-rate', configData.learning_rate || '2e-5');
            this.setInputValue('sft-per-device-train-batch-size', configData.per_device_train_batch_size || 4);
            
            // LoRA参数
            const useLora = configData.use_lora !== undefined ? configData.use_lora : true;
            this.setCheckboxValue('sft-use-lora', useLora);
            
            if (configData.lora_config) {
                this.setInputValue('sft-lora-rank', configData.lora_config.r || 8);
                this.setInputValue('sft-lora-alpha', configData.lora_config.lora_alpha || 16);
                this.setInputValue('sft-lora-dropout', configData.lora_config.lora_dropout || 0.05);
            }
            
            // 显示/隐藏LoRA参数区域
            const loraParams = this.container.querySelector('#sft-lora-params');
            loraParams.style.display = useLora ? 'block' : 'none';
            
            // 加载高级参数
            this.setInputValue('sft-model-max-length', configData.model_max_length || 2048);
            this.setInputValue('sft-gradient-accumulation-steps', configData.gradient_accumulation_steps || 1);
            this.setSelectValue('sft-save-strategy', configData.save_strategy || 'steps');
            this.setInputValue('sft-save-steps', configData.save_steps || 500);
            this.setCheckboxValue('sft-bf16', configData.bf16 || false);
        }
        
        // 其他训练类型的配置加载可以类似实现
    }
    
    updateConfigPreview() {
        if (this.currentConfigType === 'sft') {
            const configObj = this.buildSftConfig();
            const configPreview = this.container.querySelector('#sft-config-preview');
            configPreview.value = JSON.stringify(configObj, null, 2);
        }
        
        // 其他训练类型的配置预览更新可以类似实现
    }
    
    buildSftConfig() {
        // 构建SFT配置对象
        const config = {
            model_name_or_path: this.getInputValue('sft-model-name'),
            output_dir: this.getInputValue('sft-output-dir'),
            dataset: this.getInputValue('sft-dataset'),
            num_train_epochs: Number(this.getInputValue('sft-num-train-epochs')),
            learning_rate: Number(this.getInputValue('sft-learning-rate')),
            per_device_train_batch_size: Number(this.getInputValue('sft-per-device-train-batch-size')),
            gradient_accumulation_steps: Number(this.getInputValue('sft-gradient-accumulation-steps')),
            model_max_length: Number(this.getInputValue('sft-model-max-length')),
            save_strategy: this.getSelectValue('sft-save-strategy'),
            save_steps: Number(this.getInputValue('sft-save-steps')),
            bf16: this.getCheckboxValue('sft-bf16')
        };
        
        // 添加LoRA配置
        const useLora = this.getCheckboxValue('sft-use-lora');
        config.use_lora = useLora;
        
        if (useLora) {
            config.lora_config = {
                r: Number(this.getInputValue('sft-lora-rank')),
                lora_alpha: Number(this.getInputValue('sft-lora-alpha')),
                lora_dropout: Number(this.getInputValue('sft-lora-dropout'))
            };
        }
        
        return config;
    }
    
    async saveConfig() {
        let configData;
        let configType = this.currentConfigType;
        
        if (configType === 'sft') {
            configData = this.buildSftConfig();
        } else {
            alert('暂不支持该训练类型');
            return;
        }
        
        try {
            const response = await window.electronAPI.runLlamaFactory({
                operation: "save_config",
                config_data: configData,
                config_type: configType
            });
            
            if (response.status === 'success') {
                alert(`配置已保存: ${response.config_name}`);
                this.lastSavedConfig = {
                    name: response.config_name,
                    type: configType
                };
            } else {
                alert('保存配置失败: ' + response.message);
            }
        } catch (error) {
            console.error('保存配置出错:', error);
            alert('保存配置出错: ' + error.message);
        }
    }
    
    async startTraining() {
        // 先保存配置
        if (!this.lastSavedConfig) {
            await this.saveConfig();
            if (!this.lastSavedConfig) {
                return; // 保存失败
            }
        }
        
        try {
            const response = await window.electronAPI.runLlamaFactory({
                operation: "run_task",
                task_type: this.lastSavedConfig.type === 'presso_cherry' || this.lastSavedConfig.type === 'presso_less' ? 'presso' : 'train',
                config_name: this.lastSavedConfig.name
            });
            
            if (response.status === 'success') {
                this.currentTaskId = response.task_id;
                this.showTrainingMonitor();
                this.startMonitoringTask();
            } else {
                alert('启动训练失败: ' + response.message);
            }
        } catch (error) {
            console.error('启动训练出错:', error);
            alert('启动训练出错: ' + error.message);
        }
    }
    
    showTrainingMonitor() {
        const monitorPanel = this.container.querySelector('#training-monitor');
        monitorPanel.classList.remove('d-none');
        
        // 初始化监控UI
        this.container.querySelector('#task-id-display').textContent = this.currentTaskId;
        this.container.querySelector('#task-status-display').textContent = '正在运行';
        this.container.querySelector('#task-epoch-display').textContent = '0/0';
        this.container.querySelector('#task-loss-display').textContent = 'N/A';
        
        // 重置进度条
        const progressBar = this.container.querySelector('#task-progress-bar');
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressBar.setAttribute('aria-valuenow', 0);
        
        // 清空日志
        this.container.querySelector('#task-logs-content').textContent = '等待日志...';
    }
    
    hideTrainingMonitor() {
        this.stopMonitoringTask();
        const monitorPanel = this.container.querySelector('#training-monitor');
        monitorPanel.classList.add('d-none');
    }
    
    startMonitoringTask() {
        // 开始轮询任务状态
        this.statusInterval = setInterval(() => this.updateTaskStatus(), 2000);
        this.logsInterval = setInterval(() => this.updateTaskLogs(), 5000);
    }
    
    stopMonitoringTask() {
        // 停止轮询
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
        
        if (this.logsInterval) {
            clearInterval(this.logsInterval);
            this.logsInterval = null;
        }
    }
    
    async updateTaskStatus() {
        if (!this.currentTaskId) return;
        
        try {
            const response = await window.electronAPI.runLlamaFactory({
                operation: "get_task_status",
                task_id: this.currentTaskId
            });
            
            if (response.status === 'success') {
                const task = response.task;
                
                // 更新状态信息
                this.container.querySelector('#task-status-display').textContent = this.getStatusText(task.status);
                
                // 更新开始时间
                if (task.start_time) {
                    const startDate = new Date(task.start_time * 1000);
                    this.container.querySelector('#task-start-time-display').textContent = startDate.toLocaleString();
                    
                    // 更新运行时间
                    const now = new Date();
                    const runtime = Math.floor((now - startDate) / 60000); // 转换为分钟
                    this.container.querySelector('#task-runtime-display').textContent = `${runtime}分钟`;
                }
                
                // 更新进度
                if (task.progress !== undefined) {
                    const progressBar = this.container.querySelector('#task-progress-bar');
                    progressBar.style.width = `${task.progress}%`;
                    progressBar.textContent = `${Math.round(task.progress)}%`;
                    progressBar.setAttribute('aria-valuenow', task.progress);
                }
                
                // 更新轮数
                if (task.current_epoch !== undefined && task.total_epochs !== undefined) {
                    this.container.querySelector('#task-epoch-display').textContent = `${task.current_epoch}/${task.total_epochs}`;
                }
                
                // 更新损失
                if (task.metrics && task.metrics.loss && task.metrics.loss.length > 0) {
                    const latestLoss = task.metrics.loss[task.metrics.loss.length - 1];
                    this.container.querySelector('#task-loss-display').textContent = latestLoss.toFixed(4);
                }
                
                // 检查是否完成
                if (task.status === 'completed' || task.status === 'failed' || task.status === 'stopped') {
                    this.stopMonitoringTask();
                    
                    // 更新UI元素以反映任务已完成
                    const statusText = this.getStatusText(task.status);
                    this.container.querySelector('#task-status-display').textContent = statusText;
                    
                    if (task.status === 'completed') {
                        alert('训练已完成!');
                    } else if (task.status === 'failed') {
                        alert('训练失败: ' + (task.error_message || '未知错误'));
                    }
                }
            }
        } catch (error) {
            console.error('获取任务状态出错:', error);
        }
    }
    
    async updateTaskLogs() {
        if (!this.currentTaskId) return;
        
        try {
            const response = await window.electronAPI.runLlamaFactory({
                operation: "get_task_logs",
                task_id: this.currentTaskId,
                n: 50 // 获取最近50行日志
            });
            
            if (response.status === 'success' && response.logs) {
                // 更新日志显示
                const logsContent = this.container.querySelector('#task-logs-content');
                logsContent.textContent = response.logs.join('\n');
                
                // 滚动到底部
                const logContainer = logsContent.parentElement;
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        } catch (error) {
            console.error('获取任务日志出错:', error);
        }
    }
    
    async stopTraining() {
        if (!this.currentTaskId) return;
        
        if (!confirm('确定要停止训练任务?')) {
            return;
        }
        
        try {
            const response = await window.electronAPI.runLlamaFactory({
                operation: "stop_task",
                task_id: this.currentTaskId
            });
            
            if (response.status === 'success') {
                alert('已发送停止命令，请等待任务终止');
            } else {
                alert('停止任务失败: ' + response.message);
            }
        } catch (error) {
            console.error('停止任务出错:', error);
            alert('停止任务出错: ' + error.message);
        }
    }
    
    async openOutputDirectory() {
        if (!this.currentTaskId) return;
        
        try {
            const response = await window.electronAPI.runLlamaFactory({
                operation: "get_task_status",
                task_id: this.currentTaskId
            });
            
            if (response.status === 'success' && response.task.output_dir) {
                await window.electronAPI.openDirectory(response.task.output_dir);
            } else {
                alert('无法获取输出目录');
            }
        } catch (error) {
            console.error('打开输出目录出错:', error);
            alert('打开输出目录出错: ' + error.message);
        }
    }
    
    async browseForPath(targetId) {
        try {
            const isDirectory = targetId.includes('dir');
            
            let result;
            if (isDirectory) {
                result = await window.electronAPI.openDirectoryDialog({
                    title: '选择目录'
                });
            } else {
                result = await window.electronAPI.openFileDialog({
                    title: '选择文件',
                    filters: [
                        { name: '数据文件', extensions: ['json', 'jsonl', 'csv', 'txt'] },
                        { name: '所有文件', extensions: ['*'] }
                    ]
                });
            }
            
            if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                const selectedPath = result.filePaths[0];
                this.setInputValue(targetId, selectedPath);
                this.updateConfigPreview();
            }
        } catch (error) {
            console.error('浏览路径出错:', error);
            alert('浏览路径出错: ' + error.message);
        }
    }
    
    // 辅助方法：获取表单输入值
    getInputValue(id) {
        const element = this.container.querySelector(`#${id}`);
        return element ? element.value : '';
    }
    
    // 辅助方法：设置表单输入值
    setInputValue(id, value) {
        const element = this.container.querySelector(`#${id}`);
        if (element) element.value = value;
    }
    
    // 辅助方法：获取选择值
    getSelectValue(id) {
        const element = this.container.querySelector(`#${id}`);
        return element ? element.value : '';
    }
    
    // 辅助方法：设置选择值
    setSelectValue(id, value) {
        const element = this.container.querySelector(`#${id}`);
        if (element) element.value = value;
    }
    
    // 辅助方法：获取复选框值
    getCheckboxValue(id) {
        const element = this.container.querySelector(`#${id}`);
        return element ? element.checked : false;
    }
    
    // 辅助方法：设置复选框值
    setCheckboxValue(id, value) {
        const element = this.container.querySelector(`#${id}`);
        if (element) element.checked = value;
    }
    
    // 辅助方法：获取状态文本
    getStatusText(status) {
        switch (status) {
            case 'pending': return '等待中';
            case 'running': return '运行中';
            case 'completed': return '已完成';
            case 'failed': return '失败';
            case 'stopped': return '已停止';
            default: return status;
        }
    }
}

export default LlamaFactoryTrainingComponent;
