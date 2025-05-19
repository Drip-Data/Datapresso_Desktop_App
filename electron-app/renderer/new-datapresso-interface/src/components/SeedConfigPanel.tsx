import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Settings2, RotateCcw, Save } from 'lucide-react';

const SeedConfigPanel = () => {
  // State for form fields
  const [dataSource, setDataSource] = useState("local");
  const [dataFormat, setDataFormat] = useState("jsonl");
  const [dataPath, setDataPath] = useState("./data/seed_data.jsonl");
  const [preprocessClean, setPreprocessClean] = useState(true);
  const [preprocessDedup, setPreprocessDedup] = useState(true);
  const [preprocessTokenize, setPreprocessTokenize] = useState(false);
  const [advancedSettingsJson, setAdvancedSettingsJson] = useState(
    JSON.stringify({"batch_size": 128, "num_workers": 4, "shuffle": true}, null, 2)
  );
  const [outputDir, setOutputDir] = useState("./output/seed_processed");
  const [outputFormat, setOutputFormat] = useState("jsonl");

  // Active tab state is not strictly needed if using Tabs component's defaultValue and onValueChange
  // const [activeTab, setActiveTab] = useState("basic");

  const handleSaveConfig = () => {
    const config = {
      dataSource,
      dataFormat,
      dataPath,
      preprocessClean,
      preprocessDedup,
      preprocessTokenize,
      advancedSettingsJson: JSON.parse(advancedSettingsJson), // Parse JSON before saving
      outputDir,
      outputFormat,
    };
    console.log("Saving Seed Config:", config);
    alert("种子数据库配置已保存到控制台！");
  };

  const handleResetConfig = () => {
    setDataSource("local");
    setDataFormat("jsonl");
    setDataPath("./data/seed_data.jsonl");
    setPreprocessClean(true);
    setPreprocessDedup(true);
    setPreprocessTokenize(false);
    setAdvancedSettingsJson(JSON.stringify({"batch_size": 128, "num_workers": 4, "shuffle": true}, null, 2));
    setOutputDir("./output/seed_processed");
    setOutputFormat("jsonl");
    alert("种子数据库配置已重置！");
  };

  const formGroupClass = "mb-6";
  const formLabelClass = "block mb-2 text-sm font-medium text-text-primary-html";
  const formControlBaseClass = "w-full px-4 py-2.5 rounded-xl border-gray-300 bg-white text-[0.9375rem] text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-2 focus:ring-primary-dark/30";


  return (
    <div className="bg-white p-0 rounded-xl shadow-lg border border-gray-200"> {/* Card like structure */}
      {/* Panel Header */}
      <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary-html flex items-center">
          <Settings2 size={20} className="mr-2 text-primary-dark" />
          种子数据库配置
        </h3>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={handleResetConfig}>
            <RotateCcw size={14} className="mr-1.5" /> 恢复默认
          </Button>
          <Button size="sm" className="text-xs bg-gradient-to-r from-primary-dark to-primary-light hover:opacity-90" onClick={handleSaveConfig}>
            <Save size={14} className="mr-1.5" /> 保存配置
          </Button>
        </div>
      </div>

      {/* Panel Body with Tabs */}
      <div className="p-6">
        <Tabs defaultValue="seed-basic" className="w-full"激活的标签页>
          <TabsList className="grid w-full grid-cols-3 mb-6 border-b border-gray-200 rounded-none p-0 bg-transparent">
            <TabsTrigger
              value="seed-basic"
              className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-dark data-[state=active]:text-primary-dark rounded-none text-text-secondary-html hover:text-primary-dark py-3 px-5 font-medium data-[state=active]:bg-transparent"
            >
              基础设置
            </TabsTrigger>
            <TabsTrigger
              value="seed-advanced"
              className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-dark data-[state=active]:text-primary-dark rounded-none text-text-secondary-html hover:text-primary-dark py-3 px-5 font-medium data-[state=active]:bg-transparent"
            >
              高级设置
            </TabsTrigger>
            <TabsTrigger
              value="seed-output"
              className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-dark data-[state=active]:text-primary-dark rounded-none text-text-secondary-html hover:text-primary-dark py-3 px-5 font-medium data-[state=active]:bg-transparent"
            >
              输出设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seed-basic" className="mt-0">
            <div className={formGroupClass}>
              <Label htmlFor="seed-datasource" className={formLabelClass}>数据源选择</Label>
              <Select value={dataSource} onValueChange={setDataSource}>
                <SelectTrigger id="seed-datasource" className={formControlBaseClass}>
                  <SelectValue placeholder="选择数据源" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">本地文件</SelectItem>
                  <SelectItem value="remote_api">远程API</SelectItem>
                  <SelectItem value="db_conn">数据库连接</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={formGroupClass}>
              <Label htmlFor="seed-dataformat" className={formLabelClass}>数据格式</Label>
              <Select value={dataFormat} onValueChange={setDataFormat}>
                <SelectTrigger id="seed-dataformat" className={formControlBaseClass}>
                  <SelectValue placeholder="选择数据格式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jsonl">JSONL</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">XLSX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={formGroupClass}>
              <Label htmlFor="seed-datapath" className={formLabelClass}>数据路径</Label>
              <Input type="text" id="seed-datapath" value={dataPath} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataPath(e.target.value)} className={formControlBaseClass} />
            </div>
          </TabsContent>

          <TabsContent value="seed-advanced" className="mt-0">
            <div className={formGroupClass}>
              <Label className={formLabelClass}>预处理操作</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="seed-preprocess-1" checked={preprocessClean} onCheckedChange={(checked: boolean | 'indeterminate') => setPreprocessClean(Boolean(checked))} />
                  <Label htmlFor="seed-preprocess-1" className="text-sm font-normal text-text-primary-html cursor-pointer">文本清洗</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="seed-preprocess-2" checked={preprocessDedup} onCheckedChange={(checked: boolean | 'indeterminate') => setPreprocessDedup(Boolean(checked))} />
                  <Label htmlFor="seed-preprocess-2" className="text-sm font-normal text-text-primary-html cursor-pointer">去除重复数据</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="seed-preprocess-3" checked={preprocessTokenize} onCheckedChange={(checked: boolean | 'indeterminate') => setPreprocessTokenize(Boolean(checked))} />
                  <Label htmlFor="seed-preprocess-3" className="text-sm font-normal text-text-primary-html cursor-pointer">文本分词</Label>
                </div>
              </div>
            </div>
            <div className={formGroupClass}>
              <Label htmlFor="seed-advanced-json" className={formLabelClass}>高级设置 (JSON)</Label>
              <Textarea id="seed-advanced-json" value={advancedSettingsJson} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdvancedSettingsJson(e.target.value)} rows={4} className={`${formControlBaseClass} min-h-[100px] font-mono text-xs`} />
            </div>
          </TabsContent>

          <TabsContent value="seed-output" className="mt-0">
            <div className={formGroupClass}>
              <Label htmlFor="seed-outputdir" className={formLabelClass}>输出目录</Label>
              <Input type="text" id="seed-outputdir" value={outputDir} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOutputDir(e.target.value)} className={formControlBaseClass} />
            </div>
            <div className={formGroupClass}>
              <Label htmlFor="seed-outputformat" className={formLabelClass}>输出格式</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger id="seed-outputformat" className={formControlBaseClass}>
                  <SelectValue placeholder="选择输出格式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jsonl">JSONL</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="parquet">Parquet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SeedConfigPanel;