import test from 'node:test'
import assert from 'node:assert/strict'
import {stages,summarize} from '../loadtest/metrics.mjs'
import {stagingConfig,assertFixture,verifyMarker} from '../loadtest/guard.mjs'
test('load profile ramps to 200, holds 15 minutes and drains',()=>{assert.equal(stages(0),1);assert.equal(stages(120000),50);assert.equal(stages(300000),200);assert.equal(stages(1199999),200);assert.equal(stages(1260000),0)})
test('metrics separate expected capacity rejects from unexpected errors',()=>{const s=summarize([{ms:10,ok:true},{ms:20,ok:false,expected:true},{ms:30,ok:false}]);assert.equal(s.errors,1);assert.equal(s.expectedRejections,1);assert.equal(s.p95,30);assert.equal(s.errorRate,1/3)})
test('staging guard rejects missing settings and mismatched project',()=>{assert.throws(()=>stagingConfig({}));const e={VITE_SUPABASE_URL:'https://abc.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'test',STAGING_PROJECT_REF:'xyz',LOADTEST_CONFIRM:'isolated-staging-only'};assert.throws(()=>stagingConfig(e));e.STAGING_PROJECT_REF='abc';assert.equal(stagingConfig(e).ref,'abc')})
test('fixtures cannot target another project or reuse one user 200 times',()=>{assert.throws(()=>assertFixture({projectRef:'other',accounts:[]},'abc'));assert.throws(()=>assertFixture({projectRef:'abc',accounts:Array(200).fill({id:'same'})},'abc'))})
test('database marker is mandatory',async()=>{await assert.rejects(verifyMarker({rpc:async()=>({data:null,error:{}})}));await verifyMarker({rpc:async()=>({data:'isolated-loadtest-only',error:null})})
})
