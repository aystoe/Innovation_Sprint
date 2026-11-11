import {act,renderHook,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {emptyMemberFilters} from '../src/services/memberDirectory'
const api=vi.hoisted(()=>({search:vi.fn(),options:vi.fn()}))
vi.mock('../src/services/directoryRepository',()=>({searchMembers:api.search,loadMemberOptions:api.options,
 emptyMemberOptions:{occupations:[],majors:[],courses:[],interests:[]}}))
import {useMemberDirectory} from '../src/hooks/useMemberDirectory'
beforeEach(()=>{
 vi.clearAllMocks()
 api.options.mockResolvedValue({occupations:['Student'],majors:[],courses:[],interests:[]})
 api.search.mockResolvedValue({members:[],total:60})
})
afterEach(()=>vi.useRealTimers())
it('debounces rapid input and resets pagination on filter change',async()=>{
 const {result,rerender}=renderHook(({filters})=>useMemberDirectory(filters,null),{initialProps:{filters:emptyMemberFilters()}})
 await waitFor(()=>expect(result.current.loading).toBe(false))
 act(()=>result.current.setPage(2))
 await waitFor(()=>expect(api.search.mock.calls.at(-1)?.[1]).toBe(2))
 vi.useFakeTimers()
 rerender({filters:{...emptyMemberFilters(),query:'j'}})
 rerender({filters:{...emptyMemberFilters(),query:'jo'}})
 rerender({filters:{...emptyMemberFilters(),query:'jose'}})
 const before=api.search.mock.calls.length
 await act(async()=>{vi.advanceTimersByTime(299)})
 expect(api.search.mock.calls.length).toBe(before)
 await act(async()=>{vi.advanceTimersByTime(1)})
 expect(api.search.mock.calls.at(-1)?.[0].query).toBe('jose')
 expect(api.search.mock.calls.at(-1)?.[1]).toBe(0)
})
it('ignores out-of-order responses even when the transport cannot cancel',async()=>{
 let oldResolve!:(value:unknown)=>void
 api.search.mockImplementationOnce(()=>new Promise(resolve=>{oldResolve=resolve}))
 const {result,rerender}=renderHook(({filters})=>useMemberDirectory(filters,null),{initialProps:{filters:emptyMemberFilters()}})
 await waitFor(()=>expect(api.search).toHaveBeenCalledTimes(1))
 rerender({filters:{...emptyMemberFilters(),query:'new'}})
 await waitFor(()=>expect(api.search).toHaveBeenCalledTimes(2))
 await act(async()=>oldResolve({members:[{id:'stale'}],total:1}))
 expect(result.current.members).toEqual([])
 expect(result.current.total).toBe(60)
 expect(api.search.mock.calls[0][2].aborted).toBe(true)
})
it('shows an error without falling back to fixture profiles',async()=>{
 api.search.mockRejectedValue(new Error('database unavailable'))
 const {result}=renderHook(()=>useMemberDirectory(emptyMemberFilters(),null))
 await waitFor(()=>expect(result.current.error).toBe('database unavailable'))
 expect(result.current.members).toEqual([])
})
