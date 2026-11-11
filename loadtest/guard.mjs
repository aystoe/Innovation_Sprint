export function stagingConfig(env=process.env){
 const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY,ref=env.STAGING_PROJECT_REF
 if(!url||!key||!ref||env.LOADTEST_CONFIRM!=='isolated-staging-only')throw Error('Missing staging configuration/confirmation')
 const parsed=new URL(url)
 if(parsed.protocol!=='https:'||parsed.hostname!==`${ref}.supabase.co`||parsed.pathname!=='/')throw Error('URL must match the explicit staging project ref')
 return {url:parsed.origin,key,ref}
}
export async function verifyMarker(client){const {data,error}=await client.rpc('loadtest_environment');if(error||data!=='isolated-loadtest-only')throw Error('Install the staging-only marker first; refusing to run')}
export function assertFixture(fixture,ref){if(fixture.projectRef!==ref||fixture.accounts?.length!==200||new Set(fixture.accounts.map(x=>x.id)).size!==200)throw Error('Fixture must contain 200 distinct accounts for this staging project')}
export const sleep=ms=>new Promise(r=>setTimeout(r,ms))
export async function checked(query){const {data,error}=await query;if(error)throw error;return data}

export function timedFetch(input,init={}){return fetch(input,{...init,signal:AbortSignal.any([...(init.signal?[init.signal]:[]),AbortSignal.timeout(15000)])})}
