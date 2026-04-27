/*
  # Fix circular RLS dependency between projects and project_shares

  ## Problem
  - The `projects` SELECT policy checks `project_shares` (to see if user has a share)
  - The `project_shares` SELECT policy checks `projects` (to verify tenant membership)
  - This creates an infinite recursion (error 42P17) when either table is queried.

  ## Fix
  1. Create a SECURITY DEFINER helper function `get_user_shared_project_ids()` that
     queries project_shares directly bypassing RLS, returning project IDs shared with
     the current user's email.
  2. Create a SECURITY DEFINER helper `is_project_owner(project_id)` for use in
     project_shares policies without re-entering projects RLS.
  3. Replace the recursive policies with ones that use these helpers.
*/

-- Helper: returns project IDs shared with the current user (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_shared_project_ids()
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.project_id::text
  FROM project_shares ps
  JOIN users u ON u.email = ps.invitee_email
  WHERE u.uid = auth.uid()::text
$$;

-- Helper: returns TRUE if the current user owns the given project (bypasses RLS)
CREATE OR REPLACE FUNCTION is_project_owner(p_project_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id::text = p_project_id
    AND owner_id::text = auth.uid()::text
  )
$$;

-- Helper: returns TRUE if project belongs to current user's tenant (bypasses RLS)
CREATE OR REPLACE FUNCTION is_project_in_user_tenant(p_project_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id::text = p_project_id
    AND tenant_id = get_user_tenant_id()
  )
$$;

-- Recreate projects policies without referencing project_shares directly
DROP POLICY IF EXISTS "Users can view projects in their tenant" ON projects;
DROP POLICY IF EXISTS "Users can update projects in their tenant" ON projects;

CREATE POLICY "Users can view projects in their tenant"
  ON projects FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id()
    OR id::text = ANY(ARRAY(SELECT get_user_shared_project_ids()))
    OR is_platform_admin()
  );

CREATE POLICY "Users can update projects in their tenant"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id()
    AND (
      owner_id::text = auth.uid()::text
      OR id::text = ANY(ARRAY(SELECT get_user_shared_project_ids()))
    )
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Recreate project_shares policies without referencing projects directly
DROP POLICY IF EXISTS "Users can view shares for their projects" ON project_shares;
DROP POLICY IF EXISTS "Project owners can manage shares" ON project_shares;
DROP POLICY IF EXISTS "Project owners can update shares" ON project_shares;
DROP POLICY IF EXISTS "Project owners can delete shares" ON project_shares;

CREATE POLICY "Users can view shares for their projects"
  ON project_shares FOR SELECT
  TO authenticated
  USING (
    is_project_in_user_tenant(project_id::text)
    OR invitee_email::text = (SELECT email FROM users WHERE uid = auth.uid()::text)
  );

CREATE POLICY "Project owners can manage shares"
  ON project_shares FOR INSERT
  TO authenticated
  WITH CHECK (is_project_owner(project_id::text));

CREATE POLICY "Project owners can update shares"
  ON project_shares FOR UPDATE
  TO authenticated
  USING (is_project_owner(project_id::text))
  WITH CHECK (is_project_owner(project_id::text));

CREATE POLICY "Project owners can delete shares"
  ON project_shares FOR DELETE
  TO authenticated
  USING (is_project_owner(project_id::text));
