import { BibleStudy } from './database';
import { supabase } from './supabase';

export type StudyListFilter = 'past' | 'upcoming';

export type StudyPageCursor = {
  studyDate: string;
  id: string;
};

export const STUDY_PAGE_SIZE = 20;

export async function getPublishedStudiesForToday(today: string) {
  const { data, error } = await supabase
    .from('bible_studies')
    .select('*')
    .eq('status', 'published')
    .eq('study_date', today)
    .order('start_time', { ascending: true })
    .order('id', { ascending: true });

  return { studies: (data as BibleStudy[]) || [], error };
}

export async function getPublishedStudyPage({
  filter,
  today,
  cursor,
  pageSize = STUDY_PAGE_SIZE,
}: {
  filter: StudyListFilter;
  today: string;
  cursor?: StudyPageCursor | null;
  pageSize?: number;
}) {
  const ascending = filter === 'upcoming';
  let query = supabase
    .from('bible_studies')
    .select('*')
    .eq('status', 'published')
    .order('study_date', { ascending })
    .order('id', { ascending })
    .limit(pageSize + 1);

  query = filter === 'upcoming'
    ? query.gt('study_date', today)
    : query.lt('study_date', today);

  if (cursor) {
    const comparison = ascending ? 'gt' : 'lt';
    query = query.or(
      `study_date.${comparison}.${cursor.studyDate},and(study_date.eq.${cursor.studyDate},id.${comparison}.${cursor.id})`
    );
  }

  const { data, error } = await query;
  const rows = (data as BibleStudy[]) || [];
  const studies = rows.slice(0, pageSize);
  const last = studies.at(-1);

  return {
    studies,
    nextCursor: rows.length > pageSize && last
      ? { studyDate: last.study_date, id: last.id }
      : null,
    error,
  };
}
