import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { toast } from "sonner";
import { WorkflowConfig, useWorkflowConfig } from './WorkflowConfigContext';
import * as yaml from 'js-yaml';
import { openDB, IDBPDatabase } from 'idb'; // Import idb library

const DB_NAME = 'DataPressoProjectsDB';
const STORE_NAME = 'recentProjects';
const DB_VERSION = 1;

export interface RecentProjectRecord { // Add export keyword
  id: string; // Could be dirHandle.name or a generated ID
  name: string;
  dirHandle: FileSystemDirectoryHandle;
  lastOpened: number;
}

export interface ProjectFile {
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
}

interface ProjectContextType {
  projectName: string | null;
  projectDirHandle: FileSystemDirectoryHandle | null;
  projectFiles: ProjectFile[];
  isLoadingProject: boolean;
  recentProjects: RecentProjectRecord[];
  selectProjectDirectory: (nameFromInput?: string) => Promise<FileSystemDirectoryHandle | null>;
  loadProjectConfigFromHandle: (dirHandle: FileSystemDirectoryHandle, name?: string) => Promise<void>;
  saveProjectConfigToHandle: () => Promise<void>;
  createProjectDirectory: (name: string) => Promise<FileSystemDirectoryHandle | null>;
  createProjectFile: (name: string, content?: string) => Promise<FileSystemFileHandle | null>;
  closeProject: () => void;
  setProjectName: (name: string | null) => void;
  refreshProjectFiles: () => Promise<void>;
  openRecentProject: (projectRecord: RecentProjectRecord) => Promise<void>;
  removeRecentProject: (projectId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Helper function to open IndexedDB
const getDb = async (): Promise<IDBPDatabase<RecentProjectRecord>> => { // Specify DB type for better type safety
  return openDB<RecentProjectRecord>(DB_NAME, DB_VERSION, { // Specify DB type here as well
    upgrade(db: IDBPDatabase<RecentProjectRecord>) { // Explicitly type db
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Ensure the object store is created correctly for RecentProjectRecord
        // The keyPath 'id' matches RecentProjectRecord.id
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};


export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projectName, setProjectNameState] = useState<string | null>(null);
  const [projectDirHandle, setProjectDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProjectRecord[]>([]);
  const { setConfig: setWorkflowConfig, getFullConfig: getWorkflowFullConfig } = useWorkflowConfig();

  const setProjectName = (name: string | null) => {
    setProjectNameState(name);
  };

  // Load recent projects from IndexedDB on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const db = await getDb();
        // Explicitly type the result of getAll if needed, though openDB<RecentProjectRecord> should help
        const projects: RecentProjectRecord[] = await db.getAll(STORE_NAME);
        // Sort by lastOpened descending
        setRecentProjects(projects.sort((a: RecentProjectRecord, b: RecentProjectRecord) => b.lastOpened - a.lastOpened));
      } catch (error) {
        console.error("Error loading recent projects from IndexedDB:", error);
        toast.error("无法加载历史项目列表。");
      }
    };
    loadProjects();
  }, []);

  const saveRecentProject = async (name: string, handle: FileSystemDirectoryHandle) => {
    try {
      const db = await getDb();
      const projectRecord: RecentProjectRecord = {
        id: handle.name + '_' + Date.now(), // Simple unique ID, consider more robust generation
        name: name || handle.name,
        dirHandle: handle,
        lastOpened: Date.now(),
      };
      await db.put(STORE_NAME, projectRecord);
      // Update local state, ensuring no duplicates by handle name (or a more robust ID)
      setRecentProjects(prev => {
        const filtered = prev.filter(p => p.dirHandle.name !== handle.name);
        return [projectRecord, ...filtered].sort((a,b) => b.lastOpened - a.lastOpened);
      });
    } catch (error) {
      console.error("Error saving recent project to IndexedDB:", error);
      // Non-critical, so maybe a silent fail or a subtle toast
    }
  };
  
  const removeRecentProject = async (projectId: string) => {
    try {
      const db = await getDb();
      await db.delete(STORE_NAME, projectId);
      setRecentProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success("历史项目已移除。");
    } catch (error) {
      console.error("Error removing recent project:", error);
      toast.error("移除历史项目失败。");
    }
  };


