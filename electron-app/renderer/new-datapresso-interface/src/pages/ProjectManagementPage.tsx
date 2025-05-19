import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject } from '@/contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, PlusCircle, List, Trash2, ExternalLink } from 'lucide-react'; // Added Trash2, ExternalLink
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns'; // For user-friendly dates
import { zhCN } from 'date-fns/locale'; // For Chinese locale


const ProjectManagementPage: React.FC = () => {
  const {
    projectName,
    projectDirHandle,
    selectProjectDirectory,
    // loadProjectConfigFromHandle, // Not directly used here, but part of openRecentProject
    closeProject,
    setProjectName: setContextProjectName,
    projectFiles,
    isLoadingProject,
    refreshProjectFiles,
    recentProjects,     // Get recent projects
    openRecentProject,  // Get function to open recent
    removeRecentProject // Get function to remove recent
  } = useProject();
  
  const [newProjectNameInput, setNewProjectNameInput] = useState('');
  const navigate = useNavigate();

  const handleCreateNewProject = async () => {
    if (!newProjectNameInput.trim()) {
      toast.error("请输入项目名称。");
      return;
    }
    const dirHandle = await selectProjectDirectory();
    if (dirHandle) {
      // selectProjectDirectory now takes an optional name argument
      // It also handles setting the project name in context and saving to recent.
      // If newProjectNameInput is provided, it will be used as the preferred name.
      toast.success(`项目 "${newProjectNameInput || dirHandle.name}" 已创建/设置。`);
      navigate('/');
    }
    setNewProjectNameInput('');
  };

  const handleOpenExistingProject = async () => {
    // Pass undefined or no argument if we want the name to be derived from dirHandle or config.yaml
    const dirHandle = await selectProjectDirectory();
    if (dirHandle) {
      // Name and config are loaded by selectProjectDirectory/loadProjectConfigFromHandle
      navigate('/'); 
    }
  };

  const handleViewProjectFiles = () => {
    if (projectDirHandle) {
      refreshProjectFiles(); // Ensure file list is up to date
      // Display files, perhaps in a modal or a dedicated section
      console.log("Project files:", projectFiles);
      toast.info("项目文件列表已打印到控制台。UI显示待实现。");
    } else {
      toast.error("请先打开一个项目。");
    }
  };


  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold text-text-primary-html mb-8">项目管理</h1>

      {/* Current Project Section */}
      {projectDirHandle && projectName ? (
        <Card className="mb-8 bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700">当前活动项目: {projectName}</CardTitle>
            <CardDescription>
              目录: {projectDirHandle.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="text-md font-semibold mb-1 text-gray-700">项目根目录文件:</h4>
              {isLoadingProject && <p className="text-sm text-gray-500">正在加载文件列表...</p>}
              {!isLoadingProject && projectFiles.length > 0 ? (
                <div className="max-h-48 overflow-y-auto bg-white p-3 rounded-md border custom-scrollbar">
                  {projectFiles.map(file => (
                    <div key={file.name} className="text-sm flex items-center py-1">
                      {file.kind === 'directory'
                        ? <FolderOpen size={14} className="inline mr-2 text-blue-600 flex-shrink-0" />
                        : <List size={14} className="inline mr-2 text-gray-500 flex-shrink-0" />}
                      <span className="truncate" title={file.name}>{file.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                !isLoadingProject && <p className="text-sm text-gray-500">项目中没有文件或无法访问。</p>
              )}
            </div>
            <Button onClick={refreshProjectFiles} variant="outline" size="sm" disabled={isLoadingProject}>
              <List size={16} className="mr-2" /> {isLoadingProject ? "刷新中..." : "刷新文件列表"}
            </Button>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <Button onClick={() => navigate('/')} variant="default" className="bg-green-600 hover:bg-green-700">
              <ExternalLink size={16} className="mr-2"/> 返回工作流 ({projectName})
            </Button>
            <Button onClick={closeProject} variant="destructive" size="sm">关闭当前项目</Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="mb-8 bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-700">提示</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary-html">当前没有打开的项目。您可以创建一个新项目或打开一个历史项目。</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Projects Section */}
      {recentProjects.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>历史项目</CardTitle>
            <CardDescription>点击打开最近访问过的项目。</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentProjects.map(p => (
                <li key={p.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-md border">
                  <div>
                    <span className="font-medium text-primary-dark cursor-pointer hover:underline" onClick={async () => { await openRecentProject(p); navigate('/'); }}>
                      {p.name}
                    </span>
                    <p className="text-xs text-gray-500">
                      目录: {p.dirHandle.name} - 上次打开: {formatDistanceToNow(new Date(p.lastOpened), { addSuffix: true, locale: zhCN })}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={async () => { await openRecentProject(p); navigate('/'); }} disabled={isLoadingProject}>
                      <ExternalLink size={16} className="mr-1"/> 打开
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 h-8 w-8" onClick={() => removeRecentProject(p.id)} title="从历史记录移除">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Create or Open Project Sections */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PlusCircle size={20} className="mr-2 text-primary-dark" /> 创建新项目
            </CardTitle>
            <CardDescription>选择一个本地文件夹作为新项目的根目录。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="new-project-name">项目名称</Label>
              <Input 
                id="new-project-name" 
                placeholder="例如：我的第一个LIMO项目" 
                value={newProjectNameInput}
                onChange={(e) => setNewProjectNameInput(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCreateNewProject} className="w-full" disabled={isLoadingProject}>
              {isLoadingProject ? "处理中..." : "选择项目文件夹并创建"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FolderOpen size={20} className="mr-2 text-primary-dark" /> 打开现有项目
            </CardTitle>
            <CardDescription>选择包含 `config.yaml` 的现有项目文件夹。</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary-html mb-4">
              点击下方按钮，然后在弹出的对话框中选择您的项目文件夹。如果文件夹中包含 `config.yaml`，系统将自动加载项目配置。
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleOpenExistingProject} className="w-full" variant="outline" disabled={isLoadingProject}>
               {isLoadingProject ? "加载中..." : "选择项目文件夹"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ProjectManagementPage;