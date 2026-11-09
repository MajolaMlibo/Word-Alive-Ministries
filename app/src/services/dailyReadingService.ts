import { DailyReading } from './database';
import { supabase } from './supabase';

const SOUTH_AFRICA_TIME_ZONE = 'Africa/Johannesburg';

export interface DailyReadingCompletionResult {
  completed_at: string;
  current_streak: number;
}

export function getSouthAfricaDate(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SOUTH_AFRICA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export async function getTodaysDailyReading() {
  const { data, error } = await supabase
    .from('daily_readings')
    .select('*')
    .eq('scheduled_date', getSouthAfricaDate())
    .eq('status', 'published')
    .maybeSingle();

  return {
    reading: (data as DailyReading | null) ?? null,
    error,
  };
}

export async function getDailyReadingCompletion(readingId: string) {
  const { data, error } = await supabase
    .from('reading_completions')
    .select('id')
    .eq('reading_id', readingId)
    .maybeSingle();

  return {
    completed: Boolean(data),
    error,
  };
}

export async function completeDailyReading(readingId: string) {
  const { data, error } = await supabase
    .rpc('complete_daily_reading', { p_reading_id: readingId })
    .single();

  return {
    completion: data as DailyReadingCompletionResult | null,
    error,
  };
}
