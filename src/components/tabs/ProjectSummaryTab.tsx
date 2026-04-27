import { useState, useEffect, useRef } from 'react';
import { ExternalLink, CircleCheck as CheckCircle, Briefcase, Calendar, FileText, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectSummary, Country, ProjectTemplate } from '../../types/index';
import { calcProjectDurationWeeks } from '../../lib/formatting';
import { supabase } from '../../lib/supabase';
import { cn } from '@/lib/utils';

interface Props {
  summary: ProjectSummary | null;
  countries: Country[];
  templates: ProjectTemplate[];
  tenantId: string;
  onSave: (summary: Partial<ProjectSummary>) => Promise<void>;
  onTemplatesUpdated: () => void;
  onRenameProject?: (name: string) => void;
}

const PRICING_STAGES = ['Draft', 'In Progress', 'In Review', 'Approved', 'Cancelled'];
const COMMERCIALS = ['Time & Materials', 'Fixed Price', 'Managed Service', 'Subscription'];
const CURRENCIES = ['USD', 'GBP', 'EUR', 'AUD', 'SGD', 'INR', 'ZAR'];

export default function ProjectSummaryTab({ summary, countries, templates, tenantId, onSave, onTemplatesUpdated, onRenameProject }: Props) {
  const [form, setForm] = useState<Partial<ProjectSummary>>(summary ?? { pricing_stage: 'Draft' });
  const [templateView, setTemplateView] = useState<'card' | 'list'>('card');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (summary) setForm(summary);
  }, [summary]);

  function update(field: keyof ProjectSummary, value: string | number) {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      if (field === 'start_date' || field === 'end_date') {
        updated.duration = calcProjectDurationWeeks(
          field === 'start_date' ? (value as string) : (f.start_date ?? null),
          field === 'end_date' ? (value as string) : (f.end_date ?? null)
        );
      }

      // Auto-rename project when account or opportunity changes
      const account = field === 'account' ? (value as string) : (updated.account ?? '');
      const opportunity = field === 'opportunity' ? (value as string) : (updated.opportunity ?? '');
      if (account && opportunity && onRenameProject) {
        onRenameProject(`${account} - ${opportunity}`);
      }

      // Debounced auto-save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSave(updated);
      }, 600);

      return updated;
    });
  }

  async function handleSaveTemplate() {
    const name = window.prompt('Template name?');
    if (!name) return;
    await supabase.from('project_templates').insert({
      tenant_id: tenantId,
      name,
      description: `${form.opportunity ?? ''} — ${form.account ?? ''}`,
      data: form,
    });
    onTemplatesUpdated();
  }

  async function handleApplyTemplate(templateId: string) {
    const t = templates.find((t) => t.id === templateId);
    if (!t) return;
    const confirmed = window.confirm('Apply template? This will overwrite current project summary.');
    if (!confirmed) return;
    const templateData = t.data as Partial<ProjectSummary>;
    setForm(templateData);
    await onSave(templateData);
  }

  const currentStageIndex = PRICING_STAGES.findIndex(
    (s) => s.toLowerCase() === (form.pricing_stage ?? 'draft').toLowerCase()
  );

  return (
    <div className="space-y-5">
      {/* Pricing Stage Progress Bar */}
      <PricingStageTracker
        stages={PRICING_STAGES}
        currentIndex={currentStageIndex === -1 ? 0 : currentStageIndex}
        onStageChange={(stage) => update('pricing_stage', stage)}
      />

      {/* Two-column main cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Opportunity Details */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="text-blue-600">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Opportunity Details</h3>
          </div>

          <div className="space-y-4">
            <Field label="Opportunity Name">
              <Input
                value={form.opportunity ?? ''}
                onChange={(e) => update('opportunity', e.target.value)}
                placeholder="e.g. CS Cloud"
                className="border-gray-200 h-10"
              />
            </Field>

            <Field label="Account">
              <Input
                value={form.account ?? ''}
                onChange={(e) => update('account', e.target.value)}
                placeholder="e.g. Customer Driven"
                className="border-gray-200 h-10"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Country">
                <Select value={form.country ?? ''} onValueChange={(v) => update('country', v)}>
                  <SelectTrigger className="border-gray-200 h-10">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Currency">
                <Select value={form.currency ?? 'USD'} onValueChange={(v) => update('currency', v)}>
                  <SelectTrigger className="border-gray-200 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Opportunity Link">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                  </span>
                  <Input
                    value={form.opportunity_link ?? ''}
                    onChange={(e) => update('opportunity_link', e.target.value)}
                    placeholder="https://crm.example.com/opp/123"
                    className="border-gray-200 h-10 pl-8 text-sm"
                  />
                </div>
                {form.opportunity_link && (
                  <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => window.open(form.opportunity_link, '_blank')}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </Field>
          </div>
        </div>

        {/* Project Timeline */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="text-blue-600">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Project Timeline</h3>
            </div>
            <Button
              size="sm"
              onClick={handleSaveTemplate}
              className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-8 text-xs font-semibold uppercase tracking-wide px-3"
            >
              <FileText className="w-3.5 h-3.5" />
              Save as Template
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date">
                <Input
                  type="date"
                  value={form.start_date ?? ''}
                  onChange={(e) => update('start_date', e.target.value)}
                  className="border-gray-200 h-10"
                />
              </Field>
              <Field label="End Date">
                <Input
                  type="date"
                  value={form.end_date ?? ''}
                  onChange={(e) => update('end_date', e.target.value)}
                  className="border-gray-200 h-10"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Duration (Weeks)">
                <Input
                  value={form.duration ?? 0}
                  readOnly
                  className="border-gray-200 h-10 bg-gray-50 text-gray-600"
                />
              </Field>
              <Field label="Commercials">
                <Select value={form.commercials ?? ''} onValueChange={(v) => update('commercials', v)}>
                  <SelectTrigger className="border-gray-200 h-10">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMERCIALS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Pricing Stage">
                <Input
                  value={form.pricing_stage ?? ''}
                  onChange={(e) => update('pricing_stage', e.target.value)}
                  placeholder="e.g. Approved"
                  className="border-gray-200 h-10"
                />
              </Field>
              <Field label="Pricing Type">
                <Input
                  value={form.pricing_type ?? ''}
                  onChange={(e) => update('pricing_type', e.target.value)}
                  placeholder="e.g. Standard"
                  className="border-gray-200 h-10"
                />
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* Project Templates */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-gray-900">Project Templates</h3>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setTemplateView('card')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                templateView === 'card' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              )}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTemplateView('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                templateView === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-1">
          Save current resource plan as a template or{' '}
          {templates.length > 0 ? (
            <Select onValueChange={handleApplyTemplate}>
              <SelectTrigger className="inline-flex w-auto h-auto border-0 p-0 text-blue-600 text-sm font-normal shadow-none focus:ring-0 gap-0.5">
                <SelectValue placeholder="apply an existing one" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-blue-600">apply an existing one</span>
          )}
          .
        </p>

        {templates.length > 0 && (
          templateView === 'card' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleApplyTemplate(t.id)}
                  className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{t.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 mt-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2.5 px-1 rounded hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleApplyTemplate(t.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                    {t.description && (
                      <p className="text-xs text-gray-400 truncate">{t.description}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleApplyTemplate(t.id); }}
                    className="ml-4 text-xs text-blue-600 font-medium hover:underline flex-shrink-0"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function PricingStageTracker({
  stages,
  currentIndex,
  onStageChange,
}: {
  stages: string[];
  currentIndex: number;
  onStageChange?: (stage: string) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex">
        {stages.map((stage, i) => {
          const isActive = i === currentIndex;
          const isPast = i < currentIndex;
          const isCancelled = stage === 'Cancelled';
          const isFirst = i === 0;
          const isLast = i === stages.length - 1;

          return (
            <div
              key={stage}
              onClick={() => onStageChange?.(stage)}
              className={cn(
                'relative flex-1 flex items-center justify-center py-5 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer select-none',
                isActive && !isCancelled
                  ? 'bg-blue-600 text-white'
                  : isActive && isCancelled
                  ? 'bg-gray-300 text-gray-500'
                  : isPast
                  ? 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100',
                i > 0 && 'ml-[-2px]'
              )}
              style={{
                clipPath: isFirst
                  ? isLast
                    ? 'none'
                    : 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)'
                  : isLast
                  ? 'polygon(20px 0, 100% 0, 100% 100%, 20px 100%, 0 50%)'
                  : 'polygon(20px 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 20px 100%, 0 50%)',
              }}
            >
              {isActive && !isCancelled && (
                <CheckCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              )}
              <span>{stage}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
        {label}
      </Label>
      {children}
    </div>
  );
}
