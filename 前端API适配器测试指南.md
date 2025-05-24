# 前端API适配器测试指南

## 📋 测试目标
验证前端API适配器与后端服务的完整连接，确保数据传输和格式转换正确。

## 🔧 测试准备

### 1. 环境启动
```bash
# 在 datapresso_env 虚拟环境中
cd Datapresso_Desktop_App
python python-backend/test_data_filtering.py  # 测试核心过滤逻辑
python python-backend/test_api_endpoints.py   # 测试API端点（需要后端运行）
```

### 2. 启动完整应用
```bash
# 在项目根目录，激活 datapresso_env
npm run start
```

## 🧪 API适配器测试项目

### 测试1：数据过滤API调用
**前端调用路径**: `apiAdapter.ts` → `IPC` → `ipc-handlers.js` → `后端API`

**测试步骤**:
1. 在前端界面选择数据过滤功能
2. 配置过滤条件（城市=北京，年龄>25）
3. 执行过滤操作
4. 验证结果显示

**验证点**:
- [x] 请求参数正确转换 (camelCase → snake_case)
- [x] 响应数据正确转换 (snake_case → camelCase)
- [x] 错误信息正确传递
- [x] 异步任务状态更新

### 测试2：LLM API调用
**测试内容**:
- 简单文本生成
- 多模态输入（如果支持）
- 批量处理请求
- 提供商切换

### 测试3：任务管理
**测试内容**:
- 任务创建和状态查询
- 进度更新显示
- 任务取消操作
- 错误处理

## 🔍 详细测试用例

### 数据过滤功能测试

#### 测试用例1：基础过滤
```javascript
// 前端调用示例
const filterRequest = {
  data: [
    {id: 1, name: "Alice", age: 25, city: "Beijing"},
    {id: 2, name: "Bob", age: 30, city: "Shanghai"},
    {id: 3, name: "Charlie", age: 35, city: "Beijing"}
  ],
  filterConditions: [
    {
      field: "city",
      operation: "equals", 
      value: "Beijing",
      caseSensitive: true
    }
  ],
  combineOperation: "AND",
  limit: 10,
  offset: 0
};

// 期望后端接收格式（snake_case）
{
  "data": [...],
  "filter_conditions": [
    {
      "field": "city",
      "operation": "equals",
      "value": "Beijing", 
      "case_sensitive": true
    }
  ],
  "combine_operation": "AND",
  "limit": 10,
  "offset": 0
}
```

#### 测试用例2：异步过滤
```javascript
// 启动异步任务
const asyncResult = await window.electronAPI.dataFiltering.asyncFilter(largeDataset);
console.log('任务ID:', asyncResult.taskId);

// 查询任务状态
const taskStatus = await window.electronAPI.dataFiltering.getTaskResult(asyncResult.taskId);
console.log('任务状态:', taskStatus.status);
```

## 🚨 常见问题排查

### 问题1：IPC通信失败
**症状**: 前端调用API时出现 "electronAPI is not defined"
**解决**:
1. 检查 `preload.js` 是否正确暴露 API
2. 确认 `main.js` 中 webPreferences.preload 配置正确
3. 验证安全策略设置

### 问题2：数据格式转换错误
**症状**: 后端收到的参数名称不正确
**解决**:
1. 检查 `apiAdapter.ts` 中的 `toCamelCase`/`toSnakeCase` 函数
2. 验证 `caseConverter.ts` 工具函数
3. 确认请求/响应数据结构

### 问题3：错误处理不当
**症状**: 前端无法显示后端错误信息
**解决**:
1. 检查 `ipc-handlers.js` 中的错误捕获
2. 验证前端错误提示组件
3. 确认错误日志记录

## 📊 测试检查清单

### 基础连接测试
- [ ] Electron应用正常启动
- [ ] React前端界面加载
- [ ] Python后端服务运行
- [ ] API文档可访问 (http://127.0.0.1:8000/docs)

### API功能测试  
- [ ] 数据过滤：同步过滤
- [ ] 数据过滤：异步过滤  
- [ ] 数据过滤：任务状态查询
- [ ] LLM调用：基础文本生成
- [ ] LLM调用：批量处理
- [ ] 任务管理：创建/查询/删除

### 数据转换测试
- [ ] 前端 camelCase → 后端 snake_case
- [ ] 后端 snake_case → 前端 camelCase  
- [ ] 嵌套对象转换
- [ ] 数组数据转换
- [ ] 错误信息转换

### 错误处理测试
- [ ] 网络连接异常
- [ ] 后端服务异常
- [ ] 参数验证失败
- [ ] 权限检查失败
- [ ] 超时处理

### 性能测试
- [ ] 大数据集过滤 (1000+ 条记录)
- [ ] 并发请求处理
- [ ] 内存使用监控
- [ ] 响应时间测量

## 🎯 成功标准

### 功能完整性
- 所有核心API都能正常调用
- 数据转换无误
- 错误处理完善

### 性能要求
- API响应时间 < 2秒（小数据集）
- 异步任务状态更新及时
- 界面操作流畅

### 稳定性
- 连续操作无内存泄露
- 错误恢复能力良好
- 异常情况处理正确

## 📝 测试报告模板

```markdown
## 测试执行报告

**测试日期**: 2025-05-23
**测试环境**: Windows/macOS/Linux
**测试人员**: [姓名]

### 测试结果概览
- 通过: X/Y (XX%)
- 失败: X/Y  
- 跳过: X/Y

### 详细测试结果
1. **数据过滤功能**
   - 基础过滤: ✅/❌
   - 异步过滤: ✅/❌
   - 错误处理: ✅/❌

2. **LLM API功能** 
   - 文本生成: ✅/❌
   - 批量处理: ✅/❌
   
### 发现的问题
1. [问题描述]
   - 严重程度: 高/中/低
   - 重现步骤: [详细步骤]
   - 期望结果: [描述]
   - 实际结果: [描述]

### 建议和后续行动
- [具体建议]
- [修复计划]
```

---

**更新日期**: 2025年5月23日  
**版本**: 1.0