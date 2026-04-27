import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResourcePlanEntry, RateCardEntry, Phase, Country, ResourceAllocation, PhaseAllocation } from '../../types/index';
import { formatCurrency } from '../../lib/formatting';
import { calcResourceEntry } from '../../lib/calculations';

function uid() { return Math.random().toString(36).slice(2, 10); }

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
    const rate = rateCard.find((r) => r.role === entry.role && r.country === country);
    const updated = calcResourceEntry({ ...entry, country, currency: rate?.currency ?? entry.currency }, rateCard);
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

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-50 hover:bg-gray-50/50 group">
      <td className="px-2 py-2 text-gray-300" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 cursor-grab" />
      </td>
      <td className="px-2 py-2 min-w-[160px]">
        <Select value={entry.role} onValueChange={handleRoleChange}>
          <SelectTrigger className="h-7 text-xs border-gray-200 w-full">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2 min-w-[140px]">
        <Select value={entry.country} onValueChange={handleCountryChange}>
          <SelectTrigger className="h-7 text-xs border-gray-200 w-full">
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
      <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{entry.currency || '—'}</td>
      <td className="px-2 py-2">
        <Input type="number" value={entry.weeks} onChange={(e) => handleNumericChange('weeks', e.target.value)} className="h-7 text-xs border-gray-200 w-16 text-center" />
      </td>
      <td className="px-2 py-2">
        <Input type="number" value={entry.hours_per_week} onChange={(e) => handleNumericChange('hours_per_week', e.target.value)} step="0.5" className="h-7 text-xs border-gray-200 w-16 text-center" />
      </td>
      <td className="px-2 py-2 text-right text-xs font-medium text-gray-900 whitespace-nowrap">{formatCurrency(entry.total_cost, currency)}</td>
      <td className="px-2 py-2 text-right text-xs font-medium text-blue-700 whitespace-nowrap">{formatCurrency(entry.total_price, currency)}</td>
      {weekLabels.map((week) => {
        const phaseId = phaseAllocMap.get(week);
        const phase = phases.find((p) => p.id === phaseId);
        return (
          <td key={week} className="px-0 py-0">
            <select
              value={phaseId ?? ''}
              onChange={(e) => onPhaseAssign(week, e.target.value)}
              className="w-12 h-9 text-[10px] border-0 text-center cursor-pointer"
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
      <td className="px-2 py-2">
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => { setEntries(resourcePlan); }, [resourcePlan]);
  useEffect(() => { setPhaseAllocs(phaseAllocations); }, [phaseAllocations]);

  // Generate week labels from start/end date
  const weekLabels: string[] = [];
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const cur = new Date(start);
    while (cur <= end && weekLabels.length < 52) {
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

  function addEntry() {
    const entry: ResourcePlanEntry = {
      id: uid(),
      project_id: projectId,
      role: rateCard[0]?.role ?? '',
      country: rateCard[0]?.country ?? '',
      currency: rateCard[0]?.currency ?? 'USD',
      weeks: 4,
      hours_per_week: 8,
      total_cost: 0,
      total_price: 0,
      sort_order: entries.length,
    };
    const calculated = calcResourceEntry(entry, rateCard);
    const updated = [...entries, calculated];
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

  // Phase breakdown
  const phaseBreakdown = phases
    .filter((p) => !p.is_system_only)
    .map((phase) => {
      const assignedWeeks = [...phaseAllocMap.entries()]
        .filter(([, pId]) => pId === phase.id)
        .map(([week]) => week);
      const cost = entries.reduce((sum, e) => {
        const rate = rateCard.find((r) => r.role === e.role && r.country === e.country) ?? { cost_rate: 0, bill_rate: 0 };
        return sum + assignedWeeks.length * e.hours_per_week * rate.cost_rate;
      }, 0);
      return { phase, cost, weeks: assignedWeeks.length };
    })
    .filter((pb) => pb.cost > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Resource Planning</h2>
        <Button variant="outline" size="sm" onClick={addEntry} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Resource
        </Button>
      </div>

      <Card className="border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="w-8" />
                  <th className="text-left px-2 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-2 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Country</th>
                  <th className="px-2 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">CCY</th>
                  <th className="text-center px-2 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Wks</th>
                  <th className="text-center px-2 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Hrs/Wk</th>
                  <th className="text-right px-2 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Cost</th>
                  <th className="text-right px-2 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Price</th>
                  {weekLabels.map((w) => (
                    <th key={w} className="px-0 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-center w-12">
                      {new Date(w).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </th>
                  ))}
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
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                  <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                  <td className="px-2 py-3 text-right text-sm font-bold text-gray-900">{formatCurrency(totalCost, currency)}</td>
                  <td className="px-2 py-3 text-right text-sm font-bold text-blue-700">{formatCurrency(totalPrice, currency)}</td>
                  <td colSpan={weekLabels.length + 1} />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Phase Breakdown */}
      {phaseBreakdown.length > 0 && (
        <Card className="border border-gray-200 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Phase Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {phaseBreakdown.map((pb) => (
                <div
                  key={pb.phase.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100"
                  style={{ backgroundColor: `${pb.phase.color}15` }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pb.phase.color }} />
                  <span className="text-sm font-medium text-gray-700">{pb.phase.name}</span>
                  <span className="text-xs text-gray-500">{pb.weeks}w · {formatCurrency(pb.cost, currency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No resources yet. Add a resource to start planning.</p>
        </div>
      )}
    </div>
  );
}
