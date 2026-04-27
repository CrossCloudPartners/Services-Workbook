import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RateCardEntry, Country } from '../../types/index';
import { supabase } from '../../lib/supabase';

const ROLE_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

interface Props {
  tenantId: string;
  rateCard: RateCardEntry[];
  countries: Country[];
  onUpdated: () => void;
}

export default function RateCardTab({ tenantId, rateCard, countries, onUpdated }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);

  const roles = [...new Set(rateCard.map((r) => r.role))];

  function toggleRole(role: string) {
    setCollapsed((prev) => ({ ...prev, [role]: !prev[role] }));
  }

  function getRoleEntries(role: string) {
    return rateCard.filter((r) => r.role === role);
  }

  function getRoleColor(role: string) {
    return rateCard.find((r) => r.role === role)?.color ?? '#9CA3AF';
  }

  async function addRole() {
    if (!newRole.trim()) return;
    setSaving(true);
    const first = countries[0];
    if (first) {
      await supabase.from('rate_cards').insert({
        tenant_id: tenantId,
        role: newRole.trim(),
        country: first.name,
        currency: first.currency,
        cost_rate: 0,
        bill_rate: 0,
        color: ROLE_COLORS[roles.length % ROLE_COLORS.length],
      });
    }
    setNewRole('');
    setSaving(false);
    onUpdated();
  }

  async function addCountryToRole(role: string) {
    const existing = rateCard.filter((r) => r.role === role).map((r) => r.country);
    const available = countries.filter((c) => !existing.includes(c.name));
    if (!available.length) return;
    const country = available[0];
    await supabase.from('rate_cards').insert({
      tenant_id: tenantId,
      role,
      country: country.name,
      currency: country.currency,
      cost_rate: 0,
      bill_rate: 0,
      color: getRoleColor(role),
    });
    onUpdated();
  }

  async function updateEntry(id: string, field: keyof RateCardEntry, value: string | number) {
    await supabase.from('rate_cards').update({ [field]: value }).eq('id', id);
    onUpdated();
  }

  async function deleteEntry(id: string) {
    await supabase.from('rate_cards').delete().eq('id', id);
    onUpdated();
  }

  async function deleteRole(role: string) {
    if (!window.confirm(`Delete all rate entries for "${role}"?`)) return;
    await supabase.from('rate_cards').delete().eq('tenant_id', tenantId).eq('role', role);
    onUpdated();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Rate Card</h2>
        <div className="flex items-center gap-2">
          <Input
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="New role name"
            className="w-44 h-8 text-sm border-gray-200"
            onKeyDown={(e) => e.key === 'Enter' && addRole()}
          />
          <Button size="sm" onClick={addRole} disabled={saving || !newRole.trim()} className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" /> Add Role
          </Button>
        </div>
      </div>

      {roles.length === 0 && (
        <Card className="border border-gray-200 rounded-2xl shadow-sm">
          <CardContent className="py-16 text-center text-sm text-gray-400">
            No rate card entries yet. Add a role to get started.
          </CardContent>
        </Card>
      )}

      {roles.map((role) => {
        const entries = getRoleEntries(role);
        const color = getRoleColor(role);
        const isCollapsed = collapsed[role];
        return (
          <Card key={role} className="border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="pb-0 pt-3 px-4">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleRole(role)} className="flex items-center gap-2 flex-1 text-left">
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-semibold text-gray-900 text-sm">{role}</span>
                  <span className="text-xs text-gray-400">{entries.length} countr{entries.length !== 1 ? 'ies' : 'y'}</span>
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />}
                </button>
                <Button variant="ghost" size="sm" onClick={() => addCountryToRole(role)} className="h-7 text-xs text-blue-600 hover:bg-blue-50 gap-1">
                  <Plus className="w-3 h-3" /> Country
                </Button>
                <button onClick={() => deleteRole(role)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            {!isCollapsed && (
              <CardContent className="pt-2 pb-0 px-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Country</th>
                      <th className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">CCY</th>
                      <th className="text-right px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Cost Rate/hr</th>
                      <th className="text-right px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Bill Rate/hr</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-2">
                          <Select value={entry.country} onValueChange={(v) => {
                            const c = countries.find((c) => c.name === v);
                            updateEntry(entry.id, 'country', v);
                            if (c) updateEntry(entry.id, 'currency', c.currency);
                          }}>
                            <SelectTrigger className="h-7 text-xs border-gray-200 w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{entry.currency}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={entry.cost_rate}
                            onChange={(e) => updateEntry(entry.id, 'cost_rate', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs border-gray-200 w-24 text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={entry.bill_rate}
                            onChange={(e) => updateEntry(entry.id, 'bill_rate', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs border-gray-200 w-24 text-right"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => deleteEntry(entry.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
