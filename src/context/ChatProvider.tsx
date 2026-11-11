import {createContext,useContext,useEffect,useLayoutEffect,useState,useSyncExternalStore} from 'react'
import type {PropsWithChildren} from 'react'
import {ChatSession,EMPTY_ROOM} from '../services/chatSession'
import {chatTransport} from '../services/chatRepository'
const ChatContext=createContext<ChatSession|null>(null)
export function ChatProvider({userId,children}:PropsWithChildren<{userId:string}>){
 const [session]=useState(()=>new ChatSession(userId,chatTransport))
 useLayoutEffect(()=>{session.start();return()=>session.dispose()},[session])
 useEffect(()=>{
  const recover=()=>{if(document.visibilityState!=='hidden')session.refresh()}
  window.addEventListener('app:resume',recover);window.addEventListener('focus',recover);window.addEventListener('online',recover);document.addEventListener('visibilitychange',recover)
  const interval=setInterval(recover,15000)
  return()=>{clearInterval(interval);window.removeEventListener('app:resume',recover);window.removeEventListener('focus',recover);window.removeEventListener('online',recover);document.removeEventListener('visibilitychange',recover)}
 },[session])
 return <ChatContext.Provider value={session}>{children}</ChatContext.Provider>
}
export function useChatRoom(personId:string){
 const session=useContext(ChatContext);if(!session)throw new Error('Chat provider required')
 const rooms=useSyncExternalStore(session.subscribe,session.getSnapshot)
 useEffect(()=>{void session.open(personId);return()=>session.pause(personId)},[session,personId])
 return {room:rooms[personId]??EMPTY_ROOM,send:(text:string,id?:string)=>session.send(personId,text,id),older:()=>session.older(personId),retry:()=>session.open(personId)}
}
