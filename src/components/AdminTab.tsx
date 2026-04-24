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
  Clock,
  X
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserProfile, PlatformStats, GlobalSettings, ProjectTemplate, ActivityLog, Phase, RateCardEntry, SPWData } from '../types';
import { db, auth } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { ImageUploader } from './ImageUploader';

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
  const [isPhasesDialogOpen, setIsPhasesDialogOpen] = useState(false);
  const [editingPhases, setEditingPhases] = useState<Phase[]>([]);
  const [isCountriesDialogOpen, setIsCountriesDialogOpen] = useState(false);
  const [editingCountries, setEditingCountries] = useState<{ id: string; name: string; currency: string }[]>([]);
  const [isRateCardDialogOpen, setIsRateCardDialogOpen] = useState(false);
  const [editingRateCard, setEditingRateCard] = useState<RateCardEntry[]>([]);
  const [isNewTemplateDialogOpen, setIsNewTemplateDialogOpen] = useState(false);
  const [isImageUploaderOpen, setIsImageUploaderOpen] = useState(false);
  const [allProjects, setAllProjects] = useState<{id: string, name: string, data: SPWData}[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  useEffect(() => {
    setEditingRateCard(globalSettings.rateCard || []);
  }, [globalSettings.rateCard]);

  const handleSaveRateCard = () => {
    updateGlobalSettings({ rateCard: editingRateCard });
    setIsRateCardDialogOpen(false);
  };

  const handleAddRateCardEntry = () => {
    const newEntry: RateCardEntry = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'New Role',
      country: globalSettings.countries?.[0]?.name || 'Global',
      currency: globalSettings.countries?.[0]?.currency || 'USD',
      costRate: 0,
      billRate: 0
    };
    setEditingRateCard([...editingRateCard, newEntry]);
  };

  const handleRemoveRateCardEntry = (id: string) => {
    setEditingRateCard(editingRateCard.filter(e => e.id !== id));
  };

  const handleUpdateRateCardEntry = (id: string, updates: Partial<RateCardEntry>) => {
    setEditingRateCard(editingRateCard.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleCreateTemplate = () => {
    const project = allProjects.find(p => p.id === selectedProjectId);
    if (project && newTemplateName) {
      const newTemplate: ProjectTemplate = {
        id: Date.now().toString(),
        name: newTemplateName,
        description: newTemplateDescription,
        data: JSON.parse(JSON.stringify(project.data))
      };
      updateGlobalSettings({
        templates: [...(globalSettings.templates || []), newTemplate]
      });
      setIsNewTemplateDialogOpen(false);
      setSelectedProjectId('');
      setNewTemplateName('');
      setNewTemplateDescription('');
    }
  };

  useEffect(() => {
    setEditingPhases(globalSettings.phases);
  }, [globalSettings.phases]);

  const handleSaveCountries = () => {
    updateGlobalSettings({ ...globalSettings, countries: editingCountries });
    setIsCountriesDialogOpen(false);
  };

  const handleSavePhases = () => {
    updateGlobalSettings({ ...globalSettings, phases: editingPhases });
    setIsPhasesDialogOpen(false);
  };

  const handleAddCountry = () => {
    const newCountry = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Country',
      currency: 'USD'
    };
    setEditingCountries([...editingCountries, newCountry]);
  };

  const handleRemoveCountry = (id: string) => {
    setEditingCountries(editingCountries.filter(c => c.id !== id));
  };

  const handleUpdateCountry = (id: string, updates: Partial<{ name: string; currency: string }>) => {
    setEditingCountries(editingCountries.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleAddPhase = () => {
    const newPhase: Phase = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Phase',
      color: '#94A3B8'
    };
    setEditingPhases([...editingPhases, newPhase]);
  };

  const handleRemovePhase = (id: string) => {
    setEditingPhases(editingPhases.filter(p => p.id !== id));
  };

  const handleUpdatePhase = (id: string, updates: Partial<Phase>) => {
    setEditingPhases(editingPhases.map(p => p.id === id ? { ...p, ...updates } : p));
  };

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
        
        const projectList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as any));
        setAllProjects(projectList);

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
    console.log('Sending password reset email to:', email);
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset email sent to ${email}`);
    } catch (err: any) {
      console.error('Error sending reset email:', err);
      alert(`Failed to send reset email: ${err.message}`);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm('Are you sure you want to delete this global template?')) {
      const updatedTemplates = (globalSettings.templates || []).filter(t => t.id !== id);
      updateGlobalSettings({ templates: updatedTemplates });
    }
  };

  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);

  const handleSetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;
    try {
      const response = await fetch('/api/admin/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: resetPasswordUser.uid, newPassword }),
      });
      if (!response.ok) throw new Error('Failed to update password');
      alert('Password updated successfully');
      setIsResetPasswordDialogOpen(false);
      setNewPassword('');
      setResetPasswordUser(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update password');
    }
  };

  const handleSaveTemplateEdit = () => {
    if (editingTemplate) {
      const updatedTemplates = (globalSettings.templates || []).map(t => 
        t.id === editingTemplate.id ? editingTemplate : t
      );
      updateGlobalSettings({ templates: updatedTemplates });
      setEditingTemplate(null);
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
              <CardContent className="h-[300px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Jan', users: 10, projects: 5 },
                    { name: 'Feb', users: 20, projects: 12 },
                    { name: 'Mar', users: 45, projects: 25 },
                    { name: 'Apr', users: stats.totalUsers, projects: stats.totalProjects },
                  ]}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                    <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
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
                  <TableHead className="text-xs font-bold uppercase text-gray-500">Last Login</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={user.photoURL} alt={`${user.firstName} ${user.lastName}`} referrerPolicy="no-referrer" />
                          <AvatarFallback className="bg-blue-600 text-white text-[10px] font-bold">
                            {user.firstName[0]}{user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{user.companyName}</TableCell>
                    <TableCell>
                      <Select 
                        value={user.role || 'user'} 
                        onValueChange={(value) => handleUpdateUserRole(user.uid, value as 'admin' | 'user')}
                        disabled={user.uid === auth.currentUser?.uid}
                      >
                        <SelectTrigger className={cn(
                          "w-[90px] h-6 text-[10px] uppercase font-bold border-none focus:ring-0 px-2",
                          user.role === 'admin' 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user" className="text-[10px] uppercase font-bold">User</SelectItem>
                          <SelectItem value="admin" className="text-[10px] uppercase font-bold">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : (
                        <span className="text-gray-300 italic">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Set Password"
                          onClick={() => {
                            setResetPasswordUser(user);
                            setIsResetPasswordDialogOpen(true);
                          }}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Send Password Reset Email"
                          onClick={() => handleResetPassword(user.email)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <Mail className="w-4 h-4" />
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
              
              <div className="mb-4 overflow-hidden rounded-lg border border-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="text-[10px] font-bold uppercase">Role</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Country</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-right">Cost</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-right">Bill</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalSettings.rateCard?.slice(0, 3).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm font-medium">{entry.role}</TableCell>
                        <TableCell className="text-sm text-gray-500">{entry.country}</TableCell>
                        <TableCell className="text-sm text-right text-gray-600">${entry.costRate}</TableCell>
                        <TableCell className="text-sm text-right text-gray-700 font-bold">${entry.billRate}</TableCell>
                      </TableRow>
                    ))}
                    {(!globalSettings.rateCard || globalSettings.rateCard.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-gray-400 py-4">No rates defined</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {globalSettings.rateCard && globalSettings.rateCard.length > 3 && (
                  <div className="p-2 text-[10px] text-center text-gray-500 bg-gray-50 border-t border-gray-100">
                    + {globalSettings.rateCard.length - 3} more entries
                  </div>
                )}
              </div>

              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => setIsRateCardDialogOpen(true)}
              >
                <Settings className="w-4 h-4" />
                Configure Global Rate Card
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Global Countries</CardTitle>
              <CardDescription>Manage currencies and countries for the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {globalSettings.countries?.map(country => (
                  <div key={country.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-sm font-medium">{country.name}</span>
                    <Badge variant="outline" className="text-[10px]">{country.currency}</Badge>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4 gap-2"
                onClick={() => {
                  setEditingCountries(globalSettings.countries || []);
                  setIsCountriesDialogOpen(true);
                }}
              >
                <Settings className="w-4 h-4" />
                Edit Global Countries
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
              <Button 
                variant="outline" 
                className="w-full mt-4 gap-2"
                onClick={() => {
                  setEditingPhases(globalSettings.phases);
                  setIsPhasesDialogOpen(true);
                }}
              >
                <Settings className="w-4 h-4" />
                Edit Global Phases
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg">AI Agent Settings</CardTitle>
              <CardDescription>Configure AI Agent capabilities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Profile Image</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 rounded-full border border-gray-100">
                    <AvatarImage src={globalSettings.aiAgentSettings?.profileImageURL} alt="Agent" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" onClick={() => setIsImageUploaderOpen(true)}>Change Image</Button>
                </div>
              </div>
              <ImageUploader 
                isOpen={isImageUploaderOpen} 
                onClose={() => setIsImageUploaderOpen(false)} 
                onUpload={(url) => updateGlobalSettings({ 
                  aiAgentSettings: { ...globalSettings.aiAgentSettings, profileImageURL: url } 
                })} 
              />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Model API Key</Label>
                <Input 
                  type="password"
                  value={globalSettings.aiAgentSettings?.apiKey || ''}
                  onChange={(e) => updateGlobalSettings({ 
                    aiAgentSettings: { ...globalSettings.aiAgentSettings, apiKey: e.target.value } 
                  })}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Persona Prompt</Label>
                <textarea 
                  className="w-full min-h-[200px] p-3 text-sm rounded-xl border border-gray-200"
                  value={globalSettings.aiAgentSettings?.personaPrompt || `You are an expert services pricing specialist assistant for CrossCloud Partners. 
