import { supabase } from './supabase';
import { Tenant, UserProfile, Country, Phase, RateCardEntry, AIAgentSettings } from '../types/index';

const DEFAULT_COUNTRIES: Omit<Country, 'tenant_id'>[] = [
  { id: 'us', name: 'United States', currency: 'USD' },
  { id: 'gb', name: 'United Kingdom', currency: 'GBP' },
  { id: 'au', name: 'Australia', currency: 'AUD' },
  { id: 'de', name: 'Germany', currency: 'EUR' },
  { id: 'in', name: 'India', currency: 'INR' },
  { id: 'sg', name: 'Singapore', currency: 'SGD' },
  { id: 'za', name: 'South Africa', currency: 'ZAR' },
];

const DEFAULT_PHASES: Omit<Phase, 'tenant_id'>[] = [
  { id: 'discovery', name: 'Discovery', color: '#6366F1', is_system_only: false, sort_order: 0 },
  { id: 'design', name: 'Design', color: '#8B5CF6', is_system_only: false, sort_order: 1 },
  { id: 'build', name: 'Build', color: '#3B82F6', is_system_only: false, sort_order: 2 },
  { id: 'test', name: 'Test', color: '#10B981', is_system_only: false, sort_order: 3 },
  { id: 'deploy', name: 'Deploy', color: '#F59E0B', is_system_only: false, sort_order: 4 },
  { id: 'hypercare', name: 'Hypercare', color: '#EF4444', is_system_only: false, sort_order: 5 },
  { id: 'weekend', name: 'Weekend', color: '#9CA3AF', is_system_only: true, sort_order: 6 },
];

const DEFAULT_RATE_CARD: Omit<RateCardEntry, 'id' | 'tenant_id'>[] = [
  { role: 'Engagement Manager', country: 'United States', currency: 'USD', cost_rate: 200, bill_rate: 350, color: '#3B82F6' },
  { role: 'Project Manager', country: 'United States', currency: 'USD', cost_rate: 150, bill_rate: 275, color: '#8B5CF6' },
  { role: 'Senior Consultant', country: 'United States', currency: 'USD', cost_rate: 130, bill_rate: 230, color: '#10B981' },
  { role: 'Consultant', country: 'United States', currency: 'USD', cost_rate: 100, bill_rate: 180, color: '#F59E0B' },
  { role: 'Analyst', country: 'United States', currency: 'USD', cost_rate: 80, bill_rate: 140, color: '#EF4444' },
];

export async function findOrCreateTenant(companyName: string): Promise<Tenant> {
  const normalized = companyName.trim();

  const { data: existing } = await supabase
    .from('tenants')
    .select('*')
    .ilike('name', normalized)
    .maybeSingle();

  if (existing) return existing as Tenant;

  const { data: created, error } = await supabase
    .from('tenants')
    .insert({ name: normalized })
    .select()
    .single();

  if (error || !created) throw new Error(error?.message || 'Failed to create tenant');

  await seedTenantDefaults(created.id);

  return created as Tenant;
}

async function seedTenantDefaults(tenantId: string): Promise<void> {
  await Promise.all([
    supabase.from('countries').insert(
      DEFAULT_COUNTRIES.map((c) => ({ ...c, tenant_id: tenantId }))
    ),
    supabase.from('phases').insert(
      DEFAULT_PHASES.map((p) => ({ ...p, tenant_id: tenantId }))
    ),
    supabase.from('rate_cards').insert(
      DEFAULT_RATE_CARD.map((r) => ({ ...r, tenant_id: tenantId }))
    ),
    supabase.from('ai_agent_settings').insert({
      tenant_id: tenantId,
      persona_prompt: 'You are a professional services pricing assistant. Help the user analyze and optimize their resource plan and pricing strategy.',
      personality: 'Professional, analytical, concise',
      api_key: null,
      profile_image_url: null,
    }),
  ]);
}

export async function getOrCreateUserProfile(
  uid: string,
  email: string,
  firstName: string,
  lastName: string,
  companyName: string
): Promise<UserProfile> {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('uid', uid)
    .maybeSingle();

  if (existing) return existing as UserProfile;

  const tenant = await findOrCreateTenant(companyName);

  // Check how many users are already in this tenant to decide role
  const { count } = await supabase
    .from('users')
    .select('uid', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id);

  const role: 'admin' | 'user' = (count ?? 0) === 0 ? 'admin' : 'user';

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      uid,
      tenant_id: tenant.id,
      first_name: firstName,
      last_name: lastName,
      email,
      company_name: companyName,
      role,
      is_platform_admin: false,
      last_login: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !newUser) throw new Error(error?.message || 'Failed to create user profile');

  return newUser as UserProfile;
}

export async function updateLastLogin(uid: string): Promise<void> {
  await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('uid', uid);
}

export type { AIAgentSettings };
