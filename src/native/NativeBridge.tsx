import {useEffect,useState} from 'react'
import {Capacitor} from '@capacitor/core'
import type {PluginListenerHandle} from '@capacitor/core'
import {App as NativeApp} from '@capacitor/app'
import {Browser} from '@capacitor/browser'
import {Keyboard} from '@capacitor/keyboard'
import {Network} from '@capacitor/network'
import {useAuth} from '../auth/AuthContext'
import {supabase} from '../lib/supabase'
import {handleNativeBack} from './backHandler'
import {resumeAuthenticatedConnection} from './resume'
import {externalHttpsUrl} from './navigation'
export function NativeBridge(){
 const {retry}=useAuth();const [error,setError]=useState('')
 useEffect(()=>{
  if(!Capacitor.isNativePlatform())return
  let alive=true,active=true,recovering=false,keyboard=false,backBusy=false
  const handles:PluginListenerHandle[]=[]
  const keep=(pending:Promise<PluginListenerHandle>)=>{void pending.then(h=>{if(alive)handles.push(h);else void h.remove()}).catch(()=>{if(alive)setError('Device integration could not start. Restart the app.')})}
  const recover=async()=>{
   if(!alive||!active||recovering)return;recovering=true
   try{if(!supabase)return
    const client=supabase
    await resumeAuthenticatedConnection({verify:retry,active:()=>alive&&active,
     session:async()=>{const {data}=await client.auth.getSession();return data.session},
     setToken:async token=>{await client.realtime.setAuth(token)},
     connect:()=>{client.auth.startAutoRefresh();client.realtime.connect()},
     refresh:()=>window.dispatchEvent(new Event('app:resume'))})
   }catch{if(alive)setError('Connection could not be restored. Check your network and reopen the app.')}
   finally{recovering=false}
  }
  const resize=()=>{document.documentElement.style.setProperty('--app-height',`${window.visualViewport?.height??window.innerHeight}px`)}
  document.documentElement.classList.add('native-app');resize()
  window.visualViewport?.addEventListener('resize',resize);window.addEventListener('resize',resize)
  keep(NativeApp.addListener('appStateChange',({isActive})=>{active=isActive;if(isActive){resize();void recover()}else{supabase?.auth.stopAutoRefresh();supabase?.realtime.disconnect()}}))
  keep(Network.addListener('networkStatusChange',status=>{if(status.connected)void recover()}))
  keep(Browser.addListener('browserFinished',()=>void recover()))
  keep(Keyboard.addListener('keyboardDidShow',()=>{keyboard=true;document.documentElement.classList.add('keyboard-open');resize();document.activeElement?.scrollIntoView({block:'nearest'})}))
  keep(Keyboard.addListener('keyboardDidHide',()=>{keyboard=false;document.documentElement.classList.remove('keyboard-open');resize()}))
  keep(NativeApp.addListener('backButton',()=>{if(backBusy)return;backBusy=true;void (async()=>{
   if(keyboard){await Keyboard.hide();return}
   const filter=document.querySelector<HTMLButtonElement>('.filter-toggle[aria-expanded="true"]');if(filter){filter.click();return}
   if(!await handleNativeBack())await NativeApp.minimizeApp()
  })().catch(()=>{if(alive)setError('Could not go back. Please use the on-screen back button.')}).finally(()=>{backBusy=false})}))
  const external=(event:MouseEvent)=>{
   const anchor=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null
   if(!anchor||anchor.origin===window.location.origin||anchor.getAttribute('href')?.startsWith('#'))return
   event.preventDefault();const url=externalHttpsUrl(anchor.href)
   if(!url){setError('Only HTTPS external links can be opened.');return}
   void Browser.open({url}).catch(()=>{if(alive)setError('Could not open this link. Check that a browser is installed.')})
  }
  document.addEventListener('click',external,true);void recover()
  return()=>{alive=false;handles.forEach(h=>void h.remove());document.removeEventListener('click',external,true);window.visualViewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize);document.documentElement.classList.remove('keyboard-open')}
 },[retry])
 return error?<div className="native-error" role="alert">{error}<button type="button" onClick={()=>setError('')}>Dismiss</button></div>:null
}
