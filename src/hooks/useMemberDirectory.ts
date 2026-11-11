import { useEffect, useState } from 'react'
import type { MemberFilters } from '../services/memberDirectory'
import type { Profile } from '../types'
import { directoryFilterKey, MEMBER_PAGE_SIZE, MEMBER_SEARCH_DELAY } from '../services/memberQuery'
import { searchMembers,loadMemberOptions,emptyMemberOptions } from '../services/directoryRepository'

export function useMemberDirectory(filters: MemberFilters, refreshToken: Profile | null) {
  const key = directoryFilterKey(filters)
  const [settled,setSettled] = useState(key)
  const [navigation,setNavigation] = useState({ key,page: 0 })
  const page = navigation.key === key ? navigation.page : 0
  const [attempt,setAttempt] = useState(0)
  const [options,setOptions] = useState(emptyMemberOptions)
  const [optionsError,setOptionsError] = useState('')
  const [result,setResult] = useState<{key: string;page: number;members: Profile[];total: number;error: string;loading: boolean}>(
    {key:'',page:0,members:[],total:0,error:'',loading:true})
  useEffect(() => {
    const timer = setTimeout(() => setSettled(key),MEMBER_SEARCH_DELAY)
    return () => clearTimeout(timer)
  },[key])
  useEffect(() => {
    const controller = new AbortController()
    loadMemberOptions(controller.signal).then(value => {
      if (!controller.signal.aborted) {setOptions(value);setOptionsError('')}
    }).catch(() => {if(!controller.signal.aborted)setOptionsError('Could not load filter options. Please retry.')})
    return () => controller.abort()
  },[attempt,refreshToken])
  useEffect(() => {
    if (settled!==key) return
    const controller = new AbortController()
    // Capture serialized parameters, not a new object identity on each render.
    const query = JSON.parse(key) as ReturnType<typeof import('../services/memberQuery').directoryQuery>
    const requested: MemberFilters = {query:query.p_query,occupation:query.p_occupation,major:query.p_major,
      course:query.p_course,interests:query.p_interests,contactPreference:query.p_contact}
    setResult({key,page,members:[],total:0,error:'',loading:true})
    searchMembers(requested,page,controller.signal).then(data => {
      if(controller.signal.aborted)return
      if(page>0 && page*MEMBER_PAGE_SIZE>=data.total) {setNavigation({key,page:Math.max(0,Math.ceil(data.total/MEMBER_PAGE_SIZE)-1)});return}
      setResult({key,page,...data,error:'',loading:false})
    }).catch(cause => {
      if(!controller.signal.aborted)setResult({key,page,members:[],total:0,error:cause?.message ?? 'Could not load members.',loading:false})
    })
    return () => controller.abort()
  },[key,settled,page,attempt,refreshToken])
  const current = result.key===key && result.page===page && settled===key
  return { members:current ? result.members : [],total:current ? result.total : 0,
    loading:!current || result.loading,error:current ? result.error : '',options,optionsError,page,
    setPage:(value:number) => setNavigation({key,page:Math.max(0,value)}),retry:() => setAttempt(n=>n+1) }
}
