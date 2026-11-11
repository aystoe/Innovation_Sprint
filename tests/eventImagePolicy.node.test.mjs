import test from 'node:test'
import assert from 'node:assert/strict'
import {eventImagePlan,isDefaultEventImagePath} from '../src/services/eventImagePolicy.ts'
test('new event without photo uploads a default',()=>assert.deepEqual(eventImagePlan(undefined),{keep:false,needsDefault:true,isDefault:true}))
test('user photo always wins over default',()=>assert.deepEqual(eventImagePlan('user-photo'),{keep:false,needsDefault:false,isDefault:false}))
test('editing default event keeps stored image without form preview',()=>assert.deepEqual(eventImagePlan(undefined,{image:'default-data',imagePath:'owner/event/default-id.jpg',imageIsDefault:true}),{keep:true,needsDefault:false,isDefault:true}))
test('removing custom photo replaces it with the default',()=>assert.equal(eventImagePlan(undefined,{image:'custom',imagePath:'owner/event/id.jpg'}).needsDefault,true))
test('failed download does not erase a saved photo during metadata edit',()=>assert.equal(eventImagePlan(undefined,{imagePath:'owner/event/id.jpg'}).keep,true))
test('only generated default filenames mark the image as default',()=>{assert.equal(isDefaultEventImagePath('owner/event/default-id.jpg'),true);assert.equal(isDefaultEventImagePath('owner/event/custom.jpg'),false)})
