import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validExternalUrl,decodeEventImage} from '../src/services/eventInputRules.ts'
for(const url of ['https://example.com/form','https://forms.gle/abc'])test(`external ${url}`,()=>assert.equal(validExternalUrl(url),true))
for(const url of ['javascript:alert(1)','http://example.com','https://user:password@example.com','https://example.com/a b',''])test(`reject ${url}`,()=>assert.equal(validExternalUrl(url),false))
test('allows JPEG PNG WebP payloads',()=>{for(const mime of ['image/jpeg','image/png','image/webp'])assert.equal(decodeEventImage(`data:${mime};base64,AQID`).bytes.length,3)})
test('rejects SVG and oversized image payload',()=>{
 assert.throws(()=>decodeEventImage('data:image/svg+xml;base64,AQID'))
 assert.throws(()=>decodeEventImage('data:image/png;base64,'+Buffer.alloc(5*1024*1024+1).toString('base64')))
})
