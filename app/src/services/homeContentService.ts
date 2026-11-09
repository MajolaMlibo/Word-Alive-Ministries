import { HomeEncouragement } from './database';
import { supabase } from './supabase';

export const DEFAULT_HOME_ENCOURAGEMENT = {
  message: '“Your word is a lamp to my feet and a light to my path.”',
  scripture_ref: 'Psalm 119:105',
};

export async function getHomeEncouragement() {
  const { data, error } = await supabase
    .from('home_encouragement')
    .select('*')
    .eq('id', true)
    .maybeSingle();

  return {
    encouragement: (data as HomeEncouragement | null) || null,
    error,
  };
}

export async function saveHomeEncouragement(
  message: string,
  scriptureRef: string
) {
  const { data, error } = await supabase
    .from('home_encouragement')
    .update({ message: message.trim(), scripture_ref: scriptureRef.trim() })
    .eq('id', true)
    .select('*')
    .single();

  return {
    encouragement: (data as HomeEncouragement | null) || null,
    error,
  };
}
