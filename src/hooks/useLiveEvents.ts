import {useCallback,useEffect,useRef,useState} from 'react'
import {requireSupabase} from '../lib/supabase'
import {fetchEvents} from '../services/eventRepository'
import type {CommunityEvent,Profile} from '../types'
export function useLiveEvents(userId:string,enabled:boolean,profile:Profile|null){
 const [events,setEvents]=useState<CommunityEvent[]>([])
 const cached=useRef<CommunityEvent[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const controller=useRef<AbortController|null>(null)
 const active=useRef(false)
 const refresh=useCallback(async()=>{
  if(!enabled||!active.current)return
  controller.current?.abort();const request=new AbortController();controller.current=request
  try{const rows=await fetchEvents(request.signal,cached.current);if(!request.signal.aborted&&active.current){cached.current=rows;setEvents(rows);setError('');setLoading(false)}}
  catch(cause){if(!request.signal.aborted&&active.current){cached.current=[];setEvents([]);setLoading(false);setError(cause instanceof Error?cause.message:'Events could not be loaded.')}}
 },[enabled])
 useEffect(()=>{
  if(!enabled)return
  active.current=true
  const client=requireSupabase();let timer:ReturnType<typeof setTimeout>|undefined
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void refresh(),150)}
  const channel=client.channel(`event-sync:${userId}`)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'event_sync',filter:`user_id=eq.${userId}`},schedule)
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'event_sync',filter:`user_id=eq.${userId}`},schedule)
   .subscribe(status=>{if(status==='SUBSCRIBED')void refresh()})
  void refresh()
  const recover=()=>{if(document.visibilityState!=='hidden')void refresh()}
  const interval=setInterval(recover,30000)
  window.addEventListener('app:resume',recover);window.addEventListener('focus',recover);window.addEventListener('online',recover)
  return()=>{active.current=false;controller.current?.abort();clearTimeout(timer);clearInterval(interval);void client.removeChannel(channel);window.removeEventListener('app:resume',recover);window.removeEventListener('focus',recover);window.removeEventListener('online',recover)}
 },[userId,enabled,refresh])
 useEffect(()=>{void refresh()},[profile,refresh])
 return {events,loading,error,refresh}
}
