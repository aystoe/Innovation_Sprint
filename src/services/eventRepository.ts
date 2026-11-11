import {requireSupabase} from '../lib/supabase'
import type {CommunityEvent,EventInput,Role} from '../types'
import {validateEvent} from './eventRules'
import {decodeEventImage} from './eventInputRules'
type EventRow = {id:string;author_id:string;author_name:string;type:CommunityEvent['type'];title:string;description:string;location:string;
 starts_at:string;ends_at:string;audience_mode:'everyone'|'targeted';audience_traits:CommunityEvent['audience']['traits'];topics:string[];
 image_path:string|null;channel_digest:boolean;channel_slack:boolean;channel_calendar:boolean;revision:number;registration_mode:CommunityEvent['registrationMode'];
 external_url:string|null;capacity:number|null;registered_count:number;my_registration:CommunityEvent['myRegistration'];my_attended:boolean;host_label:string;time_confirmed:boolean}
async function mapEvent(r:EventRow,previous?:CommunityEvent):Promise<CommunityEvent>{
 let image=previous && previous.imagePath===r.image_path ? previous.image : undefined
 if(r.image_path && !image){
  const photo=await requireSupabase().storage.from('event-images').download(r.image_path)
  if(!photo.error)image=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Image read failed'));reader.readAsDataURL(photo.data) }).catch(()=>undefined)
 }
 return {id:r.id,authorId:r.author_id,author:r.author_name,type:r.type,title:r.title,description:r.description,location:r.location,
  start:r.starts_at,end:r.ends_at,audience:{mode:r.audience_mode,traits:r.audience_traits},topics:r.topics,image,imagePath:r.image_path??undefined,
  channels:{digest:r.channel_digest,slack:r.channel_slack,calendar:r.channel_calendar},color:'blue',art:'',reviews:[],revision:r.revision,
  registrationMode:r.registration_mode,externalUrl:r.external_url??undefined,capacity:r.capacity,registeredCount:Number(r.registered_count),
  myRegistration:r.my_registration,myAttended:r.my_attended,hostLabel:r.host_label,timeConfirmed:r.time_confirmed}
}
export async function fetchEvents(signal?:AbortSignal,previous:CommunityEvent[]=[]):Promise<CommunityEvent[]>{
 const events:CommunityEvent[]=[]
 const cached=new Map(previous.map(event=>[event.id,event]))
 for(let offset=0;;offset+=100){
  let query=requireSupabase().rpc('list_events',{p_offset:offset,p_limit:100})
  if(signal)query=query.abortSignal(signal)
  const {data,error}=await query;if(error)throw error
  const rows=data as EventRow[]
  for(let i=0;i<rows.length;i+=4){if(signal?.aborted)throw new DOMException('Aborted','AbortError');events.push(...await Promise.all(rows.slice(i,i+4).map(row=>mapEvent(row,cached.get(row.id)))))}
  if(rows.length<100)return events
 }
}
export async function fetchEvent(id:string):Promise<CommunityEvent>{
 const {data,error}=await requireSupabase().rpc('list_events',{p_id:id,p_limit:1,p_offset:0});if(error)throw error
 if(!data?.length)throw new Error('Event is unavailable or no longer visible.')
 return mapEvent(data[0] as EventRow)
}
export async function saveEvent(input:EventInput,userId:string,mode:Role,previous?:CommunityEvent,creationId?:string):Promise<{event:CommunityEvent;warning:string}>{
 const validation=validateEvent(input,mode);if(validation)throw new Error(validation)
 const client=requireSupabase();const id=previous?.id??creationId??crypto.randomUUID()
 const values={type:input.type,title:input.title.trim(),description:input.description.trim(),location:input.location.trim(),
  starts_at:new Date(input.start).toISOString(),ends_at:new Date(input.end).toISOString(),audience_mode:input.audience.mode,audience_traits:input.audience.traits,
  topics:input.topics??[],channel_digest:input.channels?.digest??false,channel_slack:input.channels?.slack??false,channel_calendar:input.channels?.calendar??false,
  registration_mode:input.registrationMode??'internal',external_url:input.externalUrl?.trim()||null,capacity:input.capacity??null,
  host_label:input.hostLabel??'',time_confirmed:input.timeConfirmed??true}
 const changedImage=input.image!==previous?.image
 const imageData=changedImage && input.image ? decodeEventImage(input.image) : null
 // For edits, upload first. For creation, persist the real author's event before Storage author checks.
 let revision=previous?.revision
 if(!previous){const inserted=await client.from('events').insert({id,author_id:userId,created_mode:mode,...values}).select('revision').single();if(inserted.error){if(inserted.error.code==='23505'){const existing=await fetchEvent(id);if(existing.authorId===userId)return {event:existing,warning:'This event was already created. Open Edit to review any remaining changes.'}}throw inserted.error};revision=inserted.data.revision}
 let path=previous?.imagePath??null;let uploaded:string|null=null;let warning=''
 if(changedImage){
  if(!input.image)path=null
  else {
   if(!imageData)throw new Error('Invalid image')
   const candidate=`${userId}/${id}/${crypto.randomUUID()}.${imageData.extension}`
   const upload=await client.storage.from('event-images').upload(candidate,imageData.bytes,{contentType:imageData.mime,upsert:false})
   if(upload.error){if(previous)throw upload.error;warning='Event created, but the image failed. Edit this event to retry.'}
   else {uploaded=candidate;path=candidate}
  }
 }
 if(previous || uploaded){
  const saved=await client.from('events').update({...values,image_path:path}).eq('id',id).eq('author_id',userId).eq('revision',revision).select('id').single()
  if(saved.error){
   if(uploaded && ['23514','42501','PGRST116'].includes(saved.error.code))await client.storage.from('event-images').remove([uploaded])
   if(previous)throw new Error('Could not save. The event may have changed; reopen it before retrying. '+saved.error.message)
   warning='Event created, but its image could not be linked. Edit the existing event to retry.'
  } else if(previous?.imagePath && previous.imagePath!==path){
   const removed=await client.storage.from('event-images').remove([previous.imagePath]);if(removed.error)warning='Event saved; old image cleanup is pending.'
  }
 }
 return {event:await fetchEvent(id),warning}
}
export async function setRegistration(id:string,registered:boolean){
 const {error}=await requireSupabase().rpc('set_event_registration',{p_event_id:id,p_registered:registered});if(error)throw error
}
