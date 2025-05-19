import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo, removed useCallback, useContext (if not used elsewhere)
import { useApiKeys } from '@/contexts/ApiKeysContext';
import { useLLMConfig } from '@/contexts/LLMConfigContext'; // Added
import { PROVIDER_UI_SUPPLEMENTS } from '@/config/llmConfig'; // For UI hints
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, Save, Filter, FileUp, FolderInput, PlusCircle, MinusCircle, Settings, HelpCircle, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'; // Added Filter and other icons

interface ModelOption { // Kept for potential use if some filters need model selection
  value: string;
  label: string;
}

// New interface for individual metric config in specific_metrics filter
interface SpecificMetricConfig {
  id: string; // for react key
  metricName: string;
  threshold: number;
}

// Renaming the component to AssessmentConfigPanel to match filename
const AssessmentConfigPanel = () => {
  const { getApiKey, isKeyStored } = useApiKeys();
  const { providersConfig, loading: llmConfigLoading, error: llmConfigError, getModelsForProvider } = useLLMConfig(); // Use LLMConfig

  const [selectedFilterMethod, setSelectedFilterMethod] = useState("multi_dimension_balanced");

  // Data Source (remains the same)
  const [dataSourceType, setDataSourceType] = useState("default_gen_output");
  const [customDataPath, setCustomDataPath] = useState("");

  // --- States for "multi_dimension_balanced" filter ---
  const [qualityThreshold, setQualityThreshold] = useState(0.7);
  const [safetyThreshold, setSafetyThreshold] = useState(0.9);
  const [diversityWeight, setDiversityWeight] = useState(0.3);
  const [targetSize, setTargetSize] = useState(1000);
  // For difficulty distribution, a simple example:
  const [difficultyEasy, setDifficultyEasy] = useState(30); // Percentage
  const [difficultyMedium, setDifficultyMedium] = useState(50);
  const [difficultyHard, setDifficultyHard] = useState(20);
  // For diversity dimensions (simplified for now)
  const [diversityDimensions, setDiversityDimensions] = useState({ domain: true, difficulty: true, content: true });
  const [diversityDimWeights, setDiversityDimWeights] = useState({ domain: 0.4, difficulty: 0.3, content: 0.3 });


  // --- States for "specific_metrics" filter ---
  const [specificMetrics, setSpecificMetrics] = useState<SpecificMetricConfig[]>([
    { id: `metric-${Date.now()}`, metricName: "overall_score", threshold: 0.8 }
  ]);

  // --- States for "rationale_answer_quality" filter ---
  const [rationaleQualityThreshold, setRationaleQualityThreshold] = useState(0.7);
  const [answerAccuracyThreshold, setAnswerAccuracyThreshold] = useState(0.7);

  // --- States for "verification_status" filter ---
  const [requireVerified, setRequireVerified] = useState(true);
  
  // Output Path (remains the same)
  const [outputType, setOutputType] = useState("default_output");
  const [customOutputPath, setCustomOutputPath] = useState("./output/filtered_data"); // Updated default

  // States for API provider and model, similar to GenerationConfigPanel
  // These might not be directly used by all filter methods, but are included for consistency
  // and potential future use if some assessment/filtering tasks require LLM calls.
  const [apiProvider, setApiProvider] = useState<string>(""); // Will be set from providersConfig
  const [selectedModel, setSelectedModel] = useState("");
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);


  const formSectionClass = "mb-8";
  const formSectionTitleClass = "text-lg font-bold text-text-primary-html mb-4"; // Changed font-semibold to font-bold
  const formGroupClass = "mb-4";
  const formLabelClass = "block mb-1.5 text-sm font-medium text-text-primary-html";
  const formControlBaseClass = "w-full px-3 py-2 rounded-md border-gray-300 bg-white text-sm text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-1 focus:ring-primary-dark/50";

  const handleAddSpecificMetric = () => {
    setSpecificMetrics(prev => [...prev, { id: `metric-${Date.now()}`, metricName: "", threshold: 0.5 }]);
  };

  const handleRemoveSpecificMetric = (id: string) => {
    setSpecificMetrics(prev => prev.filter(metric => metric.id !== id));
  };

  const handleSpecificMetricChange = (id: string, field: 'metricName' | 'threshold', value: string | number) => {
    setSpecificMetrics(prev => prev.map(metric => 
      metric.id === id ? { ...metric, [field]: field === 'threshold' ? Number(value) : value } : metric
    ));
  };


  // Effect to set initial API provider once config is loaded
  useEffect(() => {
    if (!llmConfigLoading && providersConfig && Object.keys(providersConfig).length > 0 && !apiProvider) {
      const firstProviderId = Object.keys(providersConfig)[0];
      // Check if this provider requires a key and if it's stored, or pick one that doesn't.
      // For simplicity, just picking the first one. UI will show toast if key is missing.
      setApiProvider(firstProviderId);
    }
  }, [providersConfig, llmConfigLoading, apiProvider]);

  // Effect to update available models when apiProvider or providersConfig changes
  useEffect(() => {
    if (!apiProvider || !providersConfig || llmConfigLoading) {
      setAvailableModels([]);
      setSelectedModel("");
      return;
    }

    const providerDetailsFromConfig = providersConfig[apiProvider]; // This is BackendProviderInfo
    const uiSupplement = PROVIDER_UI_SUPPLEMENTS[apiProvider];
    const displayName = uiSupplement?.name || apiProvider;

    if (providerDetailsFromConfig?.has_api_key && !isKeyStored(apiProvider)) {
      if (apiProvider !== 'local') { // Don't toast for 'local' or other keyless providers
        toast.error(`请先前往API Key设置页面填写 ${displayName} 的 API Key`);
      }
      setAvailableModels([]);
      setSelectedModel("");
      return;
    }
    
    const modelsFromContext = getModelsForProvider(apiProvider); // Returns Array<{ id: string; details: ModelDetail }>
    const modelOptions = modelsFromContext.map(model => ({ value: model.id, label: model.id }));
    setAvailableModels(modelOptions);

    if (modelOptions.length > 0) {
      const currentSelectedModelStillAvailable = modelOptions.some(m => m.value === selectedModel);
      if (!currentSelectedModelStillAvailable) {
        setSelectedModel(modelOptions[0].value);
      }
    } else {
      setSelectedModel("");
    }
  }, [apiProvider, providersConfig, llmConfigLoading, isKeyStored, getModelsForProvider, selectedModel]);

  const handleProviderChange = (newProviderId: string) => {
    setApiProvider(newProviderId);
    // Model list and selectedModel will be updated by the useEffect hook
  };

  const handleSave = () => {
    const baseConfig = {
      selectedFilterMethod,
      dataSourceType,
      customDataPath: dataSourceType === "custom_path" ? customDataPath : undefined,
      outputType,
      customOutputPath: outputType === "custom_output" ? customOutputPath : undefined,
    };

    let methodSpecificConfig = {};
    if (selectedFilterMethod === "multi_dimension_balanced") {
      methodSpecificConfig = {
        qualityThreshold, safetyThreshold, diversityWeight, targetSize,
        difficultyDistribution: { easy: difficultyEasy/100, medium: difficultyMedium/100, hard: difficultyHard/100 },
        diversityDimensionsConfig: { dimensions: Object.keys(diversityDimensions).filter(k => diversityDimensions[k as keyof typeof diversityDimensions]), weights: diversityDimWeights }
      };
    } else if (selectedFilterMethod === "specific_metrics") {
      methodSpecificConfig = { metrics: specificMetrics.map(m => ({ [m.metricName]: m.threshold })) };
    } else if (selectedFilterMethod === "rationale_answer_quality") {
      methodSpecificConfig = { rationaleQualityThreshold, answerAccuracyThreshold };
    } else if (selectedFilterMethod === "verification_status") {
      methodSpecificConfig = { requireVerified };
    }

    console.log("Save Filtering Config", { ...baseConfig, ...methodSpecificConfig });
  };

  const handleReset = () => {
    setSelectedFilterMethod("multi_dimension_balanced");
    setDataSourceType("default_gen_output"); setCustomDataPath("");
    setQualityThreshold(0.7); setSafetyThreshold(0.9); setDiversityWeight(0.3); setTargetSize(1000);
    setDifficultyEasy(30); setDifficultyMedium(50); setDifficultyHard(20);
    setDiversityDimensions({ domain: true, difficulty: true, content: true });
    setDiversityDimWeights({ domain: 0.4, difficulty: 0.3, content: 0.3 });
    setSpecificMetrics([{ id: `metric-${Date.now()}`, metricName: "overall_score", threshold: 0.8 }]);
    setRationaleQualityThreshold(0.7); setAnswerAccuracyThreshold(0.7);
    setRequireVerified(true);
    setOutputType("default_output"); setCustomOutputPath("./output/filtered_data");
    console.log("Reset Filtering Config");
  };

  const renderFilterMethodSpecificParams = () => {
    switch (selectedFilterMethod) {
      case "multi_dimension_balanced":
        return (
          <div className="space-y-4 p-4 border rounded-md bg-slate-50">
            <h5 className="text-md font-semibold text-gray-700 mb-3">综合多维度筛选参数</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div><Label htmlFor="qualityTh" className={formLabelClass}>质量阈值</Label><Input type="number" id="qualityTh" value={qualityThreshold} onChange={e => setQualityThreshold(parseFloat(e.target.value))} step="0.05" min="0" max="1" className={formControlBaseClass}/></div>
              <div><Label htmlFor="safetyTh" className={formLabelClass}>安全阈值</Label><Input type="number" id="safetyTh" value={safetyThreshold} onChange={e => setSafetyThreshold(parseFloat(e.target.value))} step="0.05" min="0" max="1" className={formControlBaseClass}/></div>
              <div><Label htmlFor="diversityWt" className={formLabelClass}>多样性权重</Label><Input type="number" id="diversityWt" value={diversityWeight} onChange={e => setDiversityWeight(parseFloat(e.target.value))} step="0.05" min="0" max="1" className={formControlBaseClass}/></div>
              <div><Label htmlFor="targetSz" className={formLabelClass}>目标数量</Label><Input type="number" id="targetSz" value={targetSize} onChange={e => setTargetSize(parseInt(e.target.value, 10))} min="1" className={formControlBaseClass}/></div>
            </div>
            <div className={formGroupClass}><Label className={formLabelClass}>难度分布 (%)</Label>
              <div className="flex space-x-2 items-center">
                <Input type="number" value={difficultyEasy} onChange={e=>setDifficultyEasy(parseInt(e.target.value,10))} placeholder="Easy" className={`${formControlBaseClass} w-1/3`} />
                <Input type="number" value={difficultyMedium} onChange={e=>setDifficultyMedium(parseInt(e.target.value,10))} placeholder="Medium" className={`${formControlBaseClass} w-1/3`} />
                <Input type="number" value={difficultyHard} onChange={e=>setDifficultyHard(parseInt(e.target.value,10))} placeholder="Hard" className={`${formControlBaseClass} w-1/3`} />
              </div>
            </div>
            {/* Simplified diversity dimensions for now */}
            <div className={formGroupClass}><Label className={formLabelClass}>多样性分析维度</Label>
                <div className="flex items-center space-x-2"><Checkbox checked={diversityDimensions.domain} onCheckedChange={c => setDiversityDimensions(p=>({...p, domain:!!c}))} id="div-domain"/><Label htmlFor="div-domain">领域</Label></div>
                {/* Add more dimensions as needed */}
            </div>
          </div>
        );
      case "specific_metrics":
        return (
          <div className="space-y-4 p-4 border rounded-md bg-slate-50">
            <h5 className="text-md font-semibold text-gray-700 mb-3">特定指标筛选参数</h5>
            {specificMetrics.map((metric, index) => (
              <div key={metric.id} className="flex items-end space-x-2 p-2 border-b">
                <div className="flex-grow"><Label htmlFor={`metricName-${index}`} className={`${formLabelClass} text-xs`}>指标名称</Label><Input id={`metricName-${index}`} value={metric.metricName} onChange={e => handleSpecificMetricChange(metric.id, 'metricName', e.target.value)} placeholder="例如: overall_score" className={formControlBaseClass}/></div>
                <div className="w-32"><Label htmlFor={`metricTh-${index}`} className={`${formLabelClass} text-xs`}>阈值 ({'>='})</Label><Input type="number" id={`metricTh-${index}`} value={metric.threshold} onChange={e => handleSpecificMetricChange(metric.id, 'threshold', e.target.value)} step="0.01" className={formControlBaseClass}/></div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveSpecificMetric(metric.id)} className="text-red-500 hover:bg-red-100"><MinusCircle size={18}/></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAddSpecificMetric} className="mt-2"><PlusCircle size={16} className="mr-2"/>添加指标</Button>
          </div>
        );
      case "rationale_answer_quality":
        return (
          <div className="space-y-4 p-4 border rounded-md bg-slate-50">
            <h5 className="text-md font-semibold text-gray-700 mb-3">推理与答案质量筛选参数</h5>
            <div><Label htmlFor="rationaleTh" className={formLabelClass}>推理过程质量阈值</Label><Input type="number" id="rationaleTh" value={rationaleQualityThreshold} onChange={e => setRationaleQualityThreshold(parseFloat(e.target.value))} step="0.05" min="0" max="1" className={formControlBaseClass}/></div>
            <div><Label htmlFor="answerTh" className={formLabelClass}>答案准确性阈值</Label><Input type="number" id="answerTh" value={answerAccuracyThreshold} onChange={e => setAnswerAccuracyThreshold(parseFloat(e.target.value))} step="0.05" min="0" max="1" className={formControlBaseClass}/></div>
          </div>
        );
      case "verification_status":
        return (
          <div className="space-y-2 p-4 border rounded-md bg-slate-50">
            <h5 className="text-md font-semibold text-gray-700 mb-3">验证状态筛选参数</h5>
            <div className="flex items-center space-x-2">
              <Checkbox id="requireVerified" checked={requireVerified} onCheckedChange={c => setRequireVerified(Boolean(c))} />
              <Label htmlFor="requireVerified" className="font-normal">仅保留已验证的数据</Label>
            </div>
          </div>
        );
      default: return null;
    }
  };

  const dynamicallyLoadedProviders = useMemo(() => {
    if (!providersConfig) return [];
    return Object.keys(providersConfig).map(id => ({
      id,
      name: PROVIDER_UI_SUPPLEMENTS[id]?.name || id,
    }));
  }, [providersConfig]);

  if (llmConfigLoading) {
    return <div className="p-6">加载 LLM 配置...</div>;
  }

  if (llmConfigError) {
    return <div className="p-6 text-red-500">加载 LLM 配置失败: {llmConfigError.message}</div>;
  }

  return (
    <div className="bg-white p-0 rounded-xl shadow-lg border border-gray-200">
      <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-xl font-semibold text-text-primary-html flex items-center">
          <ShieldCheck size={22} className="mr-3 text-primary-dark" />
          质量评估与筛选配置
        </h3>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="text-xs hover:bg-primary-dark/10 hover:text-primary-dark focus-visible:ring-primary-dark/50" onClick={handleReset}><RotateCcw size={14} className="mr-1.5" />恢复默认</Button>
          <Button size="sm" className="text-xs bg-gradient-to-r from-primary-dark to-primary-light hover:opacity-90 hover:brightness-105 transition-all" onClick={handleSave}><Save size={14} className="mr-1.5" />保存配置</Button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
          <h4 className={formSectionTitleClass}>筛选方法选择</h4>
          <div className={formGroupClass}>
            <Label htmlFor="filter-method" className={formLabelClass}>选择数据筛选方法</Label>
            <Select value={selectedFilterMethod} onValueChange={setSelectedFilterMethod}>
              <SelectTrigger id="filter-method" className={formControlBaseClass}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multi_dimension_balanced">综合多维度筛选</SelectItem>
                <SelectItem value="specific_metrics">按特定指标筛选</SelectItem>
                <SelectItem value="rationale_answer_quality">按推理与答案质量筛选</SelectItem>
                <SelectItem value="verification_status">按验证状态筛选</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="h-px bg-gray-200 my-6"></div>
        
        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
          <h4 className={formSectionTitleClass}>评估模型配置 (可选)</h4>
          <p className="text-xs text-gray-500 mb-3">如果某些评估/筛选方法需要调用大模型，请在此处配置。</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div className={formGroupClass}>
              <Label htmlFor="assess-api-provider" className={formLabelClass}>服务商</Label>
              <Select value={apiProvider} onValueChange={handleProviderChange} disabled={llmConfigLoading || dynamicallyLoadedProviders.length === 0}>
                <SelectTrigger id="assess-api-provider" className={formControlBaseClass}><SelectValue placeholder="选择服务商" /></SelectTrigger>
                <SelectContent>
                  {dynamicallyLoadedProviders.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={formGroupClass}>
              <Label htmlFor="assess-selected-model" className={formLabelClass}>模型</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={availableModels.length === 0 || llmConfigLoading}>
                <SelectTrigger id="assess-selected-model" className={formControlBaseClass}>
                  <SelectValue placeholder={availableModels.length === 0 ? "请先选择服务商" : "选择模型"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (<SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="h-px bg-gray-200 my-6"></div>

        {renderFilterMethodSpecificParams()}

        <div className="h-px bg-gray-200 my-6"></div>

        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
          <h4 className={formSectionTitleClass}>数据来源</h4>
          <RadioGroup value={dataSourceType} onValueChange={setDataSourceType} className="space-y-2">
            <div className="flex items-center space-x-2"><RadioGroupItem value="default_gen_output" id="fds-default" /><Label htmlFor="fds-default" className="font-normal">使用上游模块默认输出</Label></div>
            <div className="flex items-center space-x-2"><RadioGroupItem value="custom_path" id="fds-custom" /><Label htmlFor="fds-custom" className="font-normal">指定数据文件/路径</Label></div>
          </RadioGroup>
          {dataSourceType === "custom_path" && (
            <div className={`${formGroupClass} mt-3`}><Label htmlFor="custom-data-path" className={formLabelClass}>自定义数据路径</Label><div className="flex items-center"><Input type="text" id="custom-data-path" value={customDataPath} onChange={(e) => setCustomDataPath(e.target.value)} placeholder="例如: /path/to/your/data.jsonl" className={formControlBaseClass} /><Button variant="outline" size="icon" className="ml-2"><FileUp size={16} /></Button></div></div>
          )}
        </div>
        
        <div className="h-px bg-gray-200 my-6"></div>
                
        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
            <h4 className={formSectionTitleClass}>输出设置</h4>
            <RadioGroup value={outputType} onValueChange={setOutputType} className="space-y-2">
                <div className="flex items-center space-x-2"><RadioGroupItem value="default_output" id="fout-default" /><Label htmlFor="fout-default" className="font-normal">使用默认输出路径</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="custom_output" id="fout-custom" /><Label htmlFor="fout-custom" className="font-normal">自定义输出路径</Label></div>
            </RadioGroup>
            {outputType === "custom_output" && (
                <div className={`${formGroupClass} mt-3`}><Label htmlFor="custom-output-path" className={formLabelClass}>自定义输出路径</Label><div className="flex items-center"><Input type="text" id="custom-output-path" value={customOutputPath} onChange={(e) => setCustomOutputPath(e.target.value)} placeholder="例如: /path/to/filtered_results" className={formControlBaseClass} /><Button variant="outline" size="icon" className="ml-2"><FolderInput size={16} /></Button></div></div>
            )}
        </div>
      </div>
    </div>
  );
};

// Renaming export
export default AssessmentConfigPanel;