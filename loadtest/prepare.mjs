import {createClient} from '@supabase/supabase-js'
import {randomUUID,randomBytes} from 'node:crypto'
import {writeFile,access} from 'node:fs/promises'
import {stagingConfig,verifyMarker,timedFetch,checked} from './guard.mjs'
const config=stagingConfig(),file=process.env.LOADTEST_FIXTURE??'loadtest/fixture.local.json'
try{await access(file);throw Error('Fixture exists; use its accounts or clean them explicitly')}catch(e){if(e.code!=='ENOENT')throw e}
const secret=process.env.STAGING_SERVICE_ROLE_KEY;if(!secret)throw Error('Set STAGING_SERVICE_ROLE_KEY for provisioning only')
const admin=createClient(config.url,secret,{global:{fetch:timedFetch},auth:{persistSession:false,autoRefreshToken:false}});await verifyMarker(admin)
const run=randomUUID(),accounts=[],events=[]
try{
 for(let i=0;i<200;i++){
  const email=`loadtest+${run}-${i}@tum.de`,password=randomBytes(24).toString('base64url')
  const result=await admin.auth.admin.createUser({email,password,email_confirm:true});if(result.error)throw result.error
  const id=result.data.user.id;accounts.push({id,email,password})
  await checked(admin.from('profiles').insert({id,name:`Load Member ${String(i).padStart(3,'0')}`,occupation:i%2?'Student':'Researcher',major:i%2?'Computer Science':'Engineering',interests:i%2?'Robotics, Art':'Sport, Music',courses:'Machine Learning, Design'}))
 }
 for(let i=0;i<60;i++){
  const id=randomUUID();await checked(admin.from('events').insert({id,author_id:accounts[0].id,created_mode:'member',type:i%2?'hobby':'official',title:`Load event ${i}`,description:'Disposable staging fixture',location:'Munich',starts_at:new Date(Date.now()+86400000+i*3600000).toISOString(),ends_at:new Date(Date.now()+172800000+i*3600000).toISOString(),audience_mode:'everyone',capacity:i===0?20:200,registration_mode:'internal',topics:['Robotics']}));events.push(id)
 }
 await writeFile(file,JSON.stringify({projectRef:config.ref,run,accounts,events},null,2),{mode:0o600,flag:'wx'});console.log('Prepared 200 accounts and 60 events. Fixture contains passwords; keep it local.')
}catch(e){
 // Persist only created fixture IDs for explicit recovery, including partial provisioning.
 await writeFile(file+'.partial',JSON.stringify({projectRef:config.ref,run,accounts,events},null,2),{mode:0o600});throw e
}
