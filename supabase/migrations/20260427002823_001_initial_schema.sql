/*
  # Initial SPW Schema — Multi-Tenant Services Pricing Workbook

  ## Summary
  Creates the complete normalized schema for the Services Pricing Workbook (SPW) application
  with full multi-tenant isolation. Every tenant's data is completely separate.

  ## New Tables
  1. `tenants` — company/organization boundary for multi-tenancy
  2. `users` — user profiles, scoped to a tenant, linked to Supabase auth
  3. `projects` — pricing workbook projects owned by users within a tenant
  4. `project_shares` — grants read/edit access to specific emails for a project
  5. `project_summaries` — project metadata (account, dates, team, pricing stage)
  6. `financial_summaries` — risk scoring and FY cost adjustment per project
  7. `financial_items` — line items (resources, risk, adjustments) per project
  8. `payment_milestones` — payment schedule milestones per project
  9. `pricing_scenarios` — scenario modeling (contingency, discount, target margin)
  10. `change_history` — revision snapshots for a project
  11. `project_pos` — purchase orders linked to a project
  12. `resource_plan_entries` — resource rows (role, country, hours, weeks)
  13. `resource_allocations` — per-week/day hour allocations per resource
  14. `phase_allocations` — maps a calendar period to a project phase
  15. `rate_cards` — role/country rate entries scoped to a tenant
  16. `countries` — country/currency list scoped to a tenant
  17. `phases` — project phase definitions scoped to a tenant
  18. `ai_agent_settings` — one row per tenant for Gemini AI configuration
  19. `project_templates` — saved project templates scoped to a tenant
  20. `activity_logs` — audit log of all significant actions within a tenant
  21. `presence` — tracks which project each user is currently viewing

  ## Security
  - RLS enabled on every table
  - Tenant isolation enforced: users can only access data within their own tenant
  - Project shares grant cross-user access within the same tenant to specific projects
  - platform_admin flag bypasses tenant isolation for super-admins
*/

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE share_permission AS ENUM ('read', 'edit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_milestone_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  uid VARCHAR(255) PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  company_name VARCHAR(200) NOT NULL,
  role user_role DEFAULT 'user',
  is_platform_admin BOOLEAN DEFAULT false,
  photo_url VARCHAR(1024),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_shares (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invitee_email VARCHAR(150) NOT NULL,
  permission share_permission NOT NULL DEFAULT 'read',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, invitee_email)
);

-- ============================================================
-- PROJECT DATA TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS project_summaries (
  project_id VARCHAR(255) PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  opportunity VARCHAR(255),
  account VARCHAR(255),
  country VARCHAR(100),
  start_date DATE,
  end_date DATE,
  duration INT,
  commercials VARCHAR(200),
  currency VARCHAR(10),
  exchange_rate NUMERIC(10,4),
  regional_lead VARCHAR(255),
  regional_services_lead VARCHAR(255),
  success_partner VARCHAR(255),
  engagement_manager VARCHAR(255),
  project_manager VARCHAR(255),
  pricing_stage VARCHAR(100),
  pricing_type VARCHAR(100),
  opportunity_link VARCHAR(1024),
  global_optimistic NUMERIC(10,2),
  global_pessimistic NUMERIC(10,2),
  phase_estimates JSONB
);

