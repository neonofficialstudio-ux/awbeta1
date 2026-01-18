import { getSupabase } from './client';

export async function fetchMissionSubmissionProofUrl(submissionId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase
    .from('mission_submissions')
    .select('proof_url')
    .eq('id', submissionId)
    .single();

  if (error) throw error;
  return data?.proof_url ?? null;
}
