// Isolated staging only: supply two DIFFERENT users' access tokens and a fresh, visible, capacity=1 event.
const {VITE_SUPABASE_URL:url,VITE_SUPABASE_PUBLISHABLE_KEY:key,TEST_EVENT_ID:id,TEST_TOKEN_A:a,TEST_TOKEN_B:b}=process.env
if(!url||!key||!id||!a||!b||a===b)throw new Error('Provide project config, test event id and two different test access tokens.')
async function rpc(token,name,args){const response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args)});const text=await response.text();return {ok:response.ok,data:text ? JSON.parse(text) : null}}
const before=await rpc(a,'list_events',{p_id:id,p_limit:1,p_offset:0})
if(!before.ok||before.data[0]?.capacity!==1||Number(before.data[0]?.registered_count)!==0)throw new Error('Use a fresh capacity=1 event with no registrations.')
const results=await Promise.all([a,b].map(token=>rpc(token,'set_event_registration',{p_event_id:id,p_registered:true})))
try {
 if(results.filter(r=>r.ok).length!==1||!results.some(r=>r.data?.code==='23514'))throw new Error('Expected exactly one success and one capacity rejection.')
 const after=await rpc(a,'list_events',{p_id:id,p_limit:1,p_offset:0})
 if(!after.ok||Number(after.data[0]?.registered_count)!==1)throw new Error('Unexpected registration count')
 console.log('PASS: exactly one concurrent application accepted.')
} finally {
 for(const [i,result] of results.entries())if(result.ok){const removed=await rpc([a,b][i],'set_event_registration',{p_event_id:id,p_registered:false});if(!removed.ok)console.error('Cleanup failed: cancel the successful test application manually.')}
}
