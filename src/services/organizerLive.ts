import { requireSupabase } from '../lib/supabase'
import { hydrateProfile, profileColumns, type ProfileRow } from './profileRepository'
import type { ContributionType, RequestStatus } from '../types'
import { escapeSearch, validateRequest } from './organizerValidation'

export async function findOrganizerPeople(query: string, kind: ContributionType | '', founder: boolean, page: number, signal: AbortSignal) {
  let request = requireSupabase().from('profiles').select(profileColumns, { count: 'exact' })
    .in('contact_preference', ['green', 'yellow'])
  for (const word of query.trim().split(/\s+/).filter(Boolean)) request = request.ilike('name', `%${escapeSearch(word)}%`)
  if (kind) request = request.contains('open_to', [kind])
  if (founder) request = request.ilike('occupation', '%founder%')
  const { data, count, error } = await request.order('name').order('id').range(page * 20, page * 20 + 19).abortSignal(signal)
  if (error) throw error
  return { people: await Promise.all(((data ?? []) as ProfileRow[]).map(hydrateProfile)), total: count ?? 0 }
}
export type LiveRequest = {
  id: string; sender_id: string; recipient_id: string; contribution_type: ContributionType
  title: string; body: string; status: RequestStatus; created_at: string
  sender: { name: string } | null; recipient: { name: string } | null
}
export function requestPageSize(direction: 'sent' | 'received') { return direction === 'sent' ? 2 : 1 }
export async function listOrganizerRequests(userId: string, direction: 'sent' | 'received', page: number, signal: AbortSignal) {
  const size = requestPageSize(direction)
  const { data, count, error } = await requireSupabase().from('organizer_requests')
    .select('id,sender_id,recipient_id,contribution_type,title,body,status,created_at,sender:profiles!organizer_requests_sender_id_fkey(name),recipient:profiles!organizer_requests_recipient_id_fkey(name)', { count: 'exact' })
    .eq(direction === 'sent' ? 'sender_id' : 'recipient_id', userId)
    .order('created_at', { ascending: false }).order('id').range(page * size, page * size + size - 1).abortSignal(signal)
  if (error) throw error
  return { requests: (data ?? []) as unknown as LiveRequest[], total: count ?? 0 }
}
export async function sendOrganizerRequest(senderId: string, recipientId: string, type: ContributionType, title: string, body: string, clientId: string) {
  validateRequest(senderId, recipientId, title, body)
  const client = requireSupabase()
  const { error } = await client.from('organizer_requests').insert({ sender_id: senderId, recipient_id: recipientId,
    contribution_type: type, title: title.trim(), body: body.trim(), client_request_id: clientId })
  if (!error) return
  // A retry after a lost response must not send a second request.
  const existing = await client.from('organizer_requests').select('id').eq('sender_id', senderId).eq('client_request_id', clientId).maybeSingle()
  if (existing.error || !existing.data) throw error
}
export async function answerOrganizerRequest(id: string, status: 'opened' | 'yes' | 'no') {
  const { error } = await requireSupabase().rpc('respond_to_organizer_request', { p_request_id: id, p_status: status })
  if (error) throw error
}
