import {readFile,writeFile,mkdir,readdir,copyFile,access} from 'node:fs/promises'
import {dirname,join,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
const source=dirname(fileURLToPath(import.meta.url)),root=process.cwd(),res=join(root,'android/app/src/main/res')
await access(join(root,'android/app/src/main/AndroidManifest.xml'))
const mark=await readFile(join(source,'cg-splash-res/cg_splash_mark.xml'),'utf8')
const launch=/<style\b(?=[^>]*\bname="AppTheme\.NoActionBarLaunch")[^>]*>[\s\S]*?<\/style>/g
const replacement=`<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">#FFFFFF</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/cg_splash_mark</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
        <item name="android:background">@drawable/cg_splash_background</item>
    </style>`
const edits=[];const legacy=[]
for(const dir of await readdir(res,{withFileTypes:true})){
 if(!dir.isDirectory())continue
 if(dir.name.startsWith('values'))for(const name of await readdir(join(res,dir.name))){if(!name.endsWith('.xml'))continue;const p=join(res,dir.name,name),text=await readFile(p,'utf8');const next=text.replace(launch,replacement);if(text!==next)edits.push([p,text,next])}
 if(dir.name.startsWith('drawable'))for(const name of await readdir(join(res,dir.name))){if(name==='splash.png')legacy.push(join(res,dir.name,name))}
}
if(!edits.length){
 const base=await readFile(join(res,'values/styles.xml'),'utf8');if(!base.includes('@drawable/cg_splash_mark'))throw Error('Expected Capacitor launch theme not found. No themes changed; inspect android/app/src/main/res/values/styles.xml.')
}
await mkdir(join(res,'drawable'),{recursive:true})
await writeFile(join(res,'drawable/cg_splash_mark.xml'),mark)
await writeFile(join(res,'drawable/cg_splash_background.xml'),`<layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@android:color/white"/><item android:width="240dp" android:height="240dp" android:gravity="center" android:drawable="@drawable/cg_splash_mark"/></layer-list>`)
const backupRoot=join(root,'cg-splash-backup')
async function backupPath(path){const target=join(backupRoot,relative(res,path));await mkdir(dirname(target),{recursive:true});return target}
for(const [path,old,next] of edits){try{await writeFile(await backupPath(path),old,{flag:'wx'})}catch(e){if(e.code!=='EEXIST')throw e}await writeFile(path,next)}
for(const path of legacy){try{await copyFile(path,await backupPath(path),1)}catch(e){if(e.code!=='EEXIST')throw e}await copyFile(join(source,'cg-splash-res/splash.png'),path)}
console.log(`CG splash applied: ${edits.length} themes, ${legacy.length} legacy splash images. Rebuild/reinstall Android app; this is not a Vercel change.`)
