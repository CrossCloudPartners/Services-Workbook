/*
  # Fix RLS helper functions — add SECURITY DEFINER

  ## Problem
  The `get_user_tenant_id()` and `is_platform_admin()` functions query the `users` table.
  The `users` table RLS SELECT policy calls `get_user_tenant_id()` to check tenant membership.
  This creates a circular dependency: RLS on `users` calls the function, which queries `users`,
  which triggers RLS again, causing a "Database error querying schema" error on login.

  ## Fix
  Recreate both functions with SECURITY DEFINER so they run as the function owner (bypassing RLS)
  rather than as the calling user. This breaks the circular dependency.
*/

CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM users WHERE uid = auth.uid()::text
$$;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_platform_admin, false) FROM users WHERE uid = auth.uid()::text
$$;
