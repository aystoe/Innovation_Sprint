import { useEffect, useState } from 'react'
import { loadMemberOptions } from '../services/directoryRepository'
import { isDemoMode } from '../lib/dataMode'
import { useCommunity } from '../context/CommunityContext'
import { SAMPLE_PROFILES } from '../data/profiles'
import { TOPICS, TRAIT_LABELS } from '../data/config'
import { availableTraits, sameTrait } from '../services/eventRules'
import type { Audience, AudienceTrait, TraitKind } from '../types'
export function AudiencePicker({ value, onChange }: { value: Audience; onChange: (audience: Audience) => void }) {
  const { snapshot } = useCommunity()
  const people = [...Object.values(SAMPLE_PROFILES), ...(snapshot.profile ? [snapshot.profile] : [])]
  const [remote,setRemote]=useState<Record<TraitKind,string[]> | null>(null)
  const [loadError,setLoadError]=useState('')
  useEffect(()=>{const controller=new AbortController();loadMemberOptions(controller.signal).then(options=>{
    if(!controller.signal.aborted)setRemote({interests:options.interests,courses:options.courses,profession:options.occupations,major:options.majors})
  }).catch(()=>{if(!controller.signal.aborted)setLoadError('Profile filter options could not be loaded. Reopen this form to retry.')});return()=>controller.abort()},[])
  const options = isDemoMode ? availableTraits(people, TOPICS) : remote ?? {interests:[],courses:[],profession:[],major:[]}
  function toggle(trait: AudienceTrait) {
    onChange({ ...value, traits: value.traits.some(t => sameTrait(t, trait)) ? value.traits.filter(t => !sameTrait(t, trait)) : [...value.traits, trait] })
  }
  return <div className="audience-box">{loadError && <p role="alert">{loadError}</p>}
    <label className="field">Who can see this event?<select value={value.mode} onChange={e => onChange({ ...value, mode: e.target.value === 'targeted' ? 'targeted' : 'everyone' })}><option value="everyone">Everyone in the community</option><option value="targeted">People with selected profile traits</option></select></label>
    {value.mode === 'targeted' && <div><p className="help">People matching any one selected trait can see this event. Your own posts remain visible to you.</p>{(Object.keys(options) as TraitKind[]).map(kind => <fieldset key={kind}><legend>{TRAIT_LABELS[kind]}</legend><div className="audience-options">{options[kind].map(option => <label className="trait-option" key={option}><input type="checkbox" checked={value.traits.some(t => sameTrait(t, { kind, value: option }))} onChange={() => toggle({ kind, value: option })} /><span>{option}</span></label>)}</div></fieldset>)}</div>}
    <p className="help">Audience conditions apply in both Member and Organizer screens.</p>
  </div>
}
