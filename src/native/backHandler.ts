type Handler=()=>boolean|Promise<boolean>
let current:Handler|null=null
export function registerNativeBack(handler:Handler){current=handler;return()=>{if(current===handler)current=null}}
export async function handleNativeBack(){return current?await current():false}
