import {readFile,writeFile,mkdir,access,cp,readdir} from 'node:fs/promises'
import {resolve,dirname,relative,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {validateAndroidConfig} from './android/config.mjs'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root)
const command=process.argv[2],config=JSON.parse(await readFile('capacitor.config.json','utf8')),identity=JSON.parse(await readFile('native/app.identity.json','utf8'));validateAndroidConfig(config,identity)
const exists=async p=>{try{await access(p);return true}catch{return false}}
function cap(...args){const result=spawnSync(process.execPath,['node_modules/@capacitor/cli/bin/capacitor',...args],{stdio:'inherit'});if(result.status!==0)throw Error(`Capacitor ${args.join(' ')} failed; run npm install first.`)}
async function apply(){
 const gradle='android/app/build.gradle';let build=await readFile(gradle,'utf8')
 // Avoid silently renaming an installed package and stranding its auth storage or update path.
 if(build.match(/applicationId\s*=?\s*['"]([^'"]+)['"]/)?.[1]!==identity.appId)throw Error('Generated Android appId differs. Follow the documented pre-release rename procedure.')
 const marker="apply from: '../../native/android/release.gradle'";if(!build.includes(marker)){build+='\n'+marker+'\n';await writeFile(gradle,build)}
 const activity=`android/app/src/main/java/${identity.appId.replaceAll('.','/')}/MainActivity.java`
 await mkdir(dirname(activity),{recursive:true});await writeFile(activity,(await readFile('native/android/MainActivity.java.template','utf8')).replaceAll('__APP_ID__',identity.appId))
 const stringsPath='android/app/src/main/res/values/strings.xml'
 let strings=await readFile(stringsPath,'utf8')
 const displayName=identity.appName.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll("'","\\'").replaceAll('\"','&quot;')
 for(const key of ['app_name','title_activity_main'])strings=strings.replace(new RegExp(`(<string name=\"${key}\">)[^<]*(</string>)`),(_m,a,b)=>a+displayName+b)
 await writeFile(stringsPath,strings)
 const manifest='android/app/src/main/AndroidManifest.xml';let xml=await readFile(manifest,'utf8')
 function attribute(tag,key,value){xml=xml.replace(new RegExp(`<${tag}\\b[^>]*>`),match=>{const attr=new RegExp(`android:${key}="[^"]*"`);return attr.test(match)?match.replace(attr,`android:${key}="${value}"`):match.replace(/>$/,` android:${key}="${value}">`)})}
 attribute('application','usesCleartextTraffic','false');attribute('application','allowBackup','false');attribute('application','fullBackupContent','@xml/cg_backup_rules');attribute('application','dataExtractionRules','@xml/cg_data_extraction_rules');attribute('activity','windowSoftInputMode','adjustResize')
 await writeFile(manifest,xml);await cp('native/android/res','android/app/src/main/res',{recursive:true})
 console.log('Applied native activity, safe-area/keyboard manifest, icons, version and signing rules.')
}
async function verify(){
 const packaged=JSON.parse(await readFile('android/app/src/main/assets/capacitor.config.json','utf8'));validateAndroidConfig(packaged,identity)
 const assetRoot='android/app/src/main/assets/public';let count=0
 async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else{const local=await readFile(path),embedded=await readFile(join(assetRoot,relative('dist',path)));if(!local.equals(embedded))throw Error(`Stale embedded asset: ${relative('dist',path)}`);count++}}}
 await access('dist/index.html');await walk('dist')
 const manifest=await readFile('android/app/src/main/AndroidManifest.xml','utf8');if(!manifest.includes('android:usesCleartextTraffic="false"')||!manifest.includes('android:windowSoftInputMode="adjustResize"'))throw Error('Native manifest safeguards missing')
 console.log(`Verified ${count} embedded dist files; no external server.url. index sha256=${createHash('sha256').update(await readFile('dist/index.html')).digest('hex')}`)
}
if(command==='init'){
 await access('dist/index.html');if(!await exists('android'))cap('add','android');await apply();cap('sync','android');await verify()
}else if(command==='sync'){
 if(!await exists('android/app/build.gradle'))throw Error('Run npm run android:init first')
 await access('dist/index.html');await apply();cap('sync','android');await verify()
}else if(command==='open'){cap('open','android')}
else if(command==='verify'){await verify()}
else throw Error('Use init, sync, open or verify')
