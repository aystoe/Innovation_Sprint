import { requireSupabase } from '../lib/supabase'
import type { MemberFilters } from './memberDirectory'
import { directoryQuery } from './memberQuery'
import { hydrateProfile } from './profileRepository'
import type { ProfileRow } from './profileRepository'
export interface MemberOptions { occupations: string[]; majors: string[]; courses: string[]; interests: string[] }
export const emptyMemberOptions: MemberOptions = { occupations: [], majors: [], courses: [], interests: [] }
export async function searchMembers(filters: MemberFilters,page: number,signal: AbortSignal) {
  const { data,error } = await requireSupabase().rpc('search_members',directoryQuery(filters,page)).abortSignal(signal)
  if (error) throw error
  const result = data as { items: (ProfileRow & { team_order: number | null })[]; total: number; page: number; page_size: number }
  if (!result || !Array.isArray(result.items) || !Number.isSafeInteger(result.total)) throw new Error('Invalid directory response.')
  const members = []
  // Bounded parallel downloads: at most four at a time, only for this page.
  for (let i=0;i<result.items.length;i+=4) {
    if (signal.aborted) throw new DOMException('Aborted','AbortError')
    members.push(...await Promise.all(result.items.slice(i,i+4).map(async row => ({
      ...await hydrateProfile(row), teamOrder: row.team_order ?? undefined,
    }))))
  }
  return { members,total: result.total }
}
export async function loadMemberOptions(signal: AbortSignal): Promise<MemberOptions> {
  const { data,error } = await requireSupabase().rpc('member_filter_options').abortSignal(signal)
  if (error) throw error
  if (!data || !['occupations','majors','courses','interests'].every(key => Array.isArray(data[key]) && data[key].every((value: unknown) => typeof value === 'string'))) {
    throw new Error('Invalid filter options response.')
  }
  return data as MemberOptions
}
