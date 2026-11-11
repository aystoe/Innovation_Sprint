import {createClient} from '@supabase/supabase-js'
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises'
import {monitorEventLoopDelay} from 'node:perf_hooks'
import {stagingConfig,verifyMarker,timedFetch,assertFixture,sleep} from './guard.mjs'
import {summarize,stages} from './metrics.mjs'
const config=stagingConfig(),fixture=JSON.parse(await readFile(process.env.LOADTEST_FIXTURE??'loadtest/fixture.local.json','utf8'));assertFixture(fixture,config.ref)
const probe=createClient(config.url,config.key,{global:{fetch:timedFetch},auth:{persistSession:false}});await verifyMarker(probe)
const dir=process.env.LOADTEST_OUTPUT??`validation/load-${Date.now()}`;await mkdir(dir,{recursive:true})
const samples={},users=[],deliveryTimes=[],pending=new Map(),delivered=new Set();let steadyConnectionSamples=0,steadyFullConnectionSamples=0;let payloads=0,payloadBytes=0,catchupRows=0,channelErrors=0,late=0,stop=false,peakClients=0,peakChannels=0
const loop=monitorEventLoopDelay({resolution:20});loop.enable()
const record=(name,ms,ok,expected=false)=>{(samples[name]??=[]).push({ms,ok,expected})}
async function call(u,name,query,expectedCode){const start=performance.now();try{const {data,error}=await query;if(error){record(name,performance.now()-start,false,Boolean(expectedCode)&&error.code===expectedCode);return null}record(name,performance.now()-start,true);return data}catch{record(name,performance.now()-start,false);return null}}
function received(u,kind,p,fromDb=false){if(fromDb)catchupRows++;else{payloads++;payloadBytes+=Buffer.byteLength(JSON.stringify(p))}if(kind==='message'){const id=p.new.client_message_id,sent=pending.get(id);if(sent&&u.id===sent.recipient&&!delivered.has(id)){if(sent.steady)deliveryTimes.push(performance.now()-sent.at);delivered.add(id)}}}
async function feed(u){if(u.feedBusy){u.feedAgain=true;return}u.feedBusy=true;try{do{u.feedAgain=false;for(let offset=0;;offset+=100){const rows=await call(u,'event_feed',u.client.rpc('list_events',{p_offset:offset,p_limit:100}));if(!rows||rows.length<100)break}}while(u.feedAgain&&!stop)}finally{u.feedBusy=false}}
function subscribe(u,name,bindings){const ch=u.client.channel(`${name}:${u.id}:${crypto.randomUUID()}`);for(const [table,filter,fn] of bindings)ch.on('postgres_changes',{event:table==='event_sync'?'UPDATE':'INSERT',schema:'public',table,...(filter?{filter}:{})},p=>{received(u,table==='messages'?'message':table,p);fn?.(p)})
 ch.subscribe(status=>{u.channels.set(ch,status==='SUBSCRIBED');if(['CHANNEL_ERROR','TIMED_OUT'].includes(status))channelErrors++});u.channels.set(ch,false);return ch}
