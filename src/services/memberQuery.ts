import type { MemberFilters } from './memberDirectory'
export const MEMBER_PAGE_SIZE = 20
export const MEMBER_SEARCH_DELAY = 300
export function directoryQuery(filters: MemberFilters, page: number) {
  return { p_query: filters.query.trim().slice(0,200), p_occupation: filters.occupation,
    p_major: filters.major, p_course: filters.course, p_interests: [...filters.interests].sort(),
    p_contact: filters.contactPreference, p_page: page, p_page_size: MEMBER_PAGE_SIZE }
}
export function directoryFilterKey(filters: MemberFilters): string {
  return JSON.stringify(directoryQuery(filters,0))
}