  const listFilesInDirectory = async (dirHandle: FileSystemDirectoryHandle): Promise<ProjectFile[]> => {
    const files: ProjectFile[] = [];
    if (!dirHandle) return files;
    try {
      for await (const entry of dirHandle.values()) {
        files.push({
          name: entry.name,
          kind: entry.kind,
          handle: entry,
        });
      }
    } catch (error) {
      console.error("Error listing files in directory:", error);
      toast.error("无法列出项目目录中的文件。");
    }
    return files;
  };

  const refreshProjectFiles = useCallback(async () => {
    if (projectDirHandle) {
      const files = await listFilesInDirectory(projectDirHandle);
      setProjectFiles(files);
    }
  }, [projectDirHandle]);

  const selectProjectDirectory = async (nameFromInput?: string): Promise<FileSystemDirectoryHandle | null> => {
    setIsLoadingProject(true);
    try {
      if (!window.showDirectoryPicker) {
        toast.error("您的浏览器不支持 File System Access API。请使用现代浏览器或手动管理文件。");
        setIsLoadingProject(false);
        return null;
      }
      const dirHandle = await window.showDirectoryPicker();
      setProjectDirHandle(dirHandle);
      const effectiveName = nameFromInput || dirHandle.name;
      // Attempt to load config.yaml if it exists
      await loadProjectConfigFromHandle(dirHandle, effectiveName); // Pass effectiveName
      const files = await listFilesInDirectory(dirHandle);
      setProjectFiles(files);
      await saveRecentProject(effectiveName, dirHandle); // Save to recent projects
      setIsLoadingProject(false);
      return dirHandle;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Error selecting directory:", err);
        toast.error("无法选择目录。错误: " + err.message);
      } else {
        // toast.info("选择目录操作已取消。"); // Can be too noisy
      }
      setIsLoadingProject(false);
      return null;
    }
  };

  const openRecentProject = async (projectRecord: RecentProjectRecord) => {
    setIsLoadingProject(true);
    try {
      // Verify permission, then request if not granted.
      let permissionGranted = false;
      if (typeof projectRecord.dirHandle.queryPermission === 'function') {
        if ((await projectRecord.dirHandle.queryPermission({ mode: 'readwrite' })) === 'granted') {
          permissionGranted = true;
        }
      }
      
      if (!permissionGranted) {
        if (typeof projectRecord.dirHandle.requestPermission === 'function') {
          if ((await projectRecord.dirHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
            toast.error(`无法获取项目 "${projectRecord.name}" 的访问权限。您可能需要重新选择该目录。`);
            // Optionally remove from recent if permission is permanently denied or handle is stale
            // await removeRecentProject(projectRecord.id);
            setIsLoadingProject(false);
            return;
          }
        } else {
            // Fallback for browsers that might not support queryPermission/requestPermission on stored handles
            // or if the handle itself is stale. This is a best-effort.
            console.warn("无法验证或请求项目目录权限。尝试直接使用句柄。");
        }
      }

      setProjectDirHandle(projectRecord.dirHandle);
      // The name from projectRecord is likely more accurate or user-defined than dirHandle.name
      await loadProjectConfigFromHandle(projectRecord.dirHandle, projectRecord.name);
      const files = await listFilesInDirectory(projectRecord.dirHandle);
      setProjectFiles(files);
      // Update lastOpened time by re-saving it
      await saveRecentProject(projectRecord.name, projectRecord.dirHandle);
      toast.success(`已打开历史项目: "${projectRecord.name}"`);
    } catch (error: any) {
      console.error("Error opening recent project:", error);
      toast.error(`打开历史项目 "${projectRecord.name}" 失败: ${error.message}。可能需要重新选择该目录。`);
      // Consider removing the project from recent list if the handle is truly invalid
      // await removeRecentProject(projectRecord.id);
    } finally {
      setIsLoadingProject(false);
    }
  };

  const loadProjectConfigFromHandle = async (dirHandle: FileSystemDirectoryHandle, name?: string) => {
    if (!dirHandle) return;
    setIsLoadingProject(true);
    try {
      const configFileHandle = await dirHandle.getFileHandle('config.yaml', { create: false });
      const file = await configFileHandle.getFile();
      const text = await file.text();
      const loadedConfig = yaml.load(text) as WorkflowConfig;
      
      if (loadedConfig && typeof loadedConfig === 'object') {
        setWorkflowConfig(loadedConfig); // Update workflow context
        setProjectNameState(name || loadedConfig.workflowName || dirHandle.name || "未命名项目");
        toast.success(`项目 "${name || loadedConfig.workflowName}" 的配置已加载。`);
      } else {
        throw new Error("无效的 config.yaml 文件格式。");
      }
    } catch (error: any) {
      // If config.yaml doesn't exist, it's not necessarily an error for a new project
      if (error.name === 'NotFoundError') {
        toast.info("在项目中未找到 config.yaml。这是一个新项目或需要手动导入配置。");
        // Set project name even if config is not found
        setProjectNameState(name || dirHandle.name || "未命名项目");
      } else {
        console.error("Error loading config.yaml:", error);
        toast.error("加载 config.yaml 失败: " + error.message);
      }
    } finally {
      setIsLoadingProject(false);
    }
  };

  const saveProjectConfigToHandle = async () => {
    if (!projectDirHandle) {
      toast.error("没有打开的项目，无法保存配置。");
      return;
    }
    const currentWorkflowConfig = getWorkflowFullConfig();
    try {
      const configFileHandle = await projectDirHandle.getFileHandle('config.yaml', { create: true });
      const writable = await configFileHandle.createWritable();
      const yamlString = yaml.dump(currentWorkflowConfig);
      await writable.write(yamlString);
      await writable.close();
      toast.success(`配置已保存到项目 "${projectName || '当前项目'}" 中的 config.yaml。`);
      await refreshProjectFiles(); // Refresh file list after saving
    } catch (error: any) {
      console.error("Error saving config.yaml:", error);
      toast.error("保存 config.yaml 失败: " + error.message);
    }
  };
  
  const createProjectDirectory = async (name: string): Promise<FileSystemDirectoryHandle | null> => {
    if (!projectDirHandle) {
        toast.error("请先选择一个项目根目录。");
        return null;
    }
    try {
        const subDirHandle = await projectDirHandle.getDirectoryHandle(name, { create: true });
        toast.success(`子目录 "${name}" 已在项目中创建。`);
        await refreshProjectFiles();
        return subDirHandle;
    } catch (error: any) {
        console.error(`Error creating subdirectory ${name}:`, error);
        toast.error(`创建子目录 "${name}" 失败: ${error.message}`);
        return null;
    }
  };

  const createProjectFile = async (name: string, content: string = ""): Promise<FileSystemFileHandle | null> => {
    if (!projectDirHandle) {
        toast.error("请先选择一个项目根目录。");
        return null;
    }
    try {
        const fileHandle = await projectDirHandle.getFileHandle(name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        toast.success(`文件 "${name}" 已在项目中创建/更新。`);
        await refreshProjectFiles();
        return fileHandle;
    } catch (error: any) {
        console.error(`Error creating file ${name}:`, error);
        toast.error(`创建文件 "${name}" 失败: ${error.message}`);
        return null;
    }
  };

  const closeProject = () => {
    setProjectNameState(null);
    setProjectDirHandle(null);
    setProjectFiles([]);
    // Optionally, reset workflow config to default or a blank state
    // setWorkflowConfig(defaultWorkflowConfig); 
    toast.info("项目已关闭。");
  };

  return (
    <ProjectContext.Provider value={{ 
      projectName, 
      projectDirHandle,
      projectFiles,
      isLoadingProject,
      recentProjects, // Expose recent projects
      selectProjectDirectory,
      loadProjectConfigFromHandle,
      saveProjectConfigToHandle,
      createProjectDirectory,
      createProjectFile,
      closeProject,
      setProjectName,
      refreshProjectFiles,
      openRecentProject, // Expose openRecentProject
      removeRecentProject // Expose removeRecentProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};