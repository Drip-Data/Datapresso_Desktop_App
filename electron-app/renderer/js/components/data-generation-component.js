class DataGenerationComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isLoading = false;
        this.templateData = null;
        this.generatedData = null;
        this.initialize();
    }
    
    initialize() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="module-card">
                <div class="card-header">
                    <h3>数据生成</h3>
                    <p>根据模板或种子数据生成新的数据集</p>
                </div>
                
                <div class="card-body">
                    <div class="generation-tabs">
                        <ul class="nav nav-tabs" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active" id="template-tab" data-toggle="tab" href="#template-panel" role="tab">模板生成</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="variation-tab" data-toggle="tab" href="#variation-panel" role="tab">变异生成</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="llm-tab" data-toggle="tab" href="#llm-panel" role="tab">LLM生成</a>
                            </li>
                        </ul>
                        
                        <div class="tab-content mt-3">
                            <!-- 模板生成面板 -->
                            <div class="tab-pane fade show active" id="template-panel" role="tabpanel">
                                <div class="form-group">
                                    <label for="template-input">数据模板 (JSON):</label>
                                    <textarea id="template-input" class="form-control" rows="8" placeholder='{"name": "{{name}}", "age": "{{int:18-65}}", "email": "{{email}}"}...'></textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label for="template-count">生成数量:</label>
                                    <input type="number" id="template-count" class="form-control" min="1" max="10000" value="10">
                                </div>
                                
                                <div class="form-group">
                                    <button id="load-template-sample" class="btn btn-outline-secondary">加载示例模板</button>
                                    <button id="template-generate-btn" class="btn btn-primary">生成数据</button>
                                </div>
                            </div>
                            
                            <!-- 变异生成面板 -->
                            <div class="tab-pane fade" id="variation-panel" role="tabpanel">
                                <div class="form-group">
                                    <label for="seed-data-input">种子数据 (JSON):</label>
                                    <textarea id="seed-data-input" class="form-control" rows="8" placeholder='[{"name": "张三", "age": 30, ...}, ...]'></textarea>
                                </div>
                                
                                <div class="row">
                                    <div class="col-6">
                                        <div class="form-group">
                                            <label for="variation-count">生成数量:</label>
                                            <input type="number" id="variation-count" class="form-control" min="1" max="10000" value="10">
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="form-group">
                                            <label for="variation-factor">变异因子 (0-1):</label>
                                            <input type="range" id="variation-factor" class="form-control-range" min="0" max="1" step="0.1" value="0.3">
                                            <span id="variation-factor-value">0.3</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <button id="load-seed-sample" class="btn btn-outline-secondary">加载示例种子</button>
                                    <button id="upload-seed-data" class="btn btn-outline-secondary">上传种子数据</button>
                                    <button id="variation-generate-btn" class="btn btn-primary">生成数据</button>
                                </div>
                            </div>
                            
                            <!-- LLM生成面板 -->
                            <div class="tab-pane fade" id="llm-panel" role="tabpanel">
                                <div class="form-group">
                                    <label for="llm-prompt">提示词:</label>
                                    <textarea id="llm-prompt" class="form-control" rows="5" placeholder="请生成10条用户数据，包括姓名、年龄、职业和兴趣爱好。格式为JSON数组。"></textarea>
                                </div>
                                
                                <div class="row">
                                    <div class="col-4">
                                        <div class="form-group">
                                            <label for="llm-model">模型:</label>
                                            <select id="llm-model" class="form-control">
                                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                                <option value="gpt-4o">GPT-4o</option>
                                                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="form-group">
                                            <label for="llm-count">估计数量:</label>
                                            <input type="number" id="llm-count" class="form-control" min="1" max="100" value="10">
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="form-group">
                                            <label for="llm-temperature">创造性 (0-1):</label>
                                            <input type="range" id="llm-temperature" class="form-control-range" min="0" max="1" step="0.1" value="0.7">
                                            <span id="llm-temperature-value">0.7</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <button id="load-llm-prompt-sample" class="btn btn-outline-secondary">加载示例提示词</button>
                                    <button id="llm-generate-btn" class="btn btn-primary">生成数据</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 生成的结果区域 -->
                    <div class="generation-results mt-4" id="generation-results" style="display: none;">
                        <div class="results-header d-flex justify-content-between align-items-center">
                            <h4>生成结果</h4>
                            <div class="loading-indicator" id="generation-loading" style="display: none;">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="sr-only">正在生成...</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="results-summary alert alert-info" id="generation-summary"></div>
                        
                        <div class="results-preview">
                            <div class="form-group">
                                <label for="generated-data-output">生成数据预览:</label>
                                <textarea id="generated-data-output" class="form-control" rows="10" readonly></textarea>
                            </div>
                        </div>
                        
                        <div class="results-actions mt-3">
                            <button id="export-generated-json" class="btn btn-outline-primary">导出为JSON</button>
                            <button id="export-generated-csv" class="btn btn-outline-primary">导出为CSV</button>
                            <button id="copy-generated-data" class="btn btn-outline-secondary">复制到剪贴板</button>
                            <button id="analyze-generated-data" class="btn btn-outline-info">分析数据质量</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        // 模板生成相关事件
        const templateGenerateBtn = this.container.querySelector('#template-generate-btn');
        const loadTemplateSampleBtn = this.container.querySelector('#load-template-sample');
        
        templateGenerateBtn.addEventListener('click', () => this.generateFromTemplate());
        loadTemplateSampleBtn.addEventListener('click', () => this.loadTemplateSample());
        
        // 变异生成相关事件
        const variationGenerateBtn = this.container.querySelector('#variation-generate-btn');
        const loadSeedSampleBtn = this.container.querySelector('#load-seed-sample');
        const uploadSeedDataBtn = this.container.querySelector('#upload-seed-data');
        const variationFactorInput = this.container.querySelector('#variation-factor');
        const variationFactorValue = this.container.querySelector('#variation-factor-value');
        
        variationGenerateBtn.addEventListener('click', () => this.generateVariations());
        loadSeedSampleBtn.addEventListener('click', () => this.loadSeedSample());
        uploadSeedDataBtn.addEventListener('click', () => this.uploadSeedData());
        
        variationFactorInput.addEventListener('input', () => {
            variationFactorValue.textContent = variationFactorInput.value;
        });
        
        // LLM生成相关事件
        const llmGenerateBtn = this.container.querySelector('#llm-generate-btn');
        const loadLlmPromptSampleBtn = this.container.querySelector('#load-llm-prompt-sample');
        const llmTemperatureInput = this.container.querySelector('#llm-temperature');
        const llmTemperatureValue = this.container.querySelector('#llm-temperature-value');
        
        llmGenerateBtn.addEventListener('click', () => this.generateWithLLM());
        loadLlmPromptSampleBtn.addEventListener('click', () => this.loadLlmPromptSample());
        
        llmTemperatureInput.addEventListener('input', () => {
            llmTemperatureValue.textContent = llmTemperatureInput.value;
        });
        
        // 结果操作事件
        const exportJsonBtn = this.container.querySelector('#export-generated-json');
        const exportCsvBtn = this.container.querySelector('#export-generated-csv');
        const copyDataBtn = this.container.querySelector('#copy-generated-data');
        const analyzeDataBtn = this.container.querySelector('#analyze-generated-data');
        
        exportJsonBtn.addEventListener('click', () => this.exportAsJson());
        exportCsvBtn.addEventListener('click', () => this.exportAsCsv());
        copyDataBtn.addEventListener('click', () => this.copyToClipboard());
        analyzeDataBtn.addEventListener('click', () => this.analyzeGeneratedData());
    }
    
    // 模板生成实现
    async generateFromTemplate() {
        if (this.isLoading) return;
        
        const templateInput = this.container.querySelector('#template-input');
        const countInput = this.container.querySelector('#template-count');
        const resultsContainer = this.container.querySelector('#generation-results');
        const summary = this.container.querySelector('#generation-summary');
        const dataOutput = this.container.querySelector('#generated-data-output');
        const loadingIndicator = this.container.querySelector('#generation-loading');
        
        try {
            const template = JSON.parse(templateInput.value);
            const count = parseInt(countInput.value, 10);
            
            if (count < 1 || count > 10000) {
                this.showError('生成数量必须在1到10000之间');
                return;
            }
            
            // 显示加载状态
            this.isLoading = true;
            loadingIndicator.style.display = 'block';
            
            // 调用数据生成API
            const result = await window.electronAPI.generateData({
                template: template,
                generation_method: 'template',
                count: count,
                request_id: `gen-${Date.now()}`
            });
            
            if (result.status === 'success') {
                // 保存生成的数据
                this.generatedData = result.generated_data;
                
                // 更新UI
                dataOutput.value = JSON.stringify(result.generated_data.slice(0, 10), null, 2);
                summary.innerHTML = `成功生成 ${result.generated_data.length} 条数据，耗时 ${(result.execution_time_ms / 1000).toFixed(2)} 秒`;
                resultsContainer.style.display = 'block';
                
                this.showSuccess(`已生成 ${result.generated_data.length} 条数据`);
            } else {
                this.showError(result.message || '生成失败');
            }
        } catch (error) {
            this.showError(`生成失败: ${error.message}`);
        } finally {
            this.isLoading = false;
            loadingIndicator.style.display = 'none';
        }
    }
    
    // 变异生成实现
    async generateVariations() {
        if (this.isLoading) return;
        
        const seedDataInput = this.container.querySelector('#seed-data-input');
        const countInput = this.container.querySelector('#variation-count');
        const factorInput = this.container.querySelector('#variation-factor');
        const resultsContainer = this.container.querySelector('#generation-results');
        const summary = this.container.querySelector('#generation-summary');
        const dataOutput = this.container.querySelector('#generated-data-output');
        const loadingIndicator = this.container.querySelector('#generation-loading');
        
        try {
            const seedData = JSON.parse(seedDataInput.value);
            const count = parseInt(countInput.value, 10);
            const variationFactor = parseFloat(factorInput.value);
            
            if (!Array.isArray(seedData) || seedData.length === 0) {
                this.showError('种子数据必须是非空数组');
                return;
            }
            
            // 显示加载状态
            this.isLoading = true;
            loadingIndicator.style.display = 'block';
            
            // 调用数据生成API
            const result = await window.electronAPI.generateData({
                seed_data: seedData,
                generation_method: 'variation',
                count: count,
                variation_factor: variationFactor,
                request_id: `gen-${Date.now()}`
            });
            
            if (result.status === 'success') {
                // 保存生成的数据
                this.generatedData = result.generated_data;
                
                // 更新UI
                dataOutput.value = JSON.stringify(result.generated_data.slice(0, 10), null, 2);
                summary.innerHTML = `基于 ${seedData.length} 条种子数据，成功生成 ${result.generated_data.length} 条变异数据，耗时 ${(result.execution_time_ms / 1000).toFixed(2)} 秒`;
                resultsContainer.style.display = 'block';
                
                this.showSuccess(`已生成 ${result.generated_data.length} 条变异数据`);
            } else {
                this.showError(result.message || '生成失败');
            }
        } catch (error) {
            this.showError(`生成失败: ${error.message}`);
        } finally {
            this.isLoading = false;
            loadingIndicator.style.display = 'none';
        }
    }
    
    // LLM生成实现
    async generateWithLLM() {
        if (this.isLoading) return;
        
        const promptInput = this.container.querySelector('#llm-prompt');
        const modelSelect = this.container.querySelector('#llm-model');
        const countInput = this.container.querySelector('#llm-count');
        const temperatureInput = this.container.querySelector('#llm-temperature');
        const resultsContainer = this.container.querySelector('#generation-results');
        const summary = this.container.querySelector('#generation-summary');
        const dataOutput = this.container.querySelector('#generated-data-output');
        const loadingIndicator = this.container.querySelector('#generation-loading');
        
        try {
            const prompt = promptInput.value.trim();
            const model = modelSelect.value;
            const count = parseInt(countInput.value, 10);
            const temperature = parseFloat(temperatureInput.value);
            
            if (!prompt) {
                this.showError('请输入LLM提示词');
                return;
            }
            
            // 显示加载状态
            this.isLoading = true;
            loadingIndicator.style.display = 'block';
            
            // 调用数据生成API
            const result = await window.electronAPI.generateData({
                generation_method: 'llm_based',
                llm_prompt: prompt,
                llm_model: model,
                count: count,
                temperature: temperature,
                request_id: `gen-${Date.now()}`
            });
            
            if (result.status === 'success') {
                // 保存生成的数据
                this.generatedData = result.generated_data;
                
                // 更新UI
                dataOutput.value = JSON.stringify(result.generated_data.slice(0, 10), null, 2);
                summary.innerHTML = `使用 ${model} 模型，成功生成 ${result.generated_data.length} 条数据，耗时 ${(result.execution_time_ms / 1000).toFixed(2)} 秒<br>消耗 Token: ${result.token_usage?.total_tokens || 'N/A'}`;
                resultsContainer.style.display = 'block';
                
                this.showSuccess(`已生成 ${result.generated_data.length} 条数据`);
            } else {
                this.showError(result.message || '生成失败');
            }
        } catch (error) {
            this.showError(`生成失败: ${error.message}`);
        } finally {
            this.isLoading = false;
            loadingIndicator.style.display = 'none';
        }
    }
    
    // 加载示例数据
    loadTemplateSample() {
        const templateInput = this.container.querySelector('#template-input');
        const sampleTemplate = {
            "name": "{{name}}",
            "age": "{{int:18-65}}",
            "email": "{{email}}",
            "city": "{{city}}",
            "job": "{{choice:工程师,教师,医生,设计师,销售,管理,学生}}",
            "income": "{{float:5000-20000:2}}",
            "registered_at": "{{date:2020-01-01:2023-01-01}}"
        };
        
        templateInput.value = JSON.stringify(sampleTemplate, null, 2);
    }
    
    loadSeedSample() {
        const seedDataInput = this.container.querySelector('#seed-data-input');
        const sampleSeedData = [
            {
                "name": "张三",
                "age": 30,
                "email": "zhangsan@example.com",
                "city": "北京",
                "job": "工程师",
                "income": 12000,
                "registered_at": "2022-03-15"
            },
            {
                "name": "李四",
                "age": 25,
                "email": "lisi@example.com",
                "city": "上海",
                "job": "设计师",
                "income": 9000,
                "registered_at": "2021-07-22"
            },
            {
                "name": "王五",
                "age": 42,
                "email": "wangwu@example.com",
                "city": "广州",
                "job": "管理",
                "income": 18000,
                "registered_at": "2020-11-05"
            }
        ];
        
        seedDataInput.value = JSON.stringify(sampleSeedData, null, 2);
    }
    
    loadLlmPromptSample() {
        const promptInput = this.container.querySelector('#llm-prompt');
        promptInput.value = `请生成10条中国用户数据，数据需要包含以下字段：
- name: 中文姓名
- age: 18-65岁之间的年龄
- email: 有效的电子邮件地址
- city: 中国城市名称
- job: 职业
- income: 月收入(数字)
- interests: 兴趣爱好(数组)

请以JSON数组格式返回，每条数据都必须包含上述所有字段。`;
    }
    
    // 上传种子数据
    async uploadSeedData() {
        try {
            const result = await window.electronAPI.openFile({
                title: '选择数据文件',
                filters: [
                    { name: 'JSON文件', extensions: ['json'] },
                    { name: '所有文件', extensions: ['*'] }
                ]
            });
            
            if (result.canceled) return;
            
            const filePath = result.filePaths[0];
            const content = await window.electronAPI.readFile(filePath);
            
            try {
                const data = JSON.parse(content);
                const seedDataInput = this.container.querySelector('#seed-data-input');
                seedDataInput.value = JSON.stringify(data, null, 2);
            } catch (error) {
                this.showError(`文件解析失败: ${error.message}`);
            }
        } catch (error) {
            this.showError(`文件读取失败: ${error.message}`);
        }
    }
    
    // 导出为JSON
    async exportAsJson() {
        if (!this.generatedData) {
            this.showError('没有可导出的数据');
            return;
        }
        
        try {
            const json = JSON.stringify(this.generatedData, null, 2);
            const defaultPath = `generated_data_${new Date().toISOString().slice(0, 10)}.json`;
            
            const result = await window.electronAPI.saveFile(json, defaultPath);
            if (result && result.filePath) {
                this.showSuccess(`数据已导出到: ${result.filePath}`);
            }
        } catch (error) {
            this.showError(`导出失败: ${error.message}`);
        }
    }
    
    // 导出为CSV
    async exportAsCsv() {
        if (!this.generatedData || this.generatedData.length === 0) {
            this.showError('没有可导出的数据');
            return;
        }
        
        try {
            // 获取所有字段
            const fields = Object.keys(this.generatedData[0]);
            
            // 创建CSV内容
            let csv = fields.join(',') + '\r\n';
            
            // 添加每行数据
            this.generatedData.forEach(item => {
                const row = fields.map(field => {
                    const value = item[field];
                    
                    if (value === null || value === undefined) {
                        return '';
                    } else if (typeof value === 'string') {
                        // 为包含逗号、引号或换行符的字符串添加引号
                        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    } else if (typeof value === 'object') {
                        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                    } else {
                        return value;
                    }
                }).join(',');
                
                csv += row + '\r\n';
            });
            
            // 保存CSV文件
            const defaultPath = `generated_data_${new Date().toISOString().slice(0, 10)}.csv`;
            const result = await window.electronAPI.saveFile(csv, defaultPath);
            
            if (result && result.filePath) {
                this.showSuccess(`数据已导出到: ${result.filePath}`);
            }
        } catch (error) {
            this.showError(`导出失败: ${error.message}`);
        }
    }
    
    // 复制到剪贴板
    copyToClipboard() {
        if (!this.generatedData) {
            this.showError('没有可复制的数据');
            return;
        }
        
        try {
            const json = JSON.stringify(this.generatedData, null, 2);
            navigator.clipboard.writeText(json).then(() => {
                this.showSuccess('数据已复制到剪贴板');
            });
        } catch (error) {
            this.showError(`复制失败: ${error.message}`);
        }
    }
    
    // 分析生成的数据质量
    analyzeGeneratedData() {
        if (!this.generatedData) {
            this.showError('没有可分析的数据');
            return;
        }
        
        // 这里可以跳转到质量评估模块，或者直接调用质量评估API
        if (window.ui && typeof window.ui.navigateToQualityAssessment === 'function') {
            window.ui.navigateToQualityAssessment(this.generatedData);
        } else {
            this.showError('质量评估功能尚未实现');
        }
    }
    
    // 辅助方法：显示错误消息
    showError(message) {
        if (window.ui && window.ui.showNotification) {
            window.ui.showNotification('错误', message, 'error');
        } else {
            alert(`错误: ${message}`);
        }
    }
    
    // 辅助方法：显示成功消息
    showSuccess(message) {
        if (window.ui && window.ui.showNotification) {
            window.ui.showNotification('成功', message, 'success');
        } else {
            alert(message);
        }
    }
}

export default DataGenerationComponent;