CREATE TABLE IF NOT EXISTS financial_summaries (
  project_id VARCHAR(255) PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  risk_score NUMERIC(5,2) DEFAULT 0,
  risk_level risk_level DEFAULT 'Low',
  fy_cost_adjustment NUMERIC(15,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS financial_items (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  price NUMERIC(15,2) NOT NULL DEFAULT 0,
  cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  margin NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payment_milestones (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  type payment_milestone_type NOT NULL,
  value NUMERIC(15,4) NOT NULL DEFAULT 0,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  target_date DATE,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pricing_scenarios (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  is_used BOOLEAN DEFAULT false,
  adjustment VARCHAR(100),
  price NUMERIC(15,2) NOT NULL DEFAULT 0,
  cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  margin NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2),
  contingency_percent NUMERIC(5,2),
  target_margin_percent NUMERIC(5,2),
  is_locked BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS change_history (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author VARCHAR(255) NOT NULL,
  change_date TIMESTAMPTZ DEFAULT NOW(),
  price NUMERIC(15,2) NOT NULL DEFAULT 0,
  cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  margin NUMERIC(15,2) NOT NULL DEFAULT 0,
  revision VARCHAR(100),
  pricing_stage VARCHAR(100),
  pricing_type VARCHAR(100),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS project_pos (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  po_date DATE,
  price NUMERIC(15,2) NOT NULL DEFAULT 0,
  cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  margin NUMERIC(15,2) NOT NULL DEFAULT 0,
  po_number VARCHAR(100),
  opportunity_link VARCHAR(1024)
);

CREATE TABLE IF NOT EXISTS resource_plan_entries (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  currency VARCHAR(10),
  weeks INT NOT NULL DEFAULT 0,
  hours_per_week NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS resource_allocations (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  resource_plan_id VARCHAR(255) NOT NULL REFERENCES resource_plan_entries(id) ON DELETE CASCADE,
  allocation_period_start DATE NOT NULL,
  allocation_type VARCHAR(10) NOT NULL,
  hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  UNIQUE(resource_plan_id, allocation_period_start, allocation_type)
);

CREATE TABLE IF NOT EXISTS phase_allocations (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  phase_id VARCHAR(255) NOT NULL,
  UNIQUE(project_id, period_start)
);

-- ============================================================
-- TENANT-SCOPED SETTINGS TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_cards (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  currency VARCHAR(10),
  cost_rate NUMERIC(15,2) NOT NULL DEFAULT 0,
  bill_rate NUMERIC(15,2) NOT NULL DEFAULT 0,
  color VARCHAR(20),
  UNIQUE(tenant_id, role, country)
);

CREATE TABLE IF NOT EXISTS countries (
  id VARCHAR(50) NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  PRIMARY KEY (id, tenant_id)
);

CREATE TABLE IF NOT EXISTS phases (
  id VARCHAR(50) NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  is_system_only BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (id, tenant_id)
);

CREATE TABLE IF NOT EXISTS ai_agent_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  api_key VARCHAR(1024),
  persona_prompt TEXT,
  personality VARCHAR(200),
  profile_image_url VARCHAR(1024)
);

CREATE TABLE IF NOT EXISTS project_templates (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR(255) REFERENCES users(uid) ON DELETE SET NULL,
  user_name VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presence (
  user_id VARCHAR(255) PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  active_project_id VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL,
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_email ON project_shares(invitee_email);
CREATE INDEX IF NOT EXISTS idx_project_shares_project ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_items_project ON financial_items(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_project ON payment_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_project ON pricing_scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_change_history_project ON change_history(project_id);
CREATE INDEX IF NOT EXISTS idx_project_pos_project ON project_pos(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_plan_project ON resource_plan_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_plan ON resource_allocations(resource_plan_id);
CREATE INDEX IF NOT EXISTS idx_phase_allocations_project ON phase_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_rate_cards_tenant ON rate_cards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_phases_tenant ON phases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_countries_tenant ON countries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_templates_tenant ON project_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_plan_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: get current user's tenant_id
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE uid = auth.uid()::text
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER FUNCTION: check if current user is platform admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_platform_admin, false) FROM users WHERE uid = auth.uid()::text
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- tenants: users can view their own tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (id = get_user_tenant_id() OR is_platform_admin());

-- users: view own tenant's users
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_platform_admin());

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (uid = auth.uid()::text);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (uid = auth.uid()::text)
  WITH CHECK (uid = auth.uid()::text);

-- projects: full CRUD within tenant
CREATE POLICY "Users can view projects in their tenant"
  ON projects FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id()
    OR EXISTS (
      SELECT 1 FROM project_shares
      WHERE project_id = projects.id
      AND invitee_email = (SELECT email FROM users WHERE uid = auth.uid()::text)
    )
    OR is_platform_admin()
  );

CREATE POLICY "Users can create projects in their tenant"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND owner_id = auth.uid()::text);

CREATE POLICY "Users can update projects in their tenant"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id()
    AND (
      owner_id = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM project_shares
        WHERE project_id = projects.id
        AND invitee_email = (SELECT email FROM users WHERE uid = auth.uid()::text)
        AND permission = 'edit'
      )
    )
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid()::text);

-- project_shares
CREATE POLICY "Users can view shares for their projects"
  ON project_shares FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_shares.project_id
      AND tenant_id = get_user_tenant_id()
    )
    OR invitee_email = (SELECT email FROM users WHERE uid = auth.uid()::text)
  );

CREATE POLICY "Project owners can manage shares"
  ON project_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_shares.project_id
      AND owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Project owners can update shares"
  ON project_shares FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_shares.project_id
      AND owner_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_shares.project_id
      AND owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Project owners can delete shares"
  ON project_shares FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_shares.project_id
      AND owner_id = auth.uid()::text
    )
  );

