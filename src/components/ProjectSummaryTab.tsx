import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectSummary, ResourcePlanEntry, RateCardEntry, Phase, ProjectTemplate } from '../types';
import { 
  Calendar as CalendarIcon, 
  Link as LinkIcon, 
  Globe, 
  User, 
  Briefcase, 
  TrendingUp, 
  Copy, 
  Check, 
  Save, 
  FileJson, 
  Trash2, 
  PlusCircle, 
  Download,
  X,
  Loader2,
  Info,
  Users,
  Pencil,
  LayoutGrid,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  data: ProjectSummary;
  countries: { id: string; name: string; currency: string }[];
  updateData: (summary: Partial<ProjectSummary>) => void;
  resourcePlan: ResourcePlanEntry[];
  rateCard: RateCardEntry[];
  phases: Phase[];
  phaseAllocation: Record<string, string>;
  templates: ProjectTemplate[];
  onSaveAsTemplate: (name: string, description: string) => void;
  onUpdateTemplate: (id: string, name: string, description: string, updateData?: boolean) => void;
  onApplyTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
}

export default function ProjectSummaryTab({ 
  data, 
  countries, 
  updateData,
  resourcePlan,
  rateCard,
  phases,
  phaseAllocation,
  templates,
  onSaveAsTemplate,
  onUpdateTemplate,
  onApplyTemplate,
  onDeleteTemplate
}: Props) {
  const [copied, setCopied] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [shouldUpdateData, setShouldUpdateData] = useState(false);
  const [templateViewMode, setTemplateViewMode] = useState<'card' | 'list'>('card');

  const copyTableToClipboard = async () => {
    const tableHtml = `
      <table border="1" style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Phase</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Hours</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Optimistic (${globalOptimistic}%)</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Most Likely</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Pessimistic (${globalPessimistic}%)</th>
          </tr>
        </thead>
        <tbody>
          ${visiblePhases.map(phase => {
            const mostLikely = phasePrices[phase.id] || 0;
            const hours = phaseHours[phase.id] || 0;
            if (hours === 0 && mostLikely === 0) return '';
            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${phase.name}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${hours.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">${getCurrencyPrefix(data.currency)} ${(mostLikely * (1 + globalOptimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: bold;">${getCurrencyPrefix(data.currency)} ${mostLikely.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">${getCurrencyPrefix(data.currency)} ${(mostLikely * (1 + globalPessimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              </tr>
            `;
          }).join('')}
          ${systemPhases.some(p => (phaseHours[p.id] || 0) > 0) ? `
            <tr style="background-color: #f9fafb; font-style: italic; color: #111827;">
              <td style="padding: 8px; border: 1px solid #e5e7eb; padding-left: 20px;">System Phases (Weekend, etc.)</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${systemPhases.reduce((sum, p) => sum + (phaseHours[p.id] || 0), 0).toLocaleString()}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(data.currency)} ${systemPhases.reduce((sum, p) => sum + ((phasePrices[p.id] || 0) * (1 + globalOptimistic / 100)), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(data.currency)} ${systemPhases.reduce((sum, p) => sum + (phasePrices[p.id] || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(data.currency)} ${systemPhases.reduce((sum, p) => sum + ((phasePrices[p.id] || 0) * (1 + globalPessimistic / 100)), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            </tr>
          ` : ''}
          ${unassignedHours > 0 ? `
            <tr style="background-color: #fffbeb; font-style: italic; color: #111827;">
              <td style="padding: 8px; border: 1px solid #e5e7eb; padding-left: 20px;">Unassigned Hours</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${unassignedHours.toLocaleString()}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(data.currency)} ${(unassignedPrice * (1 + globalOptimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(data.currency)} ${unassignedPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(data.currency)} ${(unassignedPrice * (1 + globalPessimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            </tr>
          ` : ''}
          <tr style="background-color: #e5e7eb; font-weight: bold;">
            <td style="padding: 8px; border: 1px solid #e5e7eb;">Grand Total</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${totalHours.toLocaleString()}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">${getCurrencyPrefix(data.currency)} ${(totalMostLikely * (1 + globalOptimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">${getCurrencyPrefix(data.currency)} ${totalMostLikely.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">${getCurrencyPrefix(data.currency)} ${(totalMostLikely * (1 + globalPessimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
          </tr>
        </tbody>
      </table>
    `;

    try {
      const blob = new Blob([tableHtml], { type: 'text/html' });
      const dataItem = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([dataItem]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy table: ', err);
      // Fallback to plain text if HTML copy fails
      const text = `Phase\tHours\tOptimistic\tMost Likely\tPessimistic\n` + 
        visiblePhases.map(p => `${p.name}\t${phaseHours[p.id] || 0}\t${(phasePrices[p.id] || 0) * (1 + globalOptimistic / 100)}\t${phasePrices[p.id] || 0}\t${(phasePrices[p.id] || 0) * (1 + globalPessimistic / 100)}`).join('\n');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChange = (field: keyof ProjectSummary, value: string | number) => {
    if (field === 'startDate' && typeof value === 'string' && value > data.endDate) {
      updateData({ [field]: value, endDate: value });
    } else if (field === 'endDate' && typeof value === 'string' && value < data.startDate) {
      alert("End Date cannot be earlier than Start Date");
      return;
    } else {
      updateData({ [field]: value });
    }
  };

  // Get unique currencies from countries metadata
  const uniqueCurrencies = Array.from(new Set(countries.map(c => c.currency))).sort();

  const getCurrencyPrefix = (code: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'GBP': '£',
      'EUR': '€',
      'INR': '₹',
      'AUD': '$',
      'SGD': '$',
      'VND': '₫',
    };
    return `${code} ${symbols[code] || ''}`;
  };

  const calculatePhaseData = () => {
    const phasePrices: Record<string, number> = {};
    const phaseHours: Record<string, number> = {};
    let unassignedPrice = 0;
    let unassignedHours = 0;
    
    resourcePlan.forEach(entry => {
      const rate = (entry.currency 
                     ? rateCard.find(r => r.role === entry.role && r.country === entry.country && r.currency === entry.currency)
                     : null)
                 || rateCard.find(r => r.role === entry.role && r.country === entry.country)
                 || rateCard.find(r => r.role === entry.role)
                 || { billRate: 0 };
      
      const hourlyRate = rate.billRate;

      // Check if daily allocation has any non-zero values
      const dailyEntries = Object.entries(entry.dailyAllocation || {});
      const hasDaily = dailyEntries.some(([_, hours]) => hours > 0);

      if (hasDaily && entry.dailyAllocation) {
        dailyEntries.forEach(([date, hours]) => {
          if (hours <= 0) return;
          
          let phaseId = phaseAllocation[date];
          
          // Fallback to week phase if day phase is missing
          if (!phaseId || phaseId === 'none') {
            const dateObj = new Date(date);
            while (dateObj.getDay() !== 1) dateObj.setDate(dateObj.getDate() - 1);
            const weekStart = dateObj.toISOString().split('T')[0];
            phaseId = phaseAllocation[`week_${weekStart}`];
          }

          if (phaseId && phaseId !== 'none') {
            phasePrices[phaseId] = (phasePrices[phaseId] || 0) + (hours * hourlyRate);
            phaseHours[phaseId] = (phaseHours[phaseId] || 0) + hours;
          } else {
            unassignedPrice += hours * hourlyRate;
            unassignedHours += hours;
          }
        });
      } else if (entry.weeklyAllocation) {
        Object.entries(entry.weeklyAllocation).forEach(([weekStart, hours]) => {
          if (hours <= 0) return;
          const phaseId = phaseAllocation[`week_${weekStart}`];
          if (phaseId && phaseId !== 'none') {
            phasePrices[phaseId] = (phasePrices[phaseId] || 0) + (hours * hourlyRate);
            phaseHours[phaseId] = (phaseHours[phaseId] || 0) + hours;
          } else {
            unassignedPrice += hours * hourlyRate;
            unassignedHours += hours;
          }
        });
      }
    });

    return { phasePrices, phaseHours, unassignedPrice, unassignedHours };
  };

  const { phasePrices, phaseHours, unassignedPrice, unassignedHours } = calculatePhaseData();
  const visiblePhases = phases.filter(p => !p.isSystemOnly);
  const systemPhases = phases.filter(p => p.isSystemOnly);
  const globalOptimistic = data.globalOptimistic || 0;
  const globalPessimistic = data.globalPessimistic || 0;
  const totalHours = Object.values(phaseHours).reduce((a, b) => a + b, 0) + unassignedHours;
  const totalMostLikely = Object.values(phasePrices).reduce((a, b) => a + b, 0) + unassignedPrice;

  const handleSaveTemplate = () => {
    if (!templateName) return;
    setIsSavingTemplate(true);
    setTimeout(() => {
      if (editingTemplate) {
        onUpdateTemplate(editingTemplate.id, templateName, templateDescription, shouldUpdateData);
      } else {
        onSaveAsTemplate(templateName, templateDescription);
      }
      setTemplateName('');
      setTemplateDescription('');
      setEditingTemplate(null);
      setShouldUpdateData(false);
      setIsSavingTemplate(false);
      setIsTemplateModalOpen(false);
    }, 600);
  };

  const openEditModal = (template: ProjectTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description);
    setShouldUpdateData(false);
    setIsTemplateModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setShouldUpdateData(false);
    setIsTemplateModalOpen(true);
  };

  return (
    <div id="project-summary-tab" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card id="card-opportunity-details" className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Opportunity Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="opportunity" className="text-xs font-bold uppercase text-gray-500">Opportunity Name</Label>
            <Input
              id="opportunity"
              value={data.opportunity}
              onChange={(e) => handleChange('opportunity', e.target.value)}
              placeholder="e.g. Cloud Migration Phase 1"
              className="border-gray-300 focus:ring-blue-500"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account" className="text-xs font-bold uppercase text-gray-500">Account</Label>
            <Input
              id="account"
              value={data.account}
              onChange={(e) => handleChange('account', e.target.value)}
              placeholder="e.g. Acme Corp"
              className="border-gray-300 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="country" className="text-xs font-bold uppercase text-gray-500">Country</Label>
              <Select value={data.country} onValueChange={(v) => handleChange('country', v)}>
                <SelectTrigger id="country" className="border-gray-300">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency" className="text-xs font-bold uppercase text-gray-500">Currency</Label>
              <Select value={data.currency} onValueChange={(v) => handleChange('currency', v)}>
                <SelectTrigger id="currency" className="border-gray-300">
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCurrencies.map(curr => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="opportunityLink" className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1">
              <LinkIcon className="w-3 h-3" /> Opportunity Link
            </Label>
            <Input
              id="opportunityLink"
              value={data.opportunityLink}
              onChange={(e) => handleChange('opportunityLink', e.target.value)}
              placeholder="https://crm.example.com/opp/123"
              className="border-gray-300 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      <Card id="card-project-timeline" className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Project Timeline
          </CardTitle>
          <Button 
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-[10px] h-8 px-4"
          >
            <Save className="w-3 h-3 mr-2" />
            Save as Template
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate" className="text-xs font-bold uppercase text-gray-500">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={data.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="border-gray-300 focus:ring-blue-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate" className="text-xs font-bold uppercase text-gray-500">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={data.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="border-gray-300 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="duration" className="text-xs font-bold uppercase text-gray-500">Duration (Weeks)</Label>
              <Input
                id="duration"
                type="number"
                value={data.duration === 0 ? '' : data.duration}
                onFocus={(e) => {
                  if (data.duration === 0) {
                    handleChange('duration', '');
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    handleChange('duration', 0);
                  }
                }}
                onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
                className="border-gray-300 focus:ring-blue-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="commercials" className="text-xs font-bold uppercase text-gray-500">Commercials</Label>
              <Select value={data.commercials} onValueChange={(v) => handleChange('commercials', v)}>
                <SelectTrigger id="commercials" className="border-gray-300">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Time & Materials">Time & Materials</SelectItem>
                  <SelectItem value="Fixed Fee">Fixed Fee</SelectItem>
                  <SelectItem value="Retainer">Retainer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="pricingStage" className="text-xs font-bold uppercase text-gray-500">Pricing Stage</Label>
              <Input
                id="pricingStage"
                value={data.pricingStage}
                onChange={(e) => handleChange('pricingStage', e.target.value)}
                placeholder="e.g. Draft"
                className="border-gray-300 focus:ring-blue-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pricingType" className="text-xs font-bold uppercase text-gray-500">Pricing Type</Label>
              <Input
                id="pricingType"
                value={data.pricingType}
                onChange={(e) => handleChange('pricingType', e.target.value)}
                placeholder="e.g. Standard"
                className="border-gray-300 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card id="card-project-templates" className="border-gray-200 shadow-lg md:col-span-2 transition-all duration-300">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="grid gap-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileJson className="w-5 h-5 text-blue-600" />
              Project Templates
            </CardTitle>
            <CardDescription className="text-xs">
              Save current resource plan as a template or apply an existing one.
            </CardDescription>
          </div>
          <div className="flex p-1 bg-gray-100 rounded-lg border border-gray-200 shadow-inner">
            <button
              onClick={() => setTemplateViewMode('card')}
              className={cn(
                "p-1.5 rounded-md transition-all duration-200",
                templateViewMode === 'card' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTemplateViewMode('list')}
              className={cn(
                "p-1.5 rounded-md transition-all duration-200",
                templateViewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
              <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileJson className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No templates saved yet.</p>
              <p className="text-xs text-gray-400 mt-1">Save your first template to reuse resource planning across projects.</p>
            </div>
          ) : templateViewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div 
                  key={template.id} 
                  className="group relative bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-b-4 border-b-transparent hover:border-b-blue-500"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <FileJson className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditModal(template)}
                        className="h-7 w-7 text-gray-300 hover:text-blue-500 hover:bg-blue-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onDeleteTemplate(template.id)}
                        className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1 truncate">{template.name}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4 min-h-[2rem]">
                    {template.description || "No description provided."}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                      <Users className="w-3 h-3" />
                      {template.data.resourcePlan.length} Roles
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onApplyTemplate(template.id)}
                      className="h-7 text-[10px] font-bold uppercase tracking-wider border-blue-100 text-blue-600 hover:bg-blue-50"
                    >
                      <Download className="w-3 h-3 mr-1.5" />
                      Apply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-400">Template Name</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-400">Description</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 text-center">Roles</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} className="group hover:bg-blue-50/30 transition-colors">
                      <TableCell className="font-bold text-sm text-gray-900 py-3">
                        <div className="flex items-center gap-2">
                          <FileJson className="w-4 h-4 text-blue-600" />
                          {template.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-xs truncate">
                        {template.description || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-600 border-blue-100">
                          {template.data.resourcePlan.length} Roles
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onApplyTemplate(template.id)}
                            className="h-8 text-[10px] font-bold uppercase text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Download className="w-3 h-3 mr-1.5" />
                            Apply
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditModal(template)}
                            className="h-8 w-8 text-gray-300 hover:text-blue-500"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onDeleteTemplate(template.id)}
                            className="h-8 w-8 text-gray-300 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Template Modal */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  {editingTemplate ? <Pencil className="w-5 h-5 text-blue-600" /> : <Save className="w-5 h-5 text-blue-600" />}
                  <h2 className="text-xl font-bold text-gray-900">{editingTemplate ? 'Edit Template' : 'Save as Template'}</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsTemplateModalOpen(false)} className="rounded-full hover:bg-gray-200">
                  <X className="w-5 h-5 text-gray-500" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    {editingTemplate 
                      ? "Update the template's name and description. You can also choose to overwrite its resource data with the current project's plan."
                      : "This will save the current Resource Plan and Phase Allocations. You can apply this template to any new project to quickly populate its resources."
                    }
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name" className="text-xs font-bold uppercase tracking-wider text-gray-500">Template Name</Label>
                    <Input 
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                      placeholder="e.g. Standard Implementation"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-desc" className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</Label>
                    <Input 
                      id="template-desc"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                      placeholder="Briefly describe what this template is for..."
                    />
                  </div>

                  {editingTemplate && (
                    <div className="flex items-center space-x-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="update-data" 
                        checked={shouldUpdateData}
                        onChange={(e) => setShouldUpdateData(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Label htmlFor="update-data" className="text-sm text-gray-700 cursor-pointer">
                        Overwrite template data with current project plan
                      </Label>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsTemplateModalOpen(false)}
                    className="flex-1 h-11 rounded-xl font-bold border-gray-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveTemplate}
                    disabled={!templateName || isSavingTemplate}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 rounded-xl font-bold shadow-md shadow-blue-200 transition-all"
                  >
                    {isSavingTemplate ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingTemplate ? 'Update Template' : 'Create Template')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
