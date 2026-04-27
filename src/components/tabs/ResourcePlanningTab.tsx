import { useState, useEffect } from 'react';
import { Trash2, GripVertical, Users, Maximize2, FileSpreadsheet, Info, Calculator, ReceiptText } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResourcePlanEntry, RateCardEntry, Phase, Country, ResourceAllocation, PhaseAllocation } from '../../types/index';
import { formatCurrency, formatPercent, calcMarginPercent } from '../../lib/formatting';
import { calcResourceEntry } from '../../lib/calculations';
import { cn } from '@/lib/utils';

function uid() { return Math.random().toString(36).slice(2, 10); }

type ViewMode = 'summary' | 'days' | 'weeks';

interface Props {
  projectId: string;
  resourcePlan: ResourcePlanEntry[];
  resourceAllocations: ResourceAllocation[];
  phaseAllocations: PhaseAllocation[];
  rateCard: RateCardEntry[];
  phases: Phase[];
  countries: Country[];
  currency: string;
  startDate: string | null;
  endDate: string | null;
  onSave: (entries: ResourcePlanEntry[], allocs: ResourceAllocation[], phaseAllocs: PhaseAllocation[]) => Promise<void>;
}

function SortableRow({
  entry,
  rateCard,
  phases,
  countries,
  currency,
  viewMode,
  phaseAllocMap,
  weekLabels,
  onUpdate,
  onDelete,
  onPhaseAssign,
}: {
  entry: ResourcePlanEntry;
  rateCard: RateCardEntry[];
  phases: Phase[];
  countries: Country[];
  currency: string;
  viewMode: ViewMode;
  phaseAllocMap: Map<string, string>;
  weekLabels: string[];
  onUpdate: (field: keyof ResourcePlanEntry, value: unknown) => void;
  onDelete: () => void;
  onPhaseAssign: (week: string, phaseId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const roles = [...new Set(rateCard.map((r) => r.role))];
  const availableCountries = rateCard.filter((r) => r.role === entry.role).map((r) => r.country);
  const rate = rateCard.find((r) => r.role === entry.role && r.country === entry.country) ?? { cost_rate: 0, bill_rate: 0 };
  const totalHours = entry.weeks * entry.hours_per_week;

  function handleRoleChange(role: string) {
    const first = rateCard.find((r) => r.role === role);
    const updated = calcResourceEntry({ ...entry, role, country: first?.country ?? entry.country, currency: first?.currency ?? entry.currency }, rateCard);
    onUpdate('role', updated.role);
    onUpdate('country', updated.country);
    onUpdate('currency', updated.currency);
    onUpdate('total_cost', updated.total_cost);
    onUpdate('total_price', updated.total_price);
  }

  function handleCountryChange(country: string) {
    const r = rateCard.find((rc) => rc.role === entry.role && rc.country === country);
    const updated = calcResourceEntry({ ...entry, country, currency: r?.currency ?? entry.currency }, rateCard);
    onUpdate('country', updated.country);
    onUpdate('currency', updated.currency);
    onUpdate('total_cost', updated.total_cost);
    onUpdate('total_price', updated.total_price);
  }

  function handleNumericChange(field: 'weeks' | 'hours_per_week', value: string) {
    const num = parseFloat(value) || 0;
    const updated = calcResourceEntry({ ...entry, [field]: num }, rateCard);
    onUpdate(field, num);
    onUpdate('total_cost', updated.total_cost);
    onUpdate('total_price', updated.total_price);
  }

  if (viewMode === 'summary') {
    return (
      <tr ref={setNodeRef} style={style} className="border-b border-gray-100 hover:bg-gray-50/40 group">
        <td className="pl-3 pr-1 py-2.5 text-gray-300 w-8" {...attributes} {...listeners}>
          <GripVertical className="w-4 h-4 cursor-grab" />
        </td>
        {/* Role */}
        <td className="px-2 py-2 min-w-[200px]">
          <Select value={entry.role} onValueChange={handleRoleChange}>
            <SelectTrigger className="h-8 text-sm border-gray-200 w-full bg-transparent">
              <SelectValue placeholder="Select Role..." />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </td>
        {/* Country */}
        <td className="px-2 py-2 min-w-[160px]">
          <Select value={entry.country} onValueChange={handleCountryChange}>
            <SelectTrigger className="h-8 text-sm border-gray-200 w-full bg-transparent">
              <SelectValue placeholder="Select Country..." />
            </SelectTrigger>
            <SelectContent>
              {availableCountries.length > 0
                ? availableCountries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)
                : countries.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)
              }
            </SelectContent>
          </Select>
        </td>
        {/* Weeks */}
        <td className="px-2 py-2 w-24">
          <Input type="number" value={entry.weeks} onChange={(e) => handleNumericChange('weeks', e.target.value)}
            className="h-8 text-sm border-gray-200 text-center" />
        </td>
        {/* Total Hours */}
        <td className="px-3 py-2 text-sm text-gray-700 font-medium text-right tabular-nums whitespace-nowrap">
          {totalHours.toLocaleString()}
        </td>
        {/* Hourly Rate */}
        <td className="px-3 py-2 text-sm text-gray-500 text-right tabular-nums whitespace-nowrap">
          {entry.currency ?? 'USD'} {rate.cost_rate.toLocaleString()}
        </td>
        {/* Total Cost */}
        <td className="px-3 py-2 text-sm font-semibold text-gray-900 text-right tabular-nums whitespace-nowrap">
          {formatCurrency(entry.total_cost, currency)}
        </td>
        {/* Total Price */}
        <td className="px-3 py-2 text-sm font-semibold text-gray-900 text-right tabular-nums whitespace-nowrap line-through decoration-gray-400">
          {formatCurrency(entry.total_price, currency)}
        </td>
        <td className="pr-3 pl-1 py-2 w-8">
          <button onClick={onDelete} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
    );
  }

  // Days / Weeks view — show phase timeline columns
  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-100 hover:bg-gray-50/40 group">
      <td className="pl-3 pr-1 py-2.5 text-gray-300 w-8" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 cursor-grab" />
      </td>
      <td className="px-2 py-2 min-w-[180px]">
        <Select value={entry.role} onValueChange={handleRoleChange}>
          <SelectTrigger className="h-8 text-sm border-gray-200 w-full bg-transparent">
            <SelectValue placeholder="Select Role..." />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2 min-w-[140px]">
        <Select value={entry.country} onValueChange={handleCountryChange}>
          <SelectTrigger className="h-8 text-sm border-gray-200 w-full bg-transparent">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            {availableCountries.length > 0
              ? availableCountries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)
              : countries.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)
            }
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2 w-20">
        <Input type="number" value={entry.weeks} onChange={(e) => handleNumericChange('weeks', e.target.value)}
          className="h-8 text-sm border-gray-200 text-center" />
      </td>
      <td className="px-2 py-2 w-20">
        <Input type="number" value={entry.hours_per_week} onChange={(e) => handleNumericChange('hours_per_week', e.target.value)}
          step="0.5" className="h-8 text-sm border-gray-200 text-center" />
      </td>
      {weekLabels.map((week) => {
        const phaseId = phaseAllocMap.get(week);
        const phase = phases.find((p) => p.id === phaseId);
        return (
          <td key={week} className="px-0 py-0 w-10">
            <select
              value={phaseId ?? ''}
              onChange={(e) => onPhaseAssign(week, e.target.value)}
              className="w-10 h-[41px] text-[9px] border-0 text-center cursor-pointer"
              style={{ backgroundColor: phase?.color ? `${phase.color}40` : 'transparent' }}
            >
              <option value="">—</option>
              {phases.filter((p) => !p.is_system_only).map((p) => (
                <option key={p.id} value={p.id}>{p.name.slice(0, 3)}</option>
              ))}
            </select>
          </td>
        );
      })}
      <td className="pr-3 pl-1 py-2 w-8">
        <button onClick={onDelete} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

