import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, HashRouter } from 'react-router-dom';
// ThemeProvider is now in main.tsx
import { TooltipProvider } from "@/components/ui/tooltip";
// ApiKeysProvider is now in main.tsx, wrapping App. Remove from here.
// import { ApiKeysProvider } from '@/contexts/ApiKeysContext';
import { WorkflowConfigProvider } from '@/contexts/WorkflowConfigContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { UserProvider } from '@/contexts/UserContext'; // Import UserProvider
import { SettingsProvider } from '@/contexts/SettingsContext'; // Import SettingsProvider
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import MainLayout from '@/components/MainLayout';
import DatapressoWorkflowPage from "@/pages/DatapressoWorkflowPage";
import DataQualityPage from "@/pages/DataQualityPage";
import TrainingPage from "@/pages/TrainingPage";
import ExecutionPage from "@/pages/ExecutionPage";
import SettingsPage from "@/pages/SettingsPage";
import DataManagementPage from "@/pages/DataManagementPage";
import HelpPage from "@/pages/HelpPage";
import ApiKeysPage from "@/pages/ApiKeysPage";
import ProjectManagementPage from "@/pages/ProjectManagementPage"; // Import ProjectManagementPage
import LLMPlaygroundPage from "@/pages/LLMPlaygroundPage"; // Import LLMPlaygroundPage
// Placeholder page component for pages not yet implemented
const PlaceholderPage = ({ title }: { title: string }) => <div className="p-4 bg-white rounded-lg shadow-md">This is the {title} page. Content to be added.</div>;

