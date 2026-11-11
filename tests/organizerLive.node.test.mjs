import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import { escapeSearch, validateRequest } from '../src/services/organizerValidation.ts'

const code = stripTypeScriptTypes(readFileSync(new URL('../src/services/organizerLive.ts',import.meta.url),'utf8')
  .replace(/^import .*$/gm,''), {mode:'transform'}).replace(/export /g,'')
function setup(responses) {
  const calls=[]
  let chain
  chain=new Proxy({}, {get(_, key) {
    if (key==='then') return (resolve,reject) => Promise.resolve(responses.shift()).then(resolve,reject)
    return (...args) => {calls.push([key,...args]); return chain}
  }})
  const client={from:table=>{calls.push(['from',table]);return chain},rpc:(...args)=>{calls.push(['rpc',...args]);return chain}}
  const service=vm.runInNewContext(`(function(){${code};return {findOrganizerPeople,sendOrganizerRequest,listOrganizerRequests,answerOrganizerRequest}})()`, {
    requireSupabase:()=>client,hydrateProfile:async row=>row,profileColumns:'id,name,open_to,contact_preference',escapeSearch,validateRequest,
  })
  return {service,calls}
}
test('directory requests both contact colours and the next page without loading sample members',async()=>{
  const {service,calls}=setup([{data:[{id:'real'}],count:21,error:null}])
  const result=await service.findOrganizerPeople('A_%','Mentor',false,1,new AbortController().signal)
  assert.equal(result.total,21);assert.equal(result.people[0].id,'real')
  assert.equal(JSON.stringify(calls.find(c=>c[0]==='in')), JSON.stringify(['in','contact_preference',['green','yellow']]))
  assert.equal(JSON.stringify(calls.find(c=>c[0]==='range')), JSON.stringify(['range',20,39]))
  assert.equal(calls.find(c=>c[0]==='ilike')[2],'%A\\_\\%%')
  assert.ok(!calls.find(c=>c[0]==='select')[1].includes('email'))
})
test('inbox scopes queries to the account and direction',async()=>{
  const {service,calls}=setup([{data:[],count:0,error:null}])
  await service.listOrganizerRequests('B','received',0,new AbortController().signal)
  assert.equal(JSON.stringify(calls.find(c=>c[0]==='eq')), JSON.stringify(['eq','recipient_id','B']))
})
test('a lost send response resolves to the existing request on retry',async()=>{
  const {service,calls}=setup([{error:{message:'network response lost'}},{data:{id:'existing'},error:null}])
  await service.sendOrganizerRequest('A','B','Mentor','Title','Body','retry-key')
  assert.equal(calls.find(c=>c[0]==='insert')[1].client_request_id,'retry-key')
  assert.ok(calls.some(c=>c[0]==='eq' && c[1]==='sender_id' && c[2]==='A'))
})
test('failed send with no stored request is not shown as success',async()=>{
  const {service}=setup([{error:{message:'Permission denied'}},{data:null,error:null}])
  await assert.rejects(service.sendOrganizerRequest('A','B','Mentor','Title','Body','key'),e=>e.message==='Permission denied')
})
test('response errors propagate rather than optimistically showing an answer',async()=>{
  const {service,calls}=setup([{error:{message:'Only recipient may respond'}}])
  await assert.rejects(service.answerOrganizerRequest('request','yes'),e=>e.message==='Only recipient may respond')
  assert.equal(calls[0][1],'respond_to_organizer_request')
})
