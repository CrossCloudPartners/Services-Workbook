import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Shield, 
  ShieldAlert, 
  UserPlus, 
  Trash2, 
  Check,
  Copy,
  Users,
  Lock,
  Globe,
  Share2
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { db } from '../firebase';
import { 
  doc, 
  onSnapshot, 
  setDoc,
  deleteDoc,
  collection,
  query,
  getDocs
} from 'firebase/firestore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  ownerId: string;
  ownerEmail: string;
}

export default function ShareModal({ isOpen, onClose, projectId, projectName, ownerId, ownerEmail }: Props) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'read' | 'edit'>('read');
  const [shares, setShares] = useState<Record<string, 'read' | 'edit'>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const sharesRef = collection(db, 'projects', projectId, 'shares');
    const unsubscribe = onSnapshot(sharesRef, (snapshot) => {
      const newShares: Record<string, 'read' | 'edit'> = {};
      snapshot.docs.forEach(doc => {
        newShares[doc.id] = doc.data().permission;
      });
      setShares(newShares);
    });

    return () => unsubscribe();
  }, [projectId]);

  const handleInvite = async () => {
    if (!email || !email.includes('@')) return;
    
    setLoading(true);
    try {
      const inviteeEmail = email.toLowerCase().trim();
      const shareRef = doc(db, 'projects', projectId, 'shares', inviteeEmail);
      await setDoc(shareRef, {
        email: inviteeEmail,
        permission,
        projectId,
        projectName,
        ownerId,
        ownerEmail,
        createdAt: new Date().toISOString()
      });
      setEmail('');
    } catch (err) {
      console.error('Error inviting user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (inviteeEmail: string) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'shares', inviteeEmail));
    } catch (err) {
      console.error('Error removing share:', err);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">Share Project</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Invite others to collaborate on <span className="font-semibold text-gray-700">{projectName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Select value={permission} onValueChange={(v: any) => setPermission(v)}>
              <SelectTrigger className="w-[100px] h-11 rounded-xl border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleInvite} 
              disabled={loading || !email}
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-md shadow-blue-100"
            >
              {loading ? 'Inviting...' : 'Invite'}
            </Button>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">People with access</h4>
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2 scrollbar-hide">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {ownerEmail.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ownerEmail}</p>
                    <p className="text-[10px] text-gray-500">Owner</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white text-gray-500 border-gray-200 font-medium">Owner</Badge>
              </div>

              {Object.entries(shares).map(([inviteeEmail, perm]) => (
                <div key={inviteeEmail} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">
                      {inviteeEmail.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inviteeEmail}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{perm}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn(
                      "font-medium",
                      perm === 'edit' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-blue-50 text-blue-700 border-blue-100"
                    )}>
                      {perm === 'edit' ? 'Editor' : 'Viewer'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveShare(inviteeEmail)}
                      className="w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100 flex-row sm:justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-medium">Only people with access can open this project</span>
          </div>
          <Button
            variant="outline"
            onClick={copyLink}
            className="rounded-xl border-gray-200 hover:bg-white hover:border-blue-200 hover:text-blue-600 transition-all gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
