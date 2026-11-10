import type { OrganizerState, Profile, ContributionType, OrganizerRequest, RequestStatus } from '../types'
import { newId } from '../utils/format'
export const CONTRIBUTIONS: ContributionType[] = ['Speaker', 'Jury', 'Mentor', 'Feedback']
export const REQUEST_TITLES: Record<ContributionType, string> = { Speaker: 'Founder talk at the Launchpad kickoff', Jury: 'Pitch jury at demo day', Mentor: 'One 45-minute call with a team', Feedback: '5-minute feedback on your programme' }
export function freshOrganizerState(): OrganizerState {
  return { handovers: 0, requests: [
    { id:'sample-talk', title:REQUEST_TITLES.Speaker, type:'Speaker', body:'Would you share your journey with our new teams?', createdAt:'2026-11-07T10:00:00Z', recipients:[{personId:'maya',status:'yes'},{personId:'member-03',status:'opened'},{personId:'member-08',status:'delivered'}] },
    { id:'sample-feedback', title:REQUEST_TITLES.Feedback, type:'Feedback', body:'Could you share five minutes of feedback on your programme?', createdAt:'2026-11-10T09:00:00Z', recipients:[{personId:'me',status:'delivered'},{personId:'alex',status:'yes'}] },
  ] }
}
export function openTo(person: Profile): ContributionType[] { return person.openTo ?? (person.id === 'me' ? [] : ['Mentor','Feedback']) }
export function canAsk(person: Profile, type: ContributionType): boolean { return person.contactPreference !== 'gray' && person.contactPreference !== undefined && openTo(person).includes(type) }
export function addRequest(state: OrganizerState, recipient: Profile, type: ContributionType, title: string, body: string, now = new Date()): OrganizerState {
  if (!canAsk(recipient,type)) throw new Error('This member is not accepting this type of request.')
  if (!title.trim() || !body.trim()) throw new Error('Add a title and a message.')
  if (title.length > 150 || body.length > 2000) throw new Error('Keep the title under 151 and message under 2,001 characters.')
  const request: OrganizerRequest = { id:newId(), type, title:title.trim(), body:body.trim(), createdAt:now.toISOString(), recipients:[{personId:recipient.id,status:'delivered'}] }
  return { ...state, requests:[request,...state.requests] }
}
export function answerRequest(state: OrganizerState, requestId: string, personId: string, status: RequestStatus): OrganizerState {
  if (!['opened','yes','no'].includes(status)) throw new Error('Choose a valid response.')
  const request = state.requests.find(item=>item.id===requestId)
  if (!request?.recipients.some(item=>item.personId===personId)) throw new Error('This request is unavailable.')
  return { ...state, requests:state.requests.map(item=>item.id!==requestId ? item : {...item,recipients:item.recipients.map(recipient=>recipient.personId!==personId || (status==='opened' && ['yes','no'].includes(recipient.status)) ? recipient : {...recipient,status})}) }
}
export const REQUEST_STATUS: Record<RequestStatus,string> = { delivered:'Delivered', opened:'Opened', yes:'Yes', no:'Not this time' }
