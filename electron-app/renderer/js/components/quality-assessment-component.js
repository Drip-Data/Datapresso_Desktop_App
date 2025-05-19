class QualityAssessmentComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isLoading = false;
        this.data = null;
        this.selectedDimensions = [
            "completeness", "consistency", "validity", 
            "uniqueness", "diversity", "accuracy"
        ];
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
                    <h3>数据质量评估</h3>
                    <p>评估数据质量并生成详细报告</p>
                </div>
                
                <div class="card-body">
                    <div class="input-section">
                        <h4>1. 数据输入</h4>
                        <div class="row">
                            <div class="col-8">
                                <div class="form-group">
                                    <label for="data-input">输入JSON数据:</label>
                                    <textarea id="data-input" class="form-control" rows="8" placeholder='[{"field1": "value1", "field2": 123}, ...]'></textarea>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="form-group">
                                    <label>导入选项:</label>
                                    <div class="btn-group-vertical w-100">
                                        <button id="load-sample-btn" class="btn btn-outline-secondary mb-2">加载示例数据</button>
                                        <button id="load-file-btn" class="btn btn-outline-secondary mb-2">从文件导入</button>
                                        <button id="paste-clipboard-btn" class="btn btn-outline-secondary">从剪贴板粘贴</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="config-section mt-4">
                        <h4>2. 评估配置</h4>
                        <div class="row">
                            <div class="col-6">
                                <div class="form-group">
                                    <label>评估维度:</label>
                                    <div class="dimension-checkboxes">
                                        <div class="form-check">
                                            <input class="form-check-input dimension-check" type="checkbox" value="completeness" id="check-completeness" checked>
                                            <label class="form-check-label" for="check-completeness">完整性</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input dimension-check" type="checkbox" value="consistency" id="check-consistency" checked>
                                            <label class="form-check-label" for="check-consistency">一致性</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input dimension-check" type="checkbox" value="validity" id="check-validity" checked>
                                            <label class="form-check-label" for="check-validity">有效性</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input dimension-check" type="checkbox" value="uniqueness" id="check-uniqueness" checked>
                                            <label class="form-check-label" for="check-uniqueness">唯一性</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input dimension-check" type="checkbox" value="diversity" id="check-diversity" checked>
                                            <label class="form-check-label" for="check-diversity">多样性</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input dimension-check" type="checkbox" value="accuracy" id="check-accuracy" checked>
                                            <label class="form-check-label" for="check-accuracy">准确性</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="form-group">
                                    <label for="detail-level">详细程度:</label>
                                    <select id="detail-level" class="form-control">
                                        <option value="low">低 (仅基本评分)</option>
                                        <option value="medium" selected>中 (包含详细统计)</option>
                                        <option value="high">高 (包含示例和建议)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="report-format">报告格式:</label>
                                    <select id="report-format" class="form-control">
                                        <option value="json">JSON</option>
                                        <option value="html" selected>HTML</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row mt-3">
                            <div class="col">
                                <button id="assess-btn" class="btn btn-primary btn-lg">开始评估</button>
                                <div class="loading-spinner ml-2" id="loading-spinner" style="display: none;">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="sr-only">Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="results-section mt-4" id="results-section" style="display: none;">
                        <h4>3. 评估结果</h4>
                        <div class="row">
                            <div class="col-4">
                                <div class="overall-score-card">
                                    <h5>总体评分</h5>
                                    <div class="score-display" id="overall-score">0.0</div>
                                    <div class="progress mt-2">
                                        <div class="progress-bar" id="overall-progress" role="progressbar" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-8">
                                <div class="dimension-scores-card">
                                    <h5>维度评分</h5>
                                    <div id="dimension-scores-container" class="row">
                                        <!-- 维度评分将动态添加 -->
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row mt-4">
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-header">
                                        <ul class="nav nav-tabs card-header-tabs" id="result-tabs">
                                            <li class="nav-item">
                                                <a class="nav-link active" id="summary-tab" data-toggle="tab" href="#summary">摘要</a>
                                            </li>
                                            <li class="nav-item">
                                                <a class="nav-link" id="issues-tab" data-toggle="tab" href="#issues">问题</a>
                                            </li>
                                            <li class="nav-item">
                                                <a class="nav-link" id="recommendations-tab" data-toggle="tab" href="#recommendations">建议</a>
                                            </li>
                                            <li class="nav-item">
                                                <a class="nav-link" id="visualizations-tab" data-toggle="tab" href="#visualizations">可视化</a>
                                            </li>
                                            <li class="nav-item">
                                                <a class="nav-link" id="field-scores-tab" data-toggle="tab" href="#field-scores">字段评分</a>
                                            </li>
                                        </ul>
                                    </div>
                                    <div class="card-body">
                                        <div class="tab-content">
                                            <div class="tab-pane fade show active" id="summary">
                                                <div id="summary-content"></div>
                                            </div>
                                            <div class="tab-pane fade" id="issues">
                                                <div id="issues-content"></div>
                                            </div>
                                            <div class="tab-pane fade" id="recommendations">
                                                <div id="recommendations-content"></div>
                                            </div>
                                            <div class="tab-pane fade" id="visualizations">
                                                <div class="row">
                                                    <div class="col-6">
                                                        <div id="radar-chart-container"></div>
                                                    </div>
                                                    <div class="col-6">
                                                        <div id="bar-chart-container"></div>
                                                    </div>
                                                </div>
                                                <div class="row mt-4">
                                                    <div class="col-12">
                                                        <div id="heatmap-container"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="tab-pane fade" id="field-scores">
                                                <div id="field-scores-content"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row mt-4">
                            <div class="col-12">
                                <div class="btn-group">
                                    <button id="export-json-btn" class="btn btn-outline-secondary">导出JSON</button>
                                    <button id="export-report-btn" class="btn btn-outline-secondary">导出报告</button>
                                    <button id="save-result-btn" class="btn btn-outline-secondary">保存结果</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        // 加载示例数据按钮
        const loadSampleBtn = this.container.querySelector('#load-sample-btn');
        loadSampleBtn.addEventListener('click', () => this.loadSampleData());
        
        // 从文件导入按钮
        const loadFileBtn = this.container.querySelector('#load-file-btn');
        loadFileBtn.addEventListener('click', () => this.loadFromFile());
        
        // 从剪贴板粘贴按钮
        const pasteClipboardBtn = this.container.querySelector('#paste-clipboard-btn');
        pasteClipboardBtn.addEventListener('click', () => this.pasteFromClipboard());
        
        // 评估维度复选框
        const dimensionCheckboxes = this.container.querySelectorAll('.dimension-check');
        dimensionCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSelectedDimensions());
        });
        
        // 开始评估按钮
        const assessBtn = this.container.querySelector('#assess-btn');
        assessBtn.addEventListener('click', () => this.startAssessment());
        
        // 导出按钮
        const exportJsonBtn = this.container.querySelector('#export-json-btn');
        exportJsonBtn.addEventListener('click', () => this.exportAsJson());
        
        const exportReportBtn = this.container.querySelector('#export-report-btn');
        exportReportBtn.addEventListener('click', () => this.exportReport());
        
        const saveResultBtn = this.container.querySelector('#save-result-btn');
        saveResultBtn.addEventListener('click', () => this.saveResult());
    }
    
    updateSelectedDimensions() {
        const dimensionCheckboxes = this.container.querySelectorAll('.dimension-check:checked');
        this.selectedDimensions = Array.from(dimensionCheckboxes).map(cb => cb.value);
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
        this.data = sampleData;
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
                const dataInput = this.container.querySelector('#data-input');
                dataInput.value = JSON.stringify(data, null, 2);
                this.data = data;
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
                this.data = data;
            } catch (error) {
                // 如果不是有效JSON，直接放入文本框
                dataInput.value = text;
                this.showError('剪贴板内容不是有效的JSON格式');
            }
        } catch (error) {
            this.showError('无法从剪贴板粘贴: ' + error.message);
        }
    }
    
    async startAssessment() {
        if (this.isLoading) return;
        
        try {
            // 获取输入数据
            const dataInput = this.container.querySelector('#data-input');
            let data;
            
            try {
                data = JSON.parse(dataInput.value);
                this.data = data;
            } catch (error) {
                this.showError('输入数据不是有效的JSON格式');
                return;
            }
            
            if (!Array.isArray(data) || data.length === 0) {
                this.showError('输入数据必须是非空的数组');
                return;
            }
            
            // 更新选中的维度
            this.updateSelectedDimensions();
            
            if (this.selectedDimensions.length === 0) {
                this.showError('请至少选择一个评估维度');
                return;
            }
            
            // 获取详细程度和报告格式
            const detailLevel = this.container.querySelector('#detail-level').value;
            const reportFormat = this.container.querySelector('#report-format').value;
            
            // 设置加载状态
            this.isLoading = true;
            this.setLoadingState(true);
            
            // 创建请求
            const requestData = {
                data: data,
                dimensions: this.selectedDimensions,
                detail_level: detailLevel,
                report_format: reportFormat,
                generate_report: true
            };
            
            // 发送请求到后端
            const response = await window.electronAPI.assessQuality(requestData);
            
            // 处理响应
            if (response.status === 'success') {
                this.displayResults(response);
            } else {
                this.showError('评估失败: ' + response.message);
            }
        } catch (error) {
            this.showError('评估过程中出错: ' + error.message);
        } finally {
            this.isLoading = false;
            this.setLoadingState(false);
        }
    }
    
    setLoadingState(isLoading) {
        const loadingSpinner = this.container.querySelector('#loading-spinner');
        const assessBtn = this.container.querySelector('#assess-btn');
        
        if (isLoading) {
            loadingSpinner.style.display = 'inline-block';
            assessBtn.disabled = true;
            assessBtn.innerText = '评估中...';
        } else {
            loadingSpinner.style.display = 'none';
            assessBtn.disabled = false;
            assessBtn.innerText = '开始评估';
        }
    }
    
    displayResults(response) {
        // 显示结果部分
        const resultsSection = this.container.querySelector('#results-section');
        resultsSection.style.display = 'block';
        
        // 显示总体评分
        const overallScore = this.container.querySelector('#overall-score');
        const scoreValue = response.overall_score;
        overallScore.textContent = scoreValue.toFixed(2);
        
        // 设置进度条
        const progressBar = this.container.querySelector('#overall-progress');
        progressBar.style.width = `${scoreValue * 100}%`;
        
        // 根据得分设置颜色
        if (scoreValue >= 0.8) {
            progressBar.className = 'progress-bar bg-success';
        } else if (scoreValue >= 0.6) {
            progressBar.className = 'progress-bar bg-info';
        } else if (scoreValue >= 0.4) {
            progressBar.className = 'progress-bar bg-warning';
        } else {
            progressBar.className = 'progress-bar bg-danger';
        }
        
        // 显示维度得分
        this.displayDimensionScores(response.dimension_scores);
        
        // 显示摘要
        this.displaySummary(response.summary);
        
        // 显示问题
        this.displayIssues(response);
        
        // 显示建议
        this.displayRecommendations(response);
        
        // 显示字段得分
        this.displayFieldScores(response.field_scores || {});
        
        // 创建可视化图表
        this.createVisualization(response);
    }
    
    displayDimensionScores(dimensionScores) {
        const container = this.container.querySelector('#dimension-scores-container');
        container.innerHTML = '';
        
        if (!dimensionScores || dimensionScores.length === 0) {
            container.innerHTML = '<div class="col-12"><p>没有可用的维度评分</p></div>';
            return;
        }
        
        // 定义维度显示名称
        const dimensionNames = {
            "completeness": "完整性",
            "consistency": "一致性",
            "validity": "有效性",
            "uniqueness": "唯一性",
            "diversity": "多样性",
            "accuracy": "准确性"
        };
        
        dimensionScores.forEach(dimension => {
            const dimensionName = dimensionNames[dimension.dimension] || dimension.dimension;
            const score = dimension.score;
            
            let scoreClass = 'text-success';
            if (score < 0.4) {
                scoreClass = 'text-danger';
            } else if (score < 0.6) {
                scoreClass = 'text-warning';
            } else if (score < 0.8) {
                scoreClass = 'text-info';
            }
            
            const dimensionElement = document.createElement('div');
            dimensionElement.className = 'col-md-4 col-sm-6 mb-3';
            dimensionElement.innerHTML = `
                <div class="dimension-score-item">
                    <div class="dimension-name">${dimensionName}</div>
                    <div class="dimension-value ${scoreClass}">${score.toFixed(2)}</div>
                    <div class="progress mt-1" style="height: 8px;">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${score * 100}%; height: 8px;"
                             aria-valuenow="${score * 100}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div>
            `;
            
            container.appendChild(dimensionElement);
        });
    }
    
    displaySummary(summary) {
        const container = this.container.querySelector('#summary-content');
        
        if (!summary) {
            container.innerHTML = '<p>没有可用的摘要信息</p>';
            return;
        }
        
        // 构建摘要内容
        const totalItems = summary.assessed_items || 0;
        const assessedDimensions = summary.assessed_dimensions || 0;
        const passedDimensions = summary.passed_dimensions || 0;
        const failedDimensions = summary.failed_dimensions || 0;
        
        let summaryHTML = `
            <div class="summary-stats">
                <div class="row">
                    <div class="col-md-3 col-sm-6">
                        <div class="summary-stat-item">
                            <div class="stat-label">评估的数据项</div>
                            <div class="stat-value">${totalItems}</div>
                        </div>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <div class="summary-stat-item">
                            <div class="stat-label">评估的维度</div>
                            <div class="stat-value">${assessedDimensions}</div>
                        </div>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <div class="summary-stat-item">
                            <div class="stat-label">通过的维度</div>
                            <div class="stat-value text-success">${passedDimensions}</div>
                        </div>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <div class="summary-stat-item">
                            <div class="stat-label">失败的维度</div>
                            <div class="stat-value text-danger">${failedDimensions}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加顶级问题列表
        if (summary.top_issues && summary.top_issues.length > 0) {
            summaryHTML += '<div class="top-issues mt-4"><h5>主要问题:</h5><ul class="list-group">';
            
            summary.top_issues.forEach(issue => {
                let badgeClass = 'badge-danger';
                if (issue.severity === 'medium') {
                    badgeClass = 'badge-warning';
                } else if (issue.severity === 'low') {
                    badgeClass = 'badge-info';
                }
                
                summaryHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${issue.description || '未知问题'}
                        <span class="badge ${badgeClass}">${issue.severity || 'unknown'}</span>
                    </li>
                `;
            });
            
            summaryHTML += '</ul></div>';
        }
        
        container.innerHTML = summaryHTML;
    }
    
    displayIssues(response) {
        const container = this.container.querySelector('#issues-content');
        
        const dimensionScores = response.dimension_scores || [];
        const allIssues = [];
        
        // 收集所有维度的问题
        dimensionScores.forEach(dimension => {
            const dimensionName = dimension.dimension;
            const issues = dimension.issues || [];
            
            issues.forEach(issue => {
                allIssues.push({
                    dimension: dimensionName,
                    ...issue
                });
            });
        });
        
        if (allIssues.length === 0) {
            container.innerHTML = '<div class="alert alert-success">没有发现问题，数据质量良好！</div>';
            return;
        }
        
        // 按严重程度排序
        const severityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        allIssues.sort((a, b) => {
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
        
        let issuesHTML = `
            <div class="issues-filter mb-3">
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-outline-secondary active" data-filter="all">全部</button>
                    <button type="button" class="btn btn-outline-danger" data-filter="high">高严重度</button>
                    <button type="button" class="btn btn-outline-warning" data-filter="medium">中严重度</button>
                    <button type="button" class="btn btn-outline-info" data-filter="low">低严重度</button>
                </div>
            </div>
            <div class="issues-list">
        `;
        
        // 添加问题列表
        allIssues.forEach(issue => {
            let severityClass = 'text-danger';
            if (issue.severity === 'medium') {
                severityClass = 'text-warning';
            } else if (issue.severity === 'low') {
                severityClass = 'text-info';
            }
            
            // 定义维度显示名称
            const dimensionNames = {
                "completeness": "完整性",
                "consistency": "一致性",
                "validity": "有效性",
                "uniqueness": "唯一性",
                "diversity": "多样性",
                "accuracy": "准确性"
            };
            
            const dimensionName = dimensionNames[issue.dimension] || issue.dimension;
            
            issuesHTML += `
                <div class="issue-item card mb-3" data-severity="${issue.severity}">
                    <div class="card-header d-flex justify-content-between">
                        <span>${issue.field ? `字段: ${issue.field}` : '数据集问题'}</span>
                        <span class="badge badge-${issue.severity === 'high' ? 'danger' : (issue.severity === 'medium' ? 'warning' : 'info')}">
                            ${issue.severity}
                        </span>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title ${severityClass}">${issue.issue_type}</h5>
                        <p class="card-text">${issue.description}</p>
                        <div class="issue-details">
                            <small class="text-muted">维度: ${dimensionName}</small>
                        </div>
                    </div>
                </div>
            `;
        });
        
        issuesHTML += '</div>';
        container.innerHTML = issuesHTML;
        
        // 添加过滤器事件监听
        const filterButtons = container.querySelectorAll('.issues-filter button');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // 更新按钮状态
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // 应用过滤器
                const filter = button.getAttribute('data-filter');
                const issueItems = container.querySelectorAll('.issue-item');
                
                issueItems.forEach(item => {
                    if (filter === 'all' || item.getAttribute('data-severity') === filter) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }
    
    displayRecommendations(response) {
        const container = this.container.querySelector('#recommendations-content');
        
        const dimensionScores = response.dimension_scores || [];
        const allRecommendations = [];
        
        // 收集所有维度的建议
        dimensionScores.forEach(dimension => {
            const dimensionName = dimension.dimension;
            const recommendations = dimension.recommendations || [];
            
            recommendations.forEach(recommendation => {
                allRecommendations.push({
                    dimension: dimensionName,
                    text: recommendation
                });
            });
        });
        
        if (allRecommendations.length === 0) {
            container.innerHTML = '<div class="alert alert-info">没有针对当前数据集的改进建议</div>';
            return;
        }
        
        // 定义维度显示名称
        const dimensionNames = {
            "completeness": "完整性",
            "consistency": "一致性",
            "validity": "有效性",
            "uniqueness": "唯一性",
            "diversity": "多样性",
            "accuracy": "准确性"
        };
        
        // 按维度组织建议
        const recommendationsByDimension = {};
        allRecommendations.forEach(rec => {
            if (!recommendationsByDimension[rec.dimension]) {
                recommendationsByDimension[rec.dimension] = [];
            }
            recommendationsByDimension[rec.dimension].push(rec.text);
        });
        
        let recommendationsHTML = '<div class="accordion" id="recommendationsAccordion">';
        
        Object.keys(recommendationsByDimension).forEach((dimension, index) => {
            const recommendations = recommendationsByDimension[dimension];
            const dimensionName = dimensionNames[dimension] || dimension;
            
            recommendationsHTML += `
                <div class="card">
                    <div class="card-header" id="heading${index}">
                        <h2 class="mb-0">
                            <button class="btn btn-link btn-block text-left" type="button" 
                                    data-toggle="collapse" data-target="#collapse${index}" 
                                    aria-expanded="${index === 0 ? 'true' : 'false'}" aria-controls="collapse${index}">
                                ${dimensionName}建议 (${recommendations.length})
                            </button>
                        </h2>
                    </div>
                    <div id="collapse${index}" class="collapse ${index === 0 ? 'show' : ''}" 
                         aria-labelledby="heading${index}" data-parent="#recommendationsAccordion">
                        <div class="card-body">
                            <ul class="list-group list-group-flush">
            `;
            
            recommendations.forEach(rec => {
                recommendationsHTML += `<li class="list-group-item">${rec}</li>`;
            });
            
            recommendationsHTML += `
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        });
        
        recommendationsHTML += '</div>';
        container.innerHTML = recommendationsHTML;
    }
    
    displayFieldScores(fieldScores) {
        const container = this.container.querySelector('#field-scores-content');
        
        if (!fieldScores || Object.keys(fieldScores).length === 0) {
            container.innerHTML = '<p>没有可用的字段评分</p>';
            return;
        }
        
        let tableHTML = `
            <div class="table-responsive">
                <table class="table table-bordered table-hover">
                    <thead class="thead-light">
                        <tr>
                            <th>字段</th>
                            <th>评分</th>
                            <th>状态</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const [field, score] of Object.entries(fieldScores)) {
            let statusClass = 'text-success';
            let statusText = '良好';
            
            if (score < 0.4) {
                statusClass = 'text-danger';
                statusText = '差';
            } else if (score < 0.6) {
                statusClass = 'text-warning';
                statusText = '一般';
            } else if (score < 0.8) {
                statusClass = 'text-info';
                statusText = '良好';
            }
            
            tableHTML += `
                <tr>
                    <td>${field}</td>
                    <td>${score.toFixed(2)}</td>
                    <td class="${statusClass}">${statusText}</td>
                </tr>
            `;
        }
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = tableHTML;
    }
    
    createVisualization(response) {
        // 雷达图 - 各维度得分
        this.createRadarChart(response);
        
        // 条形图 - 字段评分
        this.createBarChart(response);
        
        // 热力图 - 问题矩阵
        this.createHeatmap(response);
    }
    
    createRadarChart(response) {
        const container = this.container.querySelector('#radar-chart-container');
        container.innerHTML = '<canvas id="radar-chart"></canvas>';
        
        const dimensionScores = response.dimension_scores || [];
        if (dimensionScores.length === 0) return;
        
        // 定义维度显示名称
        const dimensionNames = {
            "completeness": "完整性",
            "consistency": "一致性",
            "validity": "有效性",
            "uniqueness": "唯一性",
            "diversity": "多样性",
            "accuracy": "准确性"
        };
        
        const labels = dimensionScores.map(d => dimensionNames[d.dimension] || d.dimension);
        const scores = dimensionScores.map(d => d.score);
        
        const ctx = document.getElementById('radar-chart').getContext('2d');
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: '质量评分',
                    data: scores,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)'
                }]
            },
            options: {
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        min: 0,
                        max: 1,
                        ticks: {
                            stepSize: 0.2
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '各维度质量评分'
                    }
                }
            }
        });
    }
    
    createBarChart(response) {
        const container = this.container.querySelector('#bar-chart-container');
        container.innerHTML = '<canvas id="bar-chart"></canvas>';
        
        const fieldScores = response.field_scores;
        if (!fieldScores || Object.keys(fieldScores).length === 0) return;
        
        // 只显示前10个字段（如果超过10个）
        const fields = Object.keys(fieldScores);
        const topFields = fields.length > 10 ? fields.slice(0, 10) : fields;
        
        const labels = topFields;
        const scores = topFields.map(field => fieldScores[field]);
        
        // 颜色计算
        const colors = scores.map(score => {
            if (score >= 0.8) return 'rgba(40, 167, 69, 0.7)';  // 绿色
            if (score >= 0.6) return 'rgba(23, 162, 184, 0.7)'; // 蓝色
            if (score >= 0.4) return 'rgba(255, 193, 7, 0.7)';  // 黄色
            return 'rgba(220, 53, 69, 0.7)';                   // 红色
        });
        
        const ctx = document.getElementById('bar-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '字段评分',
                    data: scores,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            stepSize: 0.2
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '字段质量评分'
                    }
                }
            }
        });
    }
    
    createHeatmap(response) {
        const container = this.container.querySelector('#heatmap-container');
        container.innerHTML = '<div id="heatmap-chart" style="height: 300px;"></div>';
        
        const dimensionScores = response.dimension_scores || [];
        if (dimensionScores.length === 0) return;
        
        // 准备数据
        const dimensions = [];
        const issueTypes = new Set();
        const issueMatrix = {};
        
        // 定义维度显示名称
        const dimensionNames = {
            "completeness": "完整性",
            "consistency": "一致性",
            "validity": "有效性",
            "uniqueness": "唯一性",
            "diversity": "多样性",
            "accuracy": "准确性"
        };
        
        dimensionScores.forEach(dimension => {
            const dimensionName = dimensionNames[dimension.dimension] || dimension.dimension;
            dimensions.push(dimensionName);
            
            const issues = dimension.issues || [];
            issues.forEach(issue => {
                const issueType = issue.issue_type;
                issueTypes.add(issueType);
                
                const key = `${dimensionName}-${issueType}`;
                if (!issueMatrix[key]) {
                    issueMatrix[key] = 0;
                }
                issueMatrix[key]++;
            });
        });
        
        // 将Set转换为数组
        const issueTypesArray = Array.from(issueTypes);
        
        // 创建热力图数据
        const data = [];
        dimensions.forEach(dimension => {
            issueTypesArray.forEach(issueType => {
                const key = `${dimension}-${issueType}`;
                const value = issueMatrix[key] || 0;
                
                if (value > 0) {
                    data.push([
                        dimensions.indexOf(dimension),
                        issueTypesArray.indexOf(issueType),
                        value
                    ]);
                }
            });
        });
        
        // 创建热力图
        try {
            echarts.init(document.getElementById('heatmap-chart')).setOption({
                tooltip: {
                    position: 'top'
                },
                grid: {
                    height: '50%',
                    top: '10%'
                },
                xAxis: {
                    type: 'category',
                    data: dimensions,
                    splitArea: {
                        show: true
                    }
                },
                yAxis: {
                    type: 'category',
                    data: issueTypesArray,
                    splitArea: {
                        show: true
                    }
                },
                visualMap: {
                    min: 0,
                    max: Math.max(...data.map(item => item[2])),
                    calculable: true,
                    orient: 'horizontal',
                    left: 'center',
                    bottom: '15%'
                },
                series: [{
                    name: '问题数量',
                    type: 'heatmap',
                    data: data,
                    label: {
                        show: true
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }],
                title: {
                    text: '问题分布热力图',
                    left: 'center'
                }
            });
        } catch (e) {
            console.error('创建热力图失败', e);
            container.innerHTML = '<div class="alert alert-warning">无法创建热力图可视化</div>';
        }
    }
    
    async exportAsJson() {
        if (!this.data) {
            this.showError('没有可导出的评估结果');
            return;
        }
        
        try {
            const json = JSON.stringify(this.lastResult, null, 2);
            const defaultPath = `quality_assessment_${new Date().toISOString().slice(0, 10)}.json`;
            
            const result = await window.electronAPI.saveFile(json, defaultPath);
            if (result && result.filePath) {
                this.showSuccess(`已成功导出到: ${result.filePath}`);
            }
        } catch (error) {
            this.showError('导出失败: ' + error.message);
        }
    }
    
    async exportReport() {
        if (!this.lastResult || !this.lastResult.report_url) {
            this.showError('没有可用的评估报告');
            return;
        }
        
        try {
            // 获取报告内容
            const reportPath = this.lastResult.report_url;
            const reportContent = await window.electronAPI.readFile(reportPath);
            
            // 保存报告
            const defaultPath = `quality_report_${new Date().toISOString().slice(0, 10)}.html`;
            const result = await window.electronAPI.saveFile(reportContent, defaultPath);
            
            if (result && result.filePath) {
                this.showSuccess(`已成功导出报告到: ${result.filePath}`);
            }
        } catch (error) {
            this.showError('导出报告失败: ' + error.message);
        }
    }
    
    async saveResult() {
        if (!this.lastResult) {
            this.showError('没有可保存的评估结果');
            return;
        }
        
        try {
            // 创建保存对象
            const saveData = {
                timestamp: new Date().toISOString(),
                data: this.data,
                result: this.lastResult
            };
            
            const json = JSON.stringify(saveData, null, 2);
            const defaultPath = `quality_assessment_result_${new Date().toISOString().slice(0, 10)}.qar`;
            
            const result = await window.electronAPI.saveFile(json, defaultPath);
            if (result && result.filePath) {
                this.showSuccess(`已成功保存评估结果到: ${result.filePath}`);
            }
        } catch (error) {
            this.showError('保存失败: ' + error.message);
        }
    }
    
    showError(message) {
        // 显示错误消息
        if (window.ui && window.ui.showNotification) {
            window.ui.showNotification('错误', message, 'error');
        } else {
            alert(`错误: ${message}`);
        }
    }
    
    showSuccess(message) {
        // 显示成功消息
        if (window.ui && window.ui.showNotification) {
            window.ui.showNotification('成功', message, 'success');
        } else {
            alert(message);
        }
    }
}

// 导出组件
export default QualityAssessmentComponent;
