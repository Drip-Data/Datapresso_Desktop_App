import React from 'react';
import { HelpCircle, UserCircle, ChevronDown, FolderPlus, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProject, RecentProjectRecord } from '@/contexts/ProjectContext';
import { useUser } from '@/contexts/UserContext'; // Import useUser
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Removed toast import as it's not used here

interface WorkflowTopbarProps {
  pageTitle: string;
}

const ProjectInitialIcon: React.FC<{ name?: string | null }> = ({ name }) => {
  const initial = name ? name.charAt(0).toUpperCase() : 'D';
  // Simple color hashing for variety, can be improved
  const colors = ["bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-indigo-500"];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
  
  return (
    <div className={`flex items-center justify-center h-6 w-6 ${colors[colorIndex]} rounded text-white text-sm font-semibold mr-2 flex-shrink-0`}>
      {initial}
    </div>
  );
};

const WorkflowTopbar: React.FC<WorkflowTopbarProps> = ({ pageTitle }) => {
  const {
    projectName,
    projectDirHandle,
    recentProjects,
    openRecentProject,
    selectProjectDirectory,
    isLoadingProject
  } = useProject();  const { user, isLoadingUser } = useUser(); // Get user from UserContext
  const navigate = useNavigate();

  // const user = { // Replaced by UserContext
  //   name: "张数据",
  //   role: "数据科学家",
  //   avatarUrl: undefined as string | undefined
  // };

  const pageTitleStyle = "text-[1.75rem] font-semibold bg-gradient-to-r from-primary-dark to-primary-light text-transparent bg-clip-text tracking-[-0.5px]";

  const handleOpenOrCreateProject = async () => {
    const dirHandle = await selectProjectDirectory();
    if (dirHandle) {
      navigate('/workflow');
    }
  };

  const handleOpenRecent = async (project: RecentProjectRecord) => {
    await openRecentProject(project);
    navigate('/workflow');
  };

  return (
    <div className="sticky top-0 z-[9] bg-white/80 backdrop-blur-lg shadow-sm-html rounded-2xl">
      <div className="container mx-auto flex items-center justify-between py-2.5 px-6"> {/* Adjusted py */}
        
        {/* Left side: Project Dropdown and Page Title */}
        <div className="flex items-center"> {/* Removed space-x-4, will use separators */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost" // No border
                className="flex items-center px-2 py-1.5 h-auto text-sm hover:bg-gray-100 focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <ProjectInitialIcon name={projectName} />
                <span className="font-medium truncate max-w-[150px]" title={projectName || "DataPresso 项目"}>
                  {projectName || "DataPresso 项目"}
                </span>
                <ChevronDown className="h-4 w-4 opacity-60 ml-1.5 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[280px]" align="start"> {/* Wider dropdown */}
              <DropdownMenuItem onSelect={handleOpenOrCreateProject} disabled={isLoadingProject}>
                <FolderPlus className="mr-2 h-4 w-4" />
                <span>打开/创建新项目...</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {recentProjects.length > 0 && (
                <DropdownMenuGroup>
                  <DropdownMenuLabel>最近项目</DropdownMenuLabel>
                  {recentProjects.slice(0, 5).map((p) => (
                    <DropdownMenuItem key={p.id} onSelect={() => handleOpenRecent(p)} disabled={isLoadingProject}>
                      <ProjectInitialIcon name={p.name} />
                      <div className="flex flex-col ml-1">
                        <span className="truncate font-medium" title={p.name}>
                          {p.name}
                        </span>
                        {p.dirHandle?.name && <span className="text-xs text-gray-500 truncate" title={p.dirHandle.name}>{p.dirHandle.name}</span>}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              )}
              {recentProjects.length === 0 && (
                 <DropdownMenuItem disabled>没有最近项目</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/project-management')}>
                <Settings2 className="mr-2 h-4 w-4" />
                <span>项目管理中心...</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-200 mx-3"></div>

          <div>
            <h1 className={pageTitleStyle}>{pageTitle}</h1>
            {/* Current project dir name can be removed if project name in dropdown is sufficient */}
            {/* {projectDirHandle && projectName && (
              <span className="text-xs text-gray-500 font-medium -mt-1 block">
                当前: {projectDirHandle.name}
              </span>
            )} */}
          </div>
        </div>        {/* Right side: Controls & User Profile */}
        <div className="flex items-center space-x-4">

          <button
            title="帮助"
            className="p-2 rounded-lg hover:bg-gray-200 text-text-secondary-html hover:text-text-primary-html transition-colors h-9 w-9 flex items-center justify-center"
            onClick={() => navigate('/help')}
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          
          {isLoadingUser ? (
            <div className="h-[38px] w-[100px] bg-gray-200 animate-pulse rounded"></div> // Placeholder for loading user
          ) : user ? (
            <div className="flex items-center space-x-3 ml-2 cursor-pointer group" onClick={() => navigate('/settings')}> {/* Link to settings page */}
              {/* Avatar part using user.avatarText */}
              <div className="h-[38px] w-[38px] rounded-full bg-gradient-to-br from-primary-dark to-primary-light flex items-center justify-center text-white font-semibold border-2 border-primary-light">
                {user.avatarText || user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm leading-tight">
                <div className="font-semibold text-text-primary-html group-hover:text-primary-dark transition-colors">{user.name}</div>
                <div className="text-xs text-text-secondary-html group-hover:text-primary-html transition-colors">{user.role}</div>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>登录/设置</Button> // Fallback if user is null
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowTopbar;