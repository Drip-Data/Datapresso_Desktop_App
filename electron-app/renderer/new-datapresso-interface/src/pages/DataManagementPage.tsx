import React, { useState, ChangeEvent, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, CheckCircle, Trash2, Upload, Search as SearchIcon, Database, Filter as FilterIcon, Zap, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import DataStatisticsCard from '@/components/DataStatisticsCard';
import DataProcessingHistoryCard from '@/components/DataProcessingHistoryCard';
import FilteringConfigPanel, { DataFilteringRequestFrontend } from '@/components/FilteringConfigPanel';
import GenerationConfigPanel, { GenerationConfigPayload } from '@/components/GenerationConfigPanel';
import { filterData as apiFilterData, generateData as apiGenerateData, uploadSeedData as apiUploadSeedData, listSeedData as apiListSeedData, deleteSeedData as apiDeleteSeedData } from '@/utils/apiAdapter'; // Import deleteSeedData
import { DataFilteringRequest, DataGenerationRequest, FilterOperation, GenerationMethod } from '@/types/api'; // Import types

// Define the structure of a SeedDataItem based on backend schema
interface SeedDataItem {
  id: string;
  filename: string;
  savedPath: string;
  fileSize: number;
  recordCount: number;
  dataType?: string;
  status: string; // e.g., "uploaded", "validated", "indexed", "failed"
  uploadDate: string; // ISO string
  updatedAt: string; // ISO string
}

const DataManagementPage: React.FC = () => {
  const [originalSeedData, setOriginalSeedData] = useState<SeedDataItem[]>([]);
  const [displayedData, setDisplayedData] = useState<SeedDataItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewFileContent, setPreviewFileContent] = useState('');
  const [isFilteringModalOpen, setIsFilteringModalOpen] = useState(false);
  const [currentFilteringConfig, setCurrentFilteringConfig] = useState<DataFilteringRequestFrontend | null>(null);
  const [filteringStrategy, setFilteringStrategy] = useState<string>('');
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [isApplyingFilter, setIsApplyingFilter] = useState(false);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch seed data on component mount
  const fetchSeedData = useCallback(async () => {
    toast.info("正在加载种子数据...");
    try {
      const result = await apiListSeedData({});
      if (result && result.data && Array.isArray(result.data.items)) {
        setOriginalSeedData(result.data.items);
        setDisplayedData(result.data.items);
        toast.success(`成功加载 ${result.data.totalItems} 条种子数据。`);
      } else {
        toast.error("加载种子数据失败: 响应格式不正确。");
        setOriginalSeedData([]);
        setDisplayedData([]);
      }
    } catch (error: any) {
      console.error("Error fetching seed data:", error);
      toast.error(`加载种子数据失败: ${error.message}`);
      setOriginalSeedData([]);
      setDisplayedData([]);
    }
  }, []);

  useEffect(() => {
    fetchSeedData();
  }, [fetchSeedData]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("请选择一个文件进行上传。");
      return;
    }

    setUploading(true);
    toast.info(`正在上传文件: ${selectedFile.name}...`);

    try {
      // dataType can be selected by user in the future, for now, it's optional
      const result = await apiUploadSeedData(selectedFile);
      if (result && result.status === 'success') {
        toast.success(`文件 "${selectedFile.name}" 上传成功！`);
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        fetchSeedData(); // Refresh the list
      } else {
        toast.error(`文件上传失败: ${result.message || '未知错误'}`);
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(`文件上传失败: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleShowPreview = (item: SeedDataItem) => {
    setPreviewFileName(item.filename);
    // For actual preview, you'd need an API to fetch file content by ID or path
    // For now, we'll just show a placeholder or the savedPath
    setPreviewFileContent(`文件内容预览 (ID: ${item.id}, 路径: ${item.savedPath})\n\n实际内容预览功能待实现。`);
    setIsPreviewModalOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    toast.info(`正在删除种子数据: ${id}...`);
    try {
      const result = await apiDeleteSeedData(id); // Call the new API
      if (result && result.status === 'success') {
        toast.success(`种子数据 ${id} 删除成功！`);
        setOriginalSeedData(prevData => prevData.filter(item => item.id !== id));
        setDisplayedData(prevData => prevData.filter(item => item.id !== id));
      } else {
        toast.error(`删除种子数据失败: ${result.message || '未知错误'}`);
      }
    } catch (error: any) {
      console.error("Error deleting seed data:", error);
      toast.error(`删除种子数据失败: ${error.message}`);
    }
  };
  
  const searchedData = displayedData.filter((item: SeedDataItem) =>
    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
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
    
    // Use originalSeedData as the source for filtering unless FilteringConfigPanel provides its own data
    // Ensure dataToFilter matches the backend's expected List[Dict[str, Any]]
    const dataToFilter = currentFilteringConfig.data || originalSeedData.map(item => ({
      // Map SeedDataItem to a generic object that backend can process
      id: item.id, // Include ID if backend needs to reference original items
      filename: item.filename,
      file_size: item.fileSize, // Convert to snake_case for backend
      record_count: item.recordCount, // Convert to snake_case for backend
      data_type: item.dataType, // Convert to snake_case for backend
      status: item.status,
      upload_date: item.uploadDate, // Convert to snake_case for backend
      updated_at: item.updatedAt, // Convert to snake_case for backend
      // Add any other relevant fields that might be part of filtering
    }));
    
    if (dataToFilter.length === 0) {
        toast.error("没有可供筛选的数据。请先上传或选择数据。");
        return;
    }

    // Convert filterConditions to snake_case for backend
    const snakeCaseFilterConditions = currentFilteringConfig.filterConditions.map(condition => ({
      field: condition.field,
      operation: condition.operation as FilterOperation, // Cast to FilterOperation
      value: condition.value,
      case_sensitive: condition.caseSensitive, // Convert to snake_case
    }));

    const requestPayload: DataFilteringRequest = { // Use imported DataFilteringRequest type
      data: dataToFilter,
      filterConditions: snakeCaseFilterConditions, // Use snake_case version
      combineOperation: currentFilteringConfig.combineOperation,
      limit: currentFilteringConfig.limit,
      offset: currentFilteringConfig.offset,
      orderBy: currentFilteringConfig.orderBy,
      orderDirection: currentFilteringConfig.orderDirection,
    };

    console.log("Applying filter with payload:", requestPayload);
    setIsApplyingFilter(true);
    toast.info("正在应用筛选...");

    try {
      const result = await apiFilterData(requestPayload);
      console.log("Filter result:", result);
      if (result && Array.isArray(result.filteredData)) {
        const newDisplayedData: SeedDataItem[] = result.filteredData.map((filteredItem: any) => {
          // Convert filteredItem from snake_case back to camelCase for frontend display
          return {
            id: filteredItem.id,
            filename: filteredItem.filename,
            savedPath: filteredItem.saved_path,
            fileSize: filteredItem.file_size,
            recordCount: filteredItem.record_count,
            dataType: filteredItem.data_type,
            status: filteredItem.status,
            uploadDate: filteredItem.upload_date,
            updatedAt: filteredItem.updated_at,
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
        // Use relevant fields from SeedDataItem for generation, convert to snake_case
        seedDataForRequest = originalSeedData.map(item => ({
          id: item.id,
          filename: item.filename,
          saved_path: item.savedPath,
          file_size: item.fileSize,
          record_count: item.recordCount,
          data_type: item.dataType,
          status: item.status,
          upload_date: item.uploadDate,
          updated_at: item.updatedAt,
        }));
      } else if (config.seedDataSourceType === "custom_seed" && config.customSeedDataPath) {
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

    let backendGenerationMethod: GenerationMethod; // Explicitly type as GenerationMethod
    switch (config.strategy) {
      case "reasoning_distillation":
      case "topic_guided":
        backendGenerationMethod = GenerationMethod.LLM_BASED; // Use enum value
        break;
      case "seed_expansion":
        backendGenerationMethod = GenerationMethod.VARIATION; // Use enum value
        break;
      // Add other strategy mappings if necessary
      default:
        backendGenerationMethod = config.strategy as GenerationMethod; // Fallback, might need adjustment
    }

    const llmParams: Record<string, any> = {};
    if (backendGenerationMethod === GenerationMethod.LLM_BASED) { // Use enum value
      llmParams.temperature = config.temperature;
      llmParams.top_p = config.topP; // Convert to snake_case
      llmParams.frequency_penalty = config.frequencyPenalty; // Convert to snake_case
      // llmParams.presence_penalty = config.presencePenalty; // Add if configured in GenerationConfigPayload
      // llmParams.stop_sequences = config.stopSequences; // Add if configured
    }

    const requestPayload: DataGenerationRequest = { // Use imported DataGenerationRequest type
      seedData: seedDataForRequest,
      template: backendGenerationMethod === GenerationMethod.TEMPLATE && config.strategy === "topic_guided" ? { topic: config.topicDescription } : undefined, // Adjust if template strategy is different
      generationMethod: backendGenerationMethod,
      count: config.count,
      llmModel: config.model, // This is used by service if method is llm_based
      llmPrompt: config.strategy === "topic_guided" ? config.topicDescription : (backendGenerationMethod === GenerationMethod.LLM_BASED ? "Generate data based on seed." : undefined), // Provide a default prompt or ensure it's set
      // Merge llmParams directly into the payload if backend expects flat structure
      ...(Object.keys(llmParams).length > 0 ? llmParams : {}), 
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
        const newGeneratedItems: SeedDataItem[] = result.generatedData.map((genItem: any, index: number) => {
          // Convert genItem from snake_case back to camelCase for frontend display
          return {
            id: genItem.id,
            filename: genItem.filename,
            savedPath: genItem.saved_path,
            fileSize: genItem.file_size,
            recordCount: genItem.record_count,
            dataType: genItem.data_type,
            status: genItem.status,
            uploadDate: genItem.upload_date,
            updatedAt: genItem.updated_at,
          };
        });
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

  const getStatusTagClass = (status: string) => {
    // Map backend status to UI status types for styling
    switch (status) {
      case 'uploaded': return 'bg-blue-100 text-blue-800';
      case 'validated': return 'bg-green-100 text-green-800';
      case 'indexed': return 'bg-purple-100 text-purple-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'filtered': return 'bg-gray-100 text-gray-700'; // For filtered data display
      case 'generated': return 'bg-sky-100 text-sky-800'; // For newly generated data
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Calculate total records and size for statistics - based on displayedData
  const totalRecords = displayedData.reduce((sum: number, item: SeedDataItem) => sum + item.recordCount, 0);
  const totalSizeMB = displayedData.reduce((sum: number, item: SeedDataItem) => sum + (item.fileSize / (1024 * 1024)), 0); // Convert bytes to MB
  const totalSizeDisplay = totalSizeMB > 0 ? `${totalSizeMB.toFixed(2)} MB` : "N/A";

  // Mock data for chart - adapt to actual data types
  const chartData = {
    labels: ['通用问答', '代码', '对话', '其他'], // Example categories
    values: [
      displayedData.filter((d: SeedDataItem) => d.dataType === 'general_qa').reduce((sum: number, item: SeedDataItem) => sum + item.recordCount, 0),
      displayedData.filter((d: SeedDataItem) => d.dataType === 'coding_tasks').reduce((sum: number, item: SeedDataItem) => sum + item.recordCount, 0),
      displayedData.filter((d: SeedDataItem) => d.dataType === 'conversations').reduce((sum: number, item: SeedDataItem) => sum + item.recordCount, 0),
      displayedData.filter((d: SeedDataItem) => !d.dataType || (d.dataType !== 'general_qa' && d.dataType !== 'coding_tasks' && d.dataType !== 'conversations')).reduce((sum: number, item: SeedDataItem) => sum + item.recordCount, 0),
    ].filter((v: number) => v > 0)
  };
  const activeLabels = chartData.labels.filter((_, index: number) => chartData.values[index] > 0);

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
                  <div className="text-text-primary-html font-medium truncate" title={item.filename}>{item.filename}</div>
                  <div className="hidden sm:block text-center text-text-secondary-html">{item.recordCount.toLocaleString()}</div>
                  <div className="hidden sm:block text-center text-text-secondary-html">{(item.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
                  <div className="text-center">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusTagClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="hidden md:block text-center text-text-secondary-html">{new Date(item.uploadDate).toLocaleDateString()}</div>
                  <div className="flex justify-end space-x-1">
                    <Button variant="ghost" size="xs" title="预览" onClick={() => handleShowPreview(item)}>
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
          <Input type="file" className="my-2" onChange={handleFileChange} />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={uploading}>取消</Button></DialogClose>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              开始上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filtering Config Modal */}
      <Dialog open={isFilteringModalOpen} onOpenChange={setIsFilteringModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>高级数据筛选配置</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-1 pr-3">
            <FilteringConfigPanel onConfigChange={handleFilteringConfigChange} />
          </div>
          <DialogFooter className="mt-auto pt-4">
            <DialogClose asChild>
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
            <Button type="button" onClick={() => { /* Handled by GenerationConfigPanel's internal button */ }} disabled={isGeneratingData}>
              {isGeneratingData && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              开始生成 (由面板控制)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataManagementPage;