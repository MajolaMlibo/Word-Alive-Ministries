import { AppRole } from './database';
import { supabase } from './supabase';

export type AdminRole = Extract<AppRole, 'pastor' | 'admin'>;

export async function getCurrentUserRole() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { role: null, error: userError };
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    role: (data?.role as AppRole | undefined) || null,
    error,
  };
}

export function isAdminRole(role: AppRole | null): role is AdminRole {
  return role === 'pastor' || role === 'admin';
}
