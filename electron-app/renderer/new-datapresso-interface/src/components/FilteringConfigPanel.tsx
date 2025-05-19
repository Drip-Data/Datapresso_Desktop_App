import React, { useState, useEffect, useCallback } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Save, Filter, FileUp, FolderInput, PlusCircle, MinusCircle, Info, AlertTriangle } from 'lucide-react';
import { toast } from "sonner"; // For potential notifications

// Corresponds to backend schemas.FilterOperation (ensure values match)
export enum FilterOperationFrontend {
  EQUALS = "equals",
  NOT_EQUALS = "not_equals",
  GREATER_THAN = "greater_than",
  GREATER_THAN_OR_EQUAL_TO = "greater_than_or_equal_to", // Added
  LESS_THAN = "less_than",
  LESS_THAN_OR_EQUAL_TO = "less_than_or_equal_to", // Added
  CONTAINS = "contains",
  NOT_CONTAINS = "not_contains",
  STARTS_WITH = "starts_with",
  ENDS_WITH = "ends_with",
  IN_RANGE = "in_range",
  NOT_IN_RANGE = "not_in_range",
  REGEX_MATCH = "regex_match",
  IS_NULL = "is_null",
  IS_NOT_NULL = "is_not_null",
}


export interface FilterConditionFrontend {
  field: string;
  operation: FilterOperationFrontend;
  value?: any; // Value might not be needed for IS_NULL, IS_NOT_NULL
  caseSensitive?: boolean;
}

export interface DataFilteringRequestFrontend {
  // Assuming request_id, timestamp, client_version are handled by apiAdapter or backend
  data?: any[]; // Input data, might come from upstream node or file
  filterConditions: FilterConditionFrontend[];
  combineOperation?: 'AND' | 'OR';
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}


interface SpecificMetricConfig {
  id: string;
  metricName: string;
  operation: FilterOperationFrontend; // Added operation
  threshold: number | string | [number, number] | [string, string]; // Allow string for dates, array for range
}

interface FilteringConfigPanelProps {
  // Callback to notify parent about config changes or to get current config
  onConfigChange?: (config: DataFilteringRequestFrontend, strategy: string) => void;
  // Function to be called by parent to get the current config for API submission
  // This component will now manage its state and provide a way to get it.
}


