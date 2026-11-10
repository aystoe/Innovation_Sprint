import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { MAX_MESSAGE_LENGTH, suggestedMessages } from '../services/chat'
import { photoSource } from '../utils/avatar'
import { BackButton } from '../components/BackButton'
import { FormError } from '../components/FormError'
import { Icon } from '../components/Icon'

export function ChatPage({ personId, draft, onDraftChange, onBack, onProfile }: { personId: string; draft: string; onDraftChange: (text: string) => void; onBack: () => void; onProfile: (personId: string) => void }) {
  const { snapshot, getPerson, sendMessage } = useCommunity()
  const person = getPerson(personId)
  const messages = snapshot.conversations?.find(conversation => conversation.personId === personId)?.messages ?? []
  const [error, setError] = useState('')
  const bottom = useRef<HTMLDivElement>(null), input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (messages.length) bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' }) }, [personId, messages.length])
  useEffect(() => { setError('') }, [personId])
  if (!person || personId === 'me') return <><BackButton onClick={onBack} /><div className="empty"><h2>Chat unavailable</h2><p>Choose another member from Chatting.</p></div></>
  function submit(event: FormEvent) {
    event.preventDefault()
    try { sendMessage(personId, draft); onDraftChange(''); setError(''); input.current?.focus() }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not send your message.') }
  }
  return <div className="chat-room">
    <div className="chat-room-header"><BackButton onClick={onBack}>Chats</BackButton><button type="button" className="chat-recipient" onClick={() => onProfile(person.id)} aria-label={`View ${person.name}'s profile`}><img src={photoSource(person.photo)} alt="" /><span><strong>{person.name}</strong><small>Demo conversation</small></span></button></div>
    <div className="chat-messages" role="log" aria-label={`Messages with ${person.name}`} aria-live="polite" aria-relevant="additions text">
      {!messages.length && <div className="chat-welcome"><span className="chat-welcome-icon"><Icon name="chat" /></span><h2>Say hello to {person.name.split(' ')[0]}</h2><p>Choose an opener to edit, or write your own.</p><div className="chat-suggestions" aria-label="Suggested first messages">{suggestedMessages(snapshot.profile?.name ?? '', person.name).map((message) => <button type="button" key={message} onClick={() => { onDraftChange(message); input.current?.focus() }}><span>{message}</span><span className="suggestion-action">Use message ↗</span></button>)}</div></div>}
      {messages.map(message => <div key={message.id} className={`message-row ${message.sender === 'me' ? 'outgoing' : 'incoming'}`}><div className="message-bubble"><p>{message.text}</p><span className="message-meta">{message.automated ? 'Demo reply · ' : ''}<time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time></span></div></div>)}
      <div ref={bottom} />
    </div>
    <form className="chat-composer" onSubmit={submit}><label className="visually-hidden" htmlFor="chat-message">Message</label><div className="composer-row"><textarea ref={input} id="chat-message" placeholder="Write a message…" value={draft} maxLength={MAX_MESSAGE_LENGTH} rows={2} onChange={event => { onDraftChange(event.target.value); setError('') }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (draft.trim()) event.currentTarget.form?.requestSubmit() } }} /><button type="submit" className="send-message" aria-label="Send message" disabled={!draft.trim()}><Icon name="send" /></button></div><FormError message={error} /><p className="composer-hint">Demo · A sample reply appears after you send.</p></form>
  </div>
}
