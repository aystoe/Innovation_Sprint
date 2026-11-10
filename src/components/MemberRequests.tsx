import { useCommunity } from '../context/CommunityContext'
import { freshOrganizerState, REQUEST_STATUS } from '../services/organizer'
export function MemberRequests() {
  const { snapshot, role, respondRequest } = useCommunity()
  if (role==='organizer' || !snapshot.profile) return null
  const requests=(snapshot.organizer ?? freshOrganizerState()).requests.filter(request=>request.recipients.some(recipient=>recipient.personId==='me'))
  if (!requests.length) return null
  return <section className="member-requests"><div className="section-head"><strong>Coordinator requests</strong></div>{requests.map(request=>{const status=request.recipients.find(recipient=>recipient.personId==='me')!.status;return <article className="request-card" key={request.id}><header><span>{request.type} · Carl</span><h2>{request.title}</h2></header><details onToggle={e=>{if(e.currentTarget.open && status==='delivered')respondRequest(request.id,'opened')}}><summary>Read request · {REQUEST_STATUS[status]}</summary><p className="request-body">{request.body}</p><div className="request-actions"><button type="button" className="primary" aria-pressed={status==='yes'} onClick={()=>respondRequest(request.id,'yes')}>Yes</button><button type="button" className="secondary" aria-pressed={status==='no'} onClick={()=>respondRequest(request.id,'no')}>Not this time</button></div></details></article>})}</section>
}
