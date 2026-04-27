import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Project,
  ProjectData,
  ProjectSummary,
  FinancialSummary,
  FinancialItem,
  PaymentMilestone,
  PricingScenario,
  ChangeHistoryEntry,
  ProjectPO,
  ResourcePlanEntry,
  ResourceAllocation,
  PhaseAllocation,
} from '../types/index';

export function useProjects(userId: string | null, tenantId: string | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !tenantId) return;
    loadProjects(userId, tenantId);
  }, [userId, tenantId]);

  async function loadProjects(uid: string, tid: string) {
    setLoading(true);

    const [ownedRes, userEmailRes] = await Promise.all([
      supabase.from('projects').select('*').eq('tenant_id', tid).eq('owner_id', uid).order('updated_at', { ascending: false }),
      supabase.from('users').select('email').eq('uid', uid).maybeSingle(),
    ]);

    const owned = (ownedRes.data as Project[]) ?? [];

    const email = (userEmailRes.data as { email: string } | null)?.email;
    let shared: Project[] = [];

    if (email) {
      const sharesRes = await supabase
        .from('project_shares')
        .select('project_id, permission')
        .eq('invitee_email', email);

      const shareMap = new Map<string, 'read' | 'edit'>(
        ((sharesRes.data as { project_id: string; permission: 'read' | 'edit' }[]) ?? []).map((s) => [s.project_id, s.permission])
      );

      if (shareMap.size > 0) {
        const sharedProjectsRes = await supabase
          .from('projects')
          .select('*')
          .in('id', [...shareMap.keys()]);

        shared = ((sharedProjectsRes.data as Project[]) ?? []).map((p) => ({
          ...p,
          share_permission: shareMap.get(p.id),
        }));
      }
    }

    setProjects(owned);
    setSharedProjects(shared);
    setLoading(false);
  }

  async function createProject(tenantId: string, ownerId: string, name: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .insert({ tenant_id: tenantId, owner_id: ownerId, name })
      .select()
      .single();

    if (error || !data) return null;

    const project = data as Project;

    // Seed default project data
    await Promise.all([
      supabase.from('project_summaries').insert({
        project_id: project.id,
        currency: 'USD',
        exchange_rate: 1,
        risk_score: 0,
      }),
      supabase.from('financial_summaries').insert({
        project_id: project.id,
        risk_score: 0,
        risk_level: 'Low',
        fy_cost_adjustment: 0,
      }),
    ]);

    setProjects((prev) => [project, ...prev]);
    return project;
  }

  async function deleteProject(projectId: string) {
    await supabase.from('projects').delete().eq('id', projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }

  async function renameProject(projectId: string, name: string) {
    await supabase.from('projects').update({ name, updated_at: new Date().toISOString() }).eq('id', projectId);
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, name } : p)));
  }

  function refresh() {
    if (userId && tenantId) loadProjects(userId, tenantId);
  }

  return { projects, sharedProjects, loading, createProject, deleteProject, renameProject, refresh };
}

