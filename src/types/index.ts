export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface UserProfile {
  uid: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  role: 'admin' | 'user';
  is_platform_admin: boolean;
  photo_url?: string;
  last_login?: string;
  created_at: string;
}

export interface Project {
  id: string;
  tenant_id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  // joined from shares
  share_permission?: 'read' | 'edit';
  owner_email?: string;
}

export interface ProjectShare {
  id: string;
  project_id: string;
  invitee_email: string;
  permission: 'read' | 'edit';
  created_at: string;
}

export interface ProjectSummary {
  project_id: string;
  opportunity: string;
  account: string;
  country: string;
  start_date: string | null;
  end_date: string | null;
  duration: number;
  commercials: string;
  currency: string;
  exchange_rate: number;
  regional_lead: string;
  regional_services_lead: string;
  success_partner: string;
  engagement_manager: string;
  project_manager: string;
  pricing_stage: string;
  pricing_type: string;
  opportunity_link: string;
  global_optimistic: number;
  global_pessimistic: number;
  phase_estimates: Record<string, { optimistic: number; pessimistic: number }> | null;
}

export interface FinancialSummary {
  project_id: string;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  fy_cost_adjustment: number;
}

export interface FinancialItem {
  id: string;
  project_id: string;
  description: string;
  price: number;
  cost: number;
  margin: number;
  discount: number;
  sort_order: number;
}

export interface PaymentMilestone {
  id: string;
  project_id: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
  target_date: string | null;
  sort_order: number;
}

export interface PricingScenario {
  id: string;
  project_id: string;
  is_used: boolean;
  adjustment: string;
  price: number;
  cost: number;
  margin: number;
  discount_percent: number | null;
  contingency_percent: number | null;
  target_margin_percent: number | null;
  is_locked: boolean;
  sort_order: number;
}

export interface ChangeHistoryEntry {
  id: string;
  project_id: string;
  author: string;
  change_date: string;
  price: number;
  cost: number;
  margin: number;
  revision: string;
  pricing_stage: string;
  pricing_type: string;
  notes: string;
}

export interface ProjectPO {
  id: string;
  project_id: string;
  name: string;
  po_date: string | null;
  price: number;
  cost: number;
  margin: number;
  po_number: string;
  opportunity_link: string;
}

export interface ResourcePlanEntry {
  id: string;
  project_id: string;
  role: string;
  country: string;
  currency: string;
  weeks: number;
  hours_per_week: number;
  total_cost: number;
  total_price: number;
  sort_order: number;
}

export interface ResourceAllocation {
  id: string;
  resource_plan_id: string;
  allocation_period_start: string;
  allocation_type: 'daily' | 'weekly';
  hours: number;
}

export interface PhaseAllocation {
  id: string;
  project_id: string;
  period_start: string;
  phase_id: string;
}

export interface RateCardEntry {
  id: string;
  tenant_id: string;
  role: string;
  country: string;
  currency: string;
  cost_rate: number;
  bill_rate: number;
  color: string;
}

export interface Country {
  id: string;
  tenant_id: string;
  name: string;
  currency: string;
}

export interface Phase {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  is_system_only: boolean;
  sort_order: number;
}

export interface AIAgentSettings {
  tenant_id: string;
  api_key: string | null;
  persona_prompt: string | null;
  personality: string | null;
  profile_image_url: string | null;
}

export interface ProjectTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Presence {
  user_id: string;
  active_project_id: string | null;
  last_active: string;
}

export interface ProjectData {
  project: Project;
  summary: ProjectSummary | null;
  financialSummary: FinancialSummary | null;
  financialItems: FinancialItem[];
  paymentMilestones: PaymentMilestone[];
  pricingScenarios: PricingScenario[];
  changeHistory: ChangeHistoryEntry[];
  projectPOs: ProjectPO[];
  resourcePlan: ResourcePlanEntry[];
  resourceAllocations: ResourceAllocation[];
  phaseAllocations: PhaseAllocation[];
}

export interface TenantSettings {
  rateCard: RateCardEntry[];
  countries: Country[];
  phases: Phase[];
  templates: ProjectTemplate[];
  aiAgentSettings: AIAgentSettings | null;
}
