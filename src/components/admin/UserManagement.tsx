import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { UserProfile } from '../../types/index';
import { supabase } from '../../lib/supabase';

interface Props {
  tenantId: string;
  currentUserId: string;
}

export default function UserManagement({ tenantId, currentUserId }: Props) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [tenantId]);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').eq('tenant_id', tenantId).order('created_at');
    setUsers((data as UserProfile[]) ?? []);
    setLoading(false);
  }

  async function changeRole(uid: string, role: 'admin' | 'user') {
    await supabase.from('users').update({ role }).eq('uid', uid);
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">User Management</h2>

      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Last Login</th>
                <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">Loading...</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.uid} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          {user.photo_url && <AvatarImage src={user.photo_url} />}
                          <AvatarFallback className="text-xs font-bold bg-blue-100 text-blue-700">
                            {user.first_name[0]}{user.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-400">{user.company_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{user.email}</td>
                    <td className="px-3 py-3">
                      {user.uid === currentUserId ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">{user.role}</Badge>
                      ) : (
                        <Select value={user.role} onValueChange={(v) => changeRole(user.uid, v as 'admin' | 'user')}>
                          <SelectTrigger className="h-7 text-xs border-gray-200 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
