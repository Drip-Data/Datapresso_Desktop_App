import React, { useState, ChangeEvent, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, CheckCircle, Trash2, Upload, Search as SearchIcon, Database, Filter as FilterIcon, Zap, Loader2 } from 'lucide-react'; // Added FilterIcon, Zap, Loader2
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Restore Dialog imports
// import { Label } from '@/components/ui/label'; // Keep others commented for now
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Checkbox } from '@/components/ui/checkbox';
import DataStatisticsCard from '@/components/DataStatisticsCard'; // Restore
import DataProcessingHistoryCard from '@/components/DataProcessingHistoryCard'; // Restore
import FilteringConfigPanel, { DataFilteringRequestFrontend } from '@/components/FilteringConfigPanel';
import GenerationConfigPanel, { GenerationConfigPayload } from '@/components/GenerationConfigPanel';
import { filterData as apiFilterData, generateData as apiGenerateData } from '@/utils/apiAdapter';
import { toast } from "sonner"; // Import toast for notifications

// Mock data for the table, replace with actual data fetching later
const mockSeedData = [
  { id: '1', name: 'example_seed_data.jsonl', records: 1000, size: '2.5 MB', status: '已校验', statusType: 'success', uploadDate: '2024-05-10' },
  { id: '2', name: 'code_examples.jsonl', records: 500, size: '1.8 MB', status: '已校验', statusType: 'success', uploadDate: '2024-05-09' },
  { id: '3', name: 'raw_conversations.csv', records: 1200, size: '3.2 MB', status: '待校验', statusType: 'warning', uploadDate: '2024-05-07' },
  { id: '4', name: 'new_dataset_to_validate.jsonl', records: 750, size: '1.2 MB', status: '新上传', statusType: 'info', uploadDate: '2024-05-14' },
];

type SeedDataItem = typeof mockSeedData[0];

