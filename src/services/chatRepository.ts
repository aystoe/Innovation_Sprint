import {requireSupabase} from '../lib/supabase'
import {hydrateProfile} from './profileRepository'
import type {ProfileRow} from './profileRepository'
import type {ChatTransport,StoredMessage} from './chatSession'
import {CHAT_PAGE_SIZE} from './chatSession'
export const chatTransport:ChatTransport={
 async open(personId,signal){const {data,error}=await requireSupabase().rpc('get_or_create_direct_conversation',{p_other_user_id:personId}).abortSignal(signal);if(error)throw error;return data as string},
 async page(roomId,before,after,signal){const {data,error}=await requireSupabase().rpc('list_direct_messages',{p_conversation_id:roomId,p_before:before,p_after:after,p_limit:CHAT_PAGE_SIZE}).abortSignal(signal);if(error)throw error;return data as StoredMessage[]},
 async send(roomId,id,text,signal){
  const timeout=new AbortController();const abort=()=>timeout.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort()
  const timer=setTimeout(abort,15000)
  try{const {data,error}=await requireSupabase().rpc('send_direct_message',{p_conversation_id:roomId,p_client_message_id:id,p_body:text}).abortSignal(timeout.signal);if(error)throw error;return data as StoredMessage}
  finally{clearTimeout(timer);signal.removeEventListener('abort',abort)}
 },
 subscribe(roomId,onChange,onStatus){const client=requireSupabase();const channel=client.channel(`direct:${roomId}:${crypto.randomUUID()}`)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${roomId}`},onChange).subscribe(onStatus)
  return()=>{void client.removeChannel(channel)}
 }
}
export async function listConversations(page:number,signal:AbortSignal){
 const {data,error}=await requireSupabase().rpc('list_direct_conversations',{p_offset:page*20,p_limit:20}).abortSignal(signal)
 if(error)throw error
 const rows=data as {id:string;person:ProfileRow;last_body:string|null;last_sender:string|null;last_at:string}[]
 const result=[]
 for(let i=0;i<rows.length;i+=4){if(signal.aborted)throw new DOMException('Aborted','AbortError');result.push(...await Promise.all(rows.slice(i,i+4).map(async row=>({...row,person:await hydrateProfile(row.person)}))))}
 return result
}