export function useProjectData(projectId: string | null) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!projectId) {
      setData(null);
      return;
    }
    loadProjectData(projectId);
  }, [projectId]);

  async function loadProjectData(pid: string) {
    setLoading(true);
    const [
      projectRes,
      summaryRes,
      finSummaryRes,
      finItemsRes,
      milestonesRes,
      scenariosRes,
      historyRes,
      posRes,
      resourcesRes,
      allocationsRes,
      phaseAllocRes,
    ] = await Promise.all([
      supabase.from('projects').select('*').eq('id', pid).maybeSingle(),
      supabase.from('project_summaries').select('*').eq('project_id', pid).maybeSingle(),
      supabase.from('financial_summaries').select('*').eq('project_id', pid).maybeSingle(),
      supabase.from('financial_items').select('*').eq('project_id', pid).order('sort_order'),
      supabase.from('payment_milestones').select('*').eq('project_id', pid).order('sort_order'),
      supabase.from('pricing_scenarios').select('*').eq('project_id', pid).order('sort_order'),
      supabase.from('change_history').select('*').eq('project_id', pid).order('change_date', { ascending: false }),
      supabase.from('project_pos').select('*').eq('project_id', pid),
      supabase.from('resource_plan_entries').select('*').eq('project_id', pid).order('sort_order'),
      supabase.from('resource_allocations').select('*'),
      supabase.from('phase_allocations').select('*').eq('project_id', pid),
    ]);

    const resources = (resourcesRes.data as ResourcePlanEntry[]) ?? [];
    const resourceIds = resources.map((r) => r.id);
    let allocations: ResourceAllocation[] = [];
    if (resourceIds.length > 0) {
      const allocRes = await supabase
        .from('resource_allocations')
        .select('*')
        .in('resource_plan_id', resourceIds);
      allocations = (allocRes.data as ResourceAllocation[]) ?? [];
    }

    void allocationsRes;

    setData({
      project: projectRes.data as Project,
      summary: summaryRes.data as ProjectSummary | null,
      financialSummary: finSummaryRes.data as FinancialSummary | null,
      financialItems: (finItemsRes.data as FinancialItem[]) ?? [],
      paymentMilestones: (milestonesRes.data as PaymentMilestone[]) ?? [],
      pricingScenarios: (scenariosRes.data as PricingScenario[]) ?? [],
      changeHistory: (historyRes.data as ChangeHistoryEntry[]) ?? [],
      projectPOs: (posRes.data as ProjectPO[]) ?? [],
      resourcePlan: resources,
      resourceAllocations: allocations,
      phaseAllocations: (phaseAllocRes.data as PhaseAllocation[]) ?? [],
    });
    setLoading(false);
  }

  const scheduleRefresh = useCallback((pid: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => loadProjectData(pid), 500);
  }, []);

  function updateLocal(updater: (prev: ProjectData) => ProjectData) {
    setData((prev) => (prev ? updater(prev) : prev));
    if (projectId) scheduleRefresh(projectId);
  }

  async function saveProjectSummary(summary: Partial<ProjectSummary>) {
    if (!projectId) return;
    setSaving(true);
    await supabase
      .from('project_summaries')
      .upsert({ project_id: projectId, ...summary }, { onConflict: 'project_id' });
    await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', projectId);
    setSaving(false);
    setData((prev) =>
      prev ? { ...prev, summary: { ...prev.summary, ...summary } as ProjectSummary } : prev
    );
  }

  async function saveFinancialSummary(fin: Partial<FinancialSummary>) {
    if (!projectId) return;
    setSaving(true);
    await supabase
      .from('financial_summaries')
      .upsert({ project_id: projectId, ...fin }, { onConflict: 'project_id' });
    setSaving(false);
    setData((prev) =>
      prev ? { ...prev, financialSummary: { ...prev.financialSummary, ...fin } as FinancialSummary } : prev
    );
  }

  async function saveFinancialItems(items: FinancialItem[]) {
    if (!projectId) return;
    setSaving(true);
    // delete all and reinsert for simplicity
    await supabase.from('financial_items').delete().eq('project_id', projectId);
    if (items.length > 0) {
      await supabase.from('financial_items').insert(items.map((item, i) => ({ ...item, sort_order: i })));
    }
    setSaving(false);
    setData((prev) => (prev ? { ...prev, financialItems: items } : prev));
  }

  async function savePaymentMilestones(milestones: PaymentMilestone[]) {
    if (!projectId) return;
    setSaving(true);
    await supabase.from('payment_milestones').delete().eq('project_id', projectId);
    if (milestones.length > 0) {
      await supabase.from('payment_milestones').insert(milestones.map((m, i) => ({ ...m, sort_order: i })));
    }
    setSaving(false);
    setData((prev) => (prev ? { ...prev, paymentMilestones: milestones } : prev));
  }

  async function savePricingScenarios(scenarios: PricingScenario[]) {
    if (!projectId) return;
    setSaving(true);
    await supabase.from('pricing_scenarios').delete().eq('project_id', projectId);
    if (scenarios.length > 0) {
      await supabase.from('pricing_scenarios').insert(scenarios.map((s, i) => ({ ...s, sort_order: i })));
    }
    setSaving(false);
    setData((prev) => (prev ? { ...prev, pricingScenarios: scenarios } : prev));
  }

  async function saveChangeHistory(history: ChangeHistoryEntry[]) {
    if (!projectId) return;
    setSaving(true);
    await supabase.from('change_history').delete().eq('project_id', projectId);
    if (history.length > 0) {
      await supabase.from('change_history').insert(history);
    }
    setSaving(false);
    setData((prev) => (prev ? { ...prev, changeHistory: history } : prev));
  }

  async function saveProjectPOs(pos: ProjectPO[]) {
    if (!projectId) return;
    setSaving(true);
    await supabase.from('project_pos').delete().eq('project_id', projectId);
    if (pos.length > 0) {
      await supabase.from('project_pos').insert(pos);
    }
    setSaving(false);
    setData((prev) => (prev ? { ...prev, projectPOs: pos } : prev));
  }

  async function saveResourcePlan(
    entries: ResourcePlanEntry[],
    allocations: ResourceAllocation[],
    phaseAllocations: PhaseAllocation[]
  ) {
    if (!projectId) return;
    setSaving(true);

    // delete all resource plan entries (cascades to allocations)
    await supabase.from('resource_plan_entries').delete().eq('project_id', projectId);

    if (entries.length > 0) {
      await supabase.from('resource_plan_entries').insert(entries.map((e, i) => ({ ...e, sort_order: i })));
      if (allocations.length > 0) {
        await supabase.from('resource_allocations').insert(allocations);
      }
    }

    // phase allocations
    await supabase.from('phase_allocations').delete().eq('project_id', projectId);
    if (phaseAllocations.length > 0) {
      await supabase.from('phase_allocations').insert(phaseAllocations);
    }

    setSaving(false);
    setData((prev) =>
      prev ? { ...prev, resourcePlan: entries, resourceAllocations: allocations, phaseAllocations } : prev
    );
  }

  function refresh() {
    if (projectId) loadProjectData(projectId);
  }

  return {
    data,
    loading,
    saving,
    updateLocal,
    saveProjectSummary,
    saveFinancialSummary,
    saveFinancialItems,
    savePaymentMilestones,
    savePricingScenarios,
    saveChangeHistory,
    saveProjectPOs,
    saveResourcePlan,
    refresh,
  };
}
