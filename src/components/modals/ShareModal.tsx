import { useState, useEffect } from 'react';
import { Mail, Trash2, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ProjectShare } from '../../types/index';
import { supabase } from '../../lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  ownerEmail: string;
}

export default function ShareModal({ open, onClose, projectId, projectName, ownerEmail }: Props) {
  const [shares, setShares] = useState<ProjectShare[]>([]);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'read' | 'edit'>('read');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) loadShares();
  }, [open, projectId]);

  async function loadShares() {
    const { data } = await supabase.from('project_shares').select('*').eq('project_id', projectId);
    setShares((data as ProjectShare[]) ?? []);
  }

  async function invite() {
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    const { error: err } = await supabase.from('project_shares').insert({
      project_id: projectId,
      invitee_email: email.trim().toLowerCase(),
      permission,
    });
    if (err) {
      setError(err.message.includes('unique') ? 'This person already has access.' : err.message);
    } else {
      setEmail('');
      await loadShares();
    }
    setLoading(false);
  }

  async function revokeShare(id: string) {
    await supabase.from('project_shares').delete().eq('id', id);
    setShares((prev) => prev.filter((s) => s.id !== id));
  }

  async function updatePermission(id: string, perm: 'read' | 'edit') {
    await supabase.from('project_shares').update({ permission: perm }).eq('id', id);
    setShares((prev) => prev.map((s) => (s.id === id ? { ...s, permission: perm } : s)));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Share &ldquo;{projectName}&rdquo;</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invite form */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 border-gray-200"
                onKeyDown={(e) => e.key === 'Enter' && invite()}
              />
              <Select value={permission} onValueChange={(v) => setPermission(v as 'read' | 'edit')}>
                <SelectTrigger className="w-24 border-gray-200 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={invite} disabled={loading || !email} className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-9 px-3">
                <Mail className="w-3.5 h-3.5" />
                Invite
              </Button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          {/* Current access */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Access</p>

            {/* Owner row */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{ownerEmail}</p>
              </div>
              <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Owner</Badge>
            </div>

            {/* Shared users */}
            {shares.map((share) => (
              <div key={share.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-blue-600">
                    {share.invitee_email.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{share.invitee_email}</p>
                </div>
                <Select value={share.permission} onValueChange={(v) => updatePermission(share.id, v as 'read' | 'edit')}>
                  <SelectTrigger className="w-20 h-7 text-xs border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                  </SelectContent>
                </Select>
                <button onClick={() => revokeShare(share.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {shares.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">Only you have access to this project.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
