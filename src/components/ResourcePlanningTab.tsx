import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResourcePlanEntry, RateCardEntry, ProjectSummary, Phase } from '../types';
import { 
  Users, 
  Plus, 
  Trash2, 
  Calculator, 
  Info, 
  Globe, 
  Maximize2, 
  Minimize2, 
  X, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown,
  GripVertical
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  data: ResourcePlanEntry[];
  rateCard: RateCardEntry[];
  projectSummary: ProjectSummary;
  phases: Phase[];
  phaseAllocation: Record<string, string>;
  updateData: (plan: ResourcePlanEntry[]) => void;
  updateProjectSummary: (summary: Partial<ProjectSummary>) => void;
  updateProjectAndData: (summary: Partial<ProjectSummary>, plan: ResourcePlanEntry[]) => void;
  updatePhaseAllocation: (allocation: Record<string, string>) => void;
}

import { recalculateEntry, calculateTotalHours } from '../lib/calculations';

const hexToRgba = (hex: string, alpha: number) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return 'transparent';
  }
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 'transparent';
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const NumericInput = ({ 
  value, 
  onChange, 
  onPaste, 
  className, 
  placeholder = "0",
  isInteger = false,
  decimals = 0,
  id
}: { 
  value: number | string, 
  onChange: (val: number) => void, 
  onPaste?: (e: React.ClipboardEvent) => void,
  className?: string,
  placeholder?: string,
  isInteger?: boolean,
  decimals?: number,
  id?: string
}) => {
  const [localValue, setLocalValue] = useState(value === 0 || value === '0' ? '' : value.toString());

  useEffect(() => {
    const currentVal = value === 0 || value === '0' ? '' : value.toString();
    const parsedCurrent = parseFloat(currentVal || '0');
    const displayVal = isInteger ? currentVal : (parsedCurrent !== 0 ? Number(parsedCurrent.toFixed(decimals)).toString() : '');
    if (localValue !== displayVal && parseFloat(localValue || '0') !== parsedCurrent) {
      setLocalValue(displayVal);
    }
  }, [value, isInteger, decimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, numbers, and one decimal point
    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
      setLocalValue(val);
      const parsed = isInteger ? parseInt(val) : parseFloat(val);
      if (!isNaN(parsed)) {
        onChange(isInteger ? parsed : Number(parsed.toFixed(decimals)));
      } else if (val === '' || val === '-' || val === '.') {
        onChange(0);
      }
    }
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
      onPaste={onPaste}
      onFocus={(e) => e.target.select()}
      placeholder={placeholder}
      className={cn(
        "w-full text-center border-none focus:ring-1 focus:ring-blue-500 bg-transparent h-10 text-xs focus:placeholder:text-transparent",
        className
      )}
    />
  );
};

const parseDateLocal = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const isBusinessDay = (date: Date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6;
};

const formatDateLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getAllDays = (start: string, end: string) => {
  const days = [];
  let current = parseDateLocal(start);
  const last = parseDateLocal(end);
  while (current <= last) {
    days.push(formatDateLocal(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

const getNextDay = (dateStr: string) => {
  let date = parseDateLocal(dateStr);
  date.setDate(date.getDate() + 1);
  return formatDateLocal(date);
};

const getWeeks = (start: string, end: string) => {
  const weeks = [];
  let current = parseDateLocal(start);
  // Move to the first Monday on or before start
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() - 1);
  }
  
  const last = parseDateLocal(end);
  while (current <= last) {
    const weekStart = formatDateLocal(current);
    weeks.push(weekStart);
    current.setDate(current.getDate() + 7);
  }
  return weeks;
};

const getAllDaysInWeek = (weekStart: string, projectStart: string, projectEnd: string) => {
  const days = [];
  let current = parseDateLocal(weekStart);
  const pStart = parseDateLocal(projectStart);
  const pEnd = parseDateLocal(projectEnd);
  
  for (let i = 0; i < 7; i++) {
    if (current >= pStart && current <= pEnd) {
      days.push(formatDateLocal(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
};

interface ViewModeToggleProps {
  viewMode: 'summary' | 'daily' | 'weekly';
  setViewMode: (mode: 'summary' | 'daily' | 'weekly') => void;
  size?: 'sm' | 'md';
}

const ViewModeToggle = ({ viewMode, setViewMode, size = 'md' }: ViewModeToggleProps) => {
  const modes = [
    { id: 'summary', label: 'Summary' },
    { id: 'daily', label: 'Days' },
    { id: 'weekly', label: 'Weeks' },
  ] as const;

  return (
    <div id={`view-mode-toggle-${size}`} className={cn(
      "flex p-1 bg-gray-100 rounded-xl border border-gray-200 shadow-inner relative",
      size === 'sm' ? "scale-90" : ""
    )}>
      {modes.map((mode) => (
        <button
          key={mode.id}
          id={`btn-mode-${mode.id}-${size}`}
          onClick={() => setViewMode(mode.id)}
          className={cn(
            "relative px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg z-10",
            viewMode === mode.id ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          {mode.label}
          {viewMode === mode.id && (
            <motion.div
              layoutId={`active-indicator-${size}`}
              id={`active-indicator-${mode.id}-${size}`}
              className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

interface SortableRowProps {
  entry: ResourcePlanEntry;
  rateCard: RateCardEntry[];
  uniqueRoles: string[];
  getValidCountries: (role: string) => { country: string, currency: string, id: string }[];
  data: ResourcePlanEntry[];
  updateData: (plan: ResourcePlanEntry[]) => void;
  handleEdit: (id: string, field: keyof ResourcePlanEntry | string, value: any) => void;
  viewMode: 'summary' | 'daily' | 'weekly';
  isCellSelected: (entryId: string, colKey: string) => boolean;
  handleCellMouseDown: (entryId: string, colKey: string) => void;
  handleCellMouseEnter: (entryId: string, colKey: string) => void;
  handleDailyEdit: (id: string, date: string, hours: number) => void;
  handleWeeklyEdit: (id: string, weekStart: string, hours: number) => void;
  handlePaste: (e: React.ClipboardEvent, startEntryId: string, startColKey: string) => void;
  handleRemove: (id: string) => void;
  allDays: string[];
  weeks: string[];
  getRateInfo: (role: string, country: string, currency?: string) => any;
  phases: Phase[];
  phaseAllocation: Record<string, string>;
  projectSummary: ProjectSummary;
  key?: any;
}

const SortableRow = ({ 
  entry, 
  rateCard, 
  uniqueRoles, 
  getValidCountries, 
  data, 
  updateData, 
  handleEdit, 
  viewMode, 
  isCellSelected, 
  handleCellMouseDown, 
  handleCellMouseEnter, 
  handleDailyEdit, 
  handleWeeklyEdit, 
  handlePaste, 
  handleRemove, 
  allDays, 
  weeks, 
  getRateInfo,
  phases,
  phaseAllocation,
  projectSummary
}: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? 'relative' as const : 'static' as const,
  };

  const rateInfo = getRateInfo(entry.role, entry.country, entry.currency);
  const roleColor = rateCard.find(r => r.role === entry.role)?.color || 'transparent';

  return (
    <TableRow 
      id={`row-${entry.id}`}
      ref={setNodeRef} 
      style={style}
      className={cn(
        "hover:bg-gray-50/50 transition-colors group",
        isDragging && "bg-blue-50/50 shadow-lg"
      )}
    >
      <TableCell id={`cell-role-${entry.id}`} className="font-medium sticky left-0 group-hover:bg-gray-50 z-10 border-r border-gray-100 p-0 min-w-fit" style={{ backgroundColor: roleColor !== 'transparent' ? roleColor : 'white' }}>
        <div className="flex items-center min-w-fit">
          <div 
            id={`drag-handle-${entry.id}`}
            {...attributes} 
            {...listeners}
            className="px-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-blue-500 transition-colors"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <Select 
            id={`select-role-${entry.id}`}
            value={entry.role} 
            onValueChange={(role) => {
              const validCountries = getValidCountries(role);
              const exactMatch = validCountries.find(v => v.country === projectSummary.country && v.currency === projectSummary.currency);
              const matchingCountry = validCountries.find(v => v.country === projectSummary.country);
              const matchingCurrency = validCountries.find(v => v.currency === projectSummary.currency);
              
              const defaultEntry = exactMatch || matchingCountry || matchingCurrency || validCountries[0] || { country: '', currency: '' };
              
              const updatedPlan = data.map(e => {
                if (e.id === entry.id) {
                  const updated = { ...e, role, country: defaultEntry.country, currency: defaultEntry.currency };
                  return recalculateEntry(updated, rateCard);
                }
                return e;
              });
              updateData(updatedPlan);
            }}
          >
            <SelectTrigger id={`trigger-role-${entry.id}`} className="border-none focus:ring-0 bg-transparent h-10 w-full text-xs font-medium px-4 min-w-[180px]">
              <span className="truncate">{entry.role || "Select Role..."}</span>
            </SelectTrigger>
            <SelectContent id={`content-role-${entry.id}`}>
              {uniqueRoles.map(role => (
                <SelectItem id={`item-role-${entry.id}-${role}`} key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TableCell>
      <TableCell id={`cell-country-${entry.id}`} className="p-0 sticky left-[180px] group-hover:bg-gray-50 z-10 border-r border-gray-100 min-w-fit" style={{ backgroundColor: roleColor !== 'transparent' ? roleColor : 'white' }}>
        <Select 
          id={`select-country-${entry.id}`}
          value={entry.country + '|' + (entry.currency || '')} 
          onValueChange={(val) => {
            const [country, currency] = val.split('|');
            const updatedPlan = data.map(e => {
              if (e.id === entry.id) {
                const updated = { ...e, country, currency };
                return recalculateEntry(updated, rateCard);
              }
              return e;
            });
            updateData(updatedPlan);
          }}
          disabled={!entry.role}
        >
          <SelectTrigger id={`trigger-country-${entry.id}`} className="border-none focus:ring-0 bg-transparent h-10 w-full text-xs text-gray-500 px-4 min-w-[120px]">
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span className="truncate">
                {entry.country ? `${entry.country} (${entry.currency || getRateInfo(entry.role, entry.country, entry.currency).currency})` : "Select Country..."}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent id={`content-country-${entry.id}`}>
            {getValidCountries(entry.role).map(rate => (
              <SelectItem id={`item-country-${entry.id}-${rate.country}-${rate.currency}`} key={rate.id} value={rate.country + '|' + rate.currency}>
                {rate.country} ({rate.currency})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {viewMode === 'summary' ? (
        <>
          <TableCell 
            id={`cell-weeks-${entry.id}`}
            className={cn(
              "text-center p-0",
              isCellSelected(entry.id, 'weeks') && "bg-blue-100/50"
            )}
            onMouseDown={() => handleCellMouseDown(entry.id, 'weeks')}
            onMouseEnter={() => handleCellMouseEnter(entry.id, 'weeks')}
          >
            <NumericInput
              id={`input-weeks-${entry.id}`}
              value={entry.weeks}
              onChange={(val) => handleEdit(entry.id, 'weeks', val)}
              onPaste={(e) => handlePaste(e, entry.id, 'weeks')}
              isInteger={true}
              className="w-16 mx-auto h-8"
            />
          </TableCell>
          <TableCell 
            id={`cell-totalHours-${entry.id}`}
            className={cn(
              "text-center p-0",
              isCellSelected(entry.id, 'totalHours') && "bg-blue-100/50"
            )}
            onMouseDown={() => handleCellMouseDown(entry.id, 'totalHours')}
            onMouseEnter={() => handleCellMouseEnter(entry.id, 'totalHours')}
          >
            <NumericInput
              id={`input-totalHours-${entry.id}`}
              value={calculateTotalHours(entry)}
              onChange={(val) => handleEdit(entry.id, 'totalHours', val)}
              onPaste={(e) => handlePaste(e, entry.id, 'totalHours')}
              className="w-16 mx-auto h-8"
              decimals={0}
            />
          </TableCell>
          <TableCell id={`cell-hourlyRate-${entry.id}`} className="text-right text-xs text-gray-500 pr-4">
            {rateInfo.currency} {(rateInfo.billRate || 0).toLocaleString()}
          </TableCell>
        </>
      ) : viewMode === 'daily' ? (
        allDays.map(day => {
          const phaseId = phaseAllocation?.[day];
          const phase = (phases || []).find(p => p.id === phaseId);
          const phaseColor = phase?.color ? hexToRgba(phase.color, 0.2) : 'transparent';
          const isWeekend = !isBusinessDay(parseDateLocal(day));
          
          return (
            <TableCell 
              id={`cell-daily-${entry.id}-${day}`}
              key={day} 
              className={cn(
                "p-0 border-l border-gray-100",
                isWeekend && "bg-gray-50",
                isCellSelected(entry.id, day) && "bg-blue-100/50"
              )}
              style={{ backgroundColor: isCellSelected(entry.id, day) ? undefined : phaseColor !== 'transparent' ? phaseColor : undefined }}
              onMouseDown={() => handleCellMouseDown(entry.id, day)}
              onMouseEnter={() => handleCellMouseEnter(entry.id, day)}
            >
              <NumericInput
                id={`input-daily-${entry.id}-${day}`}
                value={entry.dailyAllocation?.[day] || 0}
                onChange={(val) => handleDailyEdit(entry.id, day, val)}
                onPaste={(e) => handlePaste(e, entry.id, day)}
                decimals={0}
              />
            </TableCell>
          );
        })
      ) : (
        weeks.map(w => {
          const phaseId = phaseAllocation?.[`week_${w}`];
          const phase = (phases || []).find(p => p.id === phaseId);
          const phaseColor = phase?.color ? hexToRgba(phase.color, 0.2) : 'transparent';
          
          return (
            <TableCell 
              id={`cell-weekly-${entry.id}-${w}`}
              key={w} 
              className={cn(
                "p-0 border-l border-gray-100",
                isCellSelected(entry.id, w) && "bg-blue-100/50"
              )}
              style={{ backgroundColor: phaseColor }}
              onMouseDown={() => handleCellMouseDown(entry.id, w)}
              onMouseEnter={() => handleCellMouseEnter(entry.id, w)}
            >
              <NumericInput
                id={`input-weekly-${entry.id}-${w}`}
                value={entry.weeklyAllocation?.[w] || 0}
                onChange={(val) => handleWeeklyEdit(entry.id, w, val)}
                onPaste={(e) => handlePaste(e, entry.id, w)}
                decimals={0}
              />
            </TableCell>
          );
        })
      )}

      {viewMode !== 'summary' && (
        <TableCell id={`cell-totalHours-${entry.id}`} className="text-center font-mono text-sm text-gray-500">
          {Math.round(calculateTotalHours(entry))}
        </TableCell>
      )}

      <TableCell id={`cell-totalCost-${entry.id}`} className="text-right font-mono text-sm text-gray-500">
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: rateInfo.currency, maximumFractionDigits: 0 }).format(Math.ceil(entry.totalCost))}
      </TableCell>
      <TableCell id={`cell-totalPrice-${entry.id}`} className="text-right font-mono text-sm font-bold">
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: rateInfo.currency, maximumFractionDigits: 0 }).format(Math.ceil(entry.totalPrice))}
      </TableCell>
      <TableCell id={`cell-actions-${entry.id}`}>
        <div className="flex items-center justify-end gap-1">
          <Button
            id={`btn-remove-${entry.id}`}
            variant="ghost"
            size="icon"
            onClick={() => handleRemove(entry.id)}
            className="text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

interface ResourceTableProps {
  isFullView?: boolean;
  viewMode: 'summary' | 'daily' | 'weekly';
  allDays: string[];
  weeks: string[];
  data: ResourcePlanEntry[];
  sensors: any;
  handleDragEnd: (event: DragEndEvent) => void;
  rowsToAdd: number;
  setRowsToAdd: (val: number) => void;
  handleAddNewRow: (count?: number) => void;
  handleRemoveDay: (count?: number) => void;
  projectSummary: ProjectSummary;
  updateProjectSummary: (summary: Partial<ProjectSummary>) => void;
  phases: Phase[];
  phaseAllocation: Record<string, string>;
  updatePhaseAllocation: (allocation: Record<string, string>) => void;
  // Props for SortableRow
  rateCard: RateCardEntry[];
  uniqueRoles: string[];
  getValidCountries: (role: string) => { country: string, currency: string, id: string }[];
  updateData: (plan: ResourcePlanEntry[]) => void;
  handleEdit: (id: string, field: keyof ResourcePlanEntry | string, value: any) => void;
  isCellSelected: (entryId: string, colKey: string) => boolean;
  handleCellMouseDown: (entryId: string, colKey: string) => void;
  handleCellMouseEnter: (entryId: string, colKey: string) => void;
  handleDailyEdit: (id: string, date: string, hours: number) => void;
  handleWeeklyEdit: (id: string, weekStart: string, hours: number) => void;
  handlePaste: (e: React.ClipboardEvent, startEntryId: string, startColKey: string) => void;
  handleRemove: (id: string) => void;
  getRateInfo: (role: string, country: string, currency?: string) => any;
}

const ResourceTable = ({ 
  isFullView = false, 
  viewMode, 
  allDays, 
  weeks, 
  data, 
  sensors, 
  handleDragEnd, 
  rowsToAdd, 
  setRowsToAdd, 
  handleAddNewRow,
  handleRemoveDay,
  projectSummary,
  updateProjectSummary,
  phases,
  phaseAllocation,
  updatePhaseAllocation,
  ...rowProps
}: ResourceTableProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableWidth, setTableWidth] = useState(0);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [scrollTopState, setScrollTopState] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (tableRef.current) {
        setTableWidth(tableRef.current.scrollWidth);
      }
    };

    updateWidth();
    
    if (tableRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          setTableWidth(entry.target.scrollWidth);
        }
      });
      resizeObserver.observe(tableRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [data, viewMode, allDays, weeks]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollRef.current && e.currentTarget === scrollContainerRef.current) {
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current && e.currentTarget === topScrollRef.current) {
      scrollContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'SELECT' || 
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('select') ||
      target.closest('[role="combobox"]') ||
      target.closest('.cursor-grab')
    ) {
      return;
    }

    setIsDraggingScroll(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setStartY(e.pageY - (scrollContainerRef.current?.offsetTop || 0));
    setScrollLeftState(scrollContainerRef.current?.scrollLeft || 0);
    setScrollTopState(scrollContainerRef.current?.scrollTop || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingScroll || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const y = e.pageY - scrollContainerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftState - walkX;
    scrollContainerRef.current.scrollTop = scrollTopState - walkY;
  };

  const handleMouseUpOrLeave = () => {
    setIsDraggingScroll(false);
  };

  console.log('ResourcePlanningTab phaseAllocation', phaseAllocation);
  const handlePhaseChange = (key: string, val: string, isWeekly: boolean) => {
    const newAllocation = { ...(phaseAllocation || {}) };
    const phaseValue = val === 'none' ? '' : val;
    
    if (isWeekly) {
      // Update the weekly summary key
      newAllocation[`week_${key}`] = phaseValue;
      
      // Update business days in that week for color coding, but skip weekends
      const daysInWeek = getAllDaysInWeek(key, projectSummary.startDate, projectSummary.endDate);
      daysInWeek.forEach(day => {
        const isWeekend = !isBusinessDay(parseDateLocal(day));
        if (!isWeekend) {
          newAllocation[day] = phaseValue;
        }
      });
    } else {
      // For daily view, update the specific day only.
      // Automatic weekly summary update is disabled per user request.
      newAllocation[key] = phaseValue;
    }
    updatePhaseAllocation(newAllocation);
  };

  return (
    <div className="flex flex-col w-full relative">
      {/* Top Scrollbar */}
      <div 
        ref={topScrollRef}
        className="overflow-x-auto overflow-y-hidden h-3 w-full bg-gray-100/50 border-x border-t border-gray-200 rounded-t-xl sticky top-0 z-50"
        onScroll={handleTopScroll}
        style={{ scrollbarWidth: 'thin' }}
      >
        <div style={{ width: tableWidth, height: '1px' }} />
      </div>

      <div 
        id={`resource-table-container-${isFullView ? 'full' : 'compact'}`} 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={cn(
          "overflow-auto w-full relative", 
          isFullView ? "h-full" : "max-h-[600px] border border-gray-200 rounded-b-xl shadow-sm",
          isDraggingScroll ? "cursor-grabbing select-none" : "cursor-default"
        )}
        style={{ scrollbarWidth: 'thin' }}
      >
      <DndContext 
        id="resource-dnd-context"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table id="resource-plan-table" ref={tableRef} className="min-w-full border-separate border-spacing-0">
        <TableHeader id="resource-plan-table-header" className="z-30 shadow-sm">
          <TableRow id="resource-plan-header-row" className="bg-gray-50/95 backdrop-blur-md sticky top-0 z-30">
            <TableHead id="head-role" className="text-xs font-bold uppercase text-gray-500 min-w-[180px] sticky left-0 top-0 bg-gray-50 z-40 h-12 border-r border-b border-gray-200 px-4">Role</TableHead>
            <TableHead id="head-country" className="text-xs font-bold uppercase text-gray-500 min-w-[150px] sticky left-[180px] top-0 bg-gray-50 z-40 h-12 border-r border-b border-gray-200 px-4">Country</TableHead>
            
            {viewMode === 'summary' ? (
              <>
                <TableHead id="head-weeks" className="text-center text-xs font-bold uppercase text-gray-500 border-b border-gray-200 sticky top-0 bg-gray-50 z-30">Weeks</TableHead>
                <TableHead id="head-totalHours" className="text-center text-xs font-bold uppercase text-gray-500 border-b border-gray-200 sticky top-0 bg-gray-50 z-30">Total Hours</TableHead>
                <TableHead id="head-hourlyRate" className="text-right text-xs font-bold uppercase text-gray-500 pr-4 border-b border-gray-200 sticky top-0 bg-gray-50 z-30">Hourly Rate</TableHead>
              </>
            ) : viewMode === 'daily' ? (
              allDays.map((day, idx) => {
                const isWeekend = !isBusinessDay(parseDateLocal(day));
                return (
                <TableHead id={`head-daily-${day}`} key={day} className={cn("text-center text-[10px] font-bold uppercase text-gray-400 min-w-[80px] border-l border-b border-gray-200 group/head relative h-12 py-0 sticky top-0 z-30", isWeekend ? "bg-gray-100/50" : "bg-gray-50")}>
                  <div className="flex items-center justify-center h-full px-1">
                    <span className="leading-tight">{parseDateLocal(day).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  </div>
                  {idx === allDays.length - 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveDay(1)}
                      className="absolute top-1 right-1 h-4 w-4 text-gray-300 hover:text-red-500 opacity-0 group-hover/head:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </TableHead>
              )})
            ) : (
              weeks.map((w, idx) => (
                <TableHead id={`head-weekly-${w}`} key={w} className="text-center text-[10px] font-bold uppercase text-gray-400 min-w-[100px] border-l border-b border-gray-200 group/head relative h-12 py-0 sticky top-0 bg-gray-50 z-30">
                  <div className="flex items-center justify-center h-full px-1">
                    <span className="leading-tight">Week of {parseDateLocal(w).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  {idx === weeks.length - 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        const d = parseDateLocal(projectSummary.endDate);
                        d.setDate(d.getDate() - 7);
                        updateProjectSummary({ endDate: formatDateLocal(d) });
                      }}
                      className="absolute top-1 right-1 h-4 w-4 text-gray-300 hover:text-red-500 opacity-0 group-hover/head:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </TableHead>
              ))
            )}

            {viewMode !== 'summary' && (
              <TableHead id="head-totalHours" className="text-center text-xs font-bold uppercase text-gray-500 min-w-[80px] border-b border-gray-200 sticky top-0 bg-gray-50 z-30">Total Hours</TableHead>
            )}
            <TableHead id="head-totalCost" className="text-right text-xs font-bold uppercase text-gray-500 min-w-[100px] border-b border-gray-200 sticky top-0 bg-gray-50 z-30">Total Cost</TableHead>
            <TableHead id="head-totalPrice" className="text-right text-xs font-bold uppercase text-gray-500 min-w-[100px] border-b border-gray-200 sticky top-0 bg-gray-50 z-30">Total Price</TableHead>
            <TableHead id="head-actions" className="w-[80px] border-b border-gray-200 sticky top-0 bg-gray-50 z-30"></TableHead>
          </TableRow>
          
          {viewMode !== 'summary' && (
            <TableRow id="resource-plan-phase-row" className="bg-gray-50/95 backdrop-blur-md border-b border-gray-200 sticky top-12 z-30">
              <TableHead className="sticky left-0 top-12 bg-gray-50 z-40 p-0 h-8 min-w-fit border-r border-b border-gray-200 px-4">
                <div className="flex items-center h-full">
                  <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">Project Phase</span>
                </div>
              </TableHead>
              <TableHead className="sticky left-[180px] top-12 bg-gray-50 z-40 p-0 h-8 min-w-fit border-r border-b border-gray-200"></TableHead>
              
              {viewMode === 'daily' ? (
                allDays.map((day) => {
                  const phaseId = phaseAllocation?.[day];
                  const phase = (phases || []).find(p => p.id === phaseId);
                  const isWeekend = !isBusinessDay(parseDateLocal(day));
                  return (
                    <TableHead key={`phase-${day}`} className={cn("p-0 h-8 border-l border-b border-gray-200 sticky top-12 z-30", isWeekend ? "bg-gray-100/50" : "bg-gray-50")}>
                      <Select 
                        value={phaseAllocation[day] || ""} 
                        onValueChange={(val) => handlePhaseChange(day, val, false)}
                      >
                        <SelectTrigger className="h-full w-full border-none rounded-none focus:ring-0 p-0 px-1 text-[9px] font-bold uppercase transition-colors" style={{ backgroundColor: phase?.color ? hexToRgba(phase.color, 0.15) : 'transparent', color: phase?.color || (isWeekend ? '#64748B' : '#94A3B8') }}>
                          <span className="truncate w-full text-center">{phase?.name || (isWeekend ? "Weekend" : "-")}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {(phases || []).map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                {p.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableHead>
                  );
                })
              ) : (
                weeks.map((w) => {
                  const phaseId = phaseAllocation?.[`week_${w}`];
                  const phase = (phases || []).find(p => p.id === phaseId);
                  return (
                    <TableHead key={`phase-${w}`} className="p-0 h-8 border-l border-b border-gray-200 sticky top-12 bg-gray-50 z-30">
                      <Select 
                        value={phaseId || ""} 
                        onValueChange={(val) => handlePhaseChange(w, val, true)}
                      >
                        <SelectTrigger className="h-full w-full border-none rounded-none focus:ring-0 p-0 px-1 text-[9px] font-bold uppercase transition-colors" style={{ backgroundColor: phase?.color ? hexToRgba(phase.color, 0.15) : 'transparent', color: phase?.color || '#94A3B8' }}>
                          <span className="truncate w-full text-center">{phase?.name || "-"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {(phases || []).map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                {p.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableHead>
                  );
                })
              )}
              
              <TableHead className="p-0 h-8 border-b border-gray-200 sticky top-12 bg-gray-50 z-30"></TableHead>
              <TableHead className="p-0 h-8 border-b border-gray-200 sticky top-12 bg-gray-50 z-30"></TableHead>
              <TableHead className="p-0 h-8 border-b border-gray-200 sticky top-12 bg-gray-50 z-30"></TableHead>
              <TableHead className="p-0 h-8 border-b border-gray-200 sticky top-12 bg-gray-50 z-30"></TableHead>
            </TableRow>
          )}
        </TableHeader>
        <TableBody id="resource-plan-table-body">
          <SortableContext 
            id="resource-sortable-context"
            items={data.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {data.map((entry) => (
              <SortableRow 
                key={entry.id} 
                entry={entry} 
                data={data}
                viewMode={viewMode}
                allDays={allDays}
                weeks={weeks}
                phases={phases}
                phaseAllocation={phaseAllocation}
                projectSummary={projectSummary}
                {...rowProps}
              />
            ))}
          </SortableContext>
          <TableRow id="row-add-resource" className="hover:bg-blue-50/30 transition-colors group">
            <TableCell id="cell-add-resource" colSpan={viewMode === 'summary' ? 8 : 5 + (viewMode === 'daily' ? allDays.length : weeks.length)} className="py-0 p-0 border-t border-gray-200">
              <div id="add-resource-controls" className="sticky left-0 bg-white/95 backdrop-blur-sm w-full lg:w-fit px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 border-r border-gray-200 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Label id="label-rows-to-add" className="text-[10px] uppercase font-bold text-gray-400 whitespace-nowrap">Rows to add:</Label>
                  <NumericInput
                    id="input-rows-to-add"
                    value={rowsToAdd}
                    onChange={(val) => setRowsToAdd(val)}
                    isInteger={true}
                    className="w-16 h-8 border-gray-200 focus:ring-blue-500"
                  />
                </div>
                <Button 
                  id="btn-add-resource-lines"
                  variant="ghost" 
                  onClick={() => handleAddNewRow(rowsToAdd)}
                  className="text-blue-600 font-bold text-sm hover:bg-blue-50 gap-2 px-4 h-9 rounded-lg transition-all w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Add Resource Lines
                </Button>
              </div>
            </TableCell>
          </TableRow>
          {data.length === 0 && (
            <TableRow id="row-no-resources">
              <TableCell id="cell-no-resources" colSpan={viewMode === 'summary' ? 8 : 5 + (viewMode === 'daily' ? allDays.length : weeks.length)} className="text-center py-12 text-gray-400 italic">
                No resources planned yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </DndContext>
    </div>
    </div>
  );
};

export default function ResourcePlanningTab({ 
  data, 
  rateCard, 
  projectSummary, 
  phases,
  phaseAllocation,
  updateData, 
  updateProjectSummary,
  updateProjectAndData,
  updatePhaseAllocation
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'daily' | 'weekly'>('summary');
  const [rowsToAdd, setRowsToAdd] = useState(1);
  const [daysToAdd, setDaysToAdd] = useState(1);
  const [selection, setSelection] = useState<{
    start: { id: string, col: string } | null;
    end: { id: string, col: string } | null;
  }>({ start: null, end: null });
  const [isSelecting, setIsSelecting] = useState(false);

  const uniqueRoles = Array.from(new Set(rateCard.map(r => r.role))).sort();

  const getValidCountries = (role: string) => {
    return rateCard
      .filter(r => r.role === role && r.billRate > 0)
      .map(r => ({ country: r.country, currency: r.currency, id: r.id }));
  };

  const handleAddNewRow = (count: number = 1) => {
    const actualCount = Math.max(1, count);
    const initialDaily: Record<string, number> = {};
    allDays.forEach(day => {
      initialDaily[day] = 0;
    });

    const initialWeekly: Record<string, number> = {};
    weeks.forEach(w => {
      initialWeekly[w] = 0;
    });

    const newRows = Array.from({ length: actualCount }).map(() => ({
      id: Math.random().toString(36).substr(2, 9),
      role: '',
      country: '',
      weeks: projectSummary.duration || 1,
      hoursPerWeek: 0,
      totalCost: 0,
      totalPrice: 0,
      dailyAllocation: { ...initialDaily },
      weeklyAllocation: { ...initialWeekly },
    }));

    updateData([...data, ...newRows]);
  };

  const handleRemove = (id: string) => {
    updateData(data.filter(e => e.id !== id));
  };

  const handleEdit = (id: string, field: keyof ResourcePlanEntry | string, value: any) => {
    const updatedPlan = data.map(e => {
      if (e.id === id) {
        let updated = { ...e };
        if (field === 'totalHours') {
          const totalHours = parseFloat(value) || 0;
          updated.hoursPerWeek = e.weeks > 0 ? totalHours / e.weeks : totalHours;
          
          // Distribute hours across weeks
          const newWeekly: Record<string, number> = {};
          const hoursPerWeek = e.weeks > 0 ? Math.round(totalHours / e.weeks) : totalHours;
          
          weeks.forEach((w) => {
            newWeekly[w] = hoursPerWeek;
          });
          
          updated.weeklyAllocation = newWeekly;
          updated.dailyAllocation = {}; // Clear daily if we're setting a total via summary
        } else {
          (updated as any)[field] = value;
          
          // Default country when role is selected
          if (field === 'role' && value) {
            const validCountries = getValidCountries(value);
            const exactMatch = validCountries.find(v => v.country === projectSummary.country && v.currency === projectSummary.currency);
            const matchingCountry = validCountries.find(v => v.country === projectSummary.country);
            const matchingCurrency = validCountries.find(v => v.currency === projectSummary.currency);
            
            const defaultEntry = exactMatch || matchingCountry || matchingCurrency || validCountries[0];
            if (defaultEntry) {
              updated.country = defaultEntry.country;
              updated.currency = defaultEntry.currency;
            }
          }

          if (field === 'weeks' || field === 'hoursPerWeek') {
            updated.dailyAllocation = {};
            updated.weeklyAllocation = {};
          }
        }
        return recalculateEntry(updated, rateCard);
      }
      return e;
    });
    updateData(updatedPlan);
  };

  const handleDailyEdit = (id: string, date: string, hours: number) => {
    const updatedPlan = data.map(e => {
      if (e.id === id) {
        const roundedHours = Math.round(hours);
        const dailyAllocation = { ...(e.dailyAllocation || {}), [date]: roundedHours };
        
        // Update weekly allocation based on daily
        const weeklyAllocation = { ...(e.weeklyAllocation || {}) };
        const dateObj = parseDateLocal(date);
        while (dateObj.getDay() !== 1) {
          dateObj.setDate(dateObj.getDate() - 1);
        }
        const weekStart = formatDateLocal(dateObj);
        const daysInWeek = getAllDaysInWeek(weekStart, projectSummary.startDate, projectSummary.endDate);
        const weekTotal = daysInWeek.reduce((sum, d) => sum + (dailyAllocation[d] || 0), 0);
        weeklyAllocation[weekStart] = Math.round(weekTotal);

        const updated = {
          ...e,
          dailyAllocation,
          weeklyAllocation
        };
        return recalculateEntry(updated, rateCard);
      }
      return e;
    });
    updateData(updatedPlan);
  };

  const handleWeeklyEdit = (id: string, weekStart: string, hours: number) => {
    const updatedPlan = data.map(e => {
      if (e.id === id) {
        const roundedHours = Math.round(hours);
        const weeklyAllocation = { ...(e.weeklyAllocation || {}), [weekStart]: roundedHours };
        const dailyAllocation = { ...(e.dailyAllocation || {}) };
        
        // Distribute weekly hours to daily
        const daysInWeek = getAllDaysInWeek(weekStart, projectSummary.startDate, projectSummary.endDate);
        if (daysInWeek.length > 0) {
          const baseHours = Math.floor(roundedHours / daysInWeek.length);
          const remainder = roundedHours % daysInWeek.length;
          daysInWeek.forEach((d, idx) => {
            dailyAllocation[d] = baseHours + (idx < remainder ? 1 : 0);
          });
        }

        const updated = {
          ...e,
          dailyAllocation,
          weeklyAllocation
        };
        return recalculateEntry(updated, rateCard);
      }
      return e;
    });
    updateData(updatedPlan);
  };

  const handlePaste = (e: React.ClipboardEvent, startEntryId: string, startColKey: string) => {
    e.preventDefault();
    const clipboardData = e.clipboardData.getData('text/plain');
    if (!clipboardData) return;

    const rows = clipboardData.split(/\r?\n/).filter(row => row.trim() !== '').map(row => row.split('\t'));
    const startRowIndex = data.findIndex(entry => entry.id === startEntryId);
    if (startRowIndex === -1) return;

    let colKeys: string[] = [];
    if (viewMode === 'daily') colKeys = allDays;
    else if (viewMode === 'weekly') colKeys = weeks;
    else colKeys = ['weeks', 'totalHours'];

    const startColIndex = colKeys.indexOf(startColKey);
    if (startColIndex === -1) return;

    const newData = [...data];
    
    rows.forEach((rowValues, rowOffset) => {
      const rowIndex = startRowIndex + rowOffset;
      if (rowIndex >= newData.length) return;

      let entry = { ...newData[rowIndex] };
      let changed = false;

      rowValues.forEach((value, colOffset) => {
        const colIndex = startColIndex + colOffset;
        if (colIndex >= colKeys.length) return;

        const colKey = colKeys[colIndex];
        const numValue = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;

        if (viewMode === 'daily') {
          const roundedNumValue = Math.round(numValue);
          entry.dailyAllocation = { ...(entry.dailyAllocation || {}), [colKey]: roundedNumValue };
          
          // Update weekly allocation
          const dateObj = parseDateLocal(colKey);
          while (dateObj.getDay() !== 1) dateObj.setDate(dateObj.getDate() - 1);
          const weekStart = formatDateLocal(dateObj);
          const daysInWeek = getAllDaysInWeek(weekStart, projectSummary.startDate, projectSummary.endDate);
          const weekTotal = daysInWeek.reduce((sum, d) => sum + (entry.dailyAllocation?.[d] || 0), 0);
          entry.weeklyAllocation = { ...(entry.weeklyAllocation || {}), [weekStart]: Math.round(weekTotal) };
          changed = true;
        } else if (viewMode === 'weekly') {
          const roundedNumValue = Math.round(numValue);
          entry.weeklyAllocation = { ...(entry.weeklyAllocation || {}), [colKey]: roundedNumValue };
          
          // Distribute to daily
          const daysInWeek = getAllDaysInWeek(colKey, projectSummary.startDate, projectSummary.endDate);
          if (daysInWeek.length > 0) {
            const baseHours = Math.floor(roundedNumValue / daysInWeek.length);
            const remainder = roundedNumValue % daysInWeek.length;
            const daily = { ...(entry.dailyAllocation || {}) };
            daysInWeek.forEach((d, idx) => { 
              daily[d] = baseHours + (idx < remainder ? 1 : 0); 
            });
            entry.dailyAllocation = daily;
          }
          changed = true;
        } else {
          if (colKey === 'weeks' || colKey === 'hoursPerWeek' || colKey === 'totalHours') {
            if (colKey === 'totalHours') {
              entry.hoursPerWeek = entry.weeks > 0 ? numValue / entry.weeks : numValue;
            } else {
              (entry as any)[colKey] = numValue;
            }
            // Clear daily/weekly allocations when editing summary fields to ensure consistency
            entry.dailyAllocation = {};
            entry.weeklyAllocation = {};
            changed = true;
          }
        }
      });

      if (changed) {
        newData[rowIndex] = recalculateEntry(entry, rateCard);
      }
    });

    updateData(newData);
  };

  const getSelectedRange = () => {
    if (!selection.start || !selection.end) return null;

    const rowIds = data.map(d => d.id);
    let colKeys: string[] = [];
    if (viewMode === 'daily') colKeys = allDays;
    else if (viewMode === 'weekly') colKeys = weeks;
    else colKeys = ['weeks', 'totalHours'];

    const startRowIdx = rowIds.indexOf(selection.start.id);
    const endRowIdx = rowIds.indexOf(selection.end.id);
    const startColIdx = colKeys.indexOf(selection.start.col);
    const endColIdx = colKeys.indexOf(selection.end.col);

    if (startRowIdx === -1 || endRowIdx === -1 || startColIdx === -1 || endColIdx === -1) return null;

    return {
      minRow: Math.min(startRowIdx, endRowIdx),
      maxRow: Math.max(startRowIdx, endRowIdx),
      minCol: Math.min(startColIdx, endColIdx),
      maxCol: Math.max(startColIdx, endColIdx),
      colKeys
    };
  };

  const handleCopy = (e: React.ClipboardEvent | React.KeyboardEvent) => {
    const range = getSelectedRange();
    if (!range) return;

    let text = '';
    for (let r = range.minRow; r <= range.maxRow; r++) {
      const row = data[r];
      const rowValues = [];
      for (let c = range.minCol; c <= range.maxCol; c++) {
        const colKey = range.colKeys[c];
        let val = 0;
        if (viewMode === 'daily') val = row.dailyAllocation?.[colKey] || 0;
        else if (viewMode === 'weekly') val = row.weeklyAllocation?.[colKey] || 0;
        else if (colKey === 'totalHours') {
          val = row.dailyAllocation && Object.keys(row.dailyAllocation).length > 0
            ? Object.values(row.dailyAllocation).reduce((sum, h) => sum + (h || 0), 0)
            : row.weeks * row.hoursPerWeek;
        }
        else val = (row as any)[colKey] || 0;
        rowValues.push(val);
      }
      text += rowValues.join('\t') + (r === range.maxRow ? '' : '\n');
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  const isCellSelected = (entryId: string, colKey: string) => {
    const range = getSelectedRange();
    if (!range) return false;

    const rowIdx = data.findIndex(d => d.id === entryId);
    const colIdx = range.colKeys.indexOf(colKey);

    return rowIdx >= range.minRow && rowIdx <= range.maxRow &&
           colIdx >= range.minCol && colIdx <= range.maxCol;
  };

  const handleAddDay = (count: number = 1) => {
    const actualCount = Math.max(1, count);
    let currentEnd = projectSummary.endDate;
    const newPhaseAllocation = { ...(phaseAllocation || {}) };
    const weekendPhase = phases?.find(p => p.name.toLowerCase() === 'weekend');
    
    for (let i = 0; i < actualCount; i++) {
      currentEnd = getNextDay(currentEnd);
      if (!isBusinessDay(parseDateLocal(currentEnd)) && weekendPhase) {
        newPhaseAllocation[currentEnd] = weekendPhase.id;
      }
    }
    updateProjectSummary({ endDate: currentEnd });
    updatePhaseAllocation(newPhaseAllocation);
  };

  const handleRemoveDay = (count: number = 1) => {
    const actualCount = Math.max(1, count);
    let currentEnd = parseDateLocal(projectSummary.endDate);
    for (let i = 0; i < actualCount; i++) {
      currentEnd.setDate(currentEnd.getDate() - 1);
      if (currentEnd <= parseDateLocal(projectSummary.startDate)) break;
    }
    const newEndDate = formatDateLocal(currentEnd);
    
    // Remove days after newEndDate
    const updatedData = data.map(entry => {
      const dailyAllocation = { ...entry.dailyAllocation };
      Object.keys(dailyAllocation).forEach(day => {
        if (day > newEndDate) {
          delete dailyAllocation[day];
        }
      });
      return { ...entry, dailyAllocation };
    });
    
    updateProjectAndData({ endDate: newEndDate }, updatedData);
  };

  const handleCellMouseDown = (entryId: string, colKey: string) => {
    setSelection({ start: { id: entryId, col: colKey }, end: { id: entryId, col: colKey } });
    setIsSelecting(true);
  };

  const handleCellMouseEnter = (entryId: string, colKey: string) => {
    if (isSelecting) {
      setSelection(prev => ({ ...prev, end: { id: entryId, col: colKey } }));
    }
  };

  const handleGlobalMouseUp = () => {
    setIsSelecting(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const range = getSelectedRange();
        if (range) {
          handleCopy(e as any);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selection, data, viewMode]);

  const effectiveStartDate = projectSummary.startDate || formatDateLocal(new Date());
  const effectiveEndDate = projectSummary.endDate || (() => {
    const d = parseDateLocal(effectiveStartDate);
    d.setDate(d.getDate() + ((projectSummary.duration || 1) * 7));
    return formatDateLocal(d);
  })();

  const allDays = getAllDays(effectiveStartDate, effectiveEndDate);
  const weeks = getWeeks(effectiveStartDate, effectiveEndDate);

  const totalCost = data.reduce((acc, curr) => acc + curr.totalCost, 0);
  const totalPrice = data.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalMargin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;

  const getRateInfo = (role: string, country: string, currency?: string) => {
    if (currency) {
      return rateCard.find(r => r.role === role && r.country === country && r.currency === currency)
             || rateCard.find(r => r.role === role && r.country === country)
             || rateCard.find(r => r.role === role)
             || { currency: 'USD' };
    }
    return rateCard.find(r => r.role === role && r.country === country)
           || rateCard.find(r => r.role === role)
           || { currency: 'USD' };
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = data.findIndex((item) => item.id === active.id);
      const newIndex = data.findIndex((item) => item.id === over.id);
      
      const newData = arrayMove(data, oldIndex, newIndex);
      updateData(newData);
    }
  };

  const commonRowProps = {
    rateCard,
    uniqueRoles,
    getValidCountries,
    data,
    updateData,
    handleEdit,
    viewMode,
    isCellSelected,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleDailyEdit,
    handleWeeklyEdit,
    handlePaste,
    handleRemove,
    getRateInfo,
    allDays,
    weeks,
    projectSummary
  };

  const commonTableProps = {
    viewMode,
    allDays,
    weeks,
    data,
    sensors,
    handleDragEnd,
    rowsToAdd,
    setRowsToAdd,
    handleAddNewRow,
    handleRemoveDay,
    projectSummary,
    updateProjectSummary,
    phases,
    phaseAllocation,
    updatePhaseAllocation,
    ...commonRowProps
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          >
            <motion.div 
              layoutId="resource-plan-card"
              className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
            >
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Resource Allocation Plan</h2>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Full View Mode</p>
                    </div>
                  </div>
                  
                  <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />

                  {viewMode === 'daily' && (
                    <div className="flex items-center gap-2">
                      <NumericInput
                        value={daysToAdd}
                        onChange={(val) => setDaysToAdd(val)}
                        isInteger={true}
                        className="w-16 h-8"
                      />
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleAddDay(daysToAdd)}
                          className="h-8 border-blue-200 text-blue-600 hover:bg-blue-50 gap-2"
                        >
                          <Plus className="w-3 h-3" />
                          Add Days
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRemoveDay(daysToAdd)}
                          className="h-8 border-red-100 text-red-600 hover:bg-red-50 gap-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} className="rounded-full hover:bg-gray-200">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex-1 min-h-0 w-full overflow-auto p-0 bg-white">
                <ResourceTable isFullView {...commonTableProps} />
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50/50 grid grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Total Cost</p>
                  <p className="text-lg font-bold text-gray-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.ceil(totalCost))}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Total Price</p>
                  <p className="text-lg font-bold text-gray-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.ceil(totalPrice))}</p>
                </div>
                <div className="bg-blue-600 p-3 rounded-lg shadow-sm text-white">
                  <p className="text-[10px] font-bold uppercase text-blue-100 mb-1">Margin</p>
                  <p className="text-lg font-bold">{totalMargin.toFixed(1)}%</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card id="resource-plan-main-card" className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader id="resource-plan-header" className="bg-gray-50 border-b border-gray-200 py-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-4">
            <CardTitle id="resource-plan-title" className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Resource Allocation Plan
            </CardTitle>
            <ViewModeToggle size="sm" viewMode={viewMode} setViewMode={setViewMode} />
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'daily' && (
              <div id="add-days-controls" className="flex items-center gap-2">
                <NumericInput
                  value={daysToAdd}
                  onChange={(val) => setDaysToAdd(val)}
                  isInteger={true}
                  className="w-12 h-8 text-xs"
                />
                <div className="flex gap-1">
                  <Button 
                    id="btn-add-days"
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAddDay(daysToAdd)}
                    className="h-8 border-blue-200 text-blue-600 hover:bg-blue-50 px-2"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button 
                    id="btn-remove-days"
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleRemoveDay(daysToAdd)}
                    className="h-8 border-red-100 text-red-600 hover:bg-red-50 px-2"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
            <Button 
              id="btn-expand-view"
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(true)}
              className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Expand View</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent id="resource-plan-content" className="p-0">
          <ResourceTable {...commonTableProps} />
        </CardContent>
      </Card>

      <div id="resource-financial-summary" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card id="card-total-cost" className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Planned Cost (Base)</p>
                <p className="text-2xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: projectSummary.currency || 'USD', maximumFractionDigits: 0 }).format(Math.ceil(totalCost))}</p>
              </div>
              <div className="bg-red-50 p-2 rounded-lg">
                <Calculator className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card id="card-total-price" className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Planned Price (Base)</p>
                <p className="text-2xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: projectSummary.currency || 'USD', maximumFractionDigits: 0 }).format(Math.ceil(totalPrice))}</p>
              </div>
              <div className="bg-green-50 p-2 rounded-lg">
                <Calculator className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card id="card-planned-margin" className="bg-blue-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Planned Margin</p>
                <p className="text-2xl font-bold">{totalMargin.toFixed(1)}%</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <Info className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
