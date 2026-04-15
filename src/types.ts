export interface ProjectSummary {
  opportunity: string;
  account: string;
  country: string;
  startDate: string;
  endDate: string;
  duration: number; // in weeks
  commercials: string;
  currency: string;
  exchangeRate: number;
  regionalLead: string;
  regionalServicesLead: string;
  successPartner: string;
  engagementManager: string;
  projectManager: string;
  pricingStage: string;
  pricingType: string;
  opportunityLink: string;
  phaseEstimates?: Record<string, { optimistic: number; pessimistic: number }>;
  globalOptimistic?: number;
  globalPessimistic?: number;
}

export interface FinancialItem {
  id: string;
  description: string;
  price: number;
  cost: number;
  margin: number;
  discount: number;
}

export interface PaymentMilestone {
  id: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number; // percentage (0-100) or fixed amount
  amount: number; // calculated fixed amount
  date?: string;
}

export interface FinancialSummary {
  items: FinancialItem[];
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  fyCostAdjustment: number;
  milestones?: PaymentMilestone[];
}

export interface PricingScenario {
  use: boolean;
  adjustment: string;
  price: number;
  cost: number;
  margin: number;
  discountPercent?: number;
  contingencyPercent?: number;
  targetMarginPercent?: number;
  isLocked?: boolean;
}

export interface ChangeHistoryEntry {
  id: string;
  author: string;
  date: string;
  price: number;
  cost: number;
  margin: number;
  revision: string;
  pricingStage: string;
  pricingType: string;
  notes: string;
}

export interface ProjectPO {
  id: string;
  name: string;
  date: string;
  price: number;
  cost: number;
  margin: number;
  poNumber: string;
  opportunityLink: string;
}

export interface RateCardEntry {
  id: string;
  role: string;
  country: string;
  currency: string;
  costRate: number;
  billRate: number;
  color?: string;
}

export interface Phase {
  id: string;
  name: string;
  color: string;
  isSystemOnly?: boolean;
}

export interface ResourcePlanEntry {
  id: string;
  role: string;
  country: string;
  currency?: string;
  weeks: number;
  hoursPerWeek: number;
  totalCost: number;
  totalPrice: number;
  dailyAllocation?: Record<string, number>; // date string (YYYY-MM-DD) -> hours
  weeklyAllocation?: Record<string, number>; // week start date string (YYYY-MM-DD) -> hours
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  data: SPWData;
}

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  createdAt: string;
  role?: 'admin' | 'user';
  photoURL?: string;
  lastLogin?: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalProjects: number;
  activeUsers24h: number;
  growthRate: number;
}

export interface ActivityLog {
  id: string;
  type: 'user_registered' | 'project_created' | 'project_deleted' | 'admin_action' | 'login';
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface GlobalSettings {
  rateCard: RateCardEntry[];
  countries: { id: string; name: string; currency: string }[];
  phases: Phase[];
  templates?: ProjectTemplate[];
}

export interface ProjectShare {
  id: string;
  projectId: string;
  ownerId: string;
  ownerEmail: string;
  inviteeEmail: string;
  permission: 'read' | 'edit';
  projectName: string;
  createdAt: string;
}

export interface ProjectPresence {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  lastActive: string;
  activeProjectId: string;
}

export interface SPWData {
  projectSummary: ProjectSummary;
  financialSummary: FinancialSummary;
  pricingScenarios: PricingScenario[];
  changeHistory: ChangeHistoryEntry[];
  projectsAndPOs: ProjectPO[];
  resourcePlan: ResourcePlanEntry[];
  phaseAllocation?: Record<string, string>; // date/weekStart -> phaseId
}
