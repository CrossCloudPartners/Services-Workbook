import { useState, useEffect } from 'react';
import { Camera, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '../../types/index';
import { supabase } from '../../lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdated: () => void;
}

export default function ProfileModal({ open, onClose, profile, onUpdated }: Props) {
  const [form, setForm] = useState({
    firstName: profile.first_name,
    lastName: profile.last_name,
    companyName: profile.company_name,
  });
  const [photoUrl, setPhotoUrl] = useState(profile.photo_url ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.first_name,
        lastName: profile.last_name,
        companyName: profile.company_name,
      });
      setPhotoUrl(profile.photo_url ?? '');
    }
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    await supabase.from('users').update({
      first_name: form.firstName,
      last_name: form.lastName,
      company_name: form.companyName,
    }).eq('uid', profile.uid);
    setSaving(false);
    onUpdated();
    onClose();
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    const ext = file.name.split('.').pop();
    const path = `avatars/${profile.uid}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) {
      setUploadError('Upload failed. Please try again.');
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
    const { error: dbErr } = await supabase.from('users').update({ photo_url: publicUrl }).eq('uid', profile.uid);
    if (!dbErr) {
      setPhotoUrl(publicUrl);
      onUpdated();
    } else {
      setUploadError('Failed to save photo. Please try again.');
    }
    setUploading(false);
  }

  const initials = `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-20 h-20">
                {photoUrl && <AvatarImage src={photoUrl} />}
                <AvatarFallback className="text-2xl font-bold bg-[#2E86C1] text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
                <Camera className="w-3.5 h-3.5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            </div>
            {uploading && <p className="text-xs text-gray-400">Uploading...</p>}
            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
            <p className="text-xs text-gray-400">{profile.email}</p>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600">First Name</Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="mt-1 border-gray-200 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Last Name</Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="mt-1 border-gray-200 h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Company</Label>
              <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} className="mt-1 border-gray-200 h-8 text-sm" />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 gap-1.5">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
