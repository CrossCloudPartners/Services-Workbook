import { useState, useEffect } from 'react';
import { ExternalLink, Save, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectSummary, Country, ProjectTemplate } from '../../types/index';
import { calcProjectDurationWeeks } from '../../lib/formatting';
import { supabase } from '../../lib/supabase';

interface Props {
  summary: ProjectSummary | null;
  countries: Country[];
  templates: ProjectTemplate[];
  tenantId: string;
  onSave: (summary: Partial<ProjectSummary>) => Promise<void>;
  onTemplatesUpdated: () => void;
}

const PRICING_STAGES = ['Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const PRICING_TYPES = ['Time & Materials', 'Fixed Price', 'Managed Service', 'Subscription'];
const CURRENCIES = ['USD', 'GBP', 'EUR', 'AUD', 'SGD', 'INR', 'ZAR'];

export default function ProjectSummaryTab({ summary, countries, templates, tenantId, onSave, onTemplatesUpdated }: Props) {
  const [form, setForm] = useState<Partial<ProjectSummary>>(summary ?? {});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

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
      return updated;
    });
  }

  async function handleSave() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  async function handleCopy() {
    const text = [
      `Opportunity: ${form.opportunity ?? ''}`,
      `Account: ${form.account ?? ''}`,
      `Country: ${form.country ?? ''}`,
      `Start Date: ${form.start_date ?? ''}`,
      `End Date: ${form.end_date ?? ''}`,
      `Duration: ${form.duration ?? 0} weeks`,
      `Currency: ${form.currency ?? ''}`,
      `Pricing Stage: ${form.pricing_stage ?? ''}`,
      `Pricing Type: ${form.pricing_type ?? ''}`,
      `Engagement Manager: ${form.engagement_manager ?? ''}`,
      `Project Manager: ${form.project_manager ?? ''}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Project Summary</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Opportunity Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Opportunity Name">
            <Input value={form.opportunity ?? ''} onChange={(e) => update('opportunity', e.target.value)} placeholder="e.g. Digital Transformation Phase 1" className="border-gray-200" />
          </Field>
          <Field label="Account Name">
            <Input value={form.account ?? ''} onChange={(e) => update('account', e.target.value)} placeholder="e.g. Acme Corporation" className="border-gray-200" />
          </Field>
          <Field label="Country">
            <Select value={form.country ?? ''} onValueChange={(v) => update('country', v)}>
              <SelectTrigger className="border-gray-200">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Commercials">
            <Input value={form.commercials ?? ''} onChange={(e) => update('commercials', e.target.value)} placeholder="e.g. Quoted, MSA in place" className="border-gray-200" />
          </Field>
          <Field label="Opportunity Link">
            <div className="flex gap-2">
              <Input value={form.opportunity_link ?? ''} onChange={(e) => update('opportunity_link', e.target.value)} placeholder="https://..." className="border-gray-200 flex-1" />
              {form.opportunity_link && (
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => window.open(form.opportunity_link, '_blank')}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Schedule & Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Start Date">
            <Input type="date" value={form.start_date ?? ''} onChange={(e) => update('start_date', e.target.value)} className="border-gray-200" />
          </Field>
          <Field label="End Date">
            <Input type="date" value={form.end_date ?? ''} onChange={(e) => update('end_date', e.target.value)} className="border-gray-200" />
          </Field>
          <Field label="Duration (weeks)">
            <Input value={form.duration ?? 0} readOnly className="border-gray-200 bg-gray-50 text-gray-600" />
          </Field>
          <Field label="Currency">
            <Select value={form.currency ?? 'USD'} onValueChange={(v) => update('currency', v)}>
              <SelectTrigger className="border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Exchange Rate">
            <Input type="number" value={form.exchange_rate ?? 1} onChange={(e) => update('exchange_rate', parseFloat(e.target.value) || 1)} step="0.0001" className="border-gray-200" />
          </Field>
          <Field label="Pricing Stage">
            <Select value={form.pricing_stage ?? ''} onValueChange={(v) => update('pricing_stage', v)}>
              <SelectTrigger className="border-gray-200">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {PRICING_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Pricing Type">
            <Select value={form.pricing_type ?? ''} onValueChange={(v) => update('pricing_type', v)}>
              <SelectTrigger className="border-gray-200">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PRICING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Team</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Regional Lead">
            <Input value={form.regional_lead ?? ''} onChange={(e) => update('regional_lead', e.target.value)} className="border-gray-200" />
          </Field>
          <Field label="Regional Services Lead">
            <Input value={form.regional_services_lead ?? ''} onChange={(e) => update('regional_services_lead', e.target.value)} className="border-gray-200" />
          </Field>
          <Field label="Success Partner">
            <Input value={form.success_partner ?? ''} onChange={(e) => update('success_partner', e.target.value)} className="border-gray-200" />
          </Field>
          <Field label="Engagement Manager">
            <Input value={form.engagement_manager ?? ''} onChange={(e) => update('engagement_manager', e.target.value)} className="border-gray-200" />
          </Field>
          <Field label="Project Manager">
            <Input value={form.project_manager ?? ''} onChange={(e) => update('project_manager', e.target.value)} className="border-gray-200" />
          </Field>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Templates</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleSaveTemplate} className="gap-1.5">
            <Save className="w-3.5 h-3.5" />
            Save as Template
          </Button>
          {templates.length > 0 && (
            <Select onValueChange={handleApplyTemplate}>
              <SelectTrigger className="w-52 border-gray-200 h-8 text-sm">
                <SelectValue placeholder="Apply template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-gray-600 mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
