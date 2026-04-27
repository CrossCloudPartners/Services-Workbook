import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TenantSettings, RateCardEntry, Country, Phase, ProjectTemplate, AIAgentSettings } from '../types/index';

export function useTenant(tenantId: string | null) {
  const [settings, setSettings] = useState<TenantSettings>({
    rateCard: [],
    countries: [],
    phases: [],
    templates: [],
    aiAgentSettings: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    loadSettings(tenantId);
  }, [tenantId]);

  async function loadSettings(tid: string) {
    setLoading(true);
    const [rateCardRes, countriesRes, phasesRes, templatesRes, aiRes] = await Promise.all([
      supabase.from('rate_cards').select('*').eq('tenant_id', tid).order('role'),
      supabase.from('countries').select('*').eq('tenant_id', tid).order('name'),
      supabase.from('phases').select('*').eq('tenant_id', tid).order('sort_order'),
      supabase.from('project_templates').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('ai_agent_settings').select('*').eq('tenant_id', tid).maybeSingle(),
    ]);

    setSettings({
      rateCard: (rateCardRes.data as RateCardEntry[]) ?? [],
      countries: (countriesRes.data as Country[]) ?? [],
      phases: (phasesRes.data as Phase[]) ?? [],
      templates: (templatesRes.data as ProjectTemplate[]) ?? [],
      aiAgentSettings: (aiRes.data as AIAgentSettings | null) ?? null,
    });
    setLoading(false);
  }

  async function refreshSettings() {
    if (!tenantId) return;
    await loadSettings(tenantId);
  }

  async function updateRateCard(entries: RateCardEntry[]) {
    setSettings((s) => ({ ...s, rateCard: entries }));
  }

  async function updateCountries(countries: Country[]) {
    setSettings((s) => ({ ...s, countries }));
  }

  async function updatePhases(phases: Phase[]) {
    setSettings((s) => ({ ...s, phases }));
  }

  async function updateTemplates(templates: ProjectTemplate[]) {
    setSettings((s) => ({ ...s, templates }));
  }

  async function updateAISettings(ai: AIAgentSettings) {
    setSettings((s) => ({ ...s, aiAgentSettings: ai }));
  }

  return {
    settings,
    loading,
    refreshSettings,
    updateRateCard,
    updateCountries,
    updatePhases,
    updateTemplates,
    updateAISettings,
  };
}
