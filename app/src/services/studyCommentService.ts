import { StudyComment, StudyCommentModerationItem } from './database';
import { supabase } from './supabase';

export type StudyCommentCursor = Pick<StudyComment, 'created_at' | 'id'>;
export type StudyCommentModerationCursor = Pick<StudyCommentModerationItem, 'created_at' | 'id'>;

const PAGE_SIZE = 20;

function pageFrom<T extends { created_at: string; id: string }>(items: T[]) {
  const visible = items.slice(0, PAGE_SIZE);
  return {
    items: visible,
    hasMore: items.length > PAGE_SIZE,
    nextCursor: visible.length ? {
      created_at: visible[visible.length - 1].created_at,
      id: visible[visible.length - 1].id,
    } : null,
  };
}

export async function getStudyCommentPage(studyId: string, cursor: StudyCommentCursor | null = null) {
  const { data, error } = await supabase.rpc('study_comment_page', {
    target_study: studyId,
    before_time: cursor?.created_at || null,
    before_id: cursor?.id || null,
  });

  return { ...pageFrom((data as StudyComment[]) || []), error };
}

export async function submitStudyComment(studyId: string, message: string) {
  const { data, error } = await supabase.rpc('submit_study_comment', {
    target_study: studyId,
    message,
  }).maybeSingle();

  return { comment: (data as StudyComment | null) || null, error };
}

export async function getStudyCommentModerationPage(
  search: string,
  cursor: StudyCommentModerationCursor | null = null,
) {
  const { data, error } = await supabase.rpc('study_comment_moderation_page', {
    search_term: search,
    before_time: cursor?.created_at || null,
    before_id: cursor?.id || null,
  });

  return { ...pageFrom((data as StudyCommentModerationItem[]) || []), error };
}

export async function setStudyCommentVisibility(commentId: string, visible: boolean) {
  return supabase.rpc('set_study_comment_visibility', {
    target_comment: commentId,
    should_be_visible: visible,
  });
}