const start=Date.now();let interrupted=false
process.on('SIGINT',()=>{stop=true;interrupted=true})
async function virtualUser(index){
 const a=fixture.accounts[index],client=createClient(config.url,config.key,{global:{fetch:timedFetch},auth:{persistSession:false,autoRefreshToken:true}})
 const u={id:a.id,client,channels:new Map(),feedBusy:false,feedAgain:false};users.push(u)
 const began=performance.now();const result=await client.auth.signInWithPassword({email:a.email,password:a.password});record('login',performance.now()-began,!result.error);if(result.error)return
 let timer;const scheduleFeed=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!stop)void feed(u)},150)}
 subscribe(u,'events',[['event_sync',`user_id=eq.${u.id}`,scheduleFeed]])
 const cohort=index%10;let room=null,cursor='0';let registered=false
 let catching=false;const catchup=async()=>{if(catching)return;catching=true;try{for(;;){const rows=await call(u,'message_catchup',client.rpc('list_direct_messages',{p_conversation_id:room,p_after:cursor,p_limit:40}));if(!rows)break;for(const m of rows)received(u,'message',{new:m},true);if(rows.length)cursor=rows.at(-1).sequence;if(rows.length<40)break}}finally{catching=false}}
 if(cohort>=5&&cohort<=7){const peer=fixture.accounts[index<100?index+100:index-100];u.peer=peer.id;room=await call(u,'open_chat',client.rpc('get_or_create_direct_conversation',{p_other_user_id:peer.id}));if(room)subscribe(u,'chat',[['messages',`conversation_id=eq.${room}`,()=>void catchup()]])}
 else if(cohort>=8)subscribe(u,'inbox',[['messages',null,()=>void call(u,'inbox',client.rpc('list_direct_conversations',{p_offset:0,p_limit:20}))]])
 let nextFeed=0,nextChat=0;await feed(u)
 try{while(!stop&&stages(Date.now()-start)>=index+1){
  if(Date.now()>nextFeed){await feed(u);nextFeed=Date.now()+30000}
  if(room&&Date.now()>nextChat){await catchup();nextChat=Date.now()+15000}
  if(cohort<5){const query=['Load','Member 0','Member 1','Load Member 12'][Math.floor(Math.random()*4)];await call(u,'search',client.rpc('search_members',{p_query:query,p_page:Math.random()<.2?1:0,p_page_size:20,p_occupation:Math.random()<.3?'Student':''}))}
  else if(room){const id=crypto.randomUUID();pending.set(id,{at:performance.now(),recipient:u.peer,steady:Date.now()-start>=300000&&Date.now()-start<1200000});await call(u,'send_message',client.rpc('send_direct_message',{p_conversation_id:room,p_client_message_id:id,p_body:`Load message ${id}`}));if(Math.random()<.05)await call(u,'retry_message',client.rpc('send_direct_message',{p_conversation_id:room,p_client_message_id:id,p_body:`Load message ${id}`}))}
  else{const event=fixture.events[1+index%59];registered=!registered;await call(u,'registration',client.rpc('set_event_registration',{p_event_id:event,p_registered:registered}));if(registered&&Math.random()<.15)await call(u,'duplicate_registration',client.rpc('set_event_registration',{p_event_id:event,p_registered:true}))}
  await sleep(cohort<5?5000+Math.random()*10000:10000+Math.random()*15000)
 }}finally{clearTimeout(timer);await client.removeAllChannels();u.channels.clear();await client.auth.signOut({scope:'local'})}
}
const jobs=[];let launched=0,burst=false,reconnected=false,hotInvariant=null
const sample=setInterval(()=>{const sockets=users.filter(u=>u.client.realtime.isConnected()).length,channels=users.reduce((sum,u)=>sum+[...u.channels.values()].filter(Boolean).length,0);if(Date.now()-start>=300000&&Date.now()-start<1200000){steadyConnectionSamples++;if(sockets===200)steadyFullConnectionSamples++}peakClients=Math.max(peakClients,sockets);peakChannels=Math.max(peakChannels,channels);void appendFile(`${dir}/timeseries.ndjson`,JSON.stringify({elapsedMs:Date.now()-start,launched,connectedSockets:sockets,subscribedChannels:channels,payloads,payloadBytes,channelErrors,eventLoopP99Ms:loop.percentile(99)/1e6})+'\n')},5000)
try{
 while(Date.now()-start<1260000&&!stop){const target=stages(Date.now()-start);while(launched<target){jobs.push(virtualUser(launched++).catch(()=>{record('user_lifecycle',0,false)}))}
  if(!burst&&Date.now()-start>=600000){burst=true;await Promise.all(users.map(u=>call(u,'hot_event',u.client.rpc('set_event_registration',{p_event_id:fixture.events[0],p_registered:true}),'23514')));const rows=await call(users[0],'hot_event_verify',users[0].client.rpc('list_events',{p_id:fixture.events[0],p_limit:1}));hotInvariant=rows?.[0]?.registered_count===20}
  if(!reconnected&&Date.now()-start>=720000){reconnected=true;for(const u of users.filter((_,i)=>i%10===5)){u.client.realtime.disconnect();setTimeout(()=>{if(!stop)u.client.realtime.connect()},5000)}}
  await sleep(500)
 }
}finally{stop=true;await Promise.allSettled(jobs);await Promise.allSettled(users.map(async u=>{await u.client.removeAllChannels();u.client.realtime.disconnect();await u.client.auth.signOut({scope:"local"})}));clearInterval(sample);loop.disable();for(const [id,entry] of pending)if(entry.steady&&!delivered.has(id))late++
 const deliveryStats=summarize(deliveryTimes.map(ms=>({ms,ok:true})));const operations=Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,summarize(v)]));const summary={startedAt:new Date(start).toISOString(),durationMs:Date.now()-start,interrupted,launched,finalConnectedSockets:users.filter(u=>u.client.realtime.isConnected()).length,peakConnectedSockets:peakClients,steady200ConnectionRatio:steadyConnectionSamples?steadyFullConnectionSamples/steadyConnectionSamples:0,peakSubscribedChannels:peakChannels,receivedPayloads:payloads,receivedPayloadBytes:payloadBytes,catchupRows,channelErrors,hotCapacityInvariant:hotInvariant,operations,steadyObservedDeliveryLatencyMs:deliveryStats,steadyMessagesNotObservedByRecipient:late,eventLoopP99Ms:loop.percentile(99)/1e6,limitations:'WebSocket payload counts exclude catch-up rows and protocol/heartbeat traffic; not Supabase billed message count. Dashboard metrics required. No image transfers/browser rendering.'}
 await writeFile(`${dir}/summary.json`,JSON.stringify(summary,null,2));console.log('Results written to',dir)
 if(users.some(u=>u.client.realtime.isConnected())||(deliveryStats.p95??Infinity)>2000||interrupted||hotInvariant!==true||peakClients<200||late>0||steadyFullConnectionSamples/Math.max(1,steadyConnectionSamples)<.98||Object.entries(operations).some(([name,x])=>x.errorRate>.01||(x.p95??0)>({search:1000,event_feed:1000,message_catchup:1000,send_message:1000,registration:2000,hot_event:2000}[name]??Infinity)))process.exitCode=1
}
