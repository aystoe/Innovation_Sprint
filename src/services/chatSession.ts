/** Account-scoped, memory-only chat state. Transport injected for deterministic tests. */
export interface StoredMessage {id:string;conversation_id:string;sender_id:string;body:string;created_at:string;sequence:string;client_message_id:string}
export interface ChatMessage {id:string;senderId:string;text:string;createdAt:string;sequence?:string;status:'sending'|'sent'|'failed'}
export interface RoomState {id:string;messages:ChatMessage[];loading:boolean;loadingOlder:boolean;hasOlder:boolean;error:string;connection:string}
export interface ChatTransport {
 open:(personId:string,signal:AbortSignal)=>Promise<string>
 page:(roomId:string,before:string|null,after:string|null,signal:AbortSignal)=>Promise<StoredMessage[]>
 send:(roomId:string,id:string,text:string,signal:AbortSignal)=>Promise<StoredMessage>
 subscribe:(roomId:string,onChange:()=>void,onStatus:(status:string)=>void)=>()=>void
}
export const CHAT_PAGE_SIZE=40
const empty=():RoomState=>({id:'',messages:[],loading:true,loadingOlder:false,hasOlder:false,error:'',connection:'Connecting…'})
export const EMPTY_ROOM=empty()
export function mergeMessages(previous:ChatMessage[],incoming:StoredMessage[]):ChatMessage[]{
 const map=new Map(previous.map(m=>[m.id,m]));for(const row of incoming)map.set(row.client_message_id,{id:row.client_message_id,senderId:row.sender_id,text:row.body,createdAt:row.created_at,sequence:row.sequence,status:'sent'})
 return [...map.values()].sort((a,b)=>a.sequence&&b.sequence ? (BigInt(a.sequence)<BigInt(b.sequence)?-1:BigInt(a.sequence)>BigInt(b.sequence)?1:0) : a.sequence?-1:b.sequence?1:a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id))
}
export class ChatSession {
 private rooms:Record<string,RoomState>={}
 private listeners=new Set<()=>void>()
 private controller=new AbortController()
 private stops=new Map<string,()=>void>()
 private opening=new Set<string>();private syncing=new Set<string>();private again=new Set<string>();private sending=new Set<string>()
 private cursors=new Map<string,string>();private oldest=new Map<string,string>();private initialized=new Set<string>()
 private watched=new Set<string>()
 private active=true
 private userId:string
 private transport:ChatTransport
 constructor(userId:string,transport:ChatTransport){this.userId=userId;this.transport=transport}
 start(){if(!this.active){this.active=true;this.controller=new AbortController()}}
 subscribe=(callback:()=>void)=>{this.listeners.add(callback);return()=>{this.listeners.delete(callback)}}
 getSnapshot=()=>this.rooms
 private put(person:string,patch:Partial<RoomState>){if(!this.active)return;this.rooms={...this.rooms,[person]:{...(this.rooms[person]??empty()),...patch}};this.listeners.forEach(fn=>fn())}
 private valid(signal:AbortSignal){return this.active&&!signal.aborted}
 async open(person:string){
  if(!this.active||person===this.userId)return
  this.watched.add(person)
  if(this.opening.has(person))return
  if(this.rooms[person]?.id){this.listen(person);await this.sync(person);return}
  const signal=this.controller.signal;this.opening.add(person);this.put(person,{loading:true,error:''})
  try{const id=await this.transport.open(person,signal);if(!this.valid(signal))return
   this.put(person,{id});this.listen(person);if(this.watched.has(person))await this.sync(person)
  }catch(e){if(this.valid(signal))this.put(person,{loading:false,error:message(e)})}
  finally{if(this.valid(signal))this.opening.delete(person)}
 }
 private listen(person:string){
  if(!this.watched.has(person)||this.stops.has(person))return
  const signal=this.controller.signal
  this.stops.set(person,this.transport.subscribe(this.rooms[person].id,()=>{if(this.watched.has(person))void this.sync(person)},status=>{
   if(!this.valid(signal)||!this.watched.has(person))return
   this.put(person,{connection:status==='SUBSCRIBED'?'Connected':'Reconnecting…'})
   if(status==='SUBSCRIBED')void this.sync(person)
  }))
 }
 pause(person:string){this.watched.delete(person);this.stops.get(person)?.();this.stops.delete(person)}
 async sync(person:string){
  const room=this.rooms[person];if(!this.active||!room?.id)return
  if(this.syncing.has(person)){this.again.add(person);return}
  this.syncing.add(person);const signal=this.controller.signal
  try{do{
   this.again.delete(person)
   if(!this.initialized.has(person)){
    const rows=await this.transport.page(room.id,null,null,signal);if(!this.valid(signal))return
    this.cursors.set(person,rows.at(-1)?.sequence??'0');if(rows.length)this.oldest.set(person,rows[0].sequence)
    this.initialized.add(person);this.put(person,{messages:mergeMessages(this.rooms[person].messages,rows),hasOlder:rows.length===CHAT_PAGE_SIZE,loading:false,error:''})
   }
   // Advance only from contiguous DB pages, never from realtime payloads or send acknowledgements.
   let more=true;while(more){const rows=await this.transport.page(room.id,null,this.cursors.get(person)??'0',signal);if(!this.valid(signal))return
    if(rows.length){this.cursors.set(person,rows[rows.length-1].sequence);if(!this.oldest.has(person))this.oldest.set(person,rows[0].sequence)}
    this.put(person,{messages:mergeMessages(this.rooms[person].messages,rows),loading:false,error:''});more=rows.length===CHAT_PAGE_SIZE
   }
  }while(this.again.has(person)&&this.valid(signal))
  }catch(e){if(this.valid(signal))this.put(person,{loading:false,error:message(e)})}
  finally{if(this.valid(signal))this.syncing.delete(person)}
 }
 async older(person:string){
  const room=this.rooms[person];if(!this.active||!room?.id||room.loadingOlder||!room.hasOlder)return
  const signal=this.controller.signal;this.put(person,{loadingOlder:true,error:''})
  try{const rows=await this.transport.page(room.id,this.oldest.get(person)??null,null,signal);if(!this.valid(signal))return
   if(rows.length)this.oldest.set(person,rows[0].sequence)
   this.put(person,{messages:mergeMessages(this.rooms[person].messages,rows),hasOlder:rows.length===CHAT_PAGE_SIZE})
  }catch(e){if(this.valid(signal))this.put(person,{error:message(e)})}finally{if(this.valid(signal))this.put(person,{loadingOlder:false})}
 }
 send(person:string,text:string,id:string=crypto.randomUUID()):string{
  const room=this.rooms[person];const body=text.trim()
  if(!this.active||!room?.id)throw new Error('Wait for the conversation to connect.')
  if(!body||[...body].length>2000)throw new Error('Write a message of 1–2000 characters.')
  if(this.sending.has(id)||room.messages.some(m=>m.id===id&&m.status==='sent'))return id
  const previous=room.messages.find(m=>m.id===id)
  if(previous&&previous.text!==body)throw new Error('Retry the original message unchanged.')
  const pending:ChatMessage=previous?{...previous,status:'sending'}:{id,senderId:this.userId,text:body,createdAt:new Date().toISOString(),status:'sending'}
  this.put(person,{messages:[...room.messages.filter(m=>m.id!==id),pending]})
  const signal=this.controller.signal;this.sending.add(id)
  void this.transport.send(room.id,id,body,signal).then(row=>{
   if(!this.valid(signal))return
   this.put(person,{messages:mergeMessages(this.rooms[person].messages,[row])});void this.sync(person)
  }).catch(()=>{if(this.valid(signal))this.put(person,{messages:this.rooms[person].messages.map(m=>m.id===id&&m.status!=='sent'?{...m,status:'failed'}:m)})})
  .finally(()=>{if(this.valid(signal))this.sending.delete(id)})
  return id
 }
 refresh(){for(const person of this.watched)void this.open(person)}
 dispose(){this.active=false;this.controller.abort();this.stops.forEach(stop=>stop());this.stops.clear();this.watched.clear();this.rooms={};this.opening.clear();this.syncing.clear();this.again.clear();this.sending.clear();this.cursors.clear();this.oldest.clear();this.initialized.clear();this.listeners.forEach(fn=>fn())}
}
function message(e:unknown){return e&&typeof e==='object'&&'message'in e?String(e.message):'Could not load messages. Please retry.'}
