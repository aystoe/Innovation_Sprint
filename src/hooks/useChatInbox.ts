import {useEffect,useState} from 'react'
import {requireSupabase} from '../lib/supabase'
import {listConversations} from '../services/chatRepository'
export function useChatInbox(userId:string){
 const [page,setPage]=useState(0),[attempt,setAttempt]=useState(0)
 const [state,setState]=useState<{items:Awaited<ReturnType<typeof listConversations>>;loading:boolean;error:string}>({items:[],loading:true,error:''})
 useEffect(()=>{
  const client=requireSupabase();let active=true;let controller:AbortController|undefined;let timer:ReturnType<typeof setTimeout>|undefined
  const refresh=async()=>{controller?.abort();const request=new AbortController();controller=request
   try{const items=await listConversations(page,request.signal);if(active&&!request.signal.aborted)setState({items,loading:false,error:''})}
   catch{if(active&&!request.signal.aborted)setState({items:[],loading:false,error:'Could not load conversations.'})}
  }
  setState({items:[],loading:true,error:''});void refresh()
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void refresh(),150)}
  const channel=client.channel(`inbox:${userId}:${crypto.randomUUID()}`)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},schedule)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'conversation_members',filter:`user_id=eq.${userId}`},schedule)
   .subscribe(status=>{if(status==='SUBSCRIBED')schedule()})
  const recover=()=>{if(document.visibilityState!=='hidden')void refresh()};const interval=setInterval(recover,15000)
  window.addEventListener('app:resume',recover);window.addEventListener('focus',recover);window.addEventListener('online',recover)
  return()=>{active=false;controller?.abort();clearTimeout(timer);clearInterval(interval);void client.removeChannel(channel);window.removeEventListener('app:resume',recover);window.removeEventListener('focus',recover);window.removeEventListener('online',recover)}
 },[userId,page,attempt])
 return {...state,page,setPage,retry:()=>setAttempt(n=>n+1)}
}