export default function ResourcePlanningTab({
  projectId, resourcePlan, resourceAllocations, phaseAllocations,
  rateCard, phases, countries, currency, startDate, endDate, onSave,
}: Props) {
  const [entries, setEntries] = useState<ResourcePlanEntry[]>(resourcePlan);
  const [phaseAllocs, setPhaseAllocs] = useState<PhaseAllocation[]>(phaseAllocations);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [rowsToAdd, setRowsToAdd] = useState(1);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => { setEntries(resourcePlan); }, [resourcePlan]);
  useEffect(() => { setPhaseAllocs(phaseAllocations); }, [phaseAllocations]);

  const weekLabels: string[] = [];
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const cur = new Date(start);
    while (cur <= end && weekLabels.length < 104) {
      weekLabels.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 7);
    }
  }

  const phaseAllocMap = new Map(phaseAllocs.map((pa) => [pa.period_start, pa.phase_id]));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);
    const reordered = arrayMove(entries, oldIndex, newIndex).map((e, i) => ({ ...e, sort_order: i }));
    setEntries(reordered);
    onSave(reordered, resourceAllocations, phaseAllocs);
  }

  function addEntries() {
    const count = Math.max(1, Math.min(rowsToAdd, 20));
    const newEntries: ResourcePlanEntry[] = Array.from({ length: count }, (_, i) => {
      const base: ResourcePlanEntry = {
        id: uid(),
        project_id: projectId,
        role: '',
        country: '',
        currency: 'USD',
        weeks: 1,
        hours_per_week: 8,
        total_cost: 0,
        total_price: 0,
        sort_order: entries.length + i,
      };
      return base;
    });
    const updated = [...entries, ...newEntries];
    setEntries(updated);
    onSave(updated, resourceAllocations, phaseAllocs);
  }

  function updateEntry(id: string, field: keyof ResourcePlanEntry, value: unknown) {
    setEntries((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, [field]: value } : e));
      onSave(updated, resourceAllocations, phaseAllocs);
      return updated;
    });
  }

  function deleteEntry(id: string) {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    onSave(updated, resourceAllocations, phaseAllocs);
  }

  function assignPhase(week: string, phaseId: string) {
    setPhaseAllocs((prev) => {
      let updated: PhaseAllocation[];
      if (!phaseId) {
        updated = prev.filter((pa) => pa.period_start !== week);
      } else {
        const existing = prev.find((pa) => pa.period_start === week);
        if (existing) {
          updated = prev.map((pa) => pa.period_start === week ? { ...pa, phase_id: phaseId } : pa);
        } else {
          updated = [...prev, { id: uid(), project_id: projectId, period_start: week, phase_id: phaseId }];
        }
      }
      onSave(entries, resourceAllocations, updated);
      return updated;
    });
  }

  const totalCost = entries.reduce((s, e) => s + e.total_cost, 0);
  const totalPrice = entries.reduce((s, e) => s + e.total_price, 0);
  const margin = calcMarginPercent(totalPrice, totalCost);

  return (
    <div className="space-y-5">
      {/* Main card */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">Resource Allocation Plan</h2>
            {/* View toggle pills */}
            <div className="flex items-center gap-0 bg-gray-100 rounded-full p-0.5 ml-2">
              {(['summary', 'days', 'weeks'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-all',
                    viewMode === mode
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expand View</span>
            </button>
            <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-8" />
                {viewMode === 'summary' ? (
                  <>
                    <th className="text-left px-2 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="text-left px-2 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Country</th>
                    <th className="text-center px-2 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Weeks</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Total Hours</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Hourly Rate</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Total Cost</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Total Price</th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-2 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="text-left px-2 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Country</th>
                    <th className="text-center px-2 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Wks</th>
                    <th className="text-center px-2 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Hrs/Wk</th>
                    {weekLabels.map((w) => (
                      <th key={w} className="px-0 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-center w-10">
                        {viewMode === 'weeks'
                          ? new Date(w).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
                          : `D${weekLabels.indexOf(w) + 1}`
                        }
                      </th>
                    ))}
                  </>
                )}
                <th className="w-8" />
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {entries.map((entry) => (
                    <SortableRow
                      key={entry.id}
                      entry={entry}
                      rateCard={rateCard}
                      phases={phases}
                      countries={countries}
                      currency={currency}
                      viewMode={viewMode}
                      phaseAllocMap={phaseAllocMap}
                      weekLabels={weekLabels}
                      onUpdate={(field, value) => updateEntry(entry.id, field, value)}
                      onDelete={() => deleteEntry(entry.id)}
                      onPhaseAssign={assignPhase}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>

        {/* Add rows footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rows to Add:</span>
          <input
            type="number"
            min={1}
            max={20}
            value={rowsToAdd}
            onChange={(e) => setRowsToAdd(parseInt(e.target.value) || 1)}
            className="w-14 h-7 text-sm text-center border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={addEntries}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Add Resource Lines
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Planned Cost */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Total Planned Cost (Base)
              </p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">
                {formatCurrency(totalCost, currency)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <Calculator className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>

        {/* Total Planned Price */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Total Planned Price (Base)
              </p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">
                {formatCurrency(totalPrice, currency)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <ReceiptText className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>

        {/* Planned Margin */}
        <div className="bg-blue-600 rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">
                Planned Margin
              </p>
              <p className="text-3xl font-bold text-white tabular-nums">
                {formatPercent(margin)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
