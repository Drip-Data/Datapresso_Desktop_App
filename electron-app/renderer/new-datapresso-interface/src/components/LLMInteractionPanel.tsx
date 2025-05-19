import React, { useState, useEffect, useMemo } from 'react';
import { useApiKeys } from '@/contexts/ApiKeysContext';
import { useLLMConfig } from '@/contexts/LLMConfigContext';
import { PROVIDER_UI_SUPPLEMENTS, LLMProviderID } from '@/config/llmConfig'; // Assuming LLMProviderID is exported
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Send, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { invokeLlm, invokeLlmWithImages } from '@/utils/apiAdapter';

interface ModelOption {
  value: string;
  label: string;
}

interface LLMInteractionPanelProps {
  // Placeholder for any props if needed in the future
}

const LLMInteractionPanel: React.FC<LLMInteractionPanelProps> = () => {
  const { isKeyStored } = useApiKeys();
  const { providersConfig, loading: llmConfigLoading, error: llmConfigError, getModelsForProvider } = useLLMConfig();

  const [prompt, setPrompt] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [apiProvider, setApiProvider] = useState<LLMProviderID | string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(1024);
  const [topP, setTopP] = useState<number>(0.9);
  // Add other common LLM params as needed

  const [response, setResponse] = useState<string>('');
  const [usageInfo, setUsageInfo] = useState<any>(null); // To store token usage, cost etc.
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState<string>('');

  // Effect to set initial API provider
  useEffect(() => {
    if (!llmConfigLoading && providersConfig && Object.keys(providersConfig).length > 0 && !apiProvider) {
      const firstProviderId = Object.keys(providersConfig)[0] as LLMProviderID;
      setApiProvider(firstProviderId);
    }
  }, [providersConfig, llmConfigLoading, apiProvider]);

  // Effect to update available models when apiProvider changes
  useEffect(() => {
    if (!apiProvider || !providersConfig || llmConfigLoading) {
      setAvailableModels([]);
      setSelectedModel("");
      return;
    }

    const providerDetails = providersConfig[apiProvider as LLMProviderID];
    if (providerDetails?.has_api_key && !isKeyStored(apiProvider as LLMProviderID)) {
      const displayName = PROVIDER_UI_SUPPLEMENTS[apiProvider as LLMProviderID]?.name || apiProvider;
      toast.error(`请先前往API Key设置页面填写 ${displayName} 的 API Key`);
      setAvailableModels([]);
      setSelectedModel("");
      return;
    }
    
    const modelsFromContext = getModelsForProvider(apiProvider as LLMProviderID);
    const modelOptions = modelsFromContext.map(model => ({ value: model.id, label: model.id }));
    setAvailableModels(modelOptions);

    if (modelOptions.length > 0) {
      const currentSelectedModelStillAvailable = modelOptions.some(m => m.value === selectedModel);
      if (!currentSelectedModelStillAvailable || !selectedModel) {
        setSelectedModel(modelOptions[0].value);
      }
    } else {
      setSelectedModel("");
    }
  }, [apiProvider, providersConfig, llmConfigLoading, isKeyStored, getModelsForProvider, selectedModel]);

  const handleProviderChange = (newProviderId: string) => {
    setApiProvider(newProviderId as LLMProviderID);
  };

  const handleAddImageUrl = () => {
    if (newImageUrl.trim() && imageUrls.length < 5) { // Limit to 5 images for now
      try {
        new URL(newImageUrl); // Validate URL
        setImageUrls([...imageUrls, newImageUrl.trim()]);
        setNewImageUrl('');
      } catch (_) {
        toast.error("请输入有效的图片 URL。");
      }
    } else if (imageUrls.length >= 5) {
        toast.warning("最多只能添加5张图片。");
    }
  };

  const handleRemoveImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };


  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error("请输入提示词。");
      return;
    }
    if (!apiProvider || !selectedModel) {
      toast.error("请选择服务商和模型。");
      return;
    }
    if (llmConfigLoading || !providersConfig) {
      toast.error("LLM配置仍在加载中，请稍候。");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse('');
    setUsageInfo(null);

    const params: any = {
      prompt,
      model: selectedModel,
      provider: apiProvider,
      temperature,
      maxTokens,
      topP,
    };
    if (systemPrompt.trim()) {
      params.systemMessage = systemPrompt;
    }

    try {
      let result;
      if (imageUrls.length > 0) {
        // Check if selected model/provider supports vision
        const modelDetails = providersConfig[apiProvider as LLMProviderID]?.models[selectedModel];
        if (!modelDetails?.capabilities?.includes('vision')) {
            toast.error(`选定的模型 ${selectedModel} 不支持图像输入。`);
            setIsLoading(false);
            return;
        }
        params.images = imageUrls; // Assuming backend expects 'images' for invokeLlmWithImages
        result = await invokeLlmWithImages(params);
      } else {
        result = await invokeLlm(params);
      }
      
      if (result && result.text) {
        setResponse(result.text);
        if (result.usage) {
          setUsageInfo(result.usage);
        }
      } else {
        setError("未能从API获取有效响应。");
        console.error("Invalid API response structure:", result);
      }
    } catch (err: any) {
      setError(err.message || "调用LLM API时发生错误。");
      console.error("LLM API call error:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formSectionClass = "mb-6";
  const formLabelClass = "block mb-1.5 text-sm font-medium text-text-primary-html";
  const formControlSmClass = "w-full px-3 py-1.5 rounded-md border-gray-300 bg-white text-sm text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-1 focus:ring-primary-dark/50";

  const dynamicallyLoadedProviders = useMemo(() => {
    if (!providersConfig) return [];
    return Object.keys(providersConfig).map(id => ({
      id: id as LLMProviderID,
      name: PROVIDER_UI_SUPPLEMENTS[id as LLMProviderID]?.name || id,
    }));
  }, [providersConfig]);


  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-text-primary-html mb-4">LLM API 交互面板</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Config */}
        <div className="space-y-4">
          <div className={formSectionClass}>
            <Label htmlFor="api-provider" className={formLabelClass}>服务商</Label>
            <Select value={apiProvider} onValueChange={handleProviderChange} disabled={llmConfigLoading || dynamicallyLoadedProviders.length === 0}>
              <SelectTrigger id="api-provider" className={formControlSmClass}>
                <SelectValue placeholder="选择服务商" />
              </SelectTrigger>
              <SelectContent>
                {dynamicallyLoadedProviders.map(provider => (
                  <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={formSectionClass}>
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

          <div className={formSectionClass}>
            <Label htmlFor="system-prompt" className={formLabelClass}>系统提示词 (可选)</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="例如：你是一个乐于助人的AI助手。"
              className={`${formControlSmClass} min-h-[80px]`}
            />
          </div>

          <div className={formSectionClass}>
            <Label htmlFor="prompt" className={formLabelClass}>用户提示词</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="在此输入你的问题或指令..."
              className={`${formControlSmClass} min-h-[120px]`}
              required
            />
          </div>
          
          {/* Image URLs Input */}
           <div className={formSectionClass}>
            <Label className={formLabelClass}>图片输入 (可选, 最多5张URL)</Label>
            {imageUrls.map((url, index) => (
              <div key={index} className="flex items-center space-x-2 mb-1">
                <Input type="text" value={url} readOnly className={`${formControlSmClass} bg-gray-100`} />
                <Button variant="ghost" size="icon" onClick={() => handleRemoveImageUrl(index)} className="text-red-500 hover:bg-red-100 h-8 w-8">
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            {imageUrls.length < 5 && (
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="输入图片 URL"
                  className={formControlSmClass}
                />
                <Button variant="outline" size="icon" onClick={handleAddImageUrl} className="h-8 w-8">
                  <ImagePlus size={16} />
                </Button>
              </div>
            )}
          </div>


          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="llm-params" className="border-t border-b-0">
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">高级参数</AccordionTrigger>
              <AccordionContent className="pt-2 space-y-3">
                <div>
                  <Label htmlFor="temperature" className={`${formLabelClass} text-xs`}>温度 (当前: {temperature.toFixed(1)})</Label>
                  <Input type="range" id="temperature" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-dark mt-1" />
                </div>
                <div>
                  <Label htmlFor="max-tokens" className={`${formLabelClass} text-xs`}>最大Token数 (当前: {maxTokens})</Label>
                  <Input type="number" id="max-tokens" min="1" step="1" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value,10))} className={formControlSmClass} />
                </div>
                <div>
                  <Label htmlFor="top-p" className={`${formLabelClass} text-xs`}>Top P (当前: {topP.toFixed(1)})</Label>
                  <Input type="range" id="top-p" min="0" max="1" step="0.1" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-dark mt-1" />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button onClick={handleSubmit} disabled={isLoading || llmConfigLoading} className="w-full bg-primary-dark hover:bg-primary-dark/90 text-white">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            发送请求
          </Button>
        </div>

        {/* Right Column: Response */}
        <div className="space-y-4">
          <div className={formSectionClass}>
            <Label htmlFor="response" className={formLabelClass}>模型响应</Label>
            <div className="min-h-[200px] bg-slate-50 p-4 rounded-md border border-gray-200 whitespace-pre-wrap break-words overflow-y-auto text-sm">
              {isLoading && <p className="text-text-secondary-html">正在等待响应...</p>}
              {error && <p className="text-red-500">错误: {error}</p>}
              {response && <p>{response}</p>}
              {!isLoading && !error && !response && <p className="text-text-light-html">结果将显示在此处</p>}
            </div>
          </div>
          {usageInfo && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs p-3 rounded-md">
              <h4 className="font-semibold mb-1">使用情况:</h4>
              <p>提示 Tokens: {usageInfo.promptTokens || 'N/A'}</p>
              <p>补全 Tokens: {usageInfo.completionTokens || 'N/A'}</p>
              <p>总 Tokens: {usageInfo.totalTokens || 'N/A'}</p>
              <p>预估成本: ${typeof usageInfo.cost === 'number' ? usageInfo.cost.toFixed(5) : 'N/A'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LLMInteractionPanel;