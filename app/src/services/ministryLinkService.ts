import { MinistryLink } from './database';
import { supabase } from './supabase';

export async function getVisibleMinistryLinks() {
  const { data, error } = await supabase
    .from('ministry_links')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  return { links: (data as MinistryLink[]) || [], error };
}
