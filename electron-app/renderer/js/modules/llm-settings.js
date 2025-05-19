/**
 * LLM设置组件
 * 用于管理LLM提供商配置和模型选择
 */
class LLMSettingsComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.providerConfigs = {};
        this.activeProvider = null;
        this.initialize();
    }

    async initialize() {
        try {
            // 加载LLM提供商配置
            await this.loadProviderConfigs();
            
            // 渲染设置界面
            this.render();
            
            // 绑定事件处理
            this.attachEventListeners();
        } catch (error) {
            console.error('初始化LLM设置组件失败:', error);
            showErrorNotification('无法加载LLM提供商配置');
        }
    }

    async loadProviderConfigs() {
        try {
            // 通过API获取当前配置
            const response = await window.electronAPI.getLLMProviders();
            
            if (response.status === 'success') {
                this.providerConfigs = response.providers;
                
                // 设置默认激活的提供商
                if (Object.keys(this.providerConfigs).length > 0) {
                    // 选择第一个配置好的提供商
                    const configuredProviders = Object.entries(this.providerConfigs)
                        .filter(([_, config]) => config.is_configured);
                    
                    if (configuredProviders.length > 0) {
                        this.activeProvider = configuredProviders[0][0];
                    } else {
                        // 如果没有配置好的提供商，选择第一个
                        this.activeProvider = Object.keys(this.providerConfigs)[0];
                    }
                }
            } else {
                throw new Error(response.message || '获取提供商配置失败');
            }
        } catch (error) {
            console.error('加载LLM提供商配置失败:', error);
            this.providerConfigs = {
                'openai': {
                    name: 'OpenAI',
                    is_configured: false,
                    models: []
                },
                'anthropic': {
                    name: 'Anthropic',
                    is_configured: false,
                    models: []
                },
                'gemini': {
                    name: 'Google Gemini',
                    is_configured: false,
                    models: []
                },
                'deepseek': {
                    name: 'DeepSeek',
                    is_configured: false,
                    models: []
                }
            };
            
            this.activeProvider = 'openai';
        }
    }

    render() {
        // 创建主布局
        this.container.innerHTML = `
            <div class="llm-settings">
                <div class="provider-sidebar">
                    <h3>LLM提供商</h3>
                    <ul class="provider-list">
                        ${this.renderProviderList()}
                    </ul>
                    <button id="add-provider-btn" class="btn">添加提供商</button>
                </div>
                <div class="provider-settings">
                    ${this.renderProviderSettings()}
                </div>
            </div>
        `;
    }

    renderProviderList() {
        return Object.entries(this.providerConfigs)
            .map(([providerId, config]) => {
                const isActive = providerId === this.activeProvider;
                const isConfigured = config.is_configured;
                return `
                    <li class="provider-item ${isActive ? 'active' : ''} ${isConfigured ? 'configured' : 'not-configured'}" 
                        data-provider="${providerId}">
                        <span class="provider-name">${config.name || providerId}</span>
                        <span class="provider-status">${isConfigured ? '✓' : '✗'}</span>
                    </li>
                `;
            })
            .join('');
    }

    renderProviderSettings() {
        if (!this.activeProvider || !this.providerConfigs[this.activeProvider]) {
            return `<div class="empty-state">请选择或添加LLM提供商</div>`;
        }
        
        const config = this.providerConfigs[this.activeProvider];
        
        return `
            <h3>${config.name || this.activeProvider} 设置</h3>
            <div class="settings-form">
                <div class="form-group">
                    <label for="api-key">API密钥</label>
                    <div class="input-with-action">
                        <input type="password" id="api-key" class="form-control" 
                            value="${config.api_key || ''}" placeholder="输入API密钥">
                        <button id="toggle-api-key" class="btn btn-icon" title="显示/隐藏">
                            <i class="ri-eye-line"></i>
                        </button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="default-model">默认模型</label>
                    <select id="default-model" class="form-control">
                        ${this.renderModelOptions()}
                    </select>
                </div>
                
                ${this.renderProviderSpecificSettings()}
                
                <div class="form-actions">
                    <button id="test-connection-btn" class="btn">测试连接</button>
                    <button id="save-provider-btn" class="btn btn-primary">保存设置</button>
                </div>
                
                <div id="connection-status" class="connection-status"></div>
            </div>
        `;
    }

    renderModelOptions() {
        const config = this.providerConfigs[this.activeProvider];
        const models = config.models || [];
        
        if (models.length === 0) {
            return `<option value="">无可用模型</option>`;
        }
        
        return models
            .map(model => {
                const isSelected = model === config.default_model;
                return `<option value="${model}" ${isSelected ? 'selected' : ''}>${model}</option>`;
            })
            .join('');
    }

    renderProviderSpecificSettings() {
        // 根据不同提供商渲染特定设置
        switch (this.activeProvider) {
            case 'openai':
                return `
                    <div class="form-group">
                        <label for="api-base-url">API基础URL (可选)</label>
                        <input type="text" id="api-base-url" class="form-control" 
                            value="${this.providerConfigs.openai?.base_url || ''}" 
                            placeholder="https://api.openai.com/v1">
                        <div class="form-hint">用于自托管OpenAI兼容接口</div>
                    </div>
                `;
            case 'anthropic':
                return `
                    <div class="form-group">
                        <label for="anthropic-version">Anthropic版本</label>
                        <input type="text" id="anthropic-version" class="form-control" 
                            value="${this.providerConfigs.anthropic?.version || '2023-06-01'}" 
                            placeholder="2023-06-01">
                    </div>
                `;
            case 'deepseek':
                return `
                    <div class="form-group">
                        <label for="deepseek-base-url">API基础URL</label>
                        <input type="text" id="deepseek-base-url" class="form-control" 
                            value="${this.providerConfigs.deepseek?.base_url || 'https://api.deepseek.com/v1'}" 
                            placeholder="https://api.deepseek.com/v1">
                    </div>
                `;
            default:
                return '';
        }
    }

    attachEventListeners() {
        // 提供商切换事件
        const providerItems = this.container.querySelectorAll('.provider-item');
        providerItems.forEach(item => {
            item.addEventListener('click', () => {
                this.activeProvider = item.getAttribute('data-provider');
                this.render();
                this.attachEventListeners();
            });
        });
        
        // 切换API密钥可见性
        const toggleApiKeyBtn = this.container.querySelector('#toggle-api-key');
        if (toggleApiKeyBtn) {
            toggleApiKeyBtn.addEventListener('click', () => {
                const apiKeyInput = this.container.querySelector('#api-key');
                const isPassword = apiKeyInput.type === 'password';
                apiKeyInput.type = isPassword ? 'text' : 'password';
                toggleApiKeyBtn.querySelector('i').className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
            });
        }
        
        // 测试连接
        const testConnectionBtn = this.container.querySelector('#test-connection-btn');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.testConnection());
        }
        
        // 保存设置
        const saveProviderBtn = this.container.querySelector('#save-provider-btn');
        if (saveProviderBtn) {
            saveProviderBtn.addEventListener('click', () => this.saveProviderConfig());
        }
        
        // 添加提供商
        const addProviderBtn = this.container.querySelector('#add-provider-btn');
        if (addProviderBtn) {
            addProviderBtn.addEventListener('click', () => this.showAddProviderDialog());
        }
    }

    async testConnection() {
        const connectionStatus = this.container.querySelector('#connection-status');
        const testConnectionBtn = this.container.querySelector('#test-connection-btn');
        
        try {
            // 禁用按钮，显示加载状态
            testConnectionBtn.disabled = true;
            testConnectionBtn.innerHTML = '测试中...';
            connectionStatus.innerHTML = '正在连接...';
            connectionStatus.className = 'connection-status connecting';
            
            // 获取当前设置
            const providerId = this.activeProvider;
            const apiKey = this.container.querySelector('#api-key').value;
            const defaultModel = this.container.querySelector('#default-model').value;
            
            // 根据提供商获取特定设置
            let additionalConfig = {};
            switch (providerId) {
                case 'openai':
                    const baseUrl = this.container.querySelector('#api-base-url').value;
                    if (baseUrl) additionalConfig.base_url = baseUrl;
                    break;
                case 'anthropic':
                    const version = this.container.querySelector('#anthropic-version').value;
                    if (version) additionalConfig.version = version;
                    break;
                case 'deepseek':
                    const deepseekBaseUrl = this.container.querySelector('#deepseek-base-url').value;
                    if (deepseekBaseUrl) additionalConfig.base_url = deepseekBaseUrl;
                    break;
            }
            
            // 测试API连接
            const response = await window.electronAPI.testLLMConnection({
                provider_id: providerId,
                api_key: apiKey,
                model: defaultModel,
                ...additionalConfig
            });
            
            // 显示测试结果
            if (response.status === 'success') {
                connectionStatus.innerHTML = `
                    <div class="success">
                        <i class="ri-check-line"></i>
                        连接成功! 模型: ${response.model}, 延迟: ${response.latency}ms
                    </div>
                `;
                connectionStatus.className = 'connection-status success';
            } else {
                connectionStatus.innerHTML = `
                    <div class="error">
                        <i class="ri-error-warning-line"></i>
                        连接失败: ${response.message}
                    </div>
                `;
                connectionStatus.className = 'connection-status error';
            }
        } catch (error) {
            connectionStatus.innerHTML = `
                <div class="error">
                    <i class="ri-error-warning-line"></i>
                    测试出错: ${error.message}
                </div>
            `;
            connectionStatus.className = 'connection-status error';
        } finally {
            // 恢复按钮状态
            testConnectionBtn.disabled = false;
            testConnectionBtn.innerHTML = '测试连接';
        }
    }

    async saveProviderConfig() {
        try {
            // 获取当前设置
            const providerId = this.activeProvider;
            const apiKey = this.container.querySelector('#api-key').value;
            const defaultModel = this.container.querySelector('#default-model').value;
            
            // 基本配置
            const config = {
                name: this.providerConfigs[providerId].name,
                api_key: apiKey,
                default_model: defaultModel,
                models: this.providerConfigs[providerId].models || []
            };
            
            // 根据提供商获取特定设置
            switch (providerId) {
                case 'openai':
                    const baseUrl = this.container.querySelector('#api-base-url').value;
                    if (baseUrl) config.base_url = baseUrl;
                    break;
                case 'anthropic':
                    const version = this.container.querySelector('#anthropic-version').value;
                    if (version) config.version = version;
                    break;
                case 'deepseek':
                    const deepseekBaseUrl = this.container.querySelector('#deepseek-base-url').value;
                    if (deepseekBaseUrl) config.base_url = deepseekBaseUrl;
                    break;
            }
            
            // 保存配置
            const response = await window.electronAPI.saveLLMProviderConfig(providerId, config);
            
            if (response.status === 'success') {
                showSuccessNotification('提供商配置已保存');
                
                // 更新本地缓存的配置
                this.providerConfigs[providerId] = {
                    ...this.providerConfigs[providerId],
                    ...config,
                    is_configured: true
                };
                
                // 重新渲染
                this.render();
                this.attachEventListeners();
            } else {
                showErrorNotification(`保存失败: ${response.message}`);
            }
        } catch (error) {
            console.error('保存提供商配置失败:', error);
            showErrorNotification(`保存失败: ${error.message}`);
        }
    }

    showAddProviderDialog() {
        // 创建自定义提供商添加对话框
        const providers = [
            { id: 'openai', name: 'OpenAI' },
            { id: 'anthropic', name: 'Anthropic' },
            { id: 'gemini', name: 'Google Gemini' },
            { id: 'deepseek', name: 'DeepSeek' },
            { id: 'custom', name: '自定义提供商' }
        ];
        
        showDialog({
            title: '添加LLM提供商',
            content: `
                <div class="provider-selection">
                    <div class="form-group">
                        <label for="provider-type">选择提供商类型</label>
                        <select id="provider-type" class="form-control">
                            ${providers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div id="custom-provider-fields" style="display: none;">
                        <div class="form-group">
                            <label for="custom-provider-id">提供商ID</label>
                            <input type="text" id="custom-provider-id" class="form-control" placeholder="my_provider">
                        </div>
                        <div class="form-group">
                            <label for="custom-provider-name">显示名称</label>
                            <input type="text" id="custom-provider-name" class="form-control" placeholder="我的提供商">
                        </div>
                    </div>
                </div>
            `,
            onOpen: () => {
                // 监听提供商类型变化
                const providerTypeSelect = document.getElementById('provider-type');
                const customProviderFields = document.getElementById('custom-provider-fields');
                
                providerTypeSelect.addEventListener('change', () => {
                    customProviderFields.style.display = 
                        providerTypeSelect.value === 'custom' ? 'block' : 'none';
                });
            },
            buttons: [
                {
                    text: '取消',
                    role: 'cancel'
                },
                {
                    text: '添加',
                    role: 'confirm',
                    onClick: async () => {
                        const providerType = document.getElementById('provider-type').value;
                        let providerId, providerName;
                        
                        if (providerType === 'custom') {
                            providerId = document.getElementById('custom-provider-id').value;
                            providerName = document.getElementById('custom-provider-name').value;
                            
                            if (!providerId) {
                                showErrorNotification('请输入提供商ID');
                                return false;
                            }
                        } else {
                            providerId = providerType;
                            providerName = providers.find(p => p.id === providerType).name;
                        }
                        
                        // 检查提供商是否已存在
                        if (this.providerConfigs[providerId]) {
                            showErrorNotification(`提供商 ${providerId} 已存在`);
                            return false;
                        }
                        
                        // 添加新提供商
                        this.providerConfigs[providerId] = {
                            name: providerName,
                            is_configured: false,
                            models: []
                        };
                        
                        this.activeProvider = providerId;
                        this.render();
                        this.attachEventListeners();
                        
                        return true;
                    }
                }
            ]
        });
    }
}

// 导出组件
export default LLMSettingsComponent;
