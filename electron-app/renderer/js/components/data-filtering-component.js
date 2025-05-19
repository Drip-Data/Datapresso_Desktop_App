class DataFilteringComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.filterConditions = [];
        this.combineOperation = "AND";
        this.data = null;
        this.filteredData = null;
        this.isLoading = false;
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
                    <h3>数据过滤</h3>
                    <p>根据条件过滤和处理数据集</p>
                </div>
                
                <div class="card-body">
                    <div class="row">
                        <div class="col-8">
                            <div class="form-group">
                                <label for="data-input">输入数据 (JSON):</label>
                                <textarea id="data-input" class="form-control" rows="8" placeholder='[{"field1": "value1", "field2": 123}, ...]'></textarea>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="form-group">
                                <label>数据源选项:</label>
                                <div class="btn-group-vertical w-100">
                                    <button id="load-sample-btn" class="btn btn-outline-secondary mb-2">加载示例数据</button>
                                    <button id="load-file-btn" class="btn btn-outline-secondary mb-2">从文件导入</button>
                                    <button id="paste-clipboard-btn" class="btn btn-outline-secondary">从剪贴板粘贴</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="filter-conditions mt-4">
                        <h4>过滤条件</h4>
                        <div id="filter-conditions-container"></div>
                        
                        <div class="mt-2 mb-3">
                            <button id="add-condition-btn" class="btn btn-outline-primary">
                                <i class="ri-add-line"></i> 添加条件
                            </button>
                        </div>
                        
                        <div class="form-group">
                            <label>条件组合方式:</label>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="combine-operation" id="combine-and" value="AND" checked>
                                <label class="form-check-label" for="combine-and">
                                    AND (所有条件都必须满足)
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="combine-operation" id="combine-or" value="OR">
                                <label class="form-check-label" for="combine-or">
                                    OR (满足任一条件即可)
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="filter-options mt-3">
                        <h4>其他选项</h4>
                        <div class="row">
                            <div class="col-6">
                                <div class="form-group">
                                    <label for="order-by">排序字段:</label>
                                    <select id="order-by" class="form-control">
                                        <option value="">-- 不排序 --</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="form-group">
                                    <label for="order-direction">排序方向:</label>
                                    <select id="order-direction" class="form-control">
                                        <option value="asc">升序</option>
                                        <option value="desc">降序</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-6">
                                <div class="form-group">
                                    <label for="limit">结果数量限制:</label>
                                    <input type="number" id="limit" class="form-control" min="1" placeholder="不限制">
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="form-group">
                                    <label for="offset">结果偏移量:</label>
                                    <input type="number" id="offset" class="form-control" min="0" placeholder="0">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <button id="filter-btn" class="btn btn-primary btn-lg">过滤数据</button>
                        <div class="loading-spinner ml-2" id="loading-spinner" style="display: none;">
                            <div class="spinner-border text-primary" role="status">
                                <span class="sr-only">Loading...</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="filter-results mt-4" id="filter-results" style="display: none;">
                        <h4>过滤结果</h4>
                        <div class="alert alert-info" id="result-summary"></div>
                        
                        <div class="table-responsive">
                            <table class="table table-bordered table-hover" id="result-table">
                                <thead>
                                    <tr id="result-table-header"></tr>
                                </thead>
                                <tbody id="result-table-body"></tbody>
                            </table>
                        </div>
                        
                        <div class="mt-3">
                            <button id="export-json-btn" class="btn btn-outline-secondary">导出为JSON</button>
                            <button id="export-csv-btn" class="btn btn-outline-secondary">导出为CSV</button>
                            <button id="visualization-btn" class="btn btn-outline-secondary">可视化</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 初始化过滤条件容器
        this.renderFilterCondition();
    }
    
    renderFilterCondition(index = 0, condition = null) {
        const container = this.container.querySelector('#filter-conditions-container');
        const conditionElement = document.createElement('div');
        conditionElement.className = 'filter-condition card mb-3';
        conditionElement.dataset.index = index;
        
        let fields = ['field1', 'field2']; // 默认字段，将通过数据动态更新
        if (this.data && this.data.length > 0) {
            fields = Object.keys(this.data[0]);
        }
        
        const operations = [
            { value: 'equals', label: '等于' },
            { value: 'not_equals', label: '不等于' },
            { value: 'greater_than', label: '大于' },
            { value: 'less_than', label: '小于' },
            { value: 'contains', label: '包含' },
            { value: 'not_contains', label: '不包含' },
            { value: 'starts_with', label: '开始于' },
            { value: 'ends_with', label: '结束于' },
            { value: 'in_range', label: '在范围内' },
            { value: 'not_in_range', label: '不在范围内' },
            { value: 'regex_match', label: '正则匹配' },
            { value: 'is_null', label: '为空' },
            { value: 'is_not_null', label: '不为空' }
        ];
        
        conditionElement.innerHTML = `
            <div class="card-body">
                <div class="row">
                    <div class="col-10">
                        <div class="row">
                            <div class="col-4">
                                <div class="form-group">
                                    <label>字段:</label>
                                    <select class="form-control field-select">
                                        ${fields.map(field => `<option value="${field}"${condition && condition.field === field ? ' selected' : ''}>${field}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="form-group">
                                    <label>操作:</label>
                                    <select class="form-control operation-select">
                                        ${operations.map(op => `<option value="${op.value}"${condition && condition.operation === op.value ? ' selected' : ''}>${op.label}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="form-group value-container">
                                    <label>值:</label>
                                    <input type="text" class="form-control value-input" ${condition ? `value="${condition.value || ''}"` : ''}>
                                </div>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-12">
                                <div class="form-check">
                                    <input class="form-check-input case-sensitive-check" type="checkbox" ${condition && condition.case_sensitive ? 'checked' : ''}>
                                    <label class="form-check-label">区分大小写（适用于字符串操作）</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-2 d-flex align-items-center justify-content-center">
                        <button class="btn btn-outline-danger remove-condition-btn">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(conditionElement);
        
        // 设置事件监听器
        this.setConditionEventListeners(conditionElement, index);
        
        // 根据操作类型显示/隐藏值输入框
        this.updateValueInputVisibility(conditionElement);
    }
    
    setConditionEventListeners(conditionElement, index) {
        // 删除条件按钮
        const removeBtn = conditionElement.querySelector('.remove-condition-btn');
        removeBtn.addEventListener('click', () => {
            this.removeFilterCondition(index);
        });
        
        // 操作类型变更监听
        const operationSelect = conditionElement.querySelector('.operation-select');
        operationSelect.addEventListener('change', () => {
            this.updateValueInputVisibility(conditionElement);
            this.updateFilterCondition(index);
        });
        
        // 字段、值和大小写敏感选项变更监听
        const fieldSelect = conditionElement.querySelector('.field-select');
        const valueInput = conditionElement.querySelector('.value-input');
        const caseSensitiveCheck = conditionElement.querySelector('.case-sensitive-check');
        
        [fieldSelect, valueInput, caseSensitiveCheck].forEach(element => {
            element.addEventListener('change', () => {
                this.updateFilterCondition(index);
            });
            
            if (element === valueInput) {
                element.addEventListener('input', () => {
                    this.updateFilterCondition(index);
                });
            }
        });
    }
    
    updateValueInputVisibility(conditionElement) {
        const operation = conditionElement.querySelector('.operation-select').value;
        const valueContainer = conditionElement.querySelector('.value-container');
        
        // 特定操作不需要值
        if (operation === 'is_null' || operation === 'is_not_null') {
            valueContainer.style.display = 'none';
        } else {
            valueContainer.style.display = 'block';
        }
    }
    
    updateFilterCondition(index) {
        const conditionElement = this.container.querySelector(`.filter-condition[data-index="${index}"]`);
        if (!conditionElement) return;
        
        const field = conditionElement.querySelector('.field-select').value;
        const operation = conditionElement.querySelector('.operation-select').value;
        const valueInput = conditionElement.querySelector('.value-input');
        const caseSensitive = conditionElement.querySelector('.case-sensitive-check').checked;
        
        let value = valueInput.value;
        
        // 转换值类型（尝试解析数值）
        if (!isNaN(value) && value !== '') {
            value = Number(value);
        }
        
        // 处理特殊操作类型
        if (operation === 'in_range' || operation === 'not_in_range') {
            // 尝试解析为范围数组 (例如: "10,20" 解析为 [10, 20])
            try {
                const parts = value.split(',').map(part => part.trim());
                if (parts.length === 2) {
                    const min = Number(parts[0]);
                    const max = Number(parts[1]);
                    if (!isNaN(min) && !isNaN(max)) {
                        value = [min, max];
                    }
                }
            } catch (e) {
                console.error('范围值解析失败', e);
            }
        }
        
        // 更新过滤条件数组
        this.filterConditions[index] = {
            field,
            operation,
            value,
            case_sensitive: caseSensitive
        };
    }
    
    addFilterCondition() {
        const index = this.filterConditions.length;
        this.filterConditions.push({
            field: this.data && this.data.length > 0 ? Object.keys(this.data[0])[0] : 'field1',
            operation: 'equals',
            value: '',
            case_sensitive: false
        });
        
        this.renderFilterCondition(index, this.filterConditions[index]);
    }
    
    removeFilterCondition(index) {
        // 获取所有条件元素
        const conditionElements = this.container.querySelectorAll('.filter-condition');
        
        // 移除DOM元素
        conditionElements[index].remove();
        
        // 从数组中移除条件
        this.filterConditions.splice(index, 1);
        
        // 更新剩余条件的索引
        conditionElements.forEach((element, i) => {
            if (i > index) {
                element.dataset.index = i - 1;
            }
        });
    }
    
    updateOrderByOptions() {
        if (!this.data || this.data.length === 0) return;
        
        const orderBySelect = this.container.querySelector('#order-by');
        const fields = Object.keys(this.data[0]);
        
        // 保存当前选中的值
        const currentValue = orderBySelect.value;
        
        // 清空选项并添加默认选项
        orderBySelect.innerHTML = '<option value="">-- 不排序 --</option>';
        
        // 添加所有字段
        fields.forEach(field => {
            const option = document.createElement('option');
            option.value = field;
            option.textContent = field;
            orderBySelect.appendChild(option);
        });
        
        // 恢复之前的选择，如果字段仍然存在
        if (fields.includes(currentValue)) {
            orderBySelect.value = currentValue;
        }
    }
    
    async attachEventListeners() {
        // 加载示例数据
        const loadSampleBtn = this.container.querySelector('#load-sample-btn');
        loadSampleBtn.addEventListener('click', () => {
            this.loadSampleData();
        });
        
        // 从文件导入
        const loadFileBtn = this.container.querySelector('#load-file-btn');
        loadFileBtn.addEventListener('click', async () => {
            await this.loadFromFile();
        });
        
        // 从剪贴板粘贴
        const pasteClipboardBtn = this.container.querySelector('#paste-clipboard-btn');
        pasteClipboardBtn.addEventListener('click', async () => {
            await this.pasteFromClipboard();
        });
        
        // 添加条件
        const addConditionBtn = this.container.querySelector('#add-condition-btn');
        addConditionBtn.addEventListener('click', () => {
            this.addFilterCondition();
        });
        
        // 条件组合方式
        const combineAndRadio = this.container.querySelector('#combine-and');
        const combineOrRadio = this.container.querySelector('#combine-or');
        
        combineAndRadio.addEventListener('change', () => {
            if (combineAndRadio.checked) {
                this.combineOperation = "AND";
            }
        });
        
        combineOrRadio.addEventListener('change', () => {
            if (combineOrRadio.checked) {
                this.combineOperation = "OR";
            }
        });
        
        // 过滤按钮
        const filterBtn = this.container.querySelector('#filter-btn');
        filterBtn.addEventListener('click', async () => {
            await this.filterData();
        });
        
        // 导出按钮
        const exportJsonBtn = this.container.querySelector('#export-json-btn');
        exportJsonBtn.addEventListener('click', () => {
            this.exportAsJson();
        });
        
        const exportCsvBtn = this.container.querySelector('#export-csv-btn');
        exportCsvBtn.addEventListener('click', () => {
            this.exportAsCsv();
        });
        
        // 可视化按钮
        const visualizationBtn = this.container.querySelector('#visualization-btn');
        visualizationBtn.addEventListener('click', () => {
            this.showVisualization();
        });
    }
    
    async loadSampleData() {
        const sampleData = [
            { "id": 1, "name": "产品A", "category": "电子", "price": 299.99, "stock": 150, "rating": 4.5 },
            { "id": 2, "name": "产品B", "category": "家居", "price": 59.99, "stock": 200, "rating": 3.8 },
            { "id": 3, "name": "产品C", "category": "电子", "price": 999.99, "stock": 50, "rating": 4.9 },
            { "id": 4, "name": "产品D", "category": "服装", "price": 29.99, "stock": 300, "rating": 4.2 },
            { "id": 5, "name": "产品E", "category": "家居", "price": 149.99, "stock": 100, "rating": 4.0 },
            { "id": 6, "name": "产品F", "category": "服装", "price": 39.99, "stock": 250, "rating": null },
            { "id": 7, "name": "产品G", "category": "电子", "price": 499.99, "stock": 75, "rating": 4.7 },
            { "id": 8, "name": "产品H", "category": "", "price": 79.99, "stock": 180, "rating": 3.5 },
            { "id": 9, "name": "产品I", "category": "家居", "price": 89.99, "stock": null, "rating": 4.1 },
            { "id": 10, "name": "产品J", "category": "电子", "price": 1299.99, "stock": 25, "rating": 4.8 }
        ];
        
        const dataInput = this.container.querySelector('#data-input');
        dataInput.value = JSON.stringify(sampleData, null, 2);
        
        // 解析数据
        this.data = sampleData;
        
        // 更新字段选择器
        this.updateFieldSelectors();
        
        // 更新排序选项
        this.updateOrderByOptions();
    }
    
    async loadFromFile() {
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
                
                // 更新文本区域
                const dataInput = this.container.querySelector('#data-input');
                dataInput.value = JSON.stringify(data, null, 2);
                
                // 更新数据
                this.data = data;
                
                // 更新字段选择器
                this.updateFieldSelectors();
                
                // 更新排序选项
                this.updateOrderByOptions();
                
            } catch (error) {
                this.showError('无法解析JSON文件: ' + error.message);
            }
        } catch (error) {
            this.showError('加载文件失败: ' + error.message);
        }
    }
    
    async pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            const dataInput = this.container.querySelector('#data-input');
            
            try {
                const data = JSON.parse(text);
                dataInput.value = JSON.stringify(data, null, 2);
                
                // 更新数据
                this.data = data;
                
                // 更新字段选择器
                this.updateFieldSelectors();
                
                // 更新排序选项
                this.updateOrderByOptions();
                
            } catch (error) {
                // 如果不是有效JSON，直接放入文本框
                dataInput.value = text;
                this.showError('剪贴板内容不是有效的JSON格式');
            }
        } catch (error) {
            this.showError('无法从剪贴板粘贴: ' + error.message);
        }
    }
    
    updateFieldSelectors() {
        if (!this.data || this.data.length === 0) return;
        
        const fields = Object.keys(this.data[0]);
        
        // 更新所有字段选择器
        const fieldSelects = this.container.querySelectorAll('.field-select');
        fieldSelects.forEach(select => {
            // 保存当前选中的值
            const currentValue = select.value;
            
            // 清空并添加新选项
            select.innerHTML = '';
            fields.forEach(field => {
                const option = document.createElement('option');
                option.value = field;
                option.textContent = field;
                select.appendChild(option);
            });
            
            // 恢复之前的选择，如果字段仍然存在
            if (fields.includes(currentValue)) {
                select.value = currentValue;
            }
        });
        
        // 对每个条件元素更新过滤条件
        const conditionElements = this.container.querySelectorAll('.filter-condition');
        conditionElements.forEach(element => {
            const index = parseInt(element.dataset.index);
            this.updateFilterCondition(index);
        });
    }
    
    async filterData() {
        if (this.isLoading) return;
        
        // 检查数据是否有效
        if (!this.data || this.data.length === 0) {
            const dataInput = this.container.querySelector('#data-input');
            
            try {
                this.data = JSON.parse(dataInput.value);
                if (!Array.isArray(this.data) || this.data.length === 0) {
                    this.showError('请提供非空数组数据');
                    return;
                }
            } catch (error) {
                this.showError('无效的JSON数据格式');
                return;
            }
        }
        
        // 检查是否有过滤条件
        if (this.filterConditions.length === 0) {
            this.addFilterCondition();
            this.showError('请添加至少一个过滤条件');
            return;
        }
        
        // 获取排序和分页选项
        const orderBy = this.container.querySelector('#order-by').value;
        const orderDirection = this.container.querySelector('#order-direction').value;
        const limitInput = this.container.querySelector('#limit');
        const offsetInput = this.container.querySelector('#offset');
        
        const limit = limitInput.value ? parseInt(limitInput.value) : null;
        const offset = offsetInput.value ? parseInt(offsetInput.value) : null;
        
        // 设置加载状态
        this.isLoading = true;
        const loadingSpinner = this.container.querySelector('#loading-spinner');
        const filterBtn = this.container.querySelector('#filter-btn');
        loadingSpinner.style.display = 'inline-block';
        filterBtn.disabled = true;
        
        try {
            // 准备请求数据
            const requestData = {
                data: this.data,
                filter_conditions: this.filterConditions,
                combine_operation: this.combineOperation,
                limit: limit,
                offset: offset,
                order_by: orderBy,
                order_direction: orderDirection,
                request_id: `req-${Date.now()}`
            };
            
            // 调用过滤API
            const result = await window.electronAPI.filterData(requestData);
            
            if (result.status === 'success') {
                // 保存过滤结果
                this.filteredData = result.filtered_data;
                
                // 显示结果
                this.displayFilterResults(result);
            } else {
                this.showError(`过滤失败: ${result.message}`);
            }
        } catch (error) {
            this.showError(`处理错误: ${error.message}`);
        } finally {
            // 恢复状态
            this.isLoading = false;
            loadingSpinner.style.display = 'none';
            filterBtn.disabled = false;
        }
    }
    
    displayFilterResults(result) {
        const resultsSection = this.container.querySelector('#filter-results');
        const summaryElement = this.container.querySelector('#result-summary');
        const tableHeader = this.container.querySelector('#result-table-header');
        const tableBody = this.container.querySelector('#result-table-body');
        
        // 显示结果区域
        resultsSection.style.display = 'block';
        
        // 显示摘要信息
        const { total_count, filtered_count, filter_summary } = result;
        summaryElement.innerHTML = `
            原始数据: ${total_count} 条记录<br>
            过滤后: ${filtered_count} 条记录<br>
            过滤率: ${((total_count - filtered_count) / total_count * 100).toFixed(1)}%
        `;
        
        // 如果没有数据，显示提示信息
        if (filtered_count === 0) {
            tableHeader.innerHTML = '';
            tableBody.innerHTML = `
                <tr>
                    <td colspan="100%" class="text-center">没有匹配的数据</td>
                </tr>
            `;
            return;
        }
        
        // 获取字段列表
        const fields = Object.keys(result.filtered_data[0]);
        
        // 创建表头
        tableHeader.innerHTML = fields.map(field => `<th>${field}</th>`).join('');
        
        // 创建表格内容
        tableBody.innerHTML = '';
        result.filtered_data.forEach(item => {
            const row = document.createElement('tr');
            fields.forEach(field => {
                const cell = document.createElement('td');
                const value = item[field];
                
                // 格式化值
                if (value === null || value === undefined) {
                    cell.innerHTML = '<i class="text-muted">null</i>';
                } else if (typeof value === 'object') {
                    cell.textContent = JSON.stringify(value);
                } else {
                    cell.textContent = value;
                }
                
                row.appendChild(cell);
            });
            tableBody.appendChild(row);
        });
    }
    
    async exportAsJson() {
        if (!this.filteredData) {
            this.showError('没有可导出的数据');
            return;
        }
        
        try {
            const json = JSON.stringify(this.filteredData, null, 2);
            const defaultPath = `filtered_data_${new Date().toISOString().slice(0, 10)}.json`;
            
            const result = await window.electronAPI.saveFile(json, defaultPath);
            if (result && result.filePath) {
                this.showSuccess(`数据已导出到: ${result.filePath}`);
            }
        } catch (error) {
            this.showError('导出失败: ' + error.message);
        }
    }
    
    async exportAsCsv() {
        if (!this.filteredData || this.filteredData.length === 0) {
            this.showError('没有可导出的数据');
            return;
        }
        
        try {
            // 获取所有字段
            const fields = Object.keys(this.filteredData[0]);
            
            // 创建CSV内容
            let csv = fields.join(',') + '\r\n';
            
            // 添加每行数据
            this.filteredData.forEach(item => {
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
            const defaultPath = `filtered_data_${new Date().toISOString().slice(0, 10)}.csv`;
            const result = await window.electronAPI.saveFile(csv, defaultPath);
            
            if (result && result.filePath) {
                this.showSuccess(`数据已导出到: ${result.filePath}`);
            }
        } catch (error) {
            this.showError('导出失败: ' + error.message);
        }
    }
    
    showVisualization() {
        if (!this.filteredData || this.filteredData.length === 0) {
            this.showError('没有数据可用于可视化');
            return;
        }
        
        // 创建对话框
        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.innerHTML = `
            <div class="dialog-content" style="width: 80%; max-width: 1000px;">
                <div class="dialog-header">
                    <h4>数据可视化</h4>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="dialog-body">
                    <div class="row mb-3">
                        <div class="col-4">
                            <div class="form-group">
                                <label>图表类型:</label>
                                <select id="chart-type" class="form-control">
                                    <option value="bar">柱状图</option>
                                    <option value="pie">饼图</option>
                                    <option value="line">折线图</option>
                                    <option value="scatter">散点图</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="form-group">
                                <label>X轴/类别:</label>
                                <select id="x-axis" class="form-control"></select>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="form-group">
                                <label>Y轴/数值:</label>
                                <select id="y-axis" class="form-control"></select>
                            </div>
                        </div>
                    </div>
                    <div class="chart-container" style="position: relative; height: 400px;">
                        <canvas id="visualization-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 获取字段
        const fields = Object.keys(this.filteredData[0]);
        const numericFields = fields.filter(field => 
            this.filteredData.some(item => typeof item[field] === 'number')
        );
        
        // 填充选择器选项
        const xAxisSelect = dialog.querySelector('#x-axis');
        const yAxisSelect = dialog.querySelector('#y-axis');
        
        fields.forEach(field => {
            const option = document.createElement('option');
            option.value = field;
            option.textContent = field;
            xAxisSelect.appendChild(option);
        });
        
        numericFields.forEach(field => {
            const option = document.createElement('option');
            option.value = field;
            option.textContent = field;
            yAxisSelect.appendChild(option);
        });
        
        // 如果有数值字段，选择第一个作为Y轴
        if (numericFields.length > 0) {
            yAxisSelect.value = numericFields[0];
        }
        
        // 渲染初始图表
        let chart = this.renderChart(dialog);
        
        // 添加事件监听器
        dialog.querySelector('.close-btn').addEventListener('click', () => {
            if (chart) {
                chart.destroy();
            }
            document.body.removeChild(dialog);
        });
        
        // 图表类型和轴变更监听
        const chartTypeSelect = dialog.querySelector('#chart-type');
        [chartTypeSelect, xAxisSelect, yAxisSelect].forEach(select => {
            select.addEventListener('change', () => {
                if (chart) {
                    chart.destroy();
                }
                chart = this.renderChart(dialog);
            });
        });
        
        // 点击对话框外部关闭
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) {
                if (chart) {
                    chart.destroy();
                }
                document.body.removeChild(dialog);
            }
        });
    }
    
    renderChart(dialog) {
        const chartType = dialog.querySelector('#chart-type').value;
        const xField = dialog.querySelector('#x-axis').value;
        const yField = dialog.querySelector('#y-axis').value;
        
        // 获取画布
        const canvas = dialog.querySelector('#visualization-chart');
        const ctx = canvas.getContext('2d');
        
        // 准备数据
        let chartData;
        let options;
        
        switch (chartType) {
            case 'bar':
            case 'line':
                // 分组数据
                const groupedData = {};
                this.filteredData.forEach(item => {
                    const key = String(item[xField] || 'null');
                    if (!groupedData[key]) {
                        groupedData[key] = [];
                    }
                    if (typeof item[yField] === 'number') {
                        groupedData[key].push(item[yField]);
                    }
                });
                
                // 计算每个组的平均值
                const labels = Object.keys(groupedData);
                const values = labels.map(label => {
                    const nums = groupedData[label];
                    return nums.length ? nums.reduce((sum, val) => sum + val, 0) / nums.length : 0;
                });
                
                chartData = {
                    labels: labels,
                    datasets: [{
                        label: yField,
                        data: values,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                };
                
                options = {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                };
                break;
                
            case 'pie':
                // 分组并计算每组的总和
                const pieGroupedData = {};
                this.filteredData.forEach(item => {
                    const key = String(item[xField] || 'null');
                    if (!pieGroupedData[key]) {
                        pieGroupedData[key] = 0;
                    }
                    if (typeof item[yField] === 'number') {
                        pieGroupedData[key] += item[yField];
                    }
                });
                
                const pieLabels = Object.keys(pieGroupedData);
                const pieValues = pieLabels.map(label => pieGroupedData[label]);
                
                // 生成随机颜色
                const backgroundColors = pieLabels.map(() => 
                    `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7)`
                );
                
                chartData = {
                    labels: pieLabels,
                    datasets: [{
                        data: pieValues,
                        backgroundColor: backgroundColors,
                        borderWidth: 1
                    }]
                };
                
                options = {
                    plugins: {
                        legend: {
                            position: 'right',
                        }
                    }
                };
                break;
                
            case 'scatter':
                // 准备散点图数据
                const scatterData = this.filteredData
                    .filter(item => typeof item[xField] === 'number' && typeof item[yField] === 'number')
                    .map(item => ({
                        x: item[xField],
                        y: item[yField]
                    }));
                
                chartData = {
                    datasets: [{
                        label: `${xField} vs ${yField}`,
                        data: scatterData,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }]
                };
                
                options = {
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom'
                        },
                        y: {
                            beginAtZero: false
                        }
                    }
                };
                break;
        }
        
        // 创建图表
        return new Chart(ctx, {
            type: chartType,
            data: chartData,
            options: options
        });
    }
    
    showError(message) {
        if (window.ui && window.ui.showNotification) {
            window.ui.showNotification('错误', message, 'error');
        } else {
            alert(`错误: ${message}`);
        }
    }
    
    showSuccess(message) {
        if (window.ui && window.ui.showNotification) {
            window.ui.showNotification('成功', message, 'success');
        } else {
            alert(message);
        }
    }
}

export default DataFilteringComponent;
