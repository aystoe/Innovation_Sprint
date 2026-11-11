import { test } from 'node:test'
import assert from 'node:assert/strict'
import {directoryQuery,directoryFilterKey,MEMBER_PAGE_SIZE} from '../src/services/memberQuery.ts'
const base={query:'',occupation:'',major:'',course:'',interests:[],contactPreference:''}
test('directory parameters include page and fixed page size',()=>{
 assert.deepEqual(directoryQuery(base,2),{p_query:'',p_occupation:'',p_major:'',p_course:'',p_interests:[],p_contact:'',p_page:2,p_page_size:MEMBER_PAGE_SIZE})
})
test('literal search characters remain data rather than PostgREST filter syntax',()=>{
 assert.equal(directoryQuery({...base,query:'  % _ , (x)  '},0).p_query,'% _ , (x)')
})
test('interest ordering does not reset pagination or send duplicate queries',()=>{
 assert.equal(directoryFilterKey({...base,interests:['AI','Hiking']}),directoryFilterKey({...base,interests:['Hiking','AI']}))
})
test('a changed filter invalidates the current page key',()=>{
 assert.notEqual(directoryFilterKey(base),directoryFilterKey({...base,occupation:'Student'}))
})
test('does not mutate caller interests',()=>{
 const interests=['Z','A'];directoryQuery({...base,interests},0);assert.deepEqual(interests,['Z','A'])
})
