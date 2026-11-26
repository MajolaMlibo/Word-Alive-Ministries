import { MinistryLink } from './database';
import { supabase } from './supabase';

export async function getVisibleMinistryLinks() {
  const { data, error } = await supabase
    .from('ministry_links')
    .select('*')
    .eq('is_visible', true)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  return { links: (data as MinistryLink[]) || [], error };
}
