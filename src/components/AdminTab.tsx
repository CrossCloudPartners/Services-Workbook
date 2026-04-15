import { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Settings, 
  LayoutTemplate, 
  BarChart3, 
  Search, 
  MoreVertical, 
  Mail, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Briefcase,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Key,
  Plus,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile, PlatformStats, GlobalSettings, ProjectTemplate, ActivityLog } from '../types';
import { db, auth } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { cn } from '@/lib/utils';

interface Props {
  globalSettings: GlobalSettings;
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void;
  currentUser: any;
  activeSubTab: string;
}

export default function AdminTab({ globalSettings, updateGlobalSettings, currentUser, activeSubTab }: Props) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalProjects: 0,
    activeUsers24h: 0,
    growthRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const userList = snapshot.docs.map(doc => doc.data() as UserProfile);
          setUsers(userList);
          
          // Calculate basic stats
          const totalUsers = userList.length;
          const active24h = userList.filter(u => {
            if (!u.lastLogin) return false;
            const lastLogin = new Date(u.lastLogin);
            const now = new Date();
            return (now.getTime() - lastLogin.getTime()) < (24 * 60 * 60 * 1000);
          }).length;

          setStats(prev => ({
            ...prev,
            totalUsers,
            activeUsers24h: active24h
          }));
        });
        return unsubscribe;
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    const fetchProjectStats = async () => {
      try {
        const q = query(collection(db, 'projects'));
        const snapshot = await getDocs(q);
        const totalProjects = snapshot.size;

        setStats(prev => ({
          ...prev,
          totalProjects
        }));
      } catch (err) {
        console.error('Error fetching project stats:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchActivityLogs = () => {
      try {
        const q = query(
          collection(db, 'activity_logs'),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ActivityLog));
          setActivityLogs(logs);
        });
        return unsubscribe;
      } catch (err) {
        console.error('Error fetching activity logs:', err);
      }
    };

    fetchUsers();
    fetchProjectStats();
    const unsubscribeLogs = fetchActivityLogs();
    
    return () => {
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, []);

  const handleUpdateUserRole = async (uid: string, newRole: 'admin' | 'user') => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: newRole });
    } catch (err) {
      console.error('Error updating user role:', err);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset email sent to ${email}`);
    } catch (err) {
      console.error('Error sending reset email:', err);
      alert('Failed to send reset email.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Administration</h2>
          <p className="text-gray-500">Manage platform settings, users, and monitor growth.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Activity className="w-4 h-4" />
            System Health: <span className="text-green-600 font-bold">Optimal</span>
          </Button>
        </div>
      </div>
      
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Users</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.totalUsers}</h3>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-green-600 text-xs font-bold">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>12% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Projects</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.totalProjects}</h3>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-green-600 text-xs font-bold">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>8% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active (24h)</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.activeUsers24h}</h3>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Activity className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-amber-600 text-xs font-bold">
                  <TrendingUp className="w-3 h-3" />
                  <span>Stable activity</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Growth Rate</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.growthRate}%</h3>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-green-600 text-xs font-bold">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>New metric</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Growth Overview</CardTitle>
                <CardDescription>Platform adoption and project creation over time.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center bg-gray-50 rounded-xl m-6 border border-dashed border-gray-200">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Growth chart visualization would go here.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest actions across the platform.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        log.type === 'user_registered' ? "bg-green-100" :
                        log.type === 'project_created' ? "bg-blue-100" :
                        log.type === 'project_deleted' ? "bg-red-100" :
                        "bg-gray-100"
                      )}>
                        {log.type === 'user_registered' ? <UserPlus className="w-4 h-4 text-green-600" /> :
                         log.type === 'project_created' ? <Plus className="w-4 h-4 text-blue-600" /> :
                         log.type === 'project_deleted' ? <Trash2 className="w-4 h-4 text-red-600" /> :
                         <Activity className="w-4 h-4 text-gray-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.description}</p>
                        <p className="text-xs text-gray-500">by {log.userName}</p>
                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activityLogs.length === 0 && (
                    <div className="py-8 text-center text-gray-400">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No recent activity found.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">User Management</CardTitle>
              <CardDescription>Manage user accounts, roles, and security.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search users..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-xs font-bold uppercase text-gray-500">User</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-gray-500">Company</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-gray-500">Role</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-gray-500">Joined</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{user.companyName}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] uppercase font-bold">
                        {user.role || 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Reset Password"
                          onClick={() => handleResetPassword(user.email)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title={user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                          onClick={() => handleUpdateUserRole(user.uid, user.role === 'admin' ? 'user' : 'admin')}
                          className={cn("text-gray-400", user.role === 'admin' ? "text-amber-600 hover:bg-amber-50" : "hover:text-blue-600")}
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeSubTab === 'metadata' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Global Rate Card Defaults</CardTitle>
              <CardDescription>Set the default roles and rates for new users.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">These settings will be applied to all new accounts upon registration.</p>
              <Button variant="outline" className="w-full gap-2">
                <Settings className="w-4 h-4" />
                Configure Global Rate Card
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Global Phases</CardTitle>
              <CardDescription>Manage the default project phases for the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {globalSettings.phases.map(phase => (
                  <div key={phase.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: phase.color }} />
                      <span className="text-sm font-medium">{phase.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Default</Badge>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 gap-2">
                <Settings className="w-4 h-4" />
                Edit Global Phases
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === 'templates' && (
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Global Project Templates</CardTitle>
              <CardDescription>Create and manage templates available to all users.</CardDescription>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="w-4 h-4" />
              New Global Template
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {globalSettings.templates?.map(template => (
                <Card key={template.id} className="border border-gray-100 hover:border-blue-200 transition-all group">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <LayoutTemplate className="w-5 h-5 text-blue-600" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold text-blue-600 border-blue-200">GLOBAL</Badge>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">{template.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2 h-8 mb-4">{template.description}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Used 24 times</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!globalSettings.templates || globalSettings.templates.length === 0) && (
                <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <LayoutTemplate className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400">No global templates defined yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
