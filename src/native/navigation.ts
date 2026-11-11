import type {Page,Role} from '../types/index.ts'
export function nativeBackDestination(page:Page,role:Role):Page|null{
 const root:Page={kind:role==='organizer'?'room':'feed'}
 switch(page.kind){
  case 'profile':return page.backTo
  case 'chat':return {kind:'chats'}
  case 'review':case 'edit':return {kind:'detail',eventId:page.eventId}
  case 'onboarding':return {kind:'register'}
  case 'detail':return {kind:'feed'}
  case 'feed':return role==='organizer'?root:null
  case 'room':return null
  default:return root
 }
}
export function isEditingPage(page:Page){return ['create','edit','register','onboarding','review'].includes(page.kind)}
export function externalHttpsUrl(value:string):string|null{
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null}catch{return null}
}