const FilteringConfigPanel: React.FC<FilteringConfigPanelProps> = ({ onConfigChange }) => {
  const [selectedFilterMethod, setSelectedFilterMethod] = useState("multi_dimension_balanced");
  const [dataSourceType, setDataSourceType] = useState("default_gen_output");
  const [customDataPath, setCustomDataPath] = useState("");
  const [qualityThreshold, setQualityThreshold] = useState(0.7);
  const [safetyThreshold, setSafetyThreshold] = useState(0.9);
  const [diversityWeight, setDiversityWeight] = useState(0.3);
  const [diversityDimensions, setDiversityDimensions] = useState({ domain: true, difficulty: true, content: true });
  const [diversityDimWeights, setDiversityDimWeights] = useState({ domain: 0.4, difficulty: 0.3, content: 0.3 });
  const [specificMetrics, setSpecificMetrics] = useState<SpecificMetricConfig[]>([
    { id: `metric-${Date.now()}`, metricName: "overall_score", operation: FilterOperationFrontend.GREATER_THAN_OR_EQUAL_TO, threshold: 0.8 }
  ]);
  const [rationaleQualityThreshold, setRationaleQualityThreshold] = useState(0.7);
  const [answerAccuracyThreshold, setAnswerAccuracyThreshold] = useState(0.7);
  const [requireVerified, setRequireVerified] = useState(true);
  const [inputTotalSamples, setInputTotalSamples] = useState(1000);
  const [retentionRatio, setRetentionRatio] = useState(100);
  const [outputType, setOutputType] = useState("default_output");
  const [customOutputPath, setCustomOutputPath] = useState("./output/filtered_data");

  const formSectionClass = "mb-8"; // Increased from mb-6 for more spacing
  const formSectionTitleClass = "text-md font-bold text-text-primary-html mb-3"; // Changed font-semibold to font-bold
  const formGroupClass = "mb-3"; // Reduced from mb-4
  const formLabelClass = "block mb-1 text-sm font-medium text-text-primary-html"; // Reduced from mb-1.5
  const formControlSmClass = "w-full px-3 py-1.5 rounded-md border-gray-300 bg-white text-sm text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-1 focus:ring-primary-dark/50"; // py-1.5 for smaller height
  const formHelperTextClass = "text-xs text-gray-500 mt-0.5";


  const calculatedRetainedSamples = Math.round(inputTotalSamples * (retentionRatio / 100));

  useEffect(() => {
    if (selectedFilterMethod === "multi_dimension_balanced") {
      const baseRetention = 70; 
      const baseQuality = 0.7;
      const baseSafety = 0.9;
      const qualityAdjustmentFactor = 0.005; 
      let newQuality = baseQuality - (retentionRatio - baseRetention) * qualityAdjustmentFactor;
      newQuality = Math.max(0.1, Math.min(1.0, newQuality)); 
      setQualityThreshold(parseFloat(newQuality.toFixed(2)));
      const safetyAdjustmentFactor = 0.002;
      let newSafety = baseSafety - (retentionRatio - baseRetention) * safetyAdjustmentFactor;
      newSafety = Math.max(0.5, Math.min(1.0, newSafety));
      setSafetyThreshold(parseFloat(newSafety.toFixed(2)));
    }
  }, [retentionRatio, selectedFilterMethod]);

  const handleAddSpecificMetric = () => setSpecificMetrics(prev => [...prev, { id: `metric-${Date.now()}`, metricName: "", operation: FilterOperationFrontend.GREATER_THAN_OR_EQUAL_TO, threshold: 0.5 }]);
  const handleRemoveSpecificMetric = (id: string) => setSpecificMetrics(prev => prev.filter(metric => metric.id !== id));
  const handleSpecificMetricChange = (id: string, field: keyof SpecificMetricConfig, value: any) => {
    setSpecificMetrics(prev => prev.map(metric =>
      metric.id === id ? { ...metric, [field]: (field === 'threshold' && typeof value === 'string' && metric.operation !== FilterOperationFrontend.IN_RANGE && metric.operation !== FilterOperationFrontend.NOT_IN_RANGE) ? parseFloat(value) : value } : metric
    ));
  };
  
  const getFilterOperationOptions = () => {
    return Object.entries(FilterOperationFrontend).map(([key, value]) => ({
      value: value,
      label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) // Prettify name
    }));
  };

  // Function to compile current settings into a DataFilteringRequestFrontend object
  const getCompiledConfig = useCallback((): DataFilteringRequestFrontend => {
    let conditions: FilterConditionFrontend[] = [];
    const combineOp: 'AND' | 'OR' = 'AND'; // Default, can be made configurable later

    // These field names are placeholders and need to be agreed upon with the backend
    // or made configurable if they vary per dataset.
    const QUALITY_SCORE_FIELD = "quality_score";
    const SAFETY_SCORE_FIELD = "safety_score";
    const RATIONALE_SCORE_FIELD = "rationale_quality_score";
    const ANSWER_ACCURACY_FIELD = "answer_accuracy_score";
    const VERIFIED_FIELD = "is_verified";

    switch (selectedFilterMethod) {
      case "multi_dimension_balanced":
        conditions.push({ field: QUALITY_SCORE_FIELD, operation: FilterOperationFrontend.GREATER_THAN_OR_EQUAL_TO, value: qualityThreshold });
        conditions.push({ field: SAFETY_SCORE_FIELD, operation: FilterOperationFrontend.GREATER_THAN_OR_EQUAL_TO, value: safetyThreshold });
        // Note: Diversity and its weights (diversityWeight, diversityDimensions) are not easily translated into simple filterConditions here.
        // This might require a separate backend parameter or a more complex filtering step.
        // For now, they are not directly added to filterConditions.
        break;
      case "specific_metrics":
        conditions = specificMetrics.map(sm => {
          let parsedValue: any = sm.threshold;
          if (sm.operation === FilterOperationFrontend.IN_RANGE || sm.operation === FilterOperationFrontend.NOT_IN_RANGE) {
            if (typeof sm.threshold === 'string') {
              const parts = sm.threshold.split('-').map(p => parseFloat(p.trim()));
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                parsedValue = parts;
              } else {
                // Handle error or default for invalid range string
                console.warn(`Invalid range format for metric ${sm.metricName}: ${sm.threshold}`);
                parsedValue = [0,0]; // Default or skip this condition
              }
            } else if (!Array.isArray(sm.threshold)) {
                 console.warn(`Range operation for metric ${sm.metricName} expects an array or hyphen-separated string.`);
                 parsedValue = [0,0];
            }
          } else if (typeof sm.threshold === 'string' && !isNaN(parseFloat(sm.threshold))) {
            parsedValue = parseFloat(sm.threshold);
          }
          return {
            field: sm.metricName,
            operation: sm.operation,
            value: parsedValue,
          };
        }).filter(sm => sm.field && sm.value !== undefined); // Ensure field is present and value is set (parsedValue could be 0)
        break;
      case "rationale_answer_quality":
        conditions.push({ field: RATIONALE_SCORE_FIELD, operation: FilterOperationFrontend.GREATER_THAN_OR_EQUAL_TO, value: rationaleQualityThreshold });
        conditions.push({ field: ANSWER_ACCURACY_FIELD, operation: FilterOperationFrontend.GREATER_THAN_OR_EQUAL_TO, value: answerAccuracyThreshold });
        break;
      case "verification_status":
        if (requireVerified) {
          conditions.push({ field: VERIFIED_FIELD, operation: FilterOperationFrontend.EQUALS, value: true });
        } else {
          // Optionally, if unchecking means "don't care", no condition is added.
          // If it means "must be false", then:
          // conditions.push({ field: VERIFIED_FIELD, operation: FilterOperationFrontend.EQUALS, value: false });
        }
        break;
    }
    
    const config: DataFilteringRequestFrontend = {
      filterConditions: conditions,
      combineOperation: combineOp,
      // Add other top-level parameters from DataFilteringRequestFrontend if they are configured in this panel
      // For example, if retentionRatio is a backend parameter:
      // retentionRatio: retentionRatio / 100, // Convert percentage to 0-1
    };

    // Add retentionRatio as a custom parameter for now, backend might need to handle it.
    // Or, it's purely a UI hint for other parameters.
    // (config as any).uiRetentionRatio = retentionRatio; // Example of passing UI-specific info

    return config;
  }, [selectedFilterMethod, qualityThreshold, safetyThreshold, specificMetrics, rationaleQualityThreshold, answerAccuracyThreshold, requireVerified, retentionRatio /* added retentionRatio */]);


  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(getCompiledConfig(), selectedFilterMethod);
    }
  }, [getCompiledConfig, onConfigChange, selectedFilterMethod]);


  const handleSave = () => {
    const configToSave = getCompiledConfig();
    console.log("Save Filtering Config Triggered. Current Config:", configToSave, "Strategy:", selectedFilterMethod);
    toast.success("筛选配置已（在控制台）记录。");
    // Actual save logic (e.g., to context, localStorage, or backend) would go here.
  };
  const handleReset = () => { /* ... existing reset logic ... */ console.log("Reset Filtering Config Triggered"); };

  const renderFilterMethodSpecificParams = () => {
    switch (selectedFilterMethod) {
      case "multi_dimension_balanced":
        return (
          <div className="space-y-3 p-3 border rounded-md bg-slate-50">
            <h5 className="text-sm font-semibold text-gray-700 mb-2">综合多维度筛选参数</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
              <div><Label htmlFor="qualityTh" className={formLabelClass}>质量阈值 (建议)</Label><Input type="number" id="qualityTh" value={qualityThreshold} onChange={e => setQualityThreshold(parseFloat(e.target.value))} step="0.01" min="0" max="1" className={formControlSmClass}/><p className={formHelperTextClass}>自动建议,可修改。</p></div>
              <div><Label htmlFor="safetyTh" className={formLabelClass}>安全阈值 (建议)</Label><Input type="number" id="safetyTh" value={safetyThreshold} onChange={e => setSafetyThreshold(parseFloat(e.target.value))} step="0.01" min="0" max="1" className={formControlSmClass}/><p className={formHelperTextClass}>自动建议,可修改。</p></div>
              <div><Label htmlFor="diversityWt" className={formLabelClass}>多样性权重</Label><Input type="number" id="diversityWt" value={diversityWeight} onChange={e => setDiversityWeight(parseFloat(e.target.value))} step="0.05" min="0" max="1" className={formControlSmClass}/></div>
            </div>
            <div className={formGroupClass}><Label className={formLabelClass}>多样性分析维度 (简化)</Label><div className="flex items-center space-x-2"><Checkbox checked={diversityDimensions.domain} onCheckedChange={c => setDiversityDimensions(p=>({...p, domain:!!c}))} id="div-domain"/><Label htmlFor="div-domain" className="text-sm font-normal">领域</Label></div></div>
          </div>
        );
      case "specific_metrics":
        return (
          <div className="space-y-3 p-3 border rounded-md bg-slate-50">
            <h5 className="text-sm font-semibold text-gray-700 mb-2">特定指标筛选参数</h5>
            <div className="flex items-start p-2 mb-2 bg-blue-50 border border-blue-200 rounded-md"><Info size={18} className="mr-2 text-blue-600 flex-shrink-0 mt-0.5" /><p className="text-xs text-blue-700">手动设置阈值。“保留比例”将作用于符合这些阈值的数据。</p></div>
            {specificMetrics.map((metric, index) => (
              <div key={metric.id} className="flex items-end space-x-2 pb-2 border-b last:border-b-0">
                <div className="flex-grow"><Label htmlFor={`metricName-${index}`} className={`${formLabelClass} text-xs`}>指标字段</Label><Input id={`metricName-${index}`} value={metric.metricName} onChange={e => handleSpecificMetricChange(metric.id, 'metricName', e.target.value)} placeholder="例如: quality_score" className={formControlSmClass}/></div>
                <div className="w-40"> {/* Wider for operation select */}
                  <Label htmlFor={`metricOp-${index}`} className={`${formLabelClass} text-xs`}>操作</Label>
                  <Select
                    value={metric.operation}
                    onValueChange={(value) => handleSpecificMetricChange(metric.id, 'operation', value as FilterOperationFrontend)}
                  >
                    <SelectTrigger id={`metricOp-${index}`} className={`${formControlSmClass} h-8 text-xs`}>
                      <SelectValue placeholder="选择操作" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilterOperationOptions().map(op => (
                        <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28"><Label htmlFor={`metricTh-${index}`} className={`${formLabelClass} text-xs`}>阈值</Label><Input type="text" id={`metricTh-${index}`} value={metric.threshold.toString()} onChange={e => handleSpecificMetricChange(metric.id, 'threshold', e.target.value)} step="0.01" className={formControlSmClass} placeholder="输入值"/></div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveSpecificMetric(metric.id)} className="text-red-500 hover:bg-red-100 h-8 w-8"><MinusCircle size={16}/></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAddSpecificMetric} className="mt-2 text-xs"><PlusCircle size={14} className="mr-1.5"/>添加指标</Button>
          </div>
        );
      case "rationale_answer_quality":
        return (
           <div className="space-y-3 p-3 border rounded-md bg-slate-50">
            <h5 className="text-sm font-semibold text-gray-700 mb-2">推理与答案质量筛选</h5>
             <div className="flex items-start p-2 mb-2 bg-blue-50 border border-blue-200 rounded-md"><Info size={18} className="mr-2 text-blue-600 flex-shrink-0 mt-0.5" /><p className="text-xs text-blue-700">手动设置阈值。“保留比例”将作用于符合这些阈值的数据。</p></div>
            <div><Label htmlFor="rationaleTh" className={formLabelClass}>推理过程质量阈值</Label><Input type="number" id="rationaleTh" value={rationaleQualityThreshold} onChange={e => setRationaleQualityThreshold(parseFloat(e.target.value))} step="0.05" min="0" max="1" className={formControlSmClass}/></div>
            <div><Label htmlFor="answerTh" className={formLabelClass}>答案准确性阈值</Label><Input type="number" id="answerTh" value={answerAccuracyThreshold} onChange={e => setAnswerAccuracyThreshold(parseFloat(e.target.value))} step="0.05" min="0" max="1" className={formControlSmClass}/></div>
          </div>
        );
      case "verification_status":
        return (
          <div className="space-y-2 p-3 border rounded-md bg-slate-50">
            <h5 className="text-sm font-semibold text-gray-700 mb-2">验证状态筛选</h5>
            <div className="flex items-center space-x-2"><Checkbox id="requireVerified" checked={requireVerified} onCheckedChange={c => setRequireVerified(Boolean(c))} /><Label htmlFor="requireVerified" className="text-sm font-normal">仅保留已验证的数据</Label></div>
            <div className="flex items-start p-2 mt-2 bg-blue-50 border border-blue-200 rounded-md"><Info size={18} className="mr-2 text-blue-600 flex-shrink-0 mt-0.5" /><p className="text-xs text-blue-700">此方法直接筛选，“保留比例”将作用于筛选后的结果。</p></div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="bg-white p-0 rounded-xl shadow-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center"> {/* Reduced py */}
        <h3 className="text-lg font-semibold text-text-primary-html flex items-center"> {/* Reduced text-xl to text-lg */}
          <Filter size={20} className="mr-2.5 text-primary-dark" /> {/* Reduced size and mr */}
          数据筛选配置
        </h3>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="text-xs px-3 py-1.5 h-auto hover:bg-primary-dark/10 hover:text-primary-dark focus-visible:ring-primary-dark/50" onClick={handleReset}><RotateCcw size={14} className="mr-1.5" />恢复默认</Button> {/* Adjusted padding & height */}
          <Button size="sm" className="text-xs px-3 py-1.5 h-auto bg-gradient-to-r from-primary-dark to-primary-light hover:opacity-90 hover:brightness-105 transition-all" onClick={handleSave}><Save size={14} className="mr-1.5" />保存配置</Button>
        </div>
      </div>

      <div className="p-5 space-y-6"> {/* Reduced p-6 to p-5, space-y-8 to space-y-6 */}
        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
          <h4 className={formSectionTitleClass}>筛选方法选择</h4>
          <div className={formGroupClass}>
            <Label htmlFor="filter-method" className={formLabelClass}>选择数据筛选方法</Label>
            <Select value={selectedFilterMethod} onValueChange={setSelectedFilterMethod}>
              <SelectTrigger id="filter-method" className={formControlSmClass}><SelectValue /></SelectTrigger>
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
          <h4 className={formSectionTitleClass}>数据来源</h4>
          <RadioGroup value={dataSourceType} onValueChange={setDataSourceType} className="space-y-1.5"> {/* Reduced space-y */}
            <div className="flex items-center space-x-2"><RadioGroupItem value="default_gen_output" id="fds-default" /><Label htmlFor="fds-default" className="text-sm font-normal">使用上游模块默认输出</Label></div>
            <div className="flex items-center space-x-2"><RadioGroupItem value="custom_path" id="fds-custom" /><Label htmlFor="fds-custom" className="text-sm font-normal">指定数据文件/路径</Label></div>
          </RadioGroup>
          {dataSourceType === "custom_path" && (
            <div className={`${formGroupClass} mt-2.5`}><Label htmlFor="custom-data-path" className={formLabelClass}>自定义数据路径</Label><div className="flex items-center"><Input type="text" id="custom-data-path" value={customDataPath} onChange={(e) => setCustomDataPath(e.target.value)} placeholder="例如: /path/to/your/data.jsonl" className={formControlSmClass} /><Button variant="outline" size="icon" className="ml-2 h-8 w-8"><FileUp size={16} /></Button></div></div>
          )}
        </div>

        <div className="h-px bg-gray-200 my-6"></div>

        {renderFilterMethodSpecificParams()}

        <div className="h-px bg-gray-200 my-6"></div>

        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
          <h4 className={formSectionTitleClass}>最终抽样设置</h4>
          {/* The inner div already has bg-slate-50, so we keep it as is or adjust if needed. For now, let's see how it looks. */}
          <div className="p-3 border rounded-md bg-white space-y-3"> {/* Changed inner to bg-white for contrast if outer is bg-slate-50, or remove bg from inner if outer provides it. Let's try bg-white for inner card. */}
            <div className={formGroupClass}>
              <Label htmlFor="input-total-samples" className={formLabelClass}>用于计算比例的总样本数 (估算)</Label>
              <Input type="number" id="input-total-samples" value={inputTotalSamples} onChange={e => setInputTotalSamples(Math.max(0, parseInt(e.target.value, 10) || 0))} className={formControlSmClass} placeholder="例如: 10000" />
              <p className={formHelperTextClass}>此数值用于估算并辅助启发式调整阈值。</p>
            </div>
            <div className={formGroupClass}>
              <div className="flex justify-between items-center mb-1"><Label htmlFor="retention-ratio" className={formLabelClass}>保留比例 (筛选后随机抽样)</Label><span className="text-sm font-medium text-primary-dark">{retentionRatio}%</span></div>
              <Slider id="retention-ratio" min={0} max={100} step={1} value={[retentionRatio]} onValueChange={(value) => setRetentionRatio(value[0])} className="w-full accent-primary-dark py-1" />
               <p className={formHelperTextClass}>预计保留样本数: <span className="font-semibold">{calculatedRetainedSamples}</span> (基于上方输入的总样本数)</p>
            </div>
             <div className="flex items-start p-2.5 bg-amber-50 border border-amber-300 rounded-md"><AlertTriangle size={24} className="mr-2.5 text-amber-600 flex-shrink-0" /><p className="text-xs text-amber-700">注意：调整保留比例目前主要启发式地调整“综合多维度筛选”中的质量和安全阈值。其他方法阈值当前仍需手动设置。</p></div>
          </div>
        </div>
        
        <div className="h-px bg-gray-200 my-6"></div>
                
        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
            <h4 className={formSectionTitleClass}>输出设置</h4>
            <RadioGroup value={outputType} onValueChange={setOutputType} className="space-y-1.5">
                <div className="flex items-center space-x-2"><RadioGroupItem value="default_output" id="fout-default" /><Label htmlFor="fout-default" className="text-sm font-normal">使用默认输出路径</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="custom_output" id="fout-custom" /><Label htmlFor="fout-custom" className="text-sm font-normal">自定义输出路径</Label></div>
            </RadioGroup>
            {outputType === "custom_output" && (
                <div className={`${formGroupClass} mt-2.5`}><Label htmlFor="custom-output-path" className={formLabelClass}>自定义输出路径</Label><div className="flex items-center"><Input type="text" id="custom-output-path" value={customOutputPath} onChange={(e) => setCustomOutputPath(e.target.value)} placeholder="例如: /path/to/filtered_results" className={formControlSmClass} /><Button variant="outline" size="icon" className="ml-2 h-8 w-8"><FolderInput size={16} /></Button></div></div>
            )}
        </div>
      </div>
    </div>
  );
};

export default FilteringConfigPanel;