import { Calculator, Share2, Loader as Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
}

export default function Header({
  profile,
  activeProjectName,
  saving,
  collaborators,
  onShare,
}: Props) {
  return (
    <header className="h-[73px] bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-10">
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
            className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 gap-1.5 h-9 px-4 rounded-full border-gray-200"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </Button>
        )}
      </div>
    </header>
  );
}
