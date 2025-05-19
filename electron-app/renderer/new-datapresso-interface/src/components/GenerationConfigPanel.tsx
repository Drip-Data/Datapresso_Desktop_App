import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { useApiKeys } from '@/contexts/ApiKeysContext';
import { useLLMConfig } from '@/contexts/LLMConfigContext'; // Added
import { PROVIDER_UI_SUPPLEMENTS } from '@/config/llmConfig'; // For UI hints
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RotateCcw, Save, GitBranch, FileUp, FolderInput, Database, Edit3, PlayCircle } from 'lucide-react'; // Added PlayCircle

interface ModelOption {
  value: string;
  label: string;
}

// Define the structure of the configuration that will be passed to the parent
export interface GenerationConfigPayload {
  seedDataSourceType: string;
  customSeedDataPath?: string; // Content or path
  strategy: string;
  count: number;
  batchSize: number;
  topicDescription?: string;
  apiProvider: string;
  model: string;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  outputLocationType: string;
  customOutputPath?: string;
  outputFormat: string;
}

interface GenerationConfigPanelProps {
  onStartGeneration: (config: GenerationConfigPayload) => void;
}

const GenerationConfigPanel: React.FC<GenerationConfigPanelProps> = ({ onStartGeneration }) => {
  const { getApiKey, isKeyStored } = useApiKeys();
  const { providersConfig, loading: llmConfigLoading, error: llmConfigError, getModelsForProvider } = useLLMConfig();

  const [genSeedDataSourceType, setGenSeedDataSourceType] = useState("default_upstream");
  const [genCustomSeedDataPath, setGenCustomSeedDataPath] = useState("");
  const [genStrategy, setGenStrategy] = useState("reasoning_distillation");
  const [genCount, setGenCount] = useState(100);
  const [batchSize, setBatchSize] = useState(10);
  const [topicDescription, setTopicDescription] = useState("");
  
  const [apiProvider, setApiProvider] = useState<string>(""); // Will be set from providersConfig
  const [selectedModel, setSelectedModel] = useState("");
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [genOutputLocationType, setGenOutputLocationType] = useState("default_location");
  const [genCustomOutputPath, setGenCustomOutputPath] = useState("./output/generated_data");
  const [genOutputFormat, setGenOutputFormat] = useState("jsonl");

  // Effect to set initial API provider once config is loaded
  useEffect(() => {
    if (!llmConfigLoading && providersConfig && Object.keys(providersConfig).length > 0 && !apiProvider) {
      // Set to the first available provider that might require an API key or just the first one
      const firstProviderId = Object.keys(providersConfig)[0];
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

    const providerDetails = providersConfig[apiProvider];
    if (providerDetails?.has_api_key && !isKeyStored(apiProvider)) {
      const displayName = PROVIDER_UI_SUPPLEMENTS[apiProvider]?.name || apiProvider;
      toast.error(`请先前往API Key设置页面填写 ${displayName} 的 API Key`);
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
      // If currentSelectedModelStillAvailable is true, selectedModel remains as is.
    } else {
      setSelectedModel("");
    }
  }, [apiProvider, providersConfig, llmConfigLoading, isKeyStored, getModelsForProvider, selectedModel]);

  const handleProviderChange = (newProviderId: string) => {
    setApiProvider(newProviderId);
    // setSelectedModel(""); // Reset model when provider changes, useEffect will pick the first available
    // The useEffect above will handle model list update and selection.
  };

  const formSectionClass = "mb-8"; // Increased from mb-6 for more spacing
  const formSectionTitleClass = "text-md font-bold text-text-primary-html mb-3"; // Changed font-semibold to font-bold
  const formGroupClass = "mb-3"; // Reduced from mb-4
  const formLabelClass = "block mb-1 text-sm font-medium text-text-primary-html"; // Reduced from mb-1.5
  const formControlSmClass = "w-full px-3 py-1.5 rounded-md border-gray-300 bg-white text-sm text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-1 focus:ring-primary-dark/50";
  const formHelperTextClass = "text-xs text-gray-500 mt-0.5";


  const getCompiledGenerationConfig = (): GenerationConfigPayload => {
    return {
      seedDataSourceType: genSeedDataSourceType,
      customSeedDataPath: genSeedDataSourceType === "custom_seed" ? genCustomSeedDataPath : undefined,
      strategy: genStrategy,
      count: genCount,
      batchSize: batchSize,
      topicDescription: genStrategy === "topic_guided" ? topicDescription : undefined,
      apiProvider: apiProvider,
      model: selectedModel,
      temperature: temperature,
      topP: topP,
      frequencyPenalty: frequencyPenalty,
      outputLocationType: genOutputLocationType,
      customOutputPath: genOutputLocationType === "custom_location" ? genCustomOutputPath : undefined,
      outputFormat: genOutputFormat,
    };
  };

  const handleStartGenerationClick = () => {
    const config = getCompiledGenerationConfig();
    // Basic validation before calling parent
    if (!config.apiProvider || !config.model) {
      toast.error("请选择服务商和模型。");
      return;
    }
    if ((config.strategy === "reasoning_distillation" || config.strategy === "seed_expansion") && config.seedDataSourceType === "custom_seed" && !config.customSeedDataPath) {
      toast.error("自定义种子数据来源时，请输入路径或内容。");
      return;
    }
    if (config.strategy === "topic_guided" && !config.topicDescription) {
      toast.error("主题引导策略需要填写主题描述。");
      return;
    }
    onStartGeneration(config);
  };

  const handleSave = () => {
    const configToSave = getCompiledGenerationConfig();
    console.log("Save Generation Config Triggered. Current Config:", configToSave);
    toast.success("生成配置已（在控制台）记录。");
    // Actual save logic would go here
  };
  const handleReset = () => {
    // Reset all state to initial values (example for a few)
    setGenSeedDataSourceType("default_upstream");
    setGenStrategy("reasoning_distillation");
    setGenCount(100);
    // ... reset other states ...
    toast.info("配置已重置为默认值。");
  };

  const renderSeedDataSourceInput = () => {
    if (genStrategy === "reasoning_distillation" || genStrategy === "seed_expansion") {
      if (genSeedDataSourceType === "custom_seed") {
        return (
          <div className={`${formGroupClass} mt-2.5`}> {/* Adjusted mt */}
            <Label htmlFor="gen-custom-seed-path" className={formLabelClass}>自定义种子数据 (路径或内容)</Label>
            <div className="flex items-center">
              <Input type="text" id="gen-custom-seed-path" value={genCustomSeedDataPath} onChange={(e) => setGenCustomSeedDataPath(e.target.value)} placeholder="输入种子文件路径或直接粘贴种子内容" className={formControlSmClass}/>
              <Button variant="outline" size="icon" className="ml-2 h-8 w-8" title="上传文件"><FileUp size={16} /></Button>
            </div>
            <p className={formHelperTextClass}>例如: /path/to/seeds.jsonl 或直接粘贴JSON内容。</p>
          </div>
        );
      }
    }
    return null;
  };
  
  const renderTopicInput = () => {
    if (genStrategy === "topic_guided") {
         return (
            <div className={formGroupClass}>
                <Label htmlFor="topic-description" className={formLabelClass}>主题描述</Label>
                <Textarea id="topic-description" value={topicDescription} onChange={(e) => setTopicDescription(e.target.value)} placeholder="详细描述您希望生成内容的主题、领域、风格等..." className={`${formControlSmClass} min-h-[80px]`} /> {/* Reduced min-h */}
            </div>
        );
    }
    return null;
  }

  const dynamicallyLoadedProviders = useMemo(() => {
    if (!providersConfig) return [];
    return Object.keys(providersConfig).map(id => ({
      id,
      name: PROVIDER_UI_SUPPLEMENTS[id]?.name || id, // Use supplement name or ID
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
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary-html flex items-center">
          <GitBranch size={20} className="mr-2.5 text-primary-dark" />数据生成配置
        </h3>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="text-xs px-3 py-1.5 h-auto hover:bg-primary-dark/10 hover:text-primary-dark focus-visible:ring-primary-dark/50" onClick={handleReset}><RotateCcw size={14} className="mr-1.5" />恢复默认</Button>
          <Button variant="outline" size="sm" className="text-xs px-3 py-1.5 h-auto" onClick={handleSave}><Save size={14} className="mr-1.5" />保存配置</Button>
          <Button
            size="sm"
            className="text-xs px-3 py-1.5 h-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90 hover:brightness-105 transition-all"
            onClick={handleStartGenerationClick}
          >
            <PlayCircle size={14} className="mr-1.5" />开始生成
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {(genStrategy === "reasoning_distillation" || genStrategy === "seed_expansion") && (
          <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
            <h4 className={formSectionTitleClass}>数据来源 (种子数据)</h4>
            <RadioGroup value={genSeedDataSourceType} onValueChange={setGenSeedDataSourceType} className="space-y-1.5">
              <div className="flex items-center space-x-2"><RadioGroupItem value="default_upstream" id="gen-seed-default" /><Label htmlFor="gen-seed-default" className="text-sm font-normal flex items-center"><Database size={16} className="mr-2 text-gray-600" /> 使用上游种子数据/默认库</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="custom_seed" id="gen-seed-custom" /><Label htmlFor="gen-seed-custom" className="text-sm font-normal flex items-center"><Edit3 size={16} className="mr-2 text-gray-600" /> 自定义种子数据来源</Label></div>
            </RadioGroup>
            {renderSeedDataSourceInput()}
          </div>
        )}

        {(genStrategy === "reasoning_distillation" || genStrategy === "seed_expansion") && <div className="h-px bg-gray-200 my-6"></div>}

        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
          <h4 className={formSectionTitleClass}>基础配置</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
            <div className={formGroupClass}><Label htmlFor="gen-strategy" className={formLabelClass}>生成策略</Label><Select value={genStrategy} onValueChange={setGenStrategy}><SelectTrigger id="gen-strategy" className={formControlSmClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="reasoning_distillation">推理链蒸馏 (qa → qra)</SelectItem><SelectItem value="seed_expansion">基于种子扩展 (qra → qra)</SelectItem><SelectItem value="topic_guided">基于主题引导 (0 → qra)</SelectItem></SelectContent></Select></div>
            <div className={formGroupClass}><Label htmlFor="gen-count" className={formLabelClass}>生成数量</Label><Input type="number" id="gen-count" value={genCount} onChange={(e) => setGenCount(Math.max(1, parseInt(e.target.value, 10) || 1))} className={formControlSmClass} /></div>
            <div className={formGroupClass}><Label htmlFor="batch-size" className={formLabelClass}>批次大小</Label><Input type="number" id="batch-size" value={batchSize} min="1" max="100" onChange={(e) => setBatchSize(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))} className={formControlSmClass} /></div>
          </div>
        </div>

        <div className="h-px bg-gray-200 my-6"></div>

        {genStrategy === "topic_guided" && (
             <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
                <h4 className={formSectionTitleClass}>主题引导配置</h4>
                {renderTopicInput()}
            </div>
        )}
        
        {genStrategy === "topic_guided" && <div className="h-px bg-gray-200 my-6"></div>}

        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
          <h4 className={formSectionTitleClass}>模型配置</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div className={formGroupClass}>
              <Label htmlFor="api-provider" className={formLabelClass}>服务商</Label>
              <Select value={apiProvider} onValueChange={handleProviderChange} disabled={llmConfigLoading || dynamicallyLoadedProviders.length === 0}>
                <SelectTrigger id="api-provider" className={formControlSmClass}><SelectValue placeholder="选择服务商" /></SelectTrigger>
                <SelectContent>
                  {dynamicallyLoadedProviders.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={formGroupClass}>
              <Label htmlFor="selected-model" className={formLabelClass}>模型</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={availableModels.length === 0 || llmConfigLoading}>
                <SelectTrigger id="selected-model" className={formControlSmClass}>
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

        <Accordion type="single" collapsible defaultValue="advanced-settings-item" className="w-full">
          <AccordionItem value="advanced-settings-item" className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <AccordionTrigger className="flex items-center justify-between w-full px-5 py-3 text-md font-semibold text-text-primary-html bg-gray-50 hover:bg-gray-100 data-[state=open]:border-b border-gray-200 rounded-t-lg">
                高级配置
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
                <div><Label htmlFor="gen-temp" className={`${formLabelClass} text-xs`}>温度 (当前: {temperature.toFixed(1)})</Label><Input type="range" id="gen-temp" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-dark mt-1" /></div>
                <div><Label htmlFor="gen-topp" className={`${formLabelClass} text-xs`}>Top P (当前: {topP.toFixed(1)})</Label><Input type="range" id="gen-topp" min="0" max="1" step="0.1" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-dark mt-1" /></div>
                <div><Label htmlFor="gen-freq-penalty" className={`${formLabelClass} text-xs`}>频率惩罚 (当前: {frequencyPenalty.toFixed(1)})</Label><Input type="range" id="gen-freq-penalty" min="-2" max="2" step="0.1" value={frequencyPenalty} onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-dark mt-1" /></div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="h-px bg-gray-200 my-6"></div>
        
        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
            <h4 className={formSectionTitleClass}>输出设置</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div className={formGroupClass}>
                    <Label className={formLabelClass}>输出位置</Label>
                    <RadioGroup value={genOutputLocationType} onValueChange={setGenOutputLocationType} className="space-y-1.5">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="default_location" id="gen-out-default" /><Label htmlFor="gen-out-default" className="text-sm font-normal">使用默认输出路径</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="custom_location" id="gen-out-custom" /><Label htmlFor="gen-out-custom" className="text-sm font-normal">自定义输出路径</Label></div>
                    </RadioGroup>
                    {genOutputLocationType === "custom_location" && (
                        <div className="mt-2.5 flex items-center">
                            <Input type="text" id="gen-custom-outputdir" value={genCustomOutputPath} onChange={(e) => setGenCustomOutputPath(e.target.value)} className={formControlSmClass} placeholder="./output/my_generated_data"/>
                            <Button variant="outline" size="icon" className="ml-2 h-8 w-8" title="选择文件夹"><FolderInput size={16} /></Button>
                        </div>
                    )}
                </div>
                <div className={formGroupClass}>
                    <Label htmlFor="gen-outputformat" className={formLabelClass}>输出格式</Label>
                    <Select value={genOutputFormat} onValueChange={setGenOutputFormat}>
                        <SelectTrigger id="gen-outputformat" className={formControlSmClass}><SelectValue /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="jsonl">JSONL</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GenerationConfigPanel;