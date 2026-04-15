import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phase } from '../types';
import { Trash2, Plus, RotateCcw, GripVertical, Palette } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { PALETTES } from '../constants';

interface Props {
  phases: Phase[];
  updatePhases: (phases: Phase[]) => void;
}

function SortablePhaseRow({ phase, handleUpdatePhase, handleRemovePhase }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: phase.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={cn("group hover:bg-gray-50/50 transition-colors", isDragging && "bg-gray-100 shadow-lg z-50")}>
      <TableCell className="w-8">
        <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
          <GripVertical className="w-4 h-4" />
        </div>
      </TableCell>
      <TableCell>
        <Input 
          value={phase.name}
          onChange={(e) => handleUpdatePhase(phase.id, 'name', e.target.value)}
          className="border-none bg-transparent focus:bg-white h-8 font-medium"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Input 
            type="color"
            value={phase.color}
            onChange={(e) => handleUpdatePhase(phase.id, 'color', e.target.value)}
            className="w-8 h-8 p-0.5 border-none bg-transparent cursor-pointer rounded-full overflow-hidden"
          />
          <span className="text-xs font-mono text-gray-500 uppercase">{phase.color}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Checkbox 
          checked={phase.isSystemOnly || false}
          onCheckedChange={(checked) => handleUpdatePhase(phase.id, 'isSystemOnly', !!checked)}
        />
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleRemovePhase(phase.id)}
          className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function PhasesSettingsTab({ phases, updatePhases }: Props) {
  const [newPhase, setNewPhase] = useState({ name: '', color: '#3B82F6', isSystemOnly: false });
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAddPhase = () => {
    if (!newPhase.name) return;
    updatePhases([
      ...phases,
      {
        id: Math.random().toString(36).substr(2, 9),
        ...newPhase
      }
    ]);
    setNewPhase({ name: '', color: '#3B82F6', isSystemOnly: false });
  };

  const handleRemovePhase = (id: string) => {
    updatePhases(phases.filter(p => p.id !== id));
  };

  const handleUpdatePhase = (id: string, field: keyof Phase, value: any) => {
    updatePhases(phases.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleApplyPalette = (paletteColors: string[]) => {
    const updatedPhases = phases.map((phase, index) => ({
      ...phase,
      color: paletteColors[index % paletteColors.length]
    }));
    updatePhases(updatedPhases);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = phases.findIndex(p => p.id === active.id);
      const newIndex = phases.findIndex(p => p.id === over.id);
      updatePhases(arrayMove(phases, oldIndex, newIndex));
    }
  };

  const resetToDefaults = () => {
    const defaults: Phase[] = [
      { id: '1', name: 'Prepare', color: '#94A3B8' },
      { id: '2', name: 'Plan', color: '#3B82F6' },
      { id: '3', name: 'Architect', color: '#8B5CF6' },
      { id: '4', name: 'Construct', color: '#10B981' },
      { id: '5', name: 'Validate', color: '#F59E0B' },
      { id: '6', name: 'Deploy', color: '#EF4444' },
      { id: '7', name: 'Hypercare', color: '#EC4899' },
    ];
    updatePhases(defaults);
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Project Phases</CardTitle>
              <CardDescription>Manage project phases and their color codes used in the Resource Allocation Plan.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
                      <p className="text-xs text-gray-500">Quickly assign a cohesive color theme to all phases.</p>
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
                  </div>
                </PopoverContent>
              </Popover>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetToDefaults}
                className="text-gray-500 hover:text-blue-600 border-gray-200 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-gray-500">Phase Name</Label>
              <Input 
                value={newPhase.name}
                onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                placeholder="e.g. Discovery"
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-gray-500">Color Code</Label>
              <div className="flex gap-2">
                <Input 
                  type="color"
                  value={newPhase.color}
                  onChange={(e) => setNewPhase({ ...newPhase, color: e.target.value })}
                  className="w-12 h-10 p-1 bg-white border-gray-200 cursor-pointer"
                />
                <Input 
                  value={newPhase.color}
                  onChange={(e) => setNewPhase({ ...newPhase, color: e.target.value })}
                  placeholder="#000000"
                  className="bg-white border-gray-200 font-mono"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox 
                id="new-is-system"
                checked={newPhase.isSystemOnly}
                onCheckedChange={(checked) => setNewPhase({ ...newPhase, isSystemOnly: !!checked })}
              />
              <Label htmlFor="new-is-system" className="text-xs font-bold uppercase text-gray-500 cursor-pointer">System Only</Label>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddPhase} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs h-10 gap-2">
                <Plus className="w-4 h-4" />
                Add Phase
              </Button>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden border-gray-100">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-xs font-bold uppercase text-gray-500">Phase Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-gray-500">Color</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-gray-500 text-center">System Only</TableHead>
                  <TableHead className="w-[100px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={phases.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {phases.map((phase) => (
                      <SortablePhaseRow key={phase.id} phase={phase} handleUpdatePhase={handleUpdatePhase} handleRemovePhase={handleRemovePhase} />
                    ))}
                  </SortableContext>
                </DndContext>
                {phases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-400 italic">
                      No phases defined.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
