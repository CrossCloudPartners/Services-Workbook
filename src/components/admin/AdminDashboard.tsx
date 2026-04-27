import { useState, useEffect } from 'react';
import { Users, Briefcase, Activity, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import { ActivityLog } from '../../types/index';

interface Stats {
  totalUsers: number;
  totalProjects: number;
  activeUsers: number;
  totalPOs: number;
}

interface Props {
  tenantId: string;
}

export default function AdminDashboard({ tenantId }: Props) {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalProjects: 0, activeUsers: 0, totalPOs: 0 });
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  async function loadData() {
    setLoading(true);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [usersRes, projectsRes, activeRes, posRes, activityRes] = await Promise.all([
      supabase.from('users').select('uid', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('users').select('uid', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('last_login', yesterday),
      supabase.from('project_pos').select('id', { count: 'exact', head: true })
        .in('project_id', (await supabase.from('projects').select('id').eq('tenant_id', tenantId)).data?.map((p) => p.id) ?? []),
      supabase.from('activity_logs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(20),
    ]);

    setStats({
      totalUsers: usersRes.count ?? 0,
      totalProjects: projectsRes.count ?? 0,
      activeUsers: activeRes.count ?? 0,
      totalPOs: posRes.count ?? 0,
    });
    setActivity((activityRes.data as ActivityLog[]) ?? []);
    setLoading(false);
  }

  const chartData = [
    { month: 'Jan', users: 2, projects: 5 },
    { month: 'Feb', users: 4, projects: 9 },
    { month: 'Mar', users: 5, projects: 12 },
    { month: 'Apr', users: stats.totalUsers, projects: stats.totalProjects },
  ];

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, bg: 'bg-blue-50', color: 'text-blue-600', trend: '' },
    { label: 'Total Projects', value: stats.totalProjects, icon: Briefcase, bg: 'bg-purple-50', color: 'text-purple-600', trend: '' },
    { label: 'Active (24h)', value: stats.activeUsers, icon: Activity, bg: 'bg-amber-50', color: 'text-amber-600', trend: '' },
    { label: 'Total POs', value: stats.totalPOs, icon: TrendingUp, bg: 'bg-green-50', color: 'text-green-600', trend: '' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 text-sm">Tenant overview and activity</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 border border-green-200 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Optimal
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="border-none shadow-sm bg-white rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '—' : card.value}</p>
                </div>
                <div className={`${card.bg} p-2 rounded-lg`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Growth chart + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-gray-200 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-900">Growth Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradProjects" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="users" name="Users" stroke="#3b82f6" strokeWidth={2} fill="url(#gradUsers)" />
                  <Area type="monotone" dataKey="projects" name="Projects" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradProjects)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.slice(0, 8).map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">{log.action}</p>
                  <p className="text-[10px] text-gray-400">{log.user_name} · {new Date(log.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No activity yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