const DataManagementPage: React.FC = () => {
  const [originalSeedData, setOriginalSeedData] = useState<SeedDataItem[]>(mockSeedData); // Store the original data
  const [displayedData, setDisplayedData] = useState<SeedDataItem[]>(mockSeedData); // Data currently shown in the table
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFileName, setPreviewFileName] = useState(''); // Restore
  const [previewFileContent, setPreviewFileContent] = useState(''); // Restore
  const [isFilteringModalOpen, setIsFilteringModalOpen] = useState(false);
  const [currentFilteringConfig, setCurrentFilteringConfig] = useState<DataFilteringRequestFrontend | null>(null);
  const [filteringStrategy, setFilteringStrategy] = useState<string>('');
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [isApplyingFilter, setIsApplyingFilter] = useState(false);
  const [isGeneratingData, setIsGeneratingData] = useState(false);

  // TODO: Implement actual file upload, preview, delete, validate logic

  const handleShowPreview = (fileName: string) => { // Restore
    setPreviewFileName(fileName);
    // Simulate fetching content based on fileName
    if (fileName === 'example_seed_data.jsonl') {
        setPreviewFileContent(
`[
  {
    "instruction": "解释量子计算中的叠加态概念",
    "response": "在量子计算中，叠加态是指量子比特可以同时处于多个状态的能力。传统计算机的比特只能是0或1，而量子比特可以同时是0和1的线性组合，直到被测量时才会坍缩为特定状态。这种特性使量子计算机能够并行处理大量可能的解决方案，为特定类型的计算提供巨大的速度提升。"
  },
  {
    "instruction": "如何实现简单的Web服务器？",
    "response": "使用Python实现简单的Web服务器可以通过内置的http.server模块：\\n\\n\`\`\`python\\nimport http.server\\nimport socketserver\\n\\nPORT = 8000\\nHandler = http.server.SimpleHTTPRequestHandler\\n\\nwith socketserver.TCPServer(("", PORT), Handler) as httpd:\\n    print("服务器运行在端口:", PORT)\\n    httpd.serve_forever()\\n\`\`\`\\n\\n运行这段代码后，可以在浏览器中访问http://localhost:8000来查看当前目录中的文件。"
  }
]`
        );
    } else {
        setPreviewFileContent(`无法预览文件: ${fileName} (此为模拟预览)`);
    }
    setIsPreviewModalOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    setOriginalSeedData(prevData => prevData.filter(item => item.id !== id));
    setDisplayedData(prevData => prevData.filter(item => item.id !== id));
    // TODO: API call to delete on backend
  };
  
  // searchTerm will filter the displayedData
  const searchedData = displayedData.filter((item: SeedDataItem) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleFilteringConfigChange = useCallback((config: DataFilteringRequestFrontend, strategy: string) => {
    setCurrentFilteringConfig(config);
    setFilteringStrategy(strategy);
    console.log("Filtering config updated in DataManagementPage:", config, "Strategy:", strategy);
  }, []);

  const handleApplyFilter = async () => {
    if (!currentFilteringConfig) {
      toast.error("筛选配置未就绪。");
      return;
    }
    // For now, let's assume we are filtering the first dataset in the list or a selected one.
    // This needs to be more robust: allow user to select which data to filter.
    // As a placeholder, if seedData is not empty, use it.
    // The 'data' field in DataFilteringRequestFrontend is optional in FilteringConfigPanel,
    // but required by the backend. We need to populate it here.
    
    // TODO: Implement logic to select or provide the actual data to be filtered.
    // For this example, we'll use a placeholder or mock data if no specific data source is handled by FilteringConfigPanel.
    // If FilteringConfigPanel handles data source selection (e.g. customDataPath), that logic should be used.
    // For now, let's assume we're filtering the `mockSeedData` for demonstration if no other data is specified.
    // This part needs to be properly integrated with how data is selected/uploaded.
    
    // Use originalSeedData as the source for filtering unless FilteringConfigPanel provides its own data
    const dataToFilter = currentFilteringConfig.data || originalSeedData.map(item => {
      // The backend expects a list of dictionaries. We need to ensure the fields match what the filter conditions will operate on.
      // For now, let's pass a simplified version or the full item if backend handles it.
      // This needs to align with how `FilteringConfigPanel` expects data fields to be named.
      // For mock purposes, let's assume the backend can handle the SeedDataItem structure or relevant parts.
      // A more robust solution would be to transform `SeedDataItem` to the exact format expected by the backend API.
      const { id, status, statusType, uploadDate, ...filterableData } = item; // Exclude UI-specific fields
      return filterableData;
    });
    
    if (dataToFilter.length === 0) {
        toast.error("没有可供筛选的数据。请先上传或选择数据。");
        return;
    }

    const requestPayload: DataFilteringRequestFrontend = {
      ...currentFilteringConfig, // This includes filterConditions and combineOperation
      data: dataToFilter,
    };

    console.log("Applying filter with payload:", requestPayload);
    setIsApplyingFilter(true);
    toast.info("正在应用筛选...");

    try {
      const result = await apiFilterData(requestPayload);
      console.log("Filter result:", result);
      if (result && Array.isArray(result.filteredData)) {
        const newDisplayedData: SeedDataItem[] = result.filteredData.map((filteredItem: any, index: number) => {
          const originalItem = originalSeedData.find(og => og.name === filteredItem.name);
          return {
            id: originalItem?.id || `filtered-${index}`,
            name: filteredItem.name || 'Unknown Name',
            records: filteredItem.records || 0,
            size: filteredItem.size || 'N/A',
            status: originalItem?.status || '已筛选',
            statusType: originalItem?.statusType || 'info',
            uploadDate: originalItem?.uploadDate || new Date().toISOString().split('T')[0],
            ...filteredItem,
          };
        });
        setDisplayedData(newDisplayedData);
        toast.success(`筛选成功！获得 ${result.filteredCount || newDisplayedData.length} 条记录。`);
      } else {
        toast.error(`筛选完成，但结果格式不正确或没有数据返回: ${JSON.stringify(result)}`);
      }
    } catch (error: any) {
      console.error("Error applying filter:", error);
      toast.error(`筛选失败: ${error.message}`);
    } finally {
      setIsApplyingFilter(false);
      setIsFilteringModalOpen(false);
    }
  };

  const handleStartGeneration = async (config: GenerationConfigPayload) => {
    console.log("Starting generation with config:", config);
    setIsGeneratingData(true);
    toast.info("开始生成数据...");

    // Determine seed_data based on config.seedDataSourceType
    let seedDataForRequest: any[] | undefined = undefined;
    if (config.strategy === "reasoning_distillation" || config.strategy === "seed_expansion") {
      if (config.seedDataSourceType === "default_upstream" && originalSeedData.length > 0) {
        // Using a simplified version of originalSeedData. Adapt as needed.
        seedDataForRequest = originalSeedData.map(item => ({ instruction: item.name, response: `Records: ${item.records}` })); // Example transformation
      } else if (config.seedDataSourceType === "custom_seed" && config.customSeedDataPath) {
        // TODO: Implement logic to load data from customSeedDataPath (if it's a path)
        // or parse it (if it's direct content). This might involve an IPC call.
        // For now, assuming customSeedDataPath might be direct JSON string content for simplicity.
        try {
          seedDataForRequest = JSON.parse(config.customSeedDataPath);
          if (!Array.isArray(seedDataForRequest)) throw new Error("Custom seed data is not an array.");
        } catch (e) {
          toast.error(`自定义种子数据格式错误: ${(e as Error).message}. 请提供有效的JSON数组或文件路径。`);
          setIsGeneratingData(false);
          return;
        }
      }
    }

    let backendGenerationMethod = "";
    switch (config.strategy) {
      case "reasoning_distillation":
      case "topic_guided":
        backendGenerationMethod = "llm_based";
        break;
      case "seed_expansion":
        backendGenerationMethod = "variation";
        break;
      // Add other strategy mappings if necessary
      default:
        backendGenerationMethod = config.strategy; // Fallback, might need adjustment
    }

    const llmParams: Record<string, any> = {};
    if (backendGenerationMethod === "llm_based") {
      llmParams.temperature = config.temperature;
      llmParams.topP = config.topP;
      llmParams.frequencyPenalty = config.frequencyPenalty;
      // llmParams.presencePenalty = config.presencePenalty; // Add if configured in GenerationConfigPayload
      // llmParams.stopSequences = config.stopSequences; // Add if configured
    }

    const requestPayload = {
      seedData: seedDataForRequest,
      template: backendGenerationMethod === "template" && config.strategy === "topic_guided" ? { topic: config.topicDescription } : undefined, // Adjust if template strategy is different
      generationMethod: backendGenerationMethod,
      count: config.count,
      llmModel: config.model, // This is used by service if method is llm_based
      llmPrompt: config.strategy === "topic_guided" ? config.topicDescription : (backendGenerationMethod === "llm_based" ? "Generate data based on seed." : undefined), // Provide a default prompt or ensure it's set
      llmParams: Object.keys(llmParams).length > 0 ? llmParams : undefined,
      // TODO: Add other fields from DataGenerationRequest schema if they are configurable in GenerationConfigPanel
      // fieldConstraints: config.fieldConstraints,
      // variationFactor: config.variationFactor,
      // preserveRelationships: config.preserveRelationships,
      // randomSeed: config.randomSeed,
    };

    console.log("Generation request payload:", requestPayload);

    try {
      const result = await apiGenerateData(requestPayload);
      console.log("Generation result:", result);
      if (result && result.generatedData) {
        // TODO: Better integration of generated data.
        // For now, prepend to displayedData with a mock structure.
        const newGeneratedItems: SeedDataItem[] = result.generatedData.map((genItem: any, index: number) => ({
          id: `gen-${Date.now()}-${index}`,
          name: genItem.name || `Generated Data ${index + 1} (Strategy: ${config.strategy})`,
          records: genItem.records || 1, // Assuming backend returns records or it's 1 per item
          size: genItem.size || 'N/A',
          status: '新生成',
          statusType: 'info',
          uploadDate: new Date().toISOString().split('T')[0],
          // ... spread other relevant fields from genItem if they match SeedDataItem
        }));
        setDisplayedData(prev => [...newGeneratedItems, ...prev]);
        toast.success(`数据生成成功！新增 ${result.count || newGeneratedItems.length} 条记录。`);
      } else {
        toast.error(`数据生成完成，但结果格式不正确: ${JSON.stringify(result)}`);
      }
    } catch (error: any) {
      console.error("Error during data generation:", error);
      toast.error(`数据生成失败: ${error.message}`);
    } finally {
      setIsGeneratingData(false);
      setIsGenerationModalOpen(false);
    }
  };

  const getStatusTagClass = (statusType: string) => { // Restore getStatusTagClass
    switch (statusType) {
      case 'success': return 'bg-success-html/10 text-green-700';
      case 'warning': return 'bg-warning-html/10 text-yellow-700';
      case 'info': return 'bg-info-html/10 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Mock data for chart - Restore this logic
  const chartData = {
    labels: ['通用问答', '代码', '对话'],
    values: [
      displayedData.filter((d: SeedDataItem) => d.name.includes('seed_data') || d.name.includes('conversations')).reduce((sum: number, item: SeedDataItem) => sum + item.records, 0),
      displayedData.filter((d: SeedDataItem) => d.name.includes('code_examples')).reduce((sum: number, item: SeedDataItem) => sum + item.records, 0),
      displayedData.filter((d: SeedDataItem) => d.name.includes('new_dataset')).reduce((sum: number, item: SeedDataItem) => sum + item.records, 0) // Example, adjust as needed
    ].filter((v: number) => v > 0) // Filter out zero values if any category is empty
  };
  // Adjust labels if some values are filtered out
  const activeLabels = chartData.labels.filter((_, index: number) => chartData.values[index] > 0);


  // Calculate total records and size for statistics - based on displayedData
  const totalRecords = displayedData.reduce((sum: number, item: SeedDataItem) => sum + item.records, 0);
  // Assuming size is like "2.5 MB", "1.8 MB". This is a simplified sum.
  const totalSizeMB = displayedData.reduce((sum: number, item: SeedDataItem) => {
    const sizeMatch = item.size.match(/(\d+(\.\d+)?)\s*MB/);
    return sum + (sizeMatch ? parseFloat(sizeMatch[1]) : 0);
  }, 0);
  const totalSizeDisplay = totalSizeMB > 0 ? `${totalSizeMB.toFixed(1)} MB` : "N/A";

  return (
    <div className="space-y-6">
      {/* Seed Data Management Card */}
      <div className="bg-bg-card-html rounded-xl shadow-sm-html">
        <div className="px-6 py-5 border-b border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-semibold text-text-primary-html flex items-center">
            <Database size={22} className="mr-3 text-primary-dark" />
            种子数据管理 (Restored Basic Structure)
          </h2>
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0 md:w-64">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary-html" />
              <Input
                type="text"
                placeholder="搜索数据..."
                className="pl-9 text-sm py-2"
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button size="sm" className="text-xs" onClick={() => setIsUploadModalOpen(true)}>
              <Upload size={14} className="mr-1.5" /> 上传数据
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setIsFilteringModalOpen(true)}>
              <FilterIcon size={14} className="mr-1.5" /> 高级筛选
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => {
                setDisplayedData(originalSeedData);
                setSearchTerm('');
                toast.info('筛选已清除，显示原始数据。');
              }}
              disabled={displayedData === originalSeedData || isApplyingFilter || isGeneratingData}
            >
              清除筛选
            </Button>
            <Button
              size="sm"
              className="text-xs bg-sky-500 hover:bg-sky-600 text-white"
              onClick={() => setIsGenerationModalOpen(true)}
              disabled={isApplyingFilter || isGeneratingData}
            >
              {isGeneratingData ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Zap size={14} className="mr-1.5" />}
              数据生成
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-full align-middle">
            {/* Data Header */}
            <div className="grid grid-cols-[minmax(200px,3fr)_repeat(5,minmax(80px,1fr))] gap-4 px-6 py-3 bg-slate-50 text-xs font-medium text-text-primary-html border-b border-black/5">
              <div>文件名</div>
              <div className="hidden sm:block text-center">记录数</div>
              <div className="hidden sm:block text-center">大小</div>
              <div className="text-center">状态</div>
              <div className="hidden md:block text-center">上传日期</div>
              <div className="text-right">操作</div>
            </div>
            {/* Data List Container - Restore list rendering */}
            <div className="bg-white">
              {searchedData.map((item: SeedDataItem) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[minmax(200px,3fr)_repeat(5,minmax(80px,1fr))] gap-4 px-6 py-4 items-center border-b border-gray-100 last:border-b-0 hover:bg-primary-dark/5 transition-colors duration-150 text-sm"
                >
                  <div className="text-text-primary-html font-medium truncate" title={item.name}>{item.name}</div>
                  <div className="hidden sm:block text-center text-text-secondary-html">{item.records.toLocaleString()}</div>
                  <div className="hidden sm:block text-center text-text-secondary-html">{item.size}</div>
                  <div className="text-center">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusTagClass(item.statusType)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="hidden md:block text-center text-text-secondary-html">{item.uploadDate}</div>
                  <div className="flex justify-end space-x-1">
                    <Button variant="ghost" size="xs" title="预览" onClick={() => handleShowPreview(item.name)}>
                      <Eye className="h-4 w-4 text-text-secondary-html hover:text-primary-dark" />
                    </Button>
                    <Button variant="ghost" size="xs" title="校验" onClick={() => alert('Validate action to be implemented')}>
                      <CheckCircle className="h-4 w-4 text-text-secondary-html hover:text-success-html" />
                    </Button>
                    <Button variant="ghost" size="xs" title="删除" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-text-secondary-html hover:text-danger-html" />
                    </Button>
                  </div>
                </div>
              ))}
              {searchedData.length === 0 && (
                <div className="px-6 py-10 text-center text-text-secondary-html">没有找到匹配的数据。</div>
              )}
            </div>
          </div>
        </div>

        {/* Pagination (Simplified) */}
        <div className="px-6 py-4 border-t border-black/5 flex justify-between items-center text-xs text-text-secondary-html">
          <div>显示 {searchedData.length > 0 ? 1 : 0}-{searchedData.length} 条，共 {searchedData.length} 条 (当前显示) / {originalSeedData.length} (原始)</div>
          <div className="flex space-x-1">
            <Button variant="outline" size="sm" className="text-xs" disabled={true}>上一页</Button> {/* TODO: Implement pagination */}
            <Button variant="outline" size="sm" className="text-xs" disabled={true}>下一页</Button> {/* TODO: Implement pagination */}
          </div>
        </div>
      </div>

      {/* Grid for Statistics and History - Restore DataStatisticsCard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataStatisticsCard
          totalRecords={totalRecords}
          totalSize={totalSizeDisplay}
          fileCount={displayedData.length}
          distributionData={{ labels: activeLabels, values: chartData.values }}
        />
        <DataProcessingHistoryCard />
      </div>

      {/* Seed Data Preview Modal - Restore this modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>数据预览: {previewFileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-1 bg-slate-900 rounded-md">
            <pre className="text-xs text-slate-200 whitespace-pre-wrap break-all p-4 font-mono">
              {previewFileContent}
            </pre>
          </div>
          <DialogFooter className="mt-auto pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">关闭</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Upload modal - Placeholder, actual implementation needed */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>上传数据文件</DialogTitle></DialogHeader>
          <p className="py-4">上传功能待实现。请选择要上传的种子数据文件（例如 .jsonl, .csv）。</p>
          <Input type="file" className="my-2" onChange={(e: ChangeEvent<HTMLInputElement>) => console.log(e.target.files)} />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button onClick={() => { alert('上传逻辑待实现'); setIsUploadModalOpen(false); }}>开始上传</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filtering Config Modal */}
      <Dialog open={isFilteringModalOpen} onOpenChange={setIsFilteringModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>高级数据筛选配置</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-1 pr-3"> {/* Added pr-3 for scrollbar space */}
            <FilteringConfigPanel onConfigChange={handleFilteringConfigChange} />
          </div>
          <DialogFooter className="mt-auto pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">取消</Button>
            <Button type="button" variant="outline" disabled={isApplyingFilter}>取消</Button>
          </DialogClose>
          <Button type="button" onClick={handleApplyFilter} disabled={isApplyingFilter}>
            {isApplyingFilter && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            应用筛选
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Generation Config Modal */}
    {/* GenerationConfigPanel has its own "Start Generation" button, so no explicit footer here unless needed */}
    <Dialog open={isGenerationModalOpen} onOpenChange={setIsGenerationModalOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>数据生成配置</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-1 pr-3">
          <GenerationConfigPanel onStartGeneration={handleStartGeneration} />
        </div>
         <DialogFooter className="mt-auto pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isGeneratingData}>取消</Button>
          </DialogClose>
          {/* The "Start Generation" button is inside GenerationConfigPanel,
              so this footer might only need a close button, or be removed if panel handles close.
              For consistency, let's assume the panel's button is primary and this is just for closing.
          */}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <p className="text-center text-sm text-gray-500 mt-4">预览、筛选和生成弹窗已启用。</p>
    </div> // Closing the root div from line 271
  );
};

export default DataManagementPage;