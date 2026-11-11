import test from 'node:test'
import assert from 'node:assert/strict'
import {ChatSession,mergeMessages} from '../src/services/chatSession.ts'
const tick=()=>new Promise(r=>setImmediate(r))
const row=(n,id=`id-${n}`)=>({id:`db-${n}`,conversation_id:'room',sender_id:'alice',body:`message ${n}`,created_at:'2026-11-10T12:00:00Z',sequence:String(n),client_message_id:id})
function mock(initial=[]){
 let rows=[...initial],change,status,stopped=0,sends=0,fail=false;const calls=[]
 const transport={open:async()=> 'room',page:async(id,before,after)=>{calls.push({before,after});const selected=rows.filter(m=>(!before||BigInt(m.sequence)<BigInt(before))&&(!after||BigInt(m.sequence)>BigInt(after)));return after?selected.slice(0,40):selected.slice(-40)},send:async(room,id,text)=>{sends++;let r=rows.find(m=>m.client_message_id===id);if(!r){r={...row(rows.length+1,id),body:text};rows.push(r)}if(fail){fail=false;throw Error('Response lost')}return r},subscribe:(id,c,s)=>{change=c;status=s;return()=>stopped++}}
 const session=new ChatSession('alice',transport)
 return {session,transport,calls,rows,change:()=>change(),connect:()=>status('SUBSCRIBED'),fail:()=>{fail=true},get sends(){return sends},get stopped(){return stopped}}
}
test('latest page and earlier pages are ascending without duplicates',async()=>{const t=mock(Array.from({length:85},(_,i)=>row(i+1)));await t.session.open('bob');assert.equal(t.session.getSnapshot().bob.messages[0].sequence,'46');await t.session.older('bob');await t.session.older('bob');const r=t.session.getSnapshot().bob;assert.equal(r.messages.length,85);assert.equal(r.hasOlder,false);assert.deepEqual(r.messages.map(m=>m.sequence),Array.from({length:85},(_,i)=>String(i+1)));t.session.dispose()})
test('reconnect retrieves more than one page of missing messages',async()=>{const t=mock([row(1)]);await t.session.open('bob');t.rows.push(...Array.from({length:97},(_,i)=>row(i+2)));t.connect();await tick();assert.equal(t.session.getSnapshot().bob.messages.length,98);assert.ok(t.calls.some(c=>c.after==='81'));t.session.dispose()})
test('lost response retries same key and becomes exactly one sent message',async()=>{const t=mock();await t.session.open('bob');t.fail();t.session.send('bob','Hello','stable-id');assert.equal(t.session.getSnapshot().bob.messages[0].status,'sending');await tick();assert.equal(t.session.getSnapshot().bob.messages[0].status,'failed');t.session.send('bob','Hello','stable-id');await tick();assert.equal(t.rows.length,1);assert.equal(t.session.getSnapshot().bob.messages.length,1);assert.equal(t.session.getSnapshot().bob.messages[0].status,'sent');t.session.dispose()})
test('repeated clicks with same ID while pending issue only one send',async()=>{const t=mock();await t.session.open('bob');t.session.send('bob','Hi','same');t.session.send('bob','Hi','same');assert.equal(t.sends,1);await tick();t.session.send('bob','Hi','same');assert.equal(t.sends,1);t.session.dispose()})
test('send acknowledgement does not skip missing messages',async()=>{const t=mock([row(1)]);await t.session.open('bob');t.rows.push(row(2),row(3));t.session.send('bob','Hello','own4');await tick();assert.deepEqual(t.session.getSnapshot().bob.messages.map(m=>m.sequence),['1','2','3','4']);t.session.dispose()})
test('realtime after lost ack resolves failed message without retry',async()=>{const t=mock();await t.session.open('bob');t.fail();t.session.send('bob','Hi','stable');await tick();t.change();await tick();assert.equal(t.session.getSnapshot().bob.messages[0].status,'sent');assert.equal(t.sends,1);t.session.dispose()})
test('logout aborts requests, removes subscriptions and clears messages',async()=>{const t=mock([row(1)]);await t.session.open('bob');let resolve,signal;t.transport.send=(r,id,text,s)=>{signal=s;return new Promise(done=>resolve=done)};t.session.send('bob','Pending','late');t.session.dispose();assert.equal(signal.aborted,true);assert.equal(t.stopped,1);assert.deepEqual(t.session.getSnapshot(),{});resolve(row(2,'late'));await tick();assert.deepEqual(t.session.getSnapshot(),{});t.change();await tick();assert.deepEqual(t.session.getSnapshot(),{});assert.throws(()=>t.session.send('bob','No'))})
test('old response cannot rehydrate restarted session',async()=>{const t=mock();await t.session.open('bob');let resolve;t.transport.send=()=>new Promise(r=>resolve=r);t.session.send('bob','Old','old');t.session.dispose();t.session.start();await t.session.open('bob');resolve(row(1,'old'));await tick();assert.deepEqual(t.session.getSnapshot().bob.messages,[]);t.session.dispose()})
test('retry preserves content and validates length',async()=>{const t=mock();await t.session.open('bob');assert.throws(()=>t.session.send('bob',' '));assert.throws(()=>t.session.send('bob','x'.repeat(2001)));t.fail();t.session.send('bob','Original','key');await tick();assert.throws(()=>t.session.send('bob','Changed','key'));t.session.dispose()})
test('merge handles bigint beyond JS safe integer',()=>{const rows=[row('9007199254740994'),row('9007199254740993')];const merged=mergeMessages([],rows);assert.equal(merged[0].sequence,'9007199254740993');assert.equal(mergeMessages(merged,rows).length,2)})
test('repeated open reuses room and subscription',async()=>{const t=mock();let opens=0;t.transport.open=async()=>{opens++;return 'room'};await t.session.open('bob');await t.session.open('bob');assert.equal(opens,1);t.session.dispose();assert.equal(t.stopped,1)})
test('leaving room releases its subscription and polling; reopening catches up',async()=>{
 const t=mock([row(1)]);await t.session.open('bob');const before=t.calls.length;t.session.pause('bob');assert.equal(t.stopped,1)
 t.session.refresh();await tick();assert.equal(t.calls.length,before)
 t.rows.push(row(2));await t.session.open('bob');assert.equal(t.session.getSnapshot().bob.messages.length,2);t.session.dispose();assert.equal(t.stopped,2)
})
test('leaving before room creation completes does not create a hidden subscription',async()=>{
 const t=mock();let resolve;let subscriptions=0;t.transport.open=()=>new Promise(r=>resolve=r);t.transport.subscribe=()=>{subscriptions++;return()=>{}}
 const pending=t.session.open('bob');t.session.pause('bob');resolve('room');await pending;assert.equal(subscriptions,0);assert.equal(t.calls.length,0);t.session.dispose()
})
test('visiting 100 rooms sequentially keeps one channel instead of accumulating 100',async()=>{
 let active=0,peak=0,pages=0
 const transport={open:async p=>p,page:async()=>{pages++;return []},send:async()=>row(1),subscribe:()=>{active++;peak=Math.max(peak,active);return()=>active--}}
 const session=new ChatSession('alice',transport)
 for(let i=0;i<100;i++){if(i)session.pause(`p${i-1}`);await session.open(`p${i}`)}
 assert.equal(active,1);assert.equal(peak,1);const before=pages;session.refresh();await tick();assert.equal(pages-before,1);session.dispose();assert.equal(active,0)
})
