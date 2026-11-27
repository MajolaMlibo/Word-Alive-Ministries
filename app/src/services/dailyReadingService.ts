import {
  DailyReading,
  ReadingPlan,
  ReadingPlanMembership,
} from './database';
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

function planFor(reading: DailyReading) {
  return reading.reading_plans ?? null;
}

function orderVisibleReadings(readings: DailyReading[]) {
  return [...readings].sort((left, right) => {
    const leftPlan = planFor(left);
    const rightPlan = planFor(right);
    const leftRequired = leftPlan?.enrollment_mode === 'required' ? 0 : 1;
    const rightRequired = rightPlan?.enrollment_mode === 'required' ? 0 : 1;

    if (leftRequired !== rightRequired) return leftRequired - rightRequired;

    return (leftPlan?.name || '').localeCompare(rightPlan?.name || '') || left.id.localeCompare(right.id);
  });
}

export async function getTodaysDailyReadings() {
  const { data, error } = await supabase
    .from('daily_readings')
    .select('*, reading_plans!inner(id, name, plan_year, status, enrollment_mode)')
    .eq('reading_plans.status', 'published')
    .eq('scheduled_date', getSouthAfricaDate())
    .eq('status', 'published')
    .order('id', { ascending: true });

  return {
    readings: orderVisibleReadings((data as DailyReading[]) || []),
    error,
  };
}

// Kept for summary surfaces that intentionally show the primary plan only.
// Bible and Calendar use getTodaysDailyReadings so optional plans are never
// discarded or treated as a query error.
export async function getTodaysDailyReading() {
  const { readings, error } = await getTodaysDailyReadings();
  return { reading: readings[0] ?? null, error };
}

export async function getDailyReadingCompletion(readingId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return {
      completed: false,
      error: new Error('You must be signed in to view reading progress.'),
    };
  }

  const { data, error } = await supabase
    .from('reading_completions')
    .select('id')
    .eq('reading_id', readingId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  return {
    completed: Boolean(data),
    error,
  };
}

export async function getDailyReadingCompletions(readingIds: string[]) {
  if (!readingIds.length) return { completedIds: new Set<string>(), error: null };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return {
      completedIds: new Set<string>(),
      error: new Error('You must be signed in to view reading progress.'),
    };
  }

  const { data, error } = await supabase
    .from('reading_completions')
    .select('reading_id')
    .eq('user_id', session.user.id)
    .in('reading_id', readingIds);

  return {
    completedIds: new Set(((data || []) as { reading_id: string }[]).map((row) => row.reading_id)),
    error,
  };
}

export async function getPublishedReadingPlans(search: string = '') {
  let query = supabase
    .from('reading_plans')
    .select('*')
    .eq('status', 'published')
    .order('plan_year', { ascending: false })
    .order('name', { ascending: true })
    .limit(50);

  const searchTerm = search.trim();
  if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);

  const { data, error } = await query;

  return { plans: (data as ReadingPlan[]) || [], error };
}

export async function getMyReadingPlanMemberships() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return {
      memberships: [] as ReadingPlanMembership[],
      error: new Error('You must be signed in to view plan membership.'),
    };
  }

  const { data, error } = await supabase
    .from('reading_plan_memberships')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'active');

  return { memberships: (data as ReadingPlanMembership[]) || [], error };
}

export async function joinReadingPlan(planId: string) {
  const { error } = await supabase.rpc('join_reading_plan', { target_plan_id: planId });
  return { error };
}

export async function leaveReadingPlan(planId: string) {
  const { error } = await supabase.rpc('leave_reading_plan', { target_plan_id: planId });
  return { error };
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

export async function refreshDailyReadingStreak() {
  const { data, error } = await supabase.rpc('refresh_daily_reading_streak');

  return {
    currentStreak: typeof data === 'number' ? data : null,
    error,
  };
}
