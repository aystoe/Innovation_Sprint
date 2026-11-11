import test from 'node:test'
import assert from 'node:assert/strict'
import {preparePhoto} from '../src/services/photos.ts'
test('unsupported, empty and oversized files fail before decoding',async()=>{for(const f of [new File(['x'],'a.svg',{type:'image/svg+xml'}),new File([],'a.jpg',{type:'image/jpeg'}),new File([new Uint8Array(5242881)],'a.jpg',{type:'image/jpeg'})])await assert.rejects(preparePhoto(f))})
async function environment(kind,run){
 const saved={Image:globalThis.Image,document:globalThis.document,FileReader:globalThis.FileReader}
 globalThis.Image=class{naturalWidth=kind==='huge'?1000000:100;naturalHeight=100;set src(v){queueMicrotask(()=>{if(kind==='invalid')this.onerror?.();else this.onload?.()})}}
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}}),toBlob:fn=>fn(kind==='nullblob'?null:new Blob(['jpeg'],{type:'image/jpeg'}))})}
 globalThis.FileReader=class{readAsDataURL(){this.result='data:image/jpeg;base64,anBlZw==';queueMicrotask(()=>this.onload?.())}}
 try{await run()}finally{Object.assign(globalThis,saved)}
}
test('valid image is compressed and returned as a preview data URL',async()=>environment('valid',async()=>assert.equal(await preparePhoto(new File(['x'],'x.jpg',{type:'image/jpeg'})),'data:image/jpeg;base64,anBlZw==')))
test('corrupt image and canvas failure become visible errors',async()=>{for(const kind of ['invalid','huge','nullblob'])await environment(kind,async()=>assert.rejects(preparePhoto(new File(['x'],'x.jpg',{type:'image/jpeg'}))))})
