interface ResumeDependencies {
 verify:()=>Promise<void>
 session:()=>Promise<{access_token:string;expires_at?:number}|null>
 active:()=>boolean
 setToken:(token:string)=>Promise<void>
 connect:()=>void
 refresh:()=>void
}
/** Refresh listeners never receive the raw JWT, and inactive apps cannot reconnect late. */
export async function resumeAuthenticatedConnection(deps:ResumeDependencies){
 await deps.verify();if(!deps.active())return false
 const session=await deps.session()
 if(!deps.active()||!session||(session.expires_at??0)*1000<=Date.now())return false
 await deps.setToken(session.access_token);if(!deps.active())return false
 deps.connect();deps.refresh();return true
}