-- Helper macro for project-level access (used by data tables that reference project_id)
-- We create a function that checks if current user has access to a project
CREATE OR REPLACE FUNCTION user_can_access_project(p_project_id VARCHAR)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id
    AND (
      p.tenant_id = get_user_tenant_id()
      OR EXISTS (
        SELECT 1 FROM project_shares ps
        WHERE ps.project_id = p.id
        AND ps.invitee_email = (SELECT email FROM users WHERE uid = auth.uid()::text)
      )
      OR is_platform_admin()
    )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_can_edit_project(p_project_id VARCHAR)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id
    AND (
      (p.tenant_id = get_user_tenant_id() AND (
        p.owner_id = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM project_shares ps
          WHERE ps.project_id = p.id
          AND ps.invitee_email = (SELECT email FROM users WHERE uid = auth.uid()::text)
          AND ps.permission = 'edit'
        )
      ))
      OR is_platform_admin()
    )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Apply access policies to all project data tables
-- project_summaries
CREATE POLICY "Access project summaries" ON project_summaries FOR SELECT TO authenticated USING (user_can_access_project(project_id));
CREATE POLICY "Edit project summaries" ON project_summaries FOR INSERT TO authenticated WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Update project summaries" ON project_summaries FOR UPDATE TO authenticated USING (user_can_edit_project(project_id)) WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Delete project summaries" ON project_summaries FOR DELETE TO authenticated USING (user_can_edit_project(project_id));

-- financial_summaries
CREATE POLICY "Access financial summaries" ON financial_summaries FOR SELECT TO authenticated USING (user_can_access_project(project_id));
CREATE POLICY "Edit financial summaries" ON financial_summaries FOR INSERT TO authenticated WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Update financial summaries" ON financial_summaries FOR UPDATE TO authenticated USING (user_can_edit_project(project_id)) WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Delete financial summaries" ON financial_summaries FOR DELETE TO authenticated USING (user_can_edit_project(project_id));

-- financial_items
CREATE POLICY "Access financial items" ON financial_items FOR SELECT TO authenticated USING (user_can_access_project(project_id));
CREATE POLICY "Edit financial items" ON financial_items FOR INSERT TO authenticated WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Update financial items" ON financial_items FOR UPDATE TO authenticated USING (user_can_edit_project(project_id)) WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Delete financial items" ON financial_items FOR DELETE TO authenticated USING (user_can_edit_project(project_id));

-- payment_milestones
CREATE POLICY "Access payment milestones" ON payment_milestones FOR SELECT TO authenticated USING (user_can_access_project(project_id));
CREATE POLICY "Edit payment milestones" ON payment_milestones FOR INSERT TO authenticated WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Update payment milestones" ON payment_milestones FOR UPDATE TO authenticated USING (user_can_edit_project(project_id)) WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Delete payment milestones" ON payment_milestones FOR DELETE TO authenticated USING (user_can_edit_project(project_id));

-- pricing_scenarios
CREATE POLICY "Access pricing scenarios" ON pricing_scenarios FOR SELECT TO authenticated USING (user_can_access_project(project_id));
CREATE POLICY "Edit pricing scenarios" ON pricing_scenarios FOR INSERT TO authenticated WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Update pricing scenarios" ON pricing_scenarios FOR UPDATE TO authenticated USING (user_can_edit_project(project_id)) WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Delete pricing scenarios" ON pricing_scenarios FOR DELETE TO authenticated USING (user_can_edit_project(project_id));

-- change_history
CREATE POLICY "Access change history" ON change_history FOR SELECT TO authenticated USING (user_can_access_project(project_id));
CREATE POLICY "Edit change history" ON change_history FOR INSERT TO authenticated WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Update change history" ON change_history FOR UPDATE TO authenticated USING (user_can_edit_project(project_id)) WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Delete change history" ON change_history FOR DELETE TO authenticated USING (user_can_edit_project(project_id));

