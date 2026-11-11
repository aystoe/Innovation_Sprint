// Three-account integration acceptance test. Requires an isolated, provisioned staging fixture.
import {createClient} from '@supabase/supabase-js'
import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {stagingConfig,verifyMarker,timedFetch,assertFixture,checked} from '../loadtest/guard.mjs'
const config=stagingConfig(),f=JSON.parse(await readFile(process.env.LOADTEST_FIXTURE??'loadtest/fixture.local.json','utf8'));assertFixture(f,config.ref)
const clients=[],tokens=[]
for(const a of f.accounts.slice(0,3)){const client=createClient(config.url,config.key,{global:{fetch:timedFetch},auth:{persistSession:false}});await verifyMarker(client);const result=await client.auth.signInWithPassword({email:a.email,password:a.password});if(result.error)throw result.error;clients.push(client);tokens.push(result.data.session.access_token)}
const [a,b,c]=clients,[ua,ub]=f.accounts;const created=[]
try{
 await checked(a.from('profiles').update({bio:'Release test profile'}).eq('id',ua.id));const profile=await checked(b.from('profiles').select('id,name,bio').eq('id',ua.id).single());assert.equal(profile.bio,'Release test profile')
 const denied=await b.from('profiles').update({bio:'forged'}).eq('id',ua.id).select('id');assert.ok(denied.error||denied.data.length===0)
 const found=await checked(b.rpc('search_members',{p_query:'Load Member',p_page_size:20}));assert.ok(found.items.length);assert.ok(found.items.every(p=>!('email'in p)))
 const hidden=crypto.randomUUID();created.push(hidden)
 await checked(a.from('events').insert({id:hidden,author_id:ua.id,created_mode:'organizer',type:'official',title:'Restricted test',description:'staging',location:'Munich',starts_at:new Date(Date.now()+86400000).toISOString(),ends_at:new Date(Date.now()+172800000).toISOString(),audience_mode:'targeted',audience_traits:[{kind:'major',value:'Only-owner-test'}]}))
 assert.deepEqual(await checked(b.rpc('list_events',{p_id:hidden})),[])
 // Even user-controlled metadata claiming Organizer cannot broaden RLS.
 await checked(b.auth.updateUser({data:{role:'organizer'}}));await b.auth.refreshSession()
 assert.deepEqual(await checked(b.rpc('list_events',{p_id:hidden})),[])
 const edit=await b.from('events').update({title:'Forged'}).eq('id',hidden).select('id');assert.ok(edit.error||edit.data.length===0)
 const event=crypto.randomUUID();created.push(event)
 await checked(a.from('events').insert({id:event,author_id:ua.id,type:'official',title:'Capacity acceptance',description:'staging',location:'Munich',starts_at:new Date(Date.now()+86400000).toISOString(),ends_at:new Date(Date.now()+172800000).toISOString(),capacity:1}))
 assert.equal((await checked(b.rpc('list_events',{p_id:event})))[0].title,'Capacity acceptance')
 await checked(b.rpc('set_event_registration',{p_event_id:event,p_registered:true}));await checked(b.rpc('set_event_registration',{p_event_id:event,p_registered:true}))
 assert.equal((await checked(a.rpc('list_events',{p_id:event})))[0].registered_count,1)
 await checked(b.rpc('set_event_registration',{p_event_id:event,p_registered:false}))
 const race=await Promise.all([b,c].map(x=>x.rpc('set_event_registration',{p_event_id:event,p_registered:true})));assert.equal(race.filter(x=>!x.error).length,1);assert.equal(race.filter(x=>x.error?.code==='23514').length,1)
 const env={...process.env,TEST_TOKEN_A:tokens[0],TEST_TOKEN_B:tokens[1],TEST_TOKEN_C:tokens[2]};const chat=spawnSync(process.execPath,['scripts/test-direct-chat.mjs'],{env,stdio:'inherit',timeout:90000});assert.equal(chat.status,0,'chat integration')
 console.log('PASS: cross-account profiles/events, own-only edits, Organizer metadata bypass denial, duplicate and concurrent registration, direct chat suite')
}finally{for(const id of created)await a.from('events').delete().eq('id',id);await a.from('profiles').update({bio:''}).eq('id',ua.id);await b.auth.updateUser({data:{role:null}});await Promise.all(clients.map(async x=>{await x.removeAllChannels();await x.auth.signOut({scope:'local'});const result=await x.from('profiles').select('id').limit(1);assert.ok(result.error||!result.data?.length,'signed-out access denied')}))}
