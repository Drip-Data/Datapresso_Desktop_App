import React, { useState, useEffect } from 'react';
import { useTheme } from "next-themes";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { AlertCircle, Save, Database, Cog, Globe, Key, Cpu, HardDrive, FolderCog, TestTube2, CheckCircle2, User, Briefcase } from 'lucide-react'; // Added User, Briefcase
import { toast } from "sonner";
import { useUser, UserProfile } from '@/contexts/UserContext'; // Import useUser

// 通用样式，可以提取到一个样式文件或constants文件中
const cardClass = "bg-white rounded-xl shadow-md border border-gray-200"; // Reverted to fixed light theme style
const cardHeaderClass = "px-6 py-4 border-b border-gray-200 flex justify-between items-center"; // Reverted to fixed light theme style
const cardBodyClass = "p-6";
const formGroupClass = "mb-4";
const formLabelClass = "block mb-1.5 text-sm font-medium text-text-primary-html";
const formControlBaseClass = "w-full px-3 py-2 rounded-lg border-gray-300 bg-white text-sm text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-1 focus:ring-primary-dark/50";

const SettingsPage: React.FC = () => {
  const { user, updateUserProfile, loginUser, isLoadingUser } = useUser();

  // User Profile states
  const [userNameInput, setUserNameInput] = useState('');
  const [userRoleInput, setUserRoleInput] = useState('');

  // Basic settings
  const { theme, setTheme } = useTheme(); // theme is still managed locally for now
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      setUserNameInput(user.name);
      setUserRoleInput(user.role);
    } else {
      // If no user (e.g. fresh start, or after logout), clear inputs or set to defaults for login form
      setUserNameInput(''); // Or some default like "新用户"
      setUserRoleInput(''); // Or "数据爱好者"
    }
  }, [user]);


  const [language, setLanguage] = useState<string>('zh');
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState<number>(5);
  
  // Path settings
  const [defaultSeedPath, setDefaultSeedPath] = useState<string>('./data/seeds/');
  const [defaultOutputPath, setDefaultOutputPath] = useState<string>('./output/generated_data/');
  const [defaultModelPath, setDefaultModelPath] = useState<string>('./output/trained_models/');
  const [defaultLogPath, setDefaultLogPath] = useState<string>('./logs/');

  // 数据库设置
  const [dbConnection, setDbConnection] = useState<string>('mongodb://localhost:27017/datapresso');
  const [dbType, setDbType] = useState<string>('mongodb');
  const [maxConnections, setMaxConnections] = useState<number>(20);
  
  // API设置
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [anthropicApiKey, setAnthropicApiKey] = useState<string>('');
  const [localApiEndpoint, setLocalApiEndpoint] = useState<string>('http://localhost:8000');
  
  // 系统资源设置
  const [maxThreads, setMaxThreads] = useState<number>(4);
  const [memoryLimit, setMemoryLimit] = useState<number>(8);
  const [diskSpace, setDiskSpace] = useState<number>(50);
  const [enableLogging, setEnableLogging] = useState<boolean>(true);
  
  const handleTestDbConnection = () => {
    toast.info("正在测试数据库连接...", { duration: 1500 });
    setTimeout(() => {
      // Simulate connection success/failure
      const success = Math.random() > 0.3; // 70% chance of success
      if (success) {
        toast.success("数据库连接成功！ (模拟)");
      } else {
        toast.error("数据库连接失败。 (模拟)");
      }
    }, 2000);
  };

  const handleValidateApiKey = (provider: string) => {
    toast.info(`正在验证 ${provider} API 密钥...`, { duration: 1500 });
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% chance of success
      if (success) {
        toast.success(`${provider} API 密钥有效！ (模拟)`);
      } else {
        toast.error(`${provider} API 密钥无效或无法连接。 (模拟)`);
      }
    }, 2000);
  };
  
  // 保存设置
  const handleSaveSettings = () => {
    // Save User Profile
    if (user) { // If user exists, update
      updateUserProfile({ name: userNameInput, role: userRoleInput });
    } else { // If no user, this save action effectively logs them in with entered details
      const newUserProfile: UserProfile = {
        name: userNameInput || "新用户", // Fallback name
        role: userRoleInput || "数据探索者", // Fallback role
      };
      loginUser(newUserProfile);
    }

    // Save other settings
    console.log('保存其他设置', {
      language, currentTheme, autoSave, autoSaveInterval,
      defaultSeedPath, defaultOutputPath, defaultModelPath, defaultLogPath,
      dbConnection, dbType, maxConnections,
      openaiApiKey, anthropicApiKey, localApiEndpoint,
      maxThreads, memoryLimit, diskSpace, enableLogging
    });
    // TODO: Implement actual saving logic for these other settings (e.g., to localStorage or a config file via ProjectContext if applicable)
    toast.success('用户配置及其他设置已保存！');
  };
  
  if (isLoadingUser) {
    return <div className="p-6">正在加载用户信息...</div>;
  }

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className={cardHeaderClass}>
          <h2 className="text-xl font-semibold text-text-primary-html flex items-center">
            <Cog size={22} className="mr-3 text-primary-dark" />
            系统设置
          </h2>
          <Button onClick={handleSaveSettings} className="bg-gradient-to-r from-primary-dark to-primary-light hover:opacity-90">
            <Save size={16} className="mr-2" />
            保存设置
          </Button>
        </div>
        
        <div className={cardBodyClass}>
          <div className="flex items-start p-4 mb-6 rounded-xl bg-info-html/10 text-info-html border border-blue-300">
            <AlertCircle size={20} className="mr-3 mt-0.5 flex-shrink-0" />
            <div>配置Datapresso系统设置，包括界面首选项、数据库连接、API密钥、系统资源限制等。</div>
          </div>
          
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-6 bg-slate-100 p-1 rounded-lg">
              <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm">
                <User size={14} className="mr-1.5" />
                用户配置
              </TabsTrigger>
              <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm">
                <Globe size={14} className="mr-1.5" />
                基本
              </TabsTrigger>
              <TabsTrigger value="paths" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm">
                <FolderCog size={14} className="mr-1.5" />
                路径
              </TabsTrigger>
              <TabsTrigger value="database" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm">
                <Database size={14} className="mr-1.5" />
                数据库
              </TabsTrigger>
              <TabsTrigger value="api" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm">
                <Key size={14} className="mr-1.5" />
                API
              </TabsTrigger>
              <TabsTrigger value="system" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm">
                <Cpu size={14} className="mr-1.5" />
                系统
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={formGroupClass}>
                  <Label htmlFor="user-name" className={formLabelClass}>用户名</Label>
                  <Input
                    id="user-name"
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                    placeholder="输入您的用户名"
                    className={formControlBaseClass}
                  />
                </div>
                <div className={formGroupClass}>
                  <Label htmlFor="user-role" className={formLabelClass}>角色/职位</Label>
                  <Input
                    id="user-role"
                    value={userRoleInput}
                    onChange={(e) => setUserRoleInput(e.target.value)}
                    placeholder="例如：数据科学家"
                    className={formControlBaseClass}
                  />
                </div>
              </div>
               {!user && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm">
                  当前为访客模式。输入信息并保存后将作为您的本地用户信息。
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="general" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={formGroupClass}>
                  <Label htmlFor="language" className={formLabelClass}>界面语言</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language" className={formControlBaseClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Theme selection removed as theme is now locked to light mode */}
                {/*
                <div className={formGroupClass}>
                  <Label htmlFor="theme" className={formLabelClass}>界面主题</Label>
                  <Select value={currentTheme ?? 'system'} onValueChange={(value) => { setTheme(value); setCurrentTheme(value); }}>
                    <SelectTrigger id="theme" className={formControlBaseClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">亮色</SelectItem>
                      <SelectItem value="dark">暗色</SelectItem>
                      <SelectItem value="system">跟随系统</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                */}
                
                <div className={formGroupClass}>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="auto-save" className={formLabelClass}>自动保存</Label>
                    <Switch 
                      id="auto-save" 
                      checked={autoSave} 
                      onCheckedChange={setAutoSave} 
                    />
                  </div>
                </div>
                
                {autoSave && (
                  <div className={formGroupClass}>
                    <Label htmlFor="auto-save-interval" className={formLabelClass}>
                      自动保存间隔 (分钟): {autoSaveInterval}
                    </Label>
                    <Slider 
                      id="auto-save-interval"
                      min={1}
                      max={30}
                      step={1}
                      value={[autoSaveInterval]}
                      onValueChange={(values: number[]) => setAutoSaveInterval(values[0])}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="paths" className="mt-0">
              <div className="space-y-4">
                <div className={formGroupClass}>
                  <Label htmlFor="default-seed-path" className={formLabelClass}>默认种子数据路径</Label>
                  <div className="flex"><Input id="default-seed-path" value={defaultSeedPath} onChange={(e) => setDefaultSeedPath(e.target.value)} className={formControlBaseClass} /><Button variant="outline" size="sm" className="ml-2 text-xs">浏览</Button></div>
                </div>
                <div className={formGroupClass}>
                  <Label htmlFor="default-output-path" className={formLabelClass}>默认生成数据输出路径</Label>
                  <div className="flex"><Input id="default-output-path" value={defaultOutputPath} onChange={(e) => setDefaultOutputPath(e.target.value)} className={formControlBaseClass} /><Button variant="outline" size="sm" className="ml-2 text-xs">浏览</Button></div>
                </div>
                <div className={formGroupClass}>
                  <Label htmlFor="default-model-path" className={formLabelClass}>默认训练模型输出路径</Label>
                  <div className="flex"><Input id="default-model-path" value={defaultModelPath} onChange={(e) => setDefaultModelPath(e.target.value)} className={formControlBaseClass} /><Button variant="outline" size="sm" className="ml-2 text-xs">浏览</Button></div>
                </div>
                <div className={formGroupClass}>
                  <Label htmlFor="default-log-path" className={formLabelClass}>默认日志保存路径</Label>
                  <div className="flex"><Input id="default-log-path" value={defaultLogPath} onChange={(e) => setDefaultLogPath(e.target.value)} className={formControlBaseClass} /><Button variant="outline" size="sm" className="ml-2 text-xs">浏览</Button></div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="database" className="mt-0">
              <div className="space-y-4">
                <div className={formGroupClass}>
                  <Label htmlFor="db-type" className={formLabelClass}>数据库类型</Label>
                  <Select value={dbType} onValueChange={setDbType}>
                    <SelectTrigger id="db-type" className={formControlBaseClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mongodb">MongoDB</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="postgres">PostgreSQL</SelectItem>
                      <SelectItem value="sqlite">SQLite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className={formGroupClass}>
                  <Label htmlFor="db-connection" className={formLabelClass}>数据库连接字符串</Label>
                  <div className="flex items-center">
                    <Input
                      id="db-connection"
                      value={dbConnection}
                      onChange={(e) => setDbConnection(e.target.value)}
                      className={formControlBaseClass}
                    />
                    <Button variant="outline" size="sm" className="ml-2 text-xs" onClick={handleTestDbConnection}><TestTube2 size={14} className="mr-1"/>测试连接</Button>
                  </div>
                </div>
                
                <div className={formGroupClass}>
                  <Label htmlFor="max-connections" className={formLabelClass}>
                    最大连接数: {maxConnections}
                  </Label>
                  <Slider 
                    id="max-connections"
                    min={5}
                    max={100}
                    step={5}
                    value={[maxConnections]}
                    onValueChange={(values: number[]) => setMaxConnections(values[0])}
                    className="mt-2"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="api" className="mt-0">
              <div className="space-y-4">
                <div className={formGroupClass}>
                  <Label htmlFor="openai-key" className={formLabelClass}>OpenAI API密钥</Label>
                  <div className="flex items-center">
                    <Input
                      id="openai-key"
                      type="password"
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder="sk-..."
                      className={formControlBaseClass}
                    />
                    <Button variant="outline" size="sm" className="ml-2 text-xs" onClick={() => handleValidateApiKey('OpenAI')}><CheckCircle2 size={14} className="mr-1"/>验证</Button>
                  </div>
                </div>
                
                <div className={formGroupClass}>
                  <Label htmlFor="anthropic-key" className={formLabelClass}>Anthropic API密钥</Label>
                  <div className="flex items-center">
                    <Input
                      id="anthropic-key"
                      type="password"
                      value={anthropicApiKey}
                      onChange={(e) => setAnthropicApiKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className={formControlBaseClass}
                    />
                     <Button variant="outline" size="sm" className="ml-2 text-xs" onClick={() => handleValidateApiKey('Anthropic')}><CheckCircle2 size={14} className="mr-1"/>验证</Button>
                  </div>
                </div>
                
                <div className={formGroupClass}>
                  <Label htmlFor="local-endpoint" className={formLabelClass}>本地API端点</Label>
                  <Input 
                    id="local-endpoint"
                    value={localApiEndpoint}
                    onChange={(e) => setLocalApiEndpoint(e.target.value)}
                    className={formControlBaseClass}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="system" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={formGroupClass}>
                  <Label htmlFor="max-threads" className={formLabelClass}>
                    最大线程数: {maxThreads}
                  </Label>
                  <Slider 
                    id="max-threads"
                    min={1}
                    max={16}
                    step={1}
                    value={[maxThreads]}
                    onValueChange={(values: number[]) => setMaxThreads(values[0])}
                    className="mt-2"
                  />
                </div>
                
                <div className={formGroupClass}>
                  <Label htmlFor="memory-limit" className={formLabelClass}>
                    内存限制 (GB): {memoryLimit}
                  </Label>
                  <Slider 
                    id="memory-limit"
                    min={1}
                    max={32}
                    step={1}
                    value={[memoryLimit]}
                    onValueChange={(values: number[]) => setMemoryLimit(values[0])}
                    className="mt-2"
                  />
                </div>
                
                <div className={formGroupClass}>
                  <Label htmlFor="disk-space" className={formLabelClass}>
                    磁盘空间限制 (GB): {diskSpace}
                  </Label>
                  <Slider 
                    id="disk-space"
                    min={10}
                    max={500}
                    step={10}
                    value={[diskSpace]}
                    onValueChange={(values: number[]) => setDiskSpace(values[0])}
                    className="mt-2"
                  />
                </div>
                
                <div className={formGroupClass}>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="enable-logging" className={formLabelClass}>启用日志记录</Label>
                    <Switch 
                      id="enable-logging" 
                      checked={enableLogging} 
                      onCheckedChange={setEnableLogging} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                <div className="flex items-start">
                  <HardDrive size={20} className="mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    系统资源设置会影响Datapresso的性能和稳定性。请确保设置的值不超过您实际可用的硬件资源。
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;