-- project_pos
CREATE POLICY "Access project pos" ON project_pos FOR SELECT TO authenticated USING (user_can_access_project(project_id));
CREATE POLICY "Edit project pos" ON project_pos FOR INSERT TO authenticated WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Update project pos" ON project_pos FOR UPDATE TO authenticated USING (user_can_edit_project(project_id)) WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Delete project pos" ON project_pos FOR DELETE TO authenticated USING (user_can_edit_project(project_id));

-- resource_plan_entries
CREATE POLICY "Access resource plan entries" ON resource_plan_entries FOR SELECT TO authenticated USING (user_can_access_project(project_id));
CREATE POLICY "Edit resource plan entries" ON resource_plan_entries FOR INSERT TO authenticated WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Update resource plan entries" ON resource_plan_entries FOR UPDATE TO authenticated USING (user_can_edit_project(project_id)) WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Delete resource plan entries" ON resource_plan_entries FOR DELETE TO authenticated USING (user_can_edit_project(project_id));

-- resource_allocations (access via resource_plan_entries)
CREATE POLICY "Access resource allocations" ON resource_allocations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM resource_plan_entries r WHERE r.id = resource_plan_id AND user_can_access_project(r.project_id)));
CREATE POLICY "Edit resource allocations" ON resource_allocations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM resource_plan_entries r WHERE r.id = resource_plan_id AND user_can_edit_project(r.project_id)));
CREATE POLICY "Update resource allocations" ON resource_allocations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM resource_plan_entries r WHERE r.id = resource_plan_id AND user_can_edit_project(r.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM resource_plan_entries r WHERE r.id = resource_plan_id AND user_can_edit_project(r.project_id)));
CREATE POLICY "Delete resource allocations" ON resource_allocations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM resource_plan_entries r WHERE r.id = resource_plan_id AND user_can_edit_project(r.project_id)));

-- phase_allocations
CREATE POLICY "Access phase allocations" ON phase_allocations FOR SELECT TO authenticated USING (user_can_access_project(project_id));
CREATE POLICY "Edit phase allocations" ON phase_allocations FOR INSERT TO authenticated WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Update phase allocations" ON phase_allocations FOR UPDATE TO authenticated USING (user_can_edit_project(project_id)) WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Delete phase allocations" ON phase_allocations FOR DELETE TO authenticated USING (user_can_edit_project(project_id));

-- rate_cards (tenant-scoped)
CREATE POLICY "Users can view their tenant rate cards" ON rate_cards FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() OR is_platform_admin());
CREATE POLICY "Admins can edit rate cards" ON rate_cards FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can update rate cards" ON rate_cards FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can delete rate cards" ON rate_cards FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id());

-- countries (tenant-scoped)
CREATE POLICY "Users can view their tenant countries" ON countries FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() OR is_platform_admin());
CREATE POLICY "Admins can edit countries" ON countries FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can update countries" ON countries FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can delete countries" ON countries FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id());

-- phases (tenant-scoped)
CREATE POLICY "Users can view their tenant phases" ON phases FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() OR is_platform_admin());
CREATE POLICY "Admins can edit phases" ON phases FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can update phases" ON phases FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can delete phases" ON phases FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id());

-- ai_agent_settings (tenant-scoped)
CREATE POLICY "Users can view their tenant AI settings" ON ai_agent_settings FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() OR is_platform_admin());
CREATE POLICY "Admins can edit AI settings" ON ai_agent_settings FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can update AI settings" ON ai_agent_settings FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- project_templates (tenant-scoped)
CREATE POLICY "Users can view their tenant templates" ON project_templates FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() OR is_platform_admin());
CREATE POLICY "Users can create templates" ON project_templates FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can update templates" ON project_templates FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can delete templates" ON project_templates FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id());

-- activity_logs (tenant-scoped, insert-only for users, read for admins)
CREATE POLICY "Users can view their tenant activity logs" ON activity_logs FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() OR is_platform_admin());
CREATE POLICY "Users can insert activity logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());

-- presence
CREATE POLICY "Users can view presence in their tenant" ON presence FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE uid = presence.user_id AND tenant_id = get_user_tenant_id()) OR is_platform_admin());
CREATE POLICY "Users can upsert their own presence" ON presence FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update their own presence" ON presence FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can delete their own presence" ON presence FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);
