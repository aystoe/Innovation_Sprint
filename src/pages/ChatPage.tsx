import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import type {FormEvent} from 'react'
import type {Profile} from '../types'
import {useCommunity} from '../context/CommunityContext'
import {useChatRoom} from '../context/ChatProvider'
import {loadProfile} from '../services/profileRepository'
import {MAX_MESSAGE_LENGTH,suggestedMessages} from '../services/chat'
import {photoSource} from '../utils/avatar'
import {BackButton} from '../components/BackButton'
import {FormError} from '../components/FormError'
import {Icon} from '../components/Icon'
export function ChatPage({personId,draft,onDraftChange,onBack,onProfile}:{personId:string;draft:string;onDraftChange:(text:string)=>void;onBack:()=>void;onProfile:(id:string)=>void}){
 const {userId,snapshot}=useCommunity();const chat=useChatRoom(personId)
 const [person,setPerson]=useState<Profile|null>(null),[error,setError]=useState(''),[profileError,setProfileError]=useState(''),[attempt,setAttempt]=useState(0)
 const input=useRef<HTMLTextAreaElement>(null),container=useRef<HTMLDivElement>(null)
 const oldHeight=useRef<number|null>(null),last=useRef(''),nearBottom=useRef(true),submitting=useRef(false)
 const {messages}=chat.room
 useEffect(()=>{const controller=new AbortController();loadProfile(personId,controller.signal).then(p=>{if(!controller.signal.aborted){setPerson(p);setProfileError(p?'':'Profile unavailable.')}}).catch(()=>{if(!controller.signal.aborted)setProfileError('Could not load profile.')});return()=>controller.abort()},[personId,attempt])
 useLayoutEffect(()=>{
  const el=container.current;if(!el)return
  if(oldHeight.current!==null&&!chat.room.loadingOlder){el.scrollTop+=el.scrollHeight-oldHeight.current;oldHeight.current=null}
  const tail=messages.at(-1)?.id??''
  if(tail!==last.current&&nearBottom.current)el.scrollTop=el.scrollHeight
  last.current=tail
 },[messages,chat.room.loadingOlder])
 function submit(event:FormEvent){event.preventDefault();if(submitting.current)return;submitting.current=true
  try{chat.send(draft);nearBottom.current=true;onDraftChange('');setError('');input.current?.focus()}catch(e){setError(e instanceof Error?e.message:'Could not send message.')}
  finally{queueMicrotask(()=>{submitting.current=false})}
 }
 if(!person)return <><BackButton onClick={onBack}/><p role={profileError?'alert':'status'}>{profileError||'Loading profile…'}</p>{profileError&&<button className="secondary" onClick={()=>{setProfileError('');setAttempt(n=>n+1)}}>Retry</button>}</>
 return <div className="chat-room">
  <div className="chat-room-header"><BackButton onClick={onBack}>Chats</BackButton><button type="button" className="chat-recipient" onClick={()=>onProfile(person.id)}><img src={photoSource(person.photo)} alt=""/><span><strong>{person.name}</strong><small role="status">{chat.room.connection}</small></span></button></div>
  <div className="chat-messages" ref={container} onScroll={()=>{const el=container.current;if(el)nearBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<100}} role="log" aria-label={`Messages with ${person.name}`} aria-live="polite" aria-relevant="additions text">
   {chat.room.loading&&<p role="status">Loading messages…</p>}
   {chat.room.error&&<div role="alert"><p>{chat.room.error}</p><button type="button" className="secondary" onClick={()=>void chat.retry()}>Retry connection</button></div>}
   {chat.room.hasOlder&&<button type="button" className="secondary" disabled={chat.room.loadingOlder} onClick={()=>{oldHeight.current=container.current?.scrollHeight??null;void chat.older()}}>{chat.room.loadingOlder?'Loading…':'Load earlier messages'}</button>}
   {!chat.room.loading&&!chat.room.error&&!messages.length&&<div className="chat-welcome"><span className="chat-welcome-icon"><Icon name="chat"/></span><h2>Say hello to {person.name.split(' ')[0]}</h2><p>Choose an opener to edit, or write your own.</p><div className="chat-suggestions" aria-label="Suggested first messages">{suggestedMessages(snapshot.profile?.name??'',person.name).map((text,index)=><button type="button" key={text} onClick={()=>{onDraftChange(text);input.current?.focus()}}><span className="suggestion-title">{['Coffee tomorrow','Get to know each other','Meet at an event'][index]}</span><span>{text}</span><span className="suggestion-action">Use message ↗</span></button>)}</div></div>}
   {messages.map(m=><div key={m.id} className={`message-row ${m.senderId===userId?'outgoing':'incoming'}`}><div className="message-bubble"><p>{m.text}</p><span className="message-meta"><time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time>{m.senderId===userId&&<> · <span role="status">{m.status==='sending'?'Sending…':m.status==='failed'?'Failed · not confirmed':'Sent'}</span></>}</span>{m.status==='failed'&&<button type="button" className="text-button" onClick={()=>{try{chat.send(m.text,m.id)}catch(e){setError(e instanceof Error?e.message:'Retry failed')}}}>Retry</button>}</div></div>)}
  </div>
  <form className="chat-composer" onSubmit={submit}><label className="visually-hidden" htmlFor="chat-message">Message</label><div className="composer-row"><textarea ref={input} id="chat-message" placeholder="Write a message…" value={draft} maxLength={MAX_MESSAGE_LENGTH} rows={2} onChange={e=>{onDraftChange(e.target.value);setError('')}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(draft.trim())e.currentTarget.form?.requestSubmit()}}}/><button type="submit" className="send-message" aria-label="Send message" disabled={!draft.trim()||!chat.room.id||chat.room.loading}><Icon name="send"/></button></div><FormError message={error}/><p className="composer-hint">Private 1-to-1 chat · Sent means saved, not read. Unsent messages stay here until logout or reload.</p></form>
 </div>
}
