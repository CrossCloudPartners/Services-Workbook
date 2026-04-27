import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Country } from '../../types/index';
import { supabase } from '../../lib/supabase';

interface Props {
  tenantId: string;
  countries: Country[];
  onUpdated: () => void;
}

export default function CountriesTab({ tenantId, countries, onUpdated }: Props) {
  const [newName, setNewName] = useState('');
  const [newId, setNewId] = useState('');
  const [newCurrency, setNewCurrency] = useState('');

  async function addCountry() {
    if (!newName.trim() || !newId.trim() || !newCurrency.trim()) return;
    await supabase.from('countries').insert({
      id: newId.toLowerCase().trim(),
      tenant_id: tenantId,
      name: newName.trim(),
      currency: newCurrency.toUpperCase().trim(),
    });
    setNewName('');
    setNewId('');
    setNewCurrency('');
    onUpdated();
  }

  async function deleteCountry(id: string) {
    await supabase.from('countries').delete().eq('id', id).eq('tenant_id', tenantId);
    onUpdated();
  }

  async function updateCountry(id: string, field: 'name' | 'currency', value: string) {
    await supabase.from('countries').update({ [field]: value }).eq('id', id).eq('tenant_id', tenantId);
    onUpdated();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Countries</h2>

      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Country Name</th>
                <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Currency</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {countries.map((c) => (
                <tr key={c.id + c.tenant_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2 text-xs text-gray-500 uppercase">{c.id}</td>
                  <td className="px-3 py-2">
                    <Input
                      value={c.name}
                      onChange={(e) => updateCountry(c.id, 'name', e.target.value)}
                      className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={c.currency}
                      onChange={(e) => updateCountry(c.id, 'currency', e.target.value.toUpperCase())}
                      maxLength={3}
                      className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm w-20 uppercase"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button onClick={() => deleteCountry(c.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {/* Add row */}
              <tr className="border-t border-gray-100 bg-blue-50/30">
                <td className="px-4 py-2">
                  <Input
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="us"
                    maxLength={5}
                    className="h-7 border-gray-200 text-sm w-16 uppercase"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Country name"
                    className="h-7 border-gray-200 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addCountry()}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                    placeholder="USD"
                    maxLength={3}
                    className="h-7 border-gray-200 text-sm w-20 uppercase"
                  />
                </td>
                <td className="px-2 py-2">
                  <Button size="sm" onClick={addCountry} disabled={!newName || !newId || !newCurrency} className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
