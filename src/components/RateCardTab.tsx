import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RateCardEntry } from '../types';
import { CreditCard, Plus, Trash2, Globe, Languages, ChevronRight, ArrowLeft, Users, LayoutGrid, List, Pipette, RotateCcw, Pencil, Palette } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { PALETTES } from '../constants';

interface Props {
  data: RateCardEntry[];
  countries: { id: string; name: string; currency: string }[];
  updateData: (card: RateCardEntry[]) => void;
  updateCountries: (countries: { id: string; name: string; currency: string }[]) => void;
  onRenameRole?: (oldName: string, newName: string, updatedRateCard: RateCardEntry[]) => void;
  initialShowCountriesMeta?: boolean;
}

export default function RateCardTab({ data, countries, updateData, updateCountries, onRenameRole, initialShowCountriesMeta = false }: Props) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isEditingRoleName, setIsEditingRoleName] = useState(false);
  const [editingRoleNameValue, setEditingRoleNameValue] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showCountriesMeta, setShowCountriesMeta] = useState(initialShowCountriesMeta);
  const [newRoleName, setNewRoleName] = useState('');
  const [newCountry, setNewCountry] = useState({ name: '', currency: 'USD' });
  const [newRate, setNewRate] = useState<Partial<RateCardEntry>>({
    country: '',
    currency: 'USD',
    costRate: 0,
    billRate: 0,
  });
  const [filterCountry, setFilterCountry] = useState<string>('All');
  const [filterCurrency, setFilterCurrency] = useState<string>('All');

  // Group data by role
  const roles = useMemo(() => {
    const roleMap = new Map<string, RateCardEntry[]>();
    data.forEach(entry => {
      if (!roleMap.has(entry.role)) {
        roleMap.set(entry.role, []);
      }
      roleMap.get(entry.role)!.push(entry);
    });
    return Array.from(roleMap.entries()).map(([name, entries]) => ({
      name,
      entries: [...entries].sort((a, b) => a.country.localeCompare(b.country)),
      countriesCount: entries.length,
      color: entries[0]?.color || 'transparent'
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const handleUpdateRoleColor = (roleName: string, color: string) => {
    const updatedData = data.map(entry => 
      entry.role === roleName ? { ...entry, color } : entry
    );
    updateData(updatedData);
  };

  const handleAddRole = () => {
    if (!newRoleName || roles.some(r => r.name === newRoleName)) return;
    
    // Automatically create entries for all countries in metadata
    const newEntries: RateCardEntry[] = countries.map(c => ({
      id: Math.random().toString(36).substr(2, 9),
      role: newRoleName,
      country: c.name,
      currency: c.currency,
      costRate: 0,
      billRate: 0
    }));

    updateData([...data, ...newEntries]);
    setSelectedRole(newRoleName);
    setNewRoleName('');
  };

  const handleAddCountryMeta = () => {
    if (!newCountry.name) return;
    const id = Math.random().toString(36).substr(2, 9);
    updateCountries([...countries, { id, ...newCountry }]);
    setNewCountry({ name: '', currency: 'USD' });
  };

  const handleRemoveCountryMeta = (id: string) => {
    updateCountries(countries.filter(c => c.id !== id));
  };

  const handleAddRate = () => {
    if (!selectedRole || !newRate.country) return;
    updateData([
      ...data,
      {
        ...newRate as RateCardEntry,
        id: Math.random().toString(36).substr(2, 9),
        role: selectedRole,
      }
    ]);
    setNewRate({ country: '', currency: 'USD', costRate: 0, billRate: 0 });
  };

  const handleAddAllCountries = () => {
    if (!selectedRole) return;
    
    const existingCountries = selectedRoleData?.entries.map(e => e.country) || [];
    const missingCountries = countries.filter(c => !existingCountries.includes(c.name));
    
    if (missingCountries.length === 0) return;

    const newEntries: RateCardEntry[] = missingCountries.map(c => ({
      id: Math.random().toString(36).substr(2, 9),
      role: selectedRole,
      country: c.name,
      currency: c.currency,
      costRate: 0,
      billRate: 0
    }));

    updateData([...data, ...newEntries]);
  };

  const handleRemoveRate = (id: string) => {
    updateData(data.filter(e => e.id !== id));
  };

  const handleEditRate = (id: string, field: keyof RateCardEntry, value: any) => {
    updateData(data.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleRenameRole = () => {
    if (!selectedRole || !editingRoleNameValue || editingRoleNameValue === selectedRole) {
      setIsEditingRoleName(false);
      return;
    }

    if (roles.some(r => r.name === editingRoleNameValue)) {
      alert('A role with this name already exists.');
      return;
    }

    const oldName = selectedRole;
    const newName = editingRoleNameValue;

    const updatedData = data.map(entry => 
      entry.role === oldName ? { ...entry, role: newName } : entry
    );

    if (onRenameRole) {
      onRenameRole(oldName, newName, updatedData);
    } else {
      updateData(updatedData);
    }
    setSelectedRole(newName);
    setIsEditingRoleName(false);
  };

  const handleApplyPalette = (paletteColors: string[]) => {
    const roleNames = roles.map(r => r.name);
    const roleColorMap = new Map<string, string>();
    
    roleNames.forEach((name, index) => {
      roleColorMap.set(name, paletteColors[index % paletteColors.length]);
    });

    const updatedData = data.map(entry => ({
      ...entry,
      color: roleColorMap.get(entry.role) || 'transparent'
    }));
    
    updateData(updatedData);
  };

  const startEditingRoleName = () => {
    if (selectedRole) {
      setEditingRoleNameValue(selectedRole);
      setIsEditingRoleName(true);
    }
  };

  const selectedRoleData = roles.find(r => r.name === selectedRole);

  const filteredEntries = useMemo(() => {
    return data.filter(entry => {
      const matchCountry = filterCountry === 'All' || entry.country === filterCountry;
      const matchCurrency = filterCurrency === 'All' || entry.currency === filterCurrency;
      return matchCountry && matchCurrency;
    }).sort((a, b) => a.role.localeCompare(b.role) || a.country.localeCompare(b.country));
  }, [data, filterCountry, filterCurrency]);

  const uniqueCountries = useMemo(() => {
    const set = new Set(data.map(e => e.country));
    return Array.from(set).sort();
  }, [data]);

  const uniqueCurrencies = useMemo(() => {
    const set = new Set(data.map(e => e.currency));
    return Array.from(set).sort();
  }, [data]);

  if (showCountriesMeta) {
    return (
      <div id="countries-meta-view" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4">
          <Button id="btn-back-to-rates" variant="ghost" size="sm" onClick={() => setShowCountriesMeta(false)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Rates
          </Button>
          <div className="h-4 w-px bg-gray-200" />
          <h2 id="countries-meta-title" className="text-xl font-bold">Global Countries Metadata</h2>
        </div>

        <Card id="card-add-country" className="border-gray-200 shadow-sm">
          <CardHeader id="header-add-country" className="pb-3">
            <CardTitle id="title-add-country" className="text-sm font-bold uppercase text-gray-500 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add New Country to Metadata
            </CardTitle>
            <CardDescription id="desc-add-country">Countries added here will be automatically included in all new roles.</CardDescription>
          </CardHeader>
        <CardContent id="content-add-country">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="grid gap-2 flex-1">
              <Label id="label-country-name" className="text-xs font-bold uppercase text-gray-500">Country Name</Label>
              <Input
                id="input-country-name"
                value={newCountry.name}
                onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
                placeholder="e.g. Germany"
                className="border-gray-300"
              />
            </div>
            <div className="grid gap-2 w-full sm:w-32">
              <Label id="label-country-currency" className="text-xs font-bold uppercase text-gray-500">Currency</Label>
              <Input
                id="input-country-currency"
                value={newCountry.currency}
                onChange={(e) => setNewCountry({ ...newCountry, currency: e.target.value.toUpperCase() })}
                placeholder="USD"
                className="border-gray-300"
                maxLength={3}
              />
            </div>
            <div className="flex items-end">
              <Button id="btn-add-country" onClick={handleAddCountryMeta} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs h-10 px-8">
                Add Country
              </Button>
            </div>
          </div>
        </CardContent>
        </Card>

        <Card id="card-countries-list" className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent id="content-countries-list" className="p-0">
            <Table id="table-countries-meta">
              <TableHeader id="header-countries-meta" className="bg-gray-50/50">
                <TableRow id="row-header-countries-meta">
                  <TableHead id="head-country-name" className="text-xs font-bold uppercase text-gray-500">Country</TableHead>
                  <TableHead id="head-country-currency" className="text-xs font-bold uppercase text-gray-500">Default Currency</TableHead>
                  <TableHead id="head-country-actions" className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody id="body-countries-meta">
                {countries.map((c) => (
                  <TableRow id={`row-country-${c.id}`} key={c.id}>
                    <TableCell id={`cell-country-name-${c.id}`} className="font-medium">{c.name}</TableCell>
                    <TableCell id={`cell-country-currency-${c.id}`}>{c.currency}</TableCell>
                    <TableCell id={`cell-country-actions-${c.id}`}>
                      <Button
                        id={`btn-remove-country-${c.id}`}
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCountryMeta(c.id)}
                        className="text-gray-300 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedRole) {
    return (
      <div id="role-detail-view" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
            <Button id="btn-back-to-roles" variant="ghost" size="sm" onClick={() => setSelectedRole(null)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Roles
            </Button>
            <div className="h-4 w-px bg-gray-200" />
            {isEditingRoleName ? (
              <div className="flex items-center gap-2">
                <Input
                  id="input-rename-role"
                  value={editingRoleNameValue}
                  onChange={(e) => setEditingRoleNameValue(e.target.value)}
                  className="h-8 w-64 font-bold text-lg"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameRole();
                    if (e.key === 'Escape') setIsEditingRoleName(false);
                  }}
                />
                <Button id="btn-save-role-rename" size="sm" onClick={handleRenameRole} className="bg-green-600 hover:bg-green-700 h-8">Save</Button>
                <Button id="btn-cancel-role-rename" size="sm" variant="ghost" onClick={() => setIsEditingRoleName(false)} className="h-8">Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 id="selected-role-title" className="text-xl font-bold">{selectedRole}</h2>
                <Button 
                  id="btn-edit-role-name" 
                  variant="ghost" 
                  size="icon" 
                  onClick={startEditingRoleName}
                  className="h-8 w-8 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            )}
            <Badge id="badge-countries-count" variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
              {selectedRoleData?.countriesCount || 0} Countries
            </Badge>
            
            <div id="role-color-picker-container" className="flex items-center gap-3 ml-4 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
              <span id="label-row-highlight" className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1.5">
                <Pipette className="w-3.5 h-3.5 text-blue-600" />
                Row Highlight:
              </span>
              <div className="flex items-center gap-2">
                <div id="color-picker-wrapper" className="relative w-8 h-8 rounded-md border border-gray-300 overflow-hidden shadow-inner group">
                  <input
                    id="input-role-color"
                    type="color"
                    value={selectedRoleData?.color && selectedRoleData.color !== 'transparent' ? selectedRoleData.color : '#ffffff'}
                    onChange={(e) => handleUpdateRoleColor(selectedRole, e.target.value)}
                    className="absolute -inset-2 w-[200%] h-[200%] cursor-pointer"
                  />
                </div>
                {selectedRoleData?.color && selectedRoleData.color !== 'transparent' && (
                  <Button 
                    id="btn-clear-role-color"
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleUpdateRoleColor(selectedRole, 'transparent')}
                    className="h-8 px-2 text-gray-400 hover:text-red-500 hover:bg-red-50 gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Clear</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Card id="card-add-rate" className="border-gray-200 shadow-sm">
          <CardHeader id="header-add-rate" className="pb-3">
            <CardTitle id="title-add-rate" className="text-sm font-bold uppercase text-gray-500 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add Country Rate
            </CardTitle>
          </CardHeader>
          <CardContent id="content-add-rate">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="grid gap-2 lg:col-span-2">
                <Label id="label-rate-country" htmlFor="country" className="text-xs font-bold uppercase text-gray-500">Country</Label>
                <Input
                  id="country"
                  value={newRate.country}
                  onChange={(e) => setNewRate({ ...newRate, country: e.target.value })}
                  placeholder="e.g. United Kingdom"
                  className="border-gray-300"
                />
              </div>
              <div className="grid gap-2">
                <Label id="label-rate-currency" htmlFor="currency" className="text-xs font-bold uppercase text-gray-500">Currency</Label>
                <Input
                  id="currency"
                  value={newRate.currency}
                  onChange={(e) => setNewRate({ ...newRate, currency: e.target.value.toUpperCase() })}
                  placeholder="USD"
                  className="border-gray-300"
                  maxLength={3}
                />
              </div>
              <div className="grid gap-2">
                <Label id="label-rate-cost" htmlFor="costRate" className="text-xs font-bold uppercase text-gray-500">Cost Rate / Hr</Label>
                <Input
                  id="costRate"
                  type="number"
                  value={newRate.costRate === 0 ? '' : newRate.costRate}
                  onChange={(e) => setNewRate({ ...newRate, costRate: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="border-gray-300 focus:placeholder:text-transparent"
                />
              </div>
              <div className="grid gap-2">
                <Label id="label-rate-bill" htmlFor="billRate" className="text-xs font-bold uppercase text-gray-500">Bill Rate / Hr</Label>
                <Input
                  id="billRate"
                  type="number"
                  value={newRate.billRate === 0 ? '' : newRate.billRate}
                  onChange={(e) => setNewRate({ ...newRate, billRate: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="border-gray-300 focus:placeholder:text-transparent"
                />
              </div>
              <div className="flex items-end lg:col-span-5 gap-3">
                <Button id="btn-add-rate" onClick={handleAddRate} className="flex-1 sm:flex-none px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs h-10">
                  Add Rate for {selectedRole}
                </Button>
                <Button 
                  id="btn-add-all-countries" 
                  variant="outline"
                  onClick={handleAddAllCountries} 
                  className="flex-1 sm:flex-none border-blue-200 text-blue-600 hover:bg-blue-50 font-bold uppercase tracking-wider text-xs h-10 gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add All Countries
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="card-rates-list" className="border-gray-200 shadow-sm overflow-hidden">
          <CardHeader id="header-rates-list" className="bg-gray-50 border-b border-gray-200 py-4">
            <CardTitle id="title-rates-list" className="text-lg font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Country-Specific Rates
            </CardTitle>
          </CardHeader>
          <CardContent id="content-rates-list" className="p-0 overflow-x-auto">
            <Table id="table-rates-list" className="min-w-[600px] lg:min-w-full">
              <TableHeader id="header-rates-table" className="bg-gray-50/50">
                <TableRow id="row-header-rates">
                  <TableHead id="head-rate-country" className="text-xs font-bold uppercase text-gray-500">Country</TableHead>
                  <TableHead id="head-rate-currency" className="text-xs font-bold uppercase text-gray-500">Currency</TableHead>
                  <TableHead id="head-rate-cost" className="text-right text-xs font-bold uppercase text-gray-500">Cost Rate</TableHead>
                  <TableHead id="head-rate-bill" className="text-right text-xs font-bold uppercase text-gray-500">Bill Rate</TableHead>
                  <TableHead id="head-rate-margin" className="text-right text-xs font-bold uppercase text-gray-500">Margin %</TableHead>
                  <TableHead id="head-rate-actions" className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody id="body-rates-list">
                {selectedRoleData?.entries.map((entry) => (
                  <TableRow id={`row-rate-${entry.id}`} key={entry.id} className="hover:bg-gray-50/50 transition-colors group">
                    <TableCell id={`cell-rate-country-${entry.id}`}>
                      <div className="flex items-center gap-2 font-medium">
                        <Globe className="w-3 h-3 text-gray-400" />
                        <Input
                          id={`input-rate-country-${entry.id}`}
                          value={entry.country}
                          onChange={(e) => handleEditRate(entry.id, 'country', e.target.value)}
                          className="border-transparent hover:border-gray-200 focus:border-blue-500 bg-transparent h-8 w-48"
                        />
                      </div>
                    </TableCell>
                    <TableCell id={`cell-rate-currency-${entry.id}`}>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Languages className="w-3 h-3" />
                        <Input
                          id={`input-rate-currency-${entry.id}`}
                          value={entry.currency}
                          onChange={(e) => handleEditRate(entry.id, 'currency', e.target.value.toUpperCase())}
                          className="border-transparent hover:border-gray-200 focus:border-blue-500 bg-transparent h-8 w-20"
                          maxLength={3}
                        />
                      </div>
                    </TableCell>
                    <TableCell id={`cell-rate-cost-${entry.id}`} className="text-right">
                      <Input
                        id={`input-rate-cost-${entry.id}`}
                        type="number"
                        value={entry.costRate === 0 ? '' : entry.costRate}
                        onChange={(e) => handleEditRate(entry.id, 'costRate', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="border-transparent hover:border-gray-200 focus:border-blue-500 bg-transparent h-8 w-24 text-right ml-auto focus:placeholder:text-transparent"
                      />
                    </TableCell>
                    <TableCell id={`cell-rate-bill-${entry.id}`} className="text-right">
                      <Input
                        id={`input-rate-bill-${entry.id}`}
                        type="number"
                        value={entry.billRate === 0 ? '' : entry.billRate}
                        onChange={(e) => handleEditRate(entry.id, 'billRate', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="border-transparent hover:border-gray-200 focus:border-blue-500 bg-transparent h-8 w-24 text-right font-bold ml-auto focus:placeholder:text-transparent"
                      />
                    </TableCell>
                    <TableCell id={`cell-rate-margin-${entry.id}`} className="text-right font-mono text-sm">
                      <span className={((entry.billRate - entry.costRate) / entry.billRate * 100) >= 40 ? 'text-green-600' : 'text-amber-600'}>
                        {entry.billRate > 0 ? (((entry.billRate - entry.costRate) / entry.billRate) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </TableCell>
                    <TableCell id={`cell-rate-actions-${entry.id}`}>
                      <Button
                        id={`btn-remove-rate-${entry.id}`}
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRate(entry.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete country rate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!selectedRoleData || selectedRoleData.entries.length === 0) && (
                  <TableRow id="row-no-rates">
                    <TableCell id="cell-no-rates" colSpan={6} className="text-center py-12 text-gray-400 italic">
                      No country-specific rates defined for this role.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id="rate-card-tab" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <Card id="card-define-role" className="border-gray-200 shadow-sm w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Define New Role
          </CardTitle>
          <CardDescription>Create a new role to start defining its global rate structure.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="grid gap-2 flex-1">
              <Label htmlFor="newRole" className="text-xs font-bold uppercase text-gray-500">Role Name</Label>
              <Input
                id="newRole"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Principal Consultant"
                className="border-gray-300"
              />
            </div>
            <div className="flex items-end">
              <Button id="btn-create-role" onClick={handleAddRole} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs h-10 px-8">
                Create & Drill Down
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div id="roles-list-header" className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-bold text-gray-900">Available Roles</h3>
            <Badge id="badge-roles-count" variant="outline" className="ml-2 bg-gray-50">
              {viewMode === 'list' ? filteredEntries.length : roles.length}
            </Badge>
          </div>
          
          {viewMode === 'list' && (
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-400">Country:</span>
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger className="h-8 w-[140px] text-xs bg-white">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Countries</SelectItem>
                    {uniqueCountries.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-400">Currency:</span>
                <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                  <SelectTrigger className="h-8 w-[100px] text-xs bg-white">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {uniqueCurrencies.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 border-gray-200">
                <Palette className="w-4 h-4 text-blue-600" />
                Palettes
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-sm mb-1">Color Palette Templates</h4>
                  <p className="text-xs text-gray-500">Quickly assign a cohesive color theme to all roles.</p>
                </div>
                <div className="grid gap-2">
                  {PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      onClick={() => handleApplyPalette(palette.colors)}
                      className="flex flex-col gap-2 p-2 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-700">{palette.name}</span>
                        <div className="flex -space-x-1">
                          {palette.colors.slice(0, 4).map((color, i) => (
                            <div key={i} className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 group-hover:text-gray-500">{palette.description}</p>
                    </button>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-[10px] font-bold uppercase text-gray-400 hover:text-red-500"
                  onClick={() => handleApplyPalette(['transparent'])}
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset All Colors
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Tabs id="view-mode-tabs" value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-auto">
            <TabsList className="bg-gray-100 p-1">
              <TabsTrigger id="trigger-grid" value="grid" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5">
                <LayoutGrid className="w-4 h-4 mr-2" />
                Cards
              </TabsTrigger>
              <TabsTrigger id="trigger-list" value="list" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5">
                <List className="w-4 h-4 mr-2" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div id="roles-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card 
              id={`role-card-${role.name.replace(/\s+/g, '-').toLowerCase()}`}
              key={role.name} 
              className="border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => setSelectedRole(role.name)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    role.color !== 'transparent' ? "bg-white border border-gray-100" : "bg-blue-50 group-hover:bg-blue-600"
                  )} style={{ backgroundColor: role.color !== 'transparent' ? role.color : undefined }}>
                    <Users className={cn(
                      "w-5 h-5 transition-colors",
                      role.color !== 'transparent' ? "text-gray-700" : "text-blue-600 group-hover:text-white"
                    )} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      id={`btn-rename-role-grid-${role.name.replace(/\s+/g, '-').toLowerCase()}`}
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-gray-300 hover:text-blue-500 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRole(role.name);
                        setEditingRoleNameValue(role.name);
                        setIsEditingRoleName(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-1">{role.name}</h3>
                <p className="text-sm text-gray-500">
                  {role.countriesCount} {role.countriesCount === 1 ? 'Country' : 'Countries'} defined
                </p>
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Avg. Margin:</span>
                  <span className="text-xs font-bold text-green-600">
                    {role.entries.length > 0 
                      ? (role.entries.reduce((acc, e) => acc + (e.billRate > 0 ? (e.billRate - e.costRate) / e.billRate : 0), 0) / role.entries.length * 100).toFixed(1)
                      : '0.0'}%
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card id="roles-list-card" className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table id="table-roles-list">
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase text-gray-500">Role Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-gray-500">Country</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-gray-500">Currency</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Cost Rate</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Bill Rate</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Margin %</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow 
                    id={`entry-row-${entry.id}`}
                    key={entry.id} 
                    className="hover:bg-gray-50/50 transition-colors group"
                    style={{ backgroundColor: entry.color !== 'transparent' ? entry.color : undefined }}
                  >
                    <TableCell className="font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        {entry.color && entry.color !== 'transparent' && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        )}
                        {entry.role}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 font-medium">
                      {entry.country}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {entry.currency}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={entry.costRate === 0 ? '' : entry.costRate}
                        onChange={(e) => handleEditRate(entry.id, 'costRate', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="h-8 w-24 text-right ml-auto bg-transparent border-transparent hover:border-gray-200 focus:border-blue-500 focus:placeholder:text-transparent"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={entry.billRate === 0 ? '' : entry.billRate}
                        onChange={(e) => handleEditRate(entry.id, 'billRate', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="h-8 w-24 text-right ml-auto bg-transparent border-transparent hover:border-gray-200 focus:border-blue-500 font-bold focus:placeholder:text-transparent"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span className={((entry.billRate - entry.costRate) / entry.billRate * 100) >= 40 ? 'text-green-600' : 'text-amber-600'}>
                        {entry.billRate > 0 ? (((entry.billRate - entry.costRate) / entry.billRate) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                          onClick={() => setSelectedRole(entry.role)}
                        >
                          Details <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400 italic">
                      No roles match the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {roles.length === 0 && (
        <div id="empty-roles-state" className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No roles defined yet. Start by creating your first role above.</p>
        </div>
      )}
    </div>
  );
}
