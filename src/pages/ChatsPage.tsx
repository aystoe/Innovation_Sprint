import {useCommunity} from '../context/CommunityContext'
import {useMemberDirectory} from '../hooks/useMemberDirectory'
import {useChatInbox} from '../hooks/useChatInbox'
import {emptyMemberFilters} from '../services/memberDirectory'
import {MEMBER_PAGE_SIZE} from '../services/memberQuery'
import {photoSource} from '../utils/avatar'
import {MemberRequests} from '../components/MemberRequests'
import {Icon} from '../components/Icon'
export function ChatsPage({query,onQueryChange,onChat}:{query:string;onQueryChange:(query:string)=>void;onChat:(personId:string)=>void}){
 const {userId,snapshot}=useCommunity();const directory=useMemberDirectory({...emptyMemberFilters(),query},snapshot.profile)
 const inbox=useChatInbox(userId);const people=directory.members.filter(p=>p.id!==userId)
 return <>
  <span className="eyebrow block">A conversation starts here</span><h1>Chatting</h1><p className="intro">Find someone in the community and say hello.</p>
  <label className="chat-search-label" htmlFor="chat-search">Search people</label><div className="member-search-input chat-search"><Icon name="search"/><input id="chat-search" type="search" autoComplete="off" placeholder="Search by name…" maxLength={200} value={query} onChange={e=>onQueryChange(e.target.value)}/></div>
  {query&&<button type="button" className="clear-name" onClick={()=>onQueryChange('')}>Clear search</button>}
  <p className="chat-demo-note">Private conversations with registered members.</p><MemberRequests/>
  {!query.trim()&&<><div className="section-head"><strong>Conversations</strong></div>
   {inbox.loading?<p role="status">Loading conversations…</p>:inbox.error?<p role="alert">{inbox.error} <button onClick={inbox.retry}>Retry</button></p>:<ul className="chat-list">{inbox.items.map(c=><li key={c.id}><button type="button" className="chat-person-row" onClick={()=>onChat(c.person.id)}><img src={photoSource(c.person.photo)} alt=""/><span className="chat-person-copy"><strong>{c.person.name}</strong><span>{c.last_sender===userId?'You: ':''}{c.last_body??'Say hello'}</span></span><time dateTime={c.last_at}>{new Date(c.last_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</time></button></li>)}</ul>}
   {(inbox.page>0||inbox.items.length===20)&&<nav className="section-head" aria-label="Conversation pages"><button className="secondary" disabled={inbox.page===0||inbox.loading} onClick={()=>inbox.setPage(inbox.page-1)}>Previous</button><span>{inbox.page+1}</span><button className="secondary" disabled={inbox.items.length<20||inbox.loading} onClick={()=>inbox.setPage(inbox.page+1)}>Next</button></nav>}
  </>}
  <div className="section-head"><strong>{query.trim()?'Search results':'Start a conversation'}</strong></div>
  {directory.loading?<p role="status">Loading members…</p>:directory.error?<p role="alert">{directory.error} <button onClick={directory.retry}>Retry</button></p>:<ul className="chat-list">{people.map(p=><li key={p.id}><button type="button" className="chat-person-row" onClick={()=>onChat(p.id)}><img src={photoSource(p.photo)} alt=""/><span className="chat-person-copy"><strong>{p.name}</strong><span>{p.occupation||'Community member'}</span></span><Icon name="chat"/></button></li>)}</ul>}
  {!directory.loading&&!directory.error&&!people.length&&<p className="empty">No other members found on this page.</p>}
  {directory.total>MEMBER_PAGE_SIZE&&<nav className="section-head" aria-label="Chat member pages"><button className="secondary" disabled={!directory.page||directory.loading} onClick={()=>directory.setPage(directory.page-1)}>Previous</button><span>{directory.page+1}</span><button className="secondary" disabled={(directory.page+1)*MEMBER_PAGE_SIZE>=directory.total||directory.loading} onClick={()=>directory.setPage(directory.page+1)}>Next</button></nav>}
 </>
}
