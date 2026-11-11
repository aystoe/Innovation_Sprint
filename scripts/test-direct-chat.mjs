// Requires three distinct, real staging accounts with completed profiles. Creates retained test messages.
import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'
const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if(!url||!key)throw Error('Set Supabase URL and publishable key')
const clients=[],ids=[],channels=[]
for(const name of ['A','B','C']){
 const token=process.env[`TEST_TOKEN_${name}`];if(!token)throw Error(`Set TEST_TOKEN_${name}`)
 const client=createClient(url,key,{accessToken:async()=>token,auth:{persistSession:false,autoRefreshToken:false}})
 const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}})
 if(!response.ok)throw Error(`Invalid ${name} test token`)
 ids.push((await response.json()).id);clients.push(client)
}
assert.equal(new Set(ids).size,3,'Use distinct accounts')
const [a,b,c]=clients
async function rpc(client,name,args){const {data,error}=await client.rpc(name,args);if(error)throw error;return data}
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const subscribe=async(client,cid,onMessage)=>{
 const channel=client.channel(`chat-test:${crypto.randomUUID()}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${cid}`},onMessage);channels.push([client,channel])
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Subscription timeout')),15000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve()}else if(status==='CHANNEL_ERROR'){clearTimeout(timer);reject(Error('Subscription failed'))}})})
 return channel
}
let cid
try{
 const rooms=await Promise.all([rpc(a,'get_or_create_direct_conversation',{p_other_user_id:ids[1]}),rpc(b,'get_or_create_direct_conversation',{p_other_user_id:ids[0]})]);assert.equal(rooms[0],rooms[1]);cid=rooms[0]
 const seenB=[],seenC=[];const bChannel=await subscribe(b,cid,p=>seenB.push(p.new));await subscribe(c,cid,p=>seenC.push(p.new))
 const nonce=crypto.randomUUID(),body=`Chat integration test ${nonce}`
 const results=await Promise.all(Array.from({length:5},()=>rpc(a,'send_direct_message',{p_conversation_id:cid,p_client_message_id:nonce,p_body:body})))
 assert.equal(new Set(results.map(r=>r.id)).size,1,'Concurrent retries are idempotent')
 const {data:stored,error:readError}=await b.from('messages').select('id,sender_id').eq('conversation_id',cid).eq('client_message_id',nonce);assert.ifError(readError);assert.equal(stored.length,1);assert.equal(stored[0].sender_id,ids[0])
 for(let n=0;n<30&&!seenB.some(m=>m.client_message_id===nonce);n++)await wait(500)
 assert.ok(seenB.some(m=>m.client_message_id===nonce),'Recipient receives realtime insert')
 const outsider=await c.from('messages').select('id').eq('conversation_id',cid);assert.ifError(outsider.error);assert.deepEqual(outsider.data,[])
 for(const name of ['list_direct_messages','send_direct_message']){
  const args=name==='list_direct_messages'?{p_conversation_id:cid}:{p_conversation_id:cid,p_client_message_id:crypto.randomUUID(),p_body:'Intrude'}
  const {error}=await c.rpc(name,args);assert.equal(error?.code,'42501')
 }
 const forged=await a.from('messages').insert({conversation_id:cid,sender_id:ids[1],body:'Spoof'});assert.equal(forged.error?.code,'42501')
 const spoofRpc=await a.rpc('send_direct_message',{p_conversation_id:cid,p_client_message_id:crypto.randomUUID(),p_body:'Spoof',p_sender_id:ids[1]});assert.ok(spoofRpc.error,'RPC has no sender override')
 await b.removeChannel(bChannel)
 const after=results[0].sequence
 const missed=await rpc(a,'send_direct_message',{p_conversation_id:cid,p_client_message_id:crypto.randomUUID(),p_body:`Reconnect test ${nonce}`})
 await subscribe(b,cid,p=>seenB.push(p.new))
 const recovered=await rpc(b,'list_direct_messages',{p_conversation_id:cid,p_after:after,p_limit:40});assert.ok(recovered.some(m=>m.id===missed.id),'Refetch recovers offline insert')
 await wait(1500);assert.equal(seenC.length,0,'Outsider receives no protected message payload')
 console.log('PASS: same room, concurrent deduplication, recipient realtime, outsider read/send denial, sender spoof denial, reconnect recovery.')
 console.log('Staging conversation for admin cleanup:',cid)
}finally{await Promise.all(channels.map(([client,channel])=>client.removeChannel(channel)))}
