import { useCommunity } from '../context/CommunityContext'
import { SAMPLE_PROFILES } from '../data/profiles'
import { TOPICS, TRAIT_LABELS } from '../data/config'
import { availableTraits, sameTrait } from '../services/eventRules'
import type { Audience, AudienceTrait, TraitKind } from '../types'
export function AudiencePicker({ value, onChange }: { value: Audience; onChange: (audience: Audience) => void }) {
  const { snapshot } = useCommunity()
  const people = [...Object.values(SAMPLE_PROFILES), ...(snapshot.profile ? [snapshot.profile] : [])]
  const options = availableTraits(people, TOPICS)
  function toggle(trait: AudienceTrait) {
    onChange({ ...value, traits: value.traits.some(t => sameTrait(t, trait)) ? value.traits.filter(t => !sameTrait(t, trait)) : [...value.traits, trait] })
  }
  return <div className="audience-box">
    <label className="field">Who can see this event?<select value={value.mode} onChange={e => onChange({ ...value, mode: e.target.value === 'targeted' ? 'targeted' : 'everyone' })}><option value="everyone">Everyone in the community</option><option value="targeted">People with selected profile traits</option></select></label>
    {value.mode === 'targeted' && <div><p className="help">People matching any one selected trait can see this event. Your own posts remain visible to you.</p>{(Object.keys(options) as TraitKind[]).map(kind => <fieldset key={kind}><legend>{TRAIT_LABELS[kind]}</legend><div className="audience-options">{options[kind].map(option => <label className="trait-option" key={option}><input type="checkbox" checked={value.traits.some(t => sameTrait(t, { kind, value: option }))} onChange={() => toggle({ kind, value: option })} /><span>{option}</span></label>)}</div></fieldset>)}</div>}
    <p className="help">Organizer announcements are always limited to organizers.</p>
  </div>
}