// Temporary inline EndToEndTestPage for workflow testing
const EndToEndTestPage = () => {
  const [results, setResults] = useState<{[key: string]: any}>({});
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});

  const updateResult = (key: string, result: any) => {
    setResults(prev => ({ ...prev, [key]: result }));
  };

  const updateLoading = (key: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">端到端工作流程测试</h1>
        <p className="text-gray-600 mt-2">测试完整的数据处理流程：生成 → 评估 → 过滤 → 训练</p>
      </div>
      
      <div className="grid gap-4">
        {/* 数据生成测试 */}
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>📊</span> 1. 数据生成测试
          </h3>
          <p className="text-gray-600 mb-3">生成测试数据集</p>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded mr-2 disabled:opacity-50"
            disabled={loading.generation}
            onClick={async () => {
              updateLoading('generation', true);
              try {
                const response = await fetch('http://localhost:8000/data_generation/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    seed_data: [
                      { name: "张三", age: 25, email: "zhangsan@example.com", score: 85 },
                      { name: "李四", age: 30, email: "lisi@example.com", score: 92 }
                    ],
                    generation_method: "variation", // Changed to lowercase to match Enum
                    count: 10,
                    variation_factor: 0.3,
                    request_id: `test-gen-${Date.now()}`
                  })
                });
                const result = await response.json();
                updateResult('generation', result);
              } catch (error: any) {
                updateResult('generation', { error: error.toString() });
              } finally {
                updateLoading('generation', false);
              }
            }}
          >
            {loading.generation ? '生成中...' : '开始生成数据'}
          </button>
          {results.generation && (
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <h4 className="font-medium mb-2">生成结果:</h4>
              {results.generation.error ? (
                <div className="text-red-600">{results.generation.error}</div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    状态: {results.generation.status} |
                    生成数量: {results.generation.generated_data?.length || 0}
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    <pre className="text-xs bg-white p-2 rounded">
                      {JSON.stringify(results.generation.generated_data?.slice(0, 3), null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 质量评估测试 */}
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>🔍</span> 2. 质量评估测试
          </h3>
          <p className="text-gray-600 mb-3">评估数据质量指标</p>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded mr-2 disabled:opacity-50"
            disabled={loading.quality}
            onClick={async () => {
              updateLoading('quality', true);
              try {
                const testData = [
                  { name: "张三", age: 25, email: "zhangsan@example.com", score: 85 },
                  { name: "李四", age: 30, email: "lisi@example.com", score: 92 }
                ];
                const response = await fetch('http://localhost:8000/quality_assessment/assess', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    data: testData,
                    dimensions: ['completeness', 'consistency', 'accuracy'],
                    request_id: `test-quality-${Date.now()}`
                  })
                });
                const result = await response.json();
                updateResult('quality', result);
              } catch (error: any) {
                updateResult('quality', { error: error.toString() });
              } finally {
                updateLoading('quality', false);
              }
            }}
          >
            {loading.quality ? '评估中...' : '开始质量评估'}
          </button>
          {results.quality && (
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <h4 className="font-medium mb-2">评估结果:</h4>
              {results.quality.error ? (
                <div className="text-red-600">{results.quality.error}</div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    状态: {results.quality.status} |
                    总体评分: {results.quality.assessment?.overall_score || '未知'}
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    <pre className="text-xs bg-white p-2 rounded">
                      {JSON.stringify(results.quality.assessment, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 数据过滤测试 */}
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>🔧</span> 3. 数据过滤测试
          </h3>
          <p className="text-gray-600 mb-3">根据质量标准过滤数据</p>
          <button
            className="px-4 py-2 bg-orange-500 text-white rounded mr-2 disabled:opacity-50"
            disabled={loading.filtering}
            onClick={async () => {
              updateLoading('filtering', true);
              try {
                const testData = [
                  { name: "张三", age: 25, email: "zhangsan@example.com", score: 85 },
                  { name: "李四", age: 30, email: "lisi@example.com", score: 92 },
                  { name: "王五", age: 28, email: "", score: 45 }
                ];
                const response = await fetch('http://localhost:8000/data_filtering/filter', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    data: testData,
                    filter_conditions: [ // Changed "filters" to "filter_conditions"
                      { type: 'threshold', field: 'score', operator: 'gte', value: 80 }
                    ],
                    request_id: `test-filter-${Date.now()}`
                  })
                });
                const result = await response.json();
                updateResult('filtering', result);
              } catch (error: any) {
                updateResult('filtering', { error: error.toString() });
              } finally {
                updateLoading('filtering', false);
              }
            }}
          >
            {loading.filtering ? '过滤中...' : '开始数据过滤'}
          </button>
          {results.filtering && (
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <h4 className="font-medium mb-2">过滤结果:</h4>
              {results.filtering.error ? (
                <div className="text-red-600">{results.filtering.error}</div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    状态: {results.filtering.status} |
                    保留数据: {results.filtering.filtered_data?.length || 0} 条 |
                    过滤掉: {results.filtering.filtered_out_count || 0} 条
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    <pre className="text-xs bg-white p-2 rounded">
                      {JSON.stringify(results.filtering.filtered_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* LlamaFactory测试 */}
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>🧠</span> 4. 模型训练测试
          </h3>
          <p className="text-gray-600 mb-3">使用高质量数据进行模型训练</p>
          <button
            className="px-4 py-2 bg-purple-500 text-white rounded mr-2 disabled:opacity-50"
            disabled={loading.training}
            onClick={async () => {
              updateLoading('training', true);
              try {
                const response = await fetch('http://localhost:8000/llamafactory/test');
                const result = await response.json();
                updateResult('training', result);
              } catch (error: any) {
                updateResult('training', { error: error.toString() });
              } finally {
                updateLoading('training', false);
              }
            }}
          >
            {loading.training ? '测试中...' : '测试训练模块'}
          </button>
          {results.training && (
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <h4 className="font-medium mb-2">测试结果:</h4>
              {results.training.error ? (
                <div className="text-red-600">{results.training.error}</div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    状态: {results.training.status} |
                    模块: {results.training.module}
                  </p>
                  <p className="text-sm text-green-600 mb-2">{results.training.message}</p>
                  <div className="max-h-32 overflow-y-auto">
                    <div className="text-xs bg-white p-2 rounded">
                      <strong>可用端点:</strong>
                      <ul className="mt-1 space-y-1">
                        {results.training.endpoints?.map((endpoint: string, index: number) => (
                          <li key={index} className="font-mono">• {endpoint}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 完整流程测试 */}
        <div className="p-4 bg-gray-50 rounded-lg border-2 border-blue-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>🚀</span> 完整端到端流程测试
          </h3>
          <p className="text-gray-600 mb-3">按顺序执行所有步骤</p>
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium"
            onClick={async () => {
              alert('完整端到端流程测试即将开始！这将依次执行：数据生成 → 质量评估 → 数据过滤 → 模型训练');
            }}
          >
            开始完整端到端测试
          </button>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">测试说明</h4>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• 每个步骤都可以单独测试，验证功能正确性</li>
          <li>• 完整端到端测试验证模块间的数据流转</li>
          <li>• 测试结果将通过弹窗显示，实际应用中可集成到UI中</li>
          <li>• 确保所有后端服务正常运行后再进行测试</li>
        </ul>
      </div>
    </div>
  );
};

// Temporary inline ModuleTestPage until file creation issue is resolved
const ModuleTestPage = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">模块联调测试</h1>
        <p className="text-gray-600 mt-2">测试 Datapresso 核心功能模块的前后端连通性</p>
      </div>
      <div className="grid gap-4">
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-lg font-semibold">数据生成模块</h3>
          <p className="text-gray-600">测试数据生成API连通性</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={async () => {
              try {
                const response = await fetch('http://localhost:8000/data_generation/test');
                const result = await response.json();
                alert(`测试结果: ${result.message}`);
              } catch (error) {
                alert(`测试失败: ${error}`);
              }
            }}
          >
            测试模块
          </button>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-lg font-semibold">质量评估模块</h3>
          <p className="text-gray-600">测试质量评估API连通性</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={async () => {
              try {
                const response = await fetch('http://localhost:8000/quality_assessment/test');
                const result = await response.json();
                alert(`测试结果: ${result.message}`);
              } catch (error) {
                alert(`测试失败: ${error}`);
              }
            }}
          >
            测试模块
          </button>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-lg font-semibold">数据过滤模块</h3>
          <p className="text-gray-600">测试数据过滤API连通性</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={async () => {
              try {
                const response = await fetch('http://localhost:8000/data_filtering/test');
                const result = await response.json();
                alert(`测试结果: ${result.message}`);
              } catch (error) {
                alert(`测试失败: ${error}`);
              }
            }}
          >
            测试模块
          </button>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-lg font-semibold">LlamaFactory模块</h3>
          <p className="text-gray-600">测试LlamaFactory模型训练API连通性</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={async () => {
              try {
                const response = await fetch('http://localhost:8000/llamafactory/test');
                const result = await response.json();
                alert(`测试结果: ${result.message}`);
              } catch (error) {
                alert(`测试失败: ${error}`);
              }
            }}
          >
            测试模块
          </button>
        </div>
      </div>
    </div>
  );
};


function App() {
  return (
    // ThemeProvider has been moved to main.tsx
    <TooltipProvider> {/* TooltipProvider can be one of the outermost */}
      <UserProvider>
        {/* ApiKeysProvider has been moved to main.tsx to correctly wrap App and be inside LLMConfigProvider */}
        <SettingsProvider> {/* Wrap HashRouter with SettingsProvider */}
          <HashRouter>
            <Routes>
              {/* Routes using MainLayout */}
              <Route
                element={
                  <WorkflowConfigProvider>
                    <ProjectProvider>
                      <MainLayout />
                    </ProjectProvider>
                  </WorkflowConfigProvider>
                }
              >
                <Route path="/" element={<Navigate to="/workflow" replace />} />
                <Route path="/workflow" element={<DatapressoWorkflowPage />} />
                <Route path="/data" element={<DataManagementPage />} />
                <Route path="/data-quality" element={<DataQualityPage />} />
                <Route path="/training" element={<TrainingPage />} />
                <Route path="/execution" element={<ExecutionPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/api-keys" element={<ApiKeysPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/project-management" element={<ProjectManagementPage />} />
                <Route path="/llm-playground" element={<LLMPlaygroundPage />} /> {/* Added LLM Playground Route */}
                <Route path="/module-test" element={<ModuleTestPage />} /> {/* Added Module Test Route */}
                <Route path="/end-to-end-test" element={<EndToEndTestPage />} /> {/* Added End-to-End Test Route */}
                {/* Fallback for unknown routes within the layout */}
                <Route path="*" element={<PlaceholderPage title="404 - 页面未找到" />} />
              </Route>
              {/* Standalone routes for debugging are removed.
              The general fallback below will catch any truly unhandled routes.
              If specific non-MainLayout routes are needed (e.g. login), they'd go here.
          */}
          {/* A general fallback if no other route matches.
              Consider if this is too broad or if 404s should be handled within MainLayout for non-standalone pages.
              For now, keeping a general fallback.
          */}
           {/* <Route path="*" element={
            <div style={{ backgroundColor: 'lightgray', color: 'black', padding: '100px', fontSize: '40px', textAlign: 'center', height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 9998 }}>
              FALLBACK 404 - UNMATCHED ROUTE (TOP LEVEL)
            </div>
          } /> */}
          </Routes>
              <SonnerToaster />
            </HashRouter>
        </SettingsProvider>
      </UserProvider>
  </TooltipProvider>
);
}

export default App;