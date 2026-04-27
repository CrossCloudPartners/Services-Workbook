import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phase } from '../../types/index';
import { supabase } from '../../lib/supabase';

const PALETTES = {
  Modern: ['#6366F1', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
  Nature: ['#16A34A', '#059669', '#65A30D', '#CA8A04', '#92400E', '#15803D'],
  Autumn: ['#EA580C', '#D97706', '#B45309', '#92400E', '#78350F', '#7C2D12'],
  Royal: ['#7C3AED', '#6D28D9', '#4C1D95', '#2563EB', '#1D4ED8', '#1E40AF'],
  Pastel: ['#A5B4FC', '#C4B5FD', '#93C5FD', '#6EE7B7', '#FDE68A', '#FCA5A5'],
  Contrast: ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6'],
};

function SortablePhaseRow({ phase, onUpdate, onDelete }: {
  phase: Phase;
  onUpdate: (field: 'name' | 'color', value: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: phase.id + phase.tenant_id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [showPalette, setShowPalette] = useState(false);

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-50 hover:bg-gray-50/50 group">
      <td className="px-2 py-2 text-gray-300" {...attributes} {...listeners}>
        {!phase.is_system_only && <GripVertical className="w-4 h-4 cursor-grab" />}
      </td>
      <td className="px-3 py-2">
        <div className="relative">
          <button
            className="w-6 h-6 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200"
            style={{ backgroundColor: phase.color }}
            onClick={() => setShowPalette(!showPalette)}
          />
          {showPalette && (
            <div className="absolute left-0 top-8 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-10 w-64">
              {Object.entries(PALETTES).map(([paletteName, colors]) => (
                <div key={paletteName} className="mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{paletteName}</p>
                  <div className="flex gap-1.5">
                    {colors.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => { onUpdate('color', color); setShowPalette(false); }}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-gray-100">
                <Input
                  type="color"
                  value={phase.color}
                  onChange={(e) => onUpdate('color', e.target.value)}
                  className="h-7 w-full border-gray-200"
                />
              </div>
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <Input
          value={phase.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          disabled={phase.is_system_only}
          className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm"
        />
      </td>
      <td className="px-3 py-2">
        {phase.is_system_only && (
          <Badge className="text-[10px] bg-gray-100 text-gray-500 border-gray-200">System</Badge>
        )}
      </td>
      <td className="px-2 py-2">
        {!phase.is_system_only && (
          <button onClick={onDelete} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

interface Props {
  tenantId: string;
  phases: Phase[];
  onUpdated: () => void;
}

export default function PhasesTab({ tenantId, phases, onUpdated }: Props) {
  const [newName, setNewName] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = phases.findIndex((p) => p.id + p.tenant_id === active.id);
    const newIndex = phases.findIndex((p) => p.id + p.tenant_id === over.id);
    const reordered = arrayMove(phases, oldIndex, newIndex);
    await Promise.all(
      reordered.map((phase, i) =>
        supabase.from('phases').update({ sort_order: i }).eq('id', phase.id).eq('tenant_id', tenantId)
      )
    );
    onUpdated();
  }

  async function addPhase() {
    if (!newName.trim()) return;
    const id = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    await supabase.from('phases').insert({
      id: `${id}-${Date.now()}`,
      tenant_id: tenantId,
      name: newName.trim(),
      color: '#6366F1',
      is_system_only: false,
      sort_order: phases.length,
    });
    setNewName('');
    onUpdated();
  }

  async function updatePhase(id: string, field: 'name' | 'color', value: string) {
    await supabase.from('phases').update({ [field]: value }).eq('id', id).eq('tenant_id', tenantId);
    onUpdated();
  }

  async function deletePhase(id: string) {
    await supabase.from('phases').delete().eq('id', id).eq('tenant_id', tenantId);
    onUpdated();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Phases</h2>
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Phase name"
            className="w-40 h-8 text-sm border-gray-200"
            onKeyDown={(e) => e.key === 'Enter' && addPhase()}
          />
          <Button size="sm" onClick={addPhase} disabled={!newName.trim()} className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" /> Add Phase
          </Button>
        </div>
      </div>

      <Card className="border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="w-8" />
                <th className="px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Color</th>
                <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Phase Name</th>
                <th className="w-20" />
                <th className="w-8" />
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={phases.map((p) => p.id + p.tenant_id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {phases.map((phase) => (
                    <SortablePhaseRow
                      key={phase.id + phase.tenant_id}
                      phase={phase}
                      onUpdate={(field, value) => updatePhase(phase.id, field, value)}
                      onDelete={() => deletePhase(phase.id)}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
