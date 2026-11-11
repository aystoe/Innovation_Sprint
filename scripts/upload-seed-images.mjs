// Run from project root. Requires the actual seed author's app credentials, never a service key.
import {createClient} from '@supabase/supabase-js'
import {readFile} from 'node:fs/promises'
const {VITE_SUPABASE_URL:url,VITE_SUPABASE_PUBLISHABLE_KEY:key,SEED_EMAIL:email,SEED_PASSWORD:password}=process.env
if(!url||!key||!email||!password)throw new Error('Set URL, publishable key, SEED_EMAIL and SEED_PASSWORD in the process environment.')
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const login=await client.auth.signInWithPassword({email,password})
if(login.error)throw login.error
try {
 const items=JSON.parse(await readFile('supabase/seeds/upcoming_images.json','utf8'))
 for(const item of items){
  const {data:event,error}=await client.from('events').select('id,author_id,image_path,revision').eq('source_key',item.source_key).single()
  if(error)throw error
  if(event.author_id!==login.data.user.id)throw new Error('Seed author does not match signed-in user')
  if(event.image_path){console.log('Already linked:',item.source_key);continue}
  const bytes=await readFile(item.file);if(bytes.length>5*1024*1024)throw new Error('Image exceeds 5 MiB')
  const ext=item.file.endsWith('.png')?'png':'jpg'
  const path=`${event.author_id}/${event.id}/seed-v1.${ext}`
  const upload=await client.storage.from('event-images').upload(path,bytes,{contentType:ext==='png'?'image/png':'image/jpeg',upsert:true})
  if(upload.error)throw upload.error
  const saved=await client.from('events').update({image_path:path}).eq('id',event.id).eq('revision',event.revision).select('id').single()
  if(saved.error)throw saved.error
  console.log('Linked:',item.source_key)
 }
} finally {await client.auth.signOut({scope:'local'})}
