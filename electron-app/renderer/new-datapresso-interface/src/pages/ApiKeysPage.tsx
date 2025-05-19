import React, { useState, ChangeEvent, useEffect, useMemo } from 'react'; // Added useMemo
import { useApiKeys } from '@/contexts/ApiKeysContext';
import { useLLMConfig } from '@/contexts/LLMConfigContext'; // Added
import { PROVIDER_UI_SUPPLEMENTS } from '@/config/llmConfig'; // Added
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { KeyRound, PlusCircle, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from "sonner";

interface ApiKey {
  id: string;
  provider: 'openai' | 'anthropic' | 'deepseek' | 'other';
  name: string;
  key: string;
  addedDate: string;
}

const ApiKeysPage: React.FC = () => {
  const { saveApiKey, getApiKey, removeApiKey: removeContextApiKey } = useApiKeys();
  const { providersConfig, loading: llmConfigLoading, error: llmConfigError } = useLLMConfig(); // Use LLMConfig

  const [managedApiKeys, setManagedApiKeys] = useState<ApiKey[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [keyFormData, setKeyFormData] = useState<{ provider: ApiKey['provider']; name: string; key: string }>({
    provider: 'openai',
    name: '',
    key: '',
  });
  const [showKeyId, setShowKeyId] = useState<string | null>(null);

  // Memoize provider list for select dropdown and display names
  const availableProviders = useMemo(() => {
    if (!providersConfig) return [];
    return Object.keys(providersConfig).map(id => ({
      id,
      // Corrected: BackendProviderInfo (providersConfig[id]) doesn't have a 'name' property directly.
      // Name comes from UI supplements or the ID itself.
      name: PROVIDER_UI_SUPPLEMENTS[id]?.name || id,
    }));
  }, [providersConfig]);

  // Load keys from context/localStorage into local state on mount
  useEffect(() => {
    if (llmConfigLoading || !providersConfig) return; // Wait for providersConfig to load

    const loadedKeys = Object.keys(providersConfig).map(providerId => {
      const key = getApiKey(providerId as ApiKey['provider']); // Cast providerId
      // Corrected: BackendProviderInfo (providersConfig[providerId]) doesn't have a 'name' property directly.
      const displayName = PROVIDER_UI_SUPPLEMENTS[providerId]?.name || providerId;
      const name = localStorage.getItem(`datapresso_${providerId}_api_name`) || `默认 ${displayName} Key`;
      const addedDate = localStorage.getItem(`datapresso_${providerId}_api_added_date`) || new Date().toISOString().split('T')[0];
      if (key) {
        // Ensure providerId is one of the allowed types for ApiKey['provider']
        // This might need a type guard or more careful mapping if providerId from backend can be arbitrary
        return { id: providerId, provider: providerId as ApiKey['provider'], name, key, addedDate };
      }
      return null;
    }).filter(Boolean) as ApiKey[];
    setManagedApiKeys(loadedKeys);
  }, [getApiKey, providersConfig, llmConfigLoading]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setKeyFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setKeyFormData(prev => ({ ...prev, [name]: value as ApiKey['provider'] }));
  };

  const validateApiKeyFormat = (providerId: ApiKey['provider'], key: string): boolean => {
    const uiSupplement = PROVIDER_UI_SUPPLEMENTS[providerId];
    if (uiSupplement?.apiKeyFormatRegex && !uiSupplement.apiKeyFormatRegex.test(key)) {
      toast.error(`${uiSupplement.name || providerId} API Key 格式似乎不正确。`);
      return false;
    }
    // Fallback for basic checks if no regex
    if (providerId === 'openai' && !key.startsWith('sk-') && !uiSupplement?.apiKeyFormatRegex) {
      toast.error('OpenAI API Key 格式不正确，应以 "sk-" 开头。');
      return false;
    }
    if (providerId === 'anthropic' && !key.startsWith('sk-ant-') && !uiSupplement?.apiKeyFormatRegex) {
      toast.error('Anthropic API Key 格式不正确，应以 "sk-ant-" 开头。');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!keyFormData.name || !keyFormData.key || !keyFormData.provider) {
      toast.error("请填写所有必填项！");
      return;
    }

    if (!validateApiKeyFormat(keyFormData.provider, keyFormData.key)) {
      return;
    }

    saveApiKey(keyFormData.provider, keyFormData.key); // Use context's saveApiKey
    // Store name and date for UI display, this is a simple approach, prefix with datapresso_
    localStorage.setItem(`datapresso_${keyFormData.provider}_api_name`, keyFormData.name);
    const addedDate = editingKey?.addedDate || new Date().toISOString().split('T')[0];
    localStorage.setItem(`datapresso_${keyFormData.provider}_api_added_date`, addedDate);


    if (editingKey) {
      setManagedApiKeys(managedApiKeys.map(k => k.id === editingKey.id ? { ...editingKey, ...keyFormData, provider: keyFormData.provider, addedDate } : k));
      toast.success(`API密钥 "${keyFormData.name}" 已更新。`);
    } else {
      const newKey: ApiKey = {
        id: keyFormData.provider, // Using provider as ID for simplicity, assuming one key per provider for now
        ...keyFormData,
        addedDate,
      };
      // Avoid duplicates if adding again for the same provider
      setManagedApiKeys(prevKeys => {
        const existing = prevKeys.find(k => k.provider === newKey.provider);
        if (existing) {
          return prevKeys.map(k => k.provider === newKey.provider ? newKey : k);
        }
        return [...prevKeys, newKey];
      });
      toast.success(`API密钥 "${keyFormData.name}" 已添加。`);
    }
    setIsFormOpen(false);
    setEditingKey(null);
    setKeyFormData({ provider: 'openai', name: '', key: '' });
  };

  const handleEdit = (key: ApiKey) => {
    setEditingKey(key);
    setKeyFormData({ provider: key.provider, name: key.name, key: key.key });
    setIsFormOpen(true);
  };
const handleDelete = (keyId: string, provider: ApiKey['provider']) => {
  // Use context's removeApiKey
  removeContextApiKey(provider);
  // Also remove UI-specific localStorage items
  localStorage.removeItem(`datapresso_${provider}_api_name`);
  localStorage.removeItem(`datapresso_${provider}_api_added_date`);
  setManagedApiKeys(managedApiKeys.filter(k => k.id !== keyId));
  toast.success("API密钥已删除。");
};

  
  const toggleShowKey = (keyId: string) => {
    setShowKeyId(prev => prev === keyId ? null : keyId);
  };

  const getProviderDisplayName = (providerId: ApiKey['provider']): string => {
    // Corrected: BackendProviderInfo (providersConfig?.[providerId]) doesn't have a 'name' property directly.
    return PROVIDER_UI_SUPPLEMENTS[providerId]?.name || providerId;
  };

  const testApiKeyConnection = async (provider: ApiKey['provider'], key: string) => {
    const displayName = getProviderDisplayName(provider);
    toast.info(`正在测试 ${displayName} 连接...`);
    
    // Placeholder for actual API call to backend which then tests the key
    // For now, using client-side validation as a mock
    setTimeout(() => {
        if (validateApiKeyFormat(provider, key)) { // Use the validation logic
             toast.success(`${displayName} 连接测试成功 (模拟)。`);
        } else {
            toast.error(`${displayName} 连接测试失败 (模拟) - Key可能无效或格式错误。`);
        }
    }, 1500);
  };

  // providerDisplayNames constant is removed, use getProviderDisplayName or availableProviders

  if (llmConfigLoading) {
    return <div className="p-6">加载LLM服务商配置中...</div>;
  }

  if (llmConfigError) {
    return <div className="p-6 text-red-600">加载LLM服务商配置失败: {llmConfigError.message}</div>;
  }
  
  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <KeyRound size={28} className="mr-3 text-primary-dark" />
          <h1 className="text-2xl font-semibold text-text-primary-html">API密钥管理</h1>
        </div>
        <Button onClick={() => { setEditingKey(null); setKeyFormData({ provider: 'openai', name: '', key: '' }); setIsFormOpen(true); }}>
          <PlusCircle size={16} className="mr-2" /> 添加API密钥
        </Button>
      </div>
      <p className="text-text-secondary-html mb-6">
        在此处管理您用于访问大模型服务提供商的API密钥。请妥善保管您的密钥。
      </p>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[180px]">服务商</TableHead>
              <TableHead>名称/别名</TableHead>
              <TableHead>API密钥 (点击显示/隐藏)</TableHead>
              <TableHead className="w-[150px]">添加日期</TableHead>
              <TableHead className="text-right w-[180px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {managedApiKeys.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-8">暂无API密钥</TableCell></TableRow>
            )}
            {managedApiKeys.map((apiKey) => (
              <TableRow key={apiKey.id}>
                <TableCell className="font-medium">{getProviderDisplayName(apiKey.provider)}</TableCell>
                <TableCell>{apiKey.name}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <span>{showKeyId === apiKey.id ? apiKey.key : `${apiKey.key.substring(0, 6)}...${apiKey.key.substring(apiKey.key.length - 4)}`}</span>
                    <Button variant="ghost" size="icon" className="ml-2 h-6 w-6" onClick={() => toggleShowKey(apiKey.id)}>
                      {showKeyId === apiKey.id ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{apiKey.addedDate}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="outline" size="sm" onClick={() => testApiKeyConnection(apiKey.provider, apiKey.key)}>
                    测试连接
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:text-primary-dark" onClick={() => handleEdit(apiKey)}>
                    <Edit size={16} />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:text-destructive">
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除?</AlertDialogTitle>
                        <AlertDialogDescription>
                          您确定要删除API密钥 "{apiKey.name}" ({getProviderDisplayName(apiKey.provider)}) 吗？此操作无法撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(apiKey.id, apiKey.provider)} className="bg-destructive hover:bg-destructive/90">删除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        setIsFormOpen(isOpen);
        if (!isOpen) setEditingKey(null);
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingKey ? '编辑API密钥' : '添加新的API密钥'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="provider" className="text-sm font-medium">服务商</Label>
              <Select value={keyFormData.provider} onValueChange={(value) => handleSelectChange('provider', value)}>
                <SelectTrigger id="provider" className="mt-1">
                  <SelectValue placeholder="选择服务商" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  {/* Fallback or 'other' if needed, though dynamic list should cover it */}
                   {!availableProviders.find(p => p.id === 'other') && <SelectItem value="other">其他 (手动输入)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name" className="text-sm font-medium">名称/别名</Label>
              <Input id="name" name="name" value={keyFormData.name} onChange={handleInputChange} className="mt-1" placeholder="例如：我的主力OpenAI Key"/>
            </div>
            <div>
              <Label htmlFor="key" className="text-sm font-medium">API密钥</Label>
              <Input id="key" name="key" type="password" value={keyFormData.key} onChange={handleInputChange} className="mt-1" placeholder="请输入API密钥"/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button onClick={handleSubmit}>{editingKey ? '保存更改' : '添加密钥'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiKeysPage;