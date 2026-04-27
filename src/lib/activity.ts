import { supabase } from './supabase';

interface LogActivityParams {
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      tenant_id: params.tenantId,
      user_id: params.userId,
      user_name: params.userName,
      action: params.action,
      description: params.description ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    // activity logging must never throw
  }
}
