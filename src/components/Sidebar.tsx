import {
  Calculator, Folder, FolderPlus, Share2, Trash2,
  CreditCard, Globe, Layers, BarChart3, Users, Settings2,
  LayoutTemplate, PanelLeftClose, PanelLeftOpen, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Project } from '../types/index';

type ActiveView =
  | { type: 'project'; projectId: string }
  | { type: 'settings'; tab: 'rates' | 'countries' | 'phases' }
  | { type: 'admin'; tab: 'dashboard' | 'users' | 'metadata' | 'templates' | 'ai' };

interface Props {
  projects: Project[];
  sharedProjects: Project[];
  activeView: ActiveView | null;
  isAdmin: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  onSelectSettings: (tab: 'rates' | 'countries' | 'phases') => void;
  onSelectAdmin: (tab: 'dashboard' | 'users' | 'metadata' | 'templates' | 'ai') => void;
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="w-full border-t border-gray-100 my-2" />;
  return (
    <p className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.1em] px-3 mt-4 mb-1">
      {label}
    </p>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
  badge,
  onDelete,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  badge?: string;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all relative',
        active
          ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        collapsed && 'justify-center px-2'
      )}
      onClick={onClick}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-blue-600' : 'text-gray-400')} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge && (
            <Badge className="text-[10px] font-medium border border-blue-100 text-blue-600 bg-blue-50/50 rounded-full px-1.5 py-0">
              {badge}
            </Badge>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function Sidebar({
  projects,
  sharedProjects,
  activeView,
  isAdmin,
  collapsed,
  onToggleCollapse,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onSelectSettings,
  onSelectAdmin,
}: Props) {
  const activeProjectId = activeView?.type === 'project' ? activeView.projectId : null;
  const activeSettingsTab = activeView?.type === 'settings' ? activeView.tab : null;
  const activeAdminTab = activeView?.type === 'admin' ? activeView.tab : null;

  return (
    <div
      className={cn(
        'h-full bg-white border-r border-gray-200 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)] flex flex-col transition-all duration-200 overflow-hidden',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="h-[73px] border-b border-gray-100 flex items-center justify-between px-3 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-blue-600 p-1.5 rounded-lg flex-shrink-0">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 truncate">SPW</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors flex-shrink-0"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {/* Admin section */}
        {isAdmin && (
          <>
            <SectionLabel label="Administration" collapsed={collapsed} />
            <SidebarItem icon={BarChart3} label="Dashboard" active={activeAdminTab === 'dashboard'} collapsed={collapsed} onClick={() => onSelectAdmin('dashboard')} />
            <SidebarItem icon={Users} label="User Management" active={activeAdminTab === 'users'} collapsed={collapsed} onClick={() => onSelectAdmin('users')} />
            <SidebarItem icon={Settings2} label="Global Metadata" active={activeAdminTab === 'metadata'} collapsed={collapsed} onClick={() => onSelectAdmin('metadata')} />
            <SidebarItem icon={LayoutTemplate} label="Templates" active={activeAdminTab === 'templates'} collapsed={collapsed} onClick={() => onSelectAdmin('templates')} />
          </>
        )}

        {/* Projects section */}
        <SectionLabel label="Projects" collapsed={collapsed} />
        {!collapsed && (
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            onClick={onNewProject}
          >
            <FolderPlus className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500 font-medium">New Project</span>
          </div>
        )}
        {collapsed && (
          <button
            onClick={onNewProject}
            className="w-full flex items-center justify-center py-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="New Project"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        )}

        {projects.map((p) => (
          <SidebarItem
            key={p.id}
            icon={Folder}
            label={p.name}
            active={activeProjectId === p.id}
            collapsed={collapsed}
            onClick={() => onSelectProject(p.id)}
            onDelete={() => onDeleteProject(p.id)}
          />
        ))}

        {sharedProjects.length > 0 && (
          <>
            {!collapsed && (
              <p className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.1em] px-3 mt-3 mb-1">
                Shared With Me
              </p>
            )}
            {sharedProjects.map((p) => (
              <SidebarItem
                key={p.id}
                icon={Share2}
                label={p.name}
                active={activeProjectId === p.id}
                collapsed={collapsed}
                onClick={() => onSelectProject(p.id)}
                badge={p.share_permission === 'edit' ? 'Edit' : 'Read'}
              />
            ))}
          </>
        )}

        {/* Configuration section */}
        <SectionLabel label="Configuration" collapsed={collapsed} />
        <SidebarItem
          icon={CreditCard}
          label="Rate Card"
          active={activeSettingsTab === 'rates'}
          collapsed={collapsed}
          onClick={() => onSelectSettings('rates')}
        />
        <SidebarItem
          icon={Globe}
          label="Countries"
          active={activeSettingsTab === 'countries'}
          collapsed={collapsed}
          onClick={() => onSelectSettings('countries')}
        />
        <SidebarItem
          icon={Layers}
          label="Phases"
          active={activeSettingsTab === 'phases'}
          collapsed={collapsed}
          onClick={() => onSelectSettings('phases')}
        />
      </div>

      {/* Bottom collapse indicator */}
      {!collapsed && (
        <div className="border-t border-gray-100 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <ChevronRight className="w-3 h-3" />
            <span>Collapse sidebar</span>
          </div>
        </div>
      )}
    </div>
  );
}
