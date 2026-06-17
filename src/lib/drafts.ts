import { supabase } from './supabase';
import type { CampaignDraft } from '../types/campaign';

/**
 * Save or update a draft (upsert by id).
 * If draft.id is undefined, a new row is inserted.
 */
export async function saveDraft(draft: CampaignDraft, userId: string): Promise<CampaignDraft> {
  const payload = {
    ...draft,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (draft.id) {
    // Update existing
    const { data, error } = await supabase
      .from('campaign_drafts')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[drafts] saveDraft upsert error:', error);
      return draft;
    }
    return data as CampaignDraft;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('campaign_drafts')
      .insert({ ...payload, status: payload.status ?? 'draft' })
      .select()
      .single();

    if (error) {
      console.error('[drafts] saveDraft insert error:', error);
      return draft;
    }
    return data as CampaignDraft;
  }
}

/**
 * Load the most recent draft for a user with status = 'draft'.
 */
export async function loadLatestDraft(userId: string): Promise<CampaignDraft | null> {
  const { data, error } = await supabase
    .from('campaign_drafts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[drafts] loadLatestDraft error:', error);
    return null;
  }
  return data as CampaignDraft | null;
}

/**
 * Load a specific draft by its id.
 */
export async function loadDraft(id: string): Promise<CampaignDraft | null> {
  const { data, error } = await supabase
    .from('campaign_drafts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[drafts] loadDraft error:', error);
    return null;
  }
  return data as CampaignDraft | null;
}

/**
 * Mark a draft as published, storing the platform API result.
 */
export async function markDraftPublished(id: string, result: object): Promise<void> {
  const { error } = await supabase
    .from('campaign_drafts')
    .update({
      status: 'published',
      publish_result: result,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[drafts] markDraftPublished error:', error);
  }
}

/**
 * Delete a draft by id.
 */
export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_drafts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[drafts] deleteDraft error:', error);
  }
}
