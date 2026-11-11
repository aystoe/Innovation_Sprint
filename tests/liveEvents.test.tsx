import {act,renderHook,waitFor} from '@testing-library/react'
import {beforeEach,expect,it,vi} from 'vitest'
const fake=vi.hoisted(()=>({fetch:vi.fn(),remove:vi.fn(),callbacks:[] as (()=>void)[],filters:[] as Record<string,string>[]}))
vi.mock('../src/services/eventRepository',()=>({fetchEvents:fake.fetch}))
vi.mock('../src/lib/supabase',()=>({requireSupabase:()=>({removeChannel:fake.remove,channel:()=>{
 const channel={on:(_kind:string,filter:Record<string,string>,callback:()=>void)=>{fake.filters.push(filter);fake.callbacks.push(callback);return channel},subscribe:()=>channel};return channel
}})}))
import {useLiveEvents} from '../src/hooks/useLiveEvents'
beforeEach(()=>{vi.clearAllMocks();fake.callbacks=[];fake.filters=[];fake.fetch.mockResolvedValue([])})
it('refreshes from the server on a private change signal and removes subscription',async()=>{
 const {result,unmount}=renderHook(()=>useLiveEvents('member-a',true,null))
 await waitFor(()=>expect(result.current.loading).toBe(false))
 expect(fake.filters.every(f=>f.table==='event_sync'&&f.filter==='user_id=eq.member-a')).toBe(true)
 const calls=fake.fetch.mock.calls.length
 act(()=>fake.callbacks[0]())
 await waitFor(()=>expect(fake.fetch.mock.calls.length).toBeGreaterThan(calls))
 unmount();expect(fake.remove).toHaveBeenCalledTimes(1)
})
it('removes stale events on query failure instead of retaining unauthorized cached data',async()=>{
 fake.fetch.mockRejectedValue(new Error('offline'))
 const {result}=renderHook(()=>useLiveEvents('member-a',true,null))
 await waitFor(()=>expect(result.current.error).toBe('offline'))
 expect(result.current.events).toEqual([])
})