Your goal is to help users build accurate and competitive pricing proposals. 

Guidelines:
1. Always analyze project scope rigorously. 
2. Be professional, data-driven, and concise.
3. If unsure about pricing calculations, explain the methodology and ask for input.
4. Maintain a helpful and collaborative tone.
5. Focus on margin optimization and feasibility.
6. When referencing project templates, highlight their best practices.
7. Always base your advice on the financial constraints provided.`}
                  onChange={(e) => updateGlobalSettings({ 
                    aiAgentSettings: { ...globalSettings.aiAgentSettings, personaPrompt: e.target.value } 
                  })}
                  placeholder="Define how the AI should behave..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={isPhasesDialogOpen} onOpenChange={setIsPhasesDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Global Phases</DialogTitle>
            <DialogDescription>
              Configure the default phases available for all projects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto pr-2">
            {editingPhases.map((phase, index) => (
              <div key={phase.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                <div className="flex-none w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-xs font-bold text-gray-400">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <Input 
                    value={phase.name}
                    onChange={(e) => handleUpdatePhase(phase.id, { name: e.target.value })}
                    className="h-8 text-sm font-medium border-none bg-transparent focus-visible:ring-0 p-0"
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={phase.color}
                      onChange={(e) => handleUpdatePhase(phase.id, { color: e.target.value })}
                      className="w-4 h-4 rounded-full border-none p-0 cursor-pointer overflow-hidden"
                    />
                    <span className="text-[10px] text-gray-400 font-mono uppercase">{phase.color}</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                  onClick={() => handleRemovePhase(phase.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full border-dashed border-2 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all gap-2"
              onClick={handleAddPhase}
            >
              <Plus className="w-4 h-4" />
              Add New Phase
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPhasesDialogOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSavePhases}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isCountriesDialogOpen} onOpenChange={setIsCountriesDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Global Countries</DialogTitle>
            <DialogDescription>
              Configure the available countries and their default currencies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto pr-2">
            {editingCountries.map((country, index) => (
              <div key={country.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                <div className="flex-1 space-y-1">
                  <Input 
                    value={country.name}
                    onChange={(e) => handleUpdateCountry(country.id, { name: e.target.value })}
                    className="h-8 text-sm font-medium border-none bg-transparent focus-visible:ring-0 p-0"
                    placeholder="Country Name"
                  />
                  <Input 
                    value={country.currency}
                    onChange={(e) => handleUpdateCountry(country.id, { currency: e.target.value })}
                    className="h-6 text-[10px] font-mono uppercase bg-white border border-gray-200"
                    placeholder="Currency (e.g., USD)"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                  onClick={() => handleRemoveCountry(country.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full border-dashed border-2 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all gap-2"
              onClick={handleAddCountry}
            >
              <Plus className="w-4 h-4" />
              Add New Country
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCountriesDialogOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveCountries}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Global Template</DialogTitle>
            <DialogDescription>
              Update the name and description of this global template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input 
                value={editingTemplate?.name || ''}
                onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea 
                className="w-full min-h-[100px] p-3 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={editingTemplate?.description || ''}
                onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, description: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveTemplateEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRateCardDialogOpen} onOpenChange={setIsRateCardDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Global Rate Card Defaults</DialogTitle>
            <DialogDescription>
              Configure the default roles and rates for the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Cost Rate</TableHead>
                  <TableHead>Bill Rate</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editingRateCard.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Input 
                        value={entry.role}
                        onChange={(e) => handleUpdateRateCardEntry(entry.id, { role: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={entry.country}
                        onValueChange={(v) => handleUpdateRateCardEntry(entry.id, { country: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {globalSettings.countries?.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                          <SelectItem value="Global">Global</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number"
                        value={entry.costRate}
                        onChange={(e) => handleUpdateRateCardEntry(entry.id, { costRate: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-xs w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number"
                        value={entry.billRate}
                        onChange={(e) => handleUpdateRateCardEntry(entry.id, { billRate: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-xs w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                        onClick={() => handleRemoveRateCardEntry(entry.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button 
              variant="outline" 
              className="w-full mt-4 border-dashed"
              onClick={handleAddRateCardEntry}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRateCardDialogOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveRateCard}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewTemplateDialogOpen} onOpenChange={setIsNewTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Global Template</DialogTitle>
            <DialogDescription>
              Create a new template from an existing project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Source Project</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {allProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input 
                placeholder="e.g., Standard Implementation"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea 
                className="w-full min-h-[100px] p-3 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Describe the purpose of this template..."
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTemplateDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={handleCreateTemplate}
              disabled={!selectedProjectId || !newTemplateName}
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeSubTab === 'templates' && (
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Global Project Templates</CardTitle>
              <CardDescription>Create and manage templates available to all users.</CardDescription>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={() => setIsNewTemplateDialogOpen(true)}
            >
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
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Template ID: {template.id.substring(0, 8)}</span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-400 hover:text-blue-600"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-400 hover:text-red-600"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
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
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set New Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordUser?.firstName} {resetPasswordUser?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSetPassword}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
