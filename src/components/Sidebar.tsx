import { useState, useRef, useEffect } from 'react';
import { FileText, FilePlus, Share2, Trash2, CreditCard, Globe, Layers, ChartBar as BarChart3, Users, Settings2, LayoutTemplate, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Project, UserProfile } from '../types/index';

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
  profile: UserProfile | null;
  onToggleCollapse: () => void;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  onSelectSettings: (tab: 'rates' | 'countries' | 'phases') => void;
  onSelectAdmin: (tab: 'dashboard' | 'users' | 'metadata' | 'templates' | 'ai') => void;
  onProfile: () => void;
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
  badgeVariant = 'default',
  onDelete,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  badge?: string;
  badgeVariant?: 'default' | 'edit';
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
            <Badge className={cn(
              'text-[10px] font-semibold rounded px-1.5 py-0 border',
              badgeVariant === 'edit'
                ? 'border-blue-200 text-blue-600 bg-blue-50'
                : 'border-blue-100 text-blue-600 bg-blue-50/50'
            )}>
              {badge}
            </Badge>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition-all flex-shrink-0"
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
  profile,
  onToggleCollapse,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onSelectSettings,
  onSelectAdmin,
  onProfile,
}: Props) {
  const activeProjectId = activeView?.type === 'project' ? activeView.projectId : null;
  const activeAdminTab = activeView?.type === 'admin' ? activeView.tab : null;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close popover on click outside
  useEffect(() => {
    if (!settingsOpen) return;
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [settingsOpen]);

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : '';

  const settingsItems: { icon: React.ElementType; label: string; tab: 'rates' | 'countries' | 'phases' }[] = [
    { icon: CreditCard, label: 'Rate Card', tab: 'rates' },
    { icon: Globe, label: 'Manage Countries', tab: 'countries' },
    { icon: Layers, label: 'Phases', tab: 'phases' },
  ];

  return (
    <div
      className={cn(
        'h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-200 overflow-visible relative',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Header — collapse toggle only */}
      <div className="h-[73px] border-b border-gray-100 flex items-center justify-center px-2 flex-shrink-0">
        <button
          onClick={onToggleCollapse}
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
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
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            onClick={onNewProject}
          >
            <FilePlus className="w-4 h-4 text-gray-400" />
            <span className="font-medium">New project</span>
          </div>
        )}
        {collapsed && (
          <button
            onClick={onNewProject}
            className="w-full flex items-center justify-center py-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="New Project"
          >
            <FilePlus className="w-4 h-4" />
          </button>
        )}

        {projects.map((p) => (
          <SidebarItem
            key={p.id}
            icon={FileText}
            label={p.name}
            active={activeProjectId === p.id}
            collapsed={collapsed}
            onClick={() => onSelectProject(p.id)}
            badge={activeProjectId === p.id ? 'Edit' : undefined}
            badgeVariant="edit"
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
      </div>

      {/* Bottom: User profile + Settings */}
      <div className="border-t border-gray-100 flex-shrink-0">
        {/* User profile */}
        <button
          onClick={onProfile}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? displayName : undefined}
        >
          <Avatar className="w-9 h-9 flex-shrink-0">
            {profile?.photo_url ? <AvatarImage src={profile.photo_url} /> : null}
            <AvatarFallback className="bg-[#2E86C1] text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{displayName}</p>
              <p className="text-xs text-gray-400 leading-tight mt-0.5">
                {profile?.role === 'admin' ? 'Admin' : 'Free'}
              </p>
            </div>
          )}
        </button>

        {/* Settings button + popover */}
        <div ref={settingsRef} className="relative border-t border-gray-100">
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors border-0',
              settingsOpen
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? 'Settings' : undefined}
          >
            <SlidersHorizontal className={cn('w-4 h-4', settingsOpen ? 'text-blue-600' : 'text-gray-400')} />
            {!collapsed && <span className="flex-1 text-left">Settings</span>}
            {!collapsed && (
              <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', settingsOpen && 'rotate-90')} />
            )}
          </button>

          {/* Popover menu — floats above the Settings button */}
          {settingsOpen && (
            <div
              className={cn(
                'absolute bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-50',
                collapsed ? 'left-full ml-2 w-48' : 'left-2 right-2'
              )}
            >
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-1.5">
                Configuration
              </p>
              {settingsItems.map(({ icon: Icon, label, tab }) => (
                <button
                  key={tab}
                  onClick={() => { onSelectSettings(tab); setSettingsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                >
                  <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
