import { Calculator, Share2, Loader as Loader2, CircleCheck as CheckCircle2, LogOut, CircleUser as UserCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserProfile } from '../types/index';

interface Collaborator {
  uid: string;
  name: string;
  photoUrl?: string;
}

interface Props {
  profile: UserProfile | null;
  activeProjectName?: string;
  saving: boolean;
  collaborators: Collaborator[];
  onShare: () => void;
  onProfile: () => void;
  onSignOut: () => void;
}

export default function Header({
  profile,
  activeProjectName,
  saving,
  collaborators,
  onShare,
  onProfile,
  onSignOut,
}: Props) {
  const initials = profile
    ? `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <header className="h-[73px] bg-white border-b border-gray-200 shadow-sm px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-10">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
          <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap">
              Services Pricing Workbook
            </h1>
            {profile?.role === 'admin' && (
              <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[9px] font-black rounded-full px-2 py-0.5 hidden sm:inline-flex">
                ADMIN
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider hidden sm:block">
            {activeProjectName ?? 'Precision Estimation'}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Saving state */}
        <div className="w-5 flex items-center justify-center">
          {saving && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
        </div>

        {/* Collaborators */}
        {collaborators.length > 0 && (
          <div className="hidden sm:flex items-center">
            {collaborators.slice(0, 3).map((c, i) => (
              <div
                key={c.uid}
                className="w-8 h-8 rounded-full border-2 border-white ring-2 ring-gray-50 -ml-2 first:ml-0"
                style={{ zIndex: 10 - i }}
                title={c.name}
              >
                {c.photoUrl ? (
                  <img src={c.photoUrl} className="w-full h-full rounded-full object-cover" alt={c.name} />
                ) : (
                  <div className="w-full h-full rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Share button */}
        {activeProjectName && (
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 gap-1.5 h-8 sm:h-9 px-3"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}

        {/* Separator */}
        <div className="h-6 w-px bg-gray-200" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors">
              <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
                {profile?.photo_url ? (
                  <AvatarImage src={profile.photo_url} />
                ) : null}
                <AvatarFallback className="bg-[#2E86C1] text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                  {profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onProfile} className="gap-2 cursor-pointer">
              <UserCircle className="w-4 h-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="gap-2 cursor-pointer text-red-600 focus:text-red-600">
              <LogOut className="w-4 h-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
