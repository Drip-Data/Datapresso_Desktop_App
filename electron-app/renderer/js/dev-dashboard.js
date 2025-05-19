/**
 * 开发状态仪表板
 * 提供工程进度和组件测试入口
 */

class DevDashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('容器元素不存在:', containerId);
      return;
    }
    
    this.init();
  }
  
  init() {
    this.renderDashboard();
    this.attachEventListeners();
  }
  
  renderDashboard() {
    this.container.innerHTML = `
      <div class="dev-dashboard">
        <h2>Datapresso 开发状态仪表板</h2>
        
        <div class="module-status-container">
          <h3>模块开发状态</h3>
          <div class="status-grid">
            ${this.renderModuleStatusCards()}
          </div>
        </div>
        
        <div class="api-tester-container">
          <h3>API测试工具</h3>
          <div class="api-tester">
            <div class="form-group">
              <label for="api-endpoint">API端点:</label>
              <select id="api-endpoint" class="form-control">
                <option value="data_filtering/filter">数据过滤</option>
                <option value="data_generation/generate">数据生成</option>
                <option value="evaluation/evaluate">评估</option>
                <option value="quality_assessment/assess">质量评估</option>
                <option value="llm_api/invoke">LLM API</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="api-payload">请求体 (JSON):</label>
              <textarea id="api-payload" class="form-control" rows="6"></textarea>
            </div>
            
            <button id="send-api-request" class="btn btn-primary">发送请求</button>
            
            <div class="form-group">
              <label for="api-response">响应:</label>
              <textarea id="api-response" class="form-control" rows="8" readonly></textarea>
            </div>
          </div>
        </div>
        
        <div class="component-preview-container">
          <h3>组件预览</h3>
          <div class="component-selector">
            <select id="component-selector" class="form-control">
              <option value="">-- 选择组件 --</option>
              <option value="data-filtering-component">数据过滤组件</option>
              <option value="data-generation-component">数据生成组件</option>
              <option value="quality-assessment-component">质量评估组件</option>
              <option value="llm-api-component">LLM API组件</option>
            </select>
          </div>
          
          <div id="component-preview-area" class="component-preview-area"></div>
        </div>
      </div>
    `;
  }
  
  renderModuleStatusCards() {
    const modules = [
      { name: '数据过滤', id: 'data-filtering', progress: 90, status: 'stable' },
      { name: '数据生成', id: 'data-generation', progress: 75, status: 'in-progress' },
      { name: '评估', id: 'evaluation', progress: 60, status: 'in-progress' },
      { name: 'LlamaFactory', id: 'llamafactory', progress: 40, status: 'in-development' },
      { name: 'LLM API', id: 'llm-api', progress: 80, status: 'stable' },
      { name: '质量评估', id: 'quality-assessment', progress: 70, status: 'in-progress' }
    ];
    
    return modules.map(module => `
      <div class="status-card ${module.status}">
        <h4>${module.name}</h4>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${module.progress}%"></div>
        </div>
        <div class="progress-text">${module.progress}% 完成</div>
        <div class="status-badge">${this.getStatusLabel(module.status)}</div>
        <button class="test-module-btn" data-module="${module.id}">测试</button>
      </div>
    `).join('');
  }
  
  getStatusLabel(status) {
    switch (status) {
      case 'stable': return '稳定';
      case 'in-progress': return '开发中';
      case 'in-development': return '初始开发';
      case 'planned': return '计划中';
      default: return '未知';
    }
  }
  
  attachEventListeners() {
    // API测试按钮
    const sendApiBtn = this.container.querySelector('#send-api-request');
    if (sendApiBtn) {
      sendApiBtn.addEventListener('click', () => this.handleApiRequest());
    }
    
    // 组件选择器
    const componentSelector = this.container.querySelector('#component-selector');
    if (componentSelector) {
      componentSelector.addEventListener('change', (e) => this.loadComponent(e.target.value));
    }
    
    // 模块测试按钮
    const testBtns = this.container.querySelectorAll('.test-module-btn');
    testBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.testModule(e.target.dataset.module));
    });
  }
  
  async handleApiRequest() {
    const endpoint = this.container.querySelector('#api-endpoint').value;
    const payloadStr = this.container.querySelector('#api-payload').value;
    const responseTextarea = this.container.querySelector('#api-response');
    
    responseTextarea.value = 'Loading...';
    
    try {
      const payload = JSON.parse(payloadStr);
      const response = await this.sendApiRequest(endpoint, payload);
      responseTextarea.value = JSON.stringify(response, null, 2);
    } catch (error) {
      responseTextarea.value = `Error: ${error.message}`;
    }
  }
  
  async sendApiRequest(endpoint, payload) {
    if (window.electronAPI) {
      // Electron环境
      const apiName = endpoint.replace('/', '_');
      if (typeof window.electronAPI[apiName] === 'function') {
        return await window.electronAPI[apiName](payload);
      } else {
        return await window.electronAPI.genericApiCall(endpoint, payload);
      }
    } else {
      // 浏览器环境
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      return await response.json();
    }
  }
  
  loadComponent(componentId) {
    const previewArea = this.container.querySelector('#component-preview-area');
    
    if (!componentId) {
      previewArea.innerHTML = '<p>请选择一个组件以预览</p>';
      return;
    }
    
    // 动态加载组件
    import(`../js/components/${componentId}.js`)
      .then(module => {
        previewArea.innerHTML = '<div id="component-container"></div>';
        const ComponentClass = module.default;
        new ComponentClass('component-container');
      })
      .catch(error => {
        previewArea.innerHTML = `<div class="error-message">加载组件失败: ${error.message}</div>`;
      });
  }
  
  testModule(moduleId) {
    // 跳转到对应模块页面
    const moduleNavItem = document.querySelector(`.nav-item[data-target="${moduleId}"]`);
    if (moduleNavItem) {
      moduleNavItem.click();
    } else {
      alert(`模块 "${moduleId}" 的导航项不存在`);
    }
  }
}

// 导出模块
export default DevDashboard;
