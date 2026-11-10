import { useCommunity } from '../context/CommunityContext'
import { SAMPLE_PROFILES } from '../data/profiles'
import { searchChatMembers } from '../services/chat'
import { photoSource } from '../utils/avatar'
import { Icon } from '../components/Icon'

export function ChatsPage({ query, onQueryChange, onChat }: { query: string; onQueryChange: (query: string) => void; onChat: (personId: string) => void }) {
  const { snapshot } = useCommunity()
  const people = searchChatMembers(Object.values(SAMPLE_PROFILES), query)
  const conversations = snapshot.conversations ?? []
  const existing = conversations.filter(conversation => people.some(person => person.id === conversation.personId) && conversation.messages.length)
  const newPeople = people.filter(person => !existing.some(conversation => conversation.personId === person.id))
  return <>
    <span className="eyebrow block">A conversation starts here</span><h1>Chatting</h1><p className="intro">Find someone in the community and say hello.</p>
    <label className="chat-search-label" htmlFor="chat-search">Search people</label><div className="member-search-input chat-search"><Icon name="search" /><input id="chat-search" type="search" autoComplete="off" placeholder="Search by name…" value={query} onChange={event => onQueryChange(event.target.value)} /></div>
    {query && <button type="button" className="clear-name" onClick={() => onQueryChange('')}>Clear search</button>}
    <p className="chat-demo-note">Demo chats · Replies are automatic.</p>
    {!!existing.length && <><div className="section-head"><strong>Conversations</strong><span>{existing.length}</span></div><ul className="chat-list">{existing.map(conversation => {
      const person = SAMPLE_PROFILES[conversation.personId], last = conversation.messages[conversation.messages.length - 1]
      return <li key={person.id}><button type="button" className="chat-person-row" onClick={() => onChat(person.id)}><img src={photoSource(person.photo)} alt="" /><span className="chat-person-copy"><strong>{person.name}</strong><span>{last.sender === 'me' ? 'You: ' : ''}{last.text}</span></span><time dateTime={last.createdAt}>{new Date(last.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</time></button></li>
    })}</ul></>}
    {!!newPeople.length && <><div className="section-head"><strong>{existing.length ? 'Start a new chat' : 'People'}</strong><span>{newPeople.length}</span></div><ul className="chat-list">{newPeople.map(person => <li key={person.id}><button type="button" className="chat-person-row" onClick={() => onChat(person.id)}><img src={photoSource(person.photo)} alt="" /><span className="chat-person-copy"><strong>{person.name}</strong><span>{person.occupation || 'Community member'}</span></span><Icon name="chat" /></button></li>)}</ul></>}
    {!people.length && <div className="empty"><Icon name="search" /><h2>No people found</h2><p>Try another name.</p><button type="button" className="secondary" onClick={() => onQueryChange('')}>Show all people</button></div>}
  </>
}
