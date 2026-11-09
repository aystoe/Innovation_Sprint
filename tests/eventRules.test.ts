import { describe, expect, it } from 'vitest'
import { createSeedEvents } from '../src/data/events'
import { emptyProfile } from '../src/data/profiles'
import { canReadEvent, matchesAudience, validateEvent } from '../src/services/eventRules'
import type { EventInput } from '../src/types'

describe('event visibility and creation rules', () => {
  it('matches any selected profile trait, ignoring case', () => {
    const event = createSeedEvents()[0]
    event.audience = { mode: 'targeted', traits: [{ kind: 'courses', value: 'Innovation Sprint 26w' }, { kind: 'interests', value: 'robotics' }] }
    const person = { ...emptyProfile(), name: 'Hyein', interests: 'Robotics, Hiking' }
    expect(matchesAudience(event, person)).toBe(true)
    expect(matchesAudience(event, { ...person, interests: 'Party' })).toBe(false)
    expect(matchesAudience(event, null)).toBe(false)
    expect(matchesAudience(event, { ...person, interests: '', courses: 'Innovation Sprint 26w' })).toBe(true)
  })
  it('keeps a creator’s targeted posts visible without granting organizer access', () => {
    const event = createSeedEvents()[0]
    event.authorId = 'me'; event.audience = { mode: 'targeted', traits: [{ kind: 'major', value: 'Unrelated major' }] }
    expect(canReadEvent(event, null, 'member')).toBe(true)
    event.type = 'announcement'
    expect(canReadEvent(event, null, 'member')).toBe(false)
    expect(canReadEvent(event, null, 'organizer')).toBe(true)
  })
  it('validates dates, required fields and targeted audience', () => {
    const seed = createSeedEvents()[0]
    const input: EventInput = { ...seed }
    expect(validateEvent(input, 'member')).toBe(null)
    expect(validateEvent({ ...input, title: '  ' }, 'member')).toContain('required')
    expect(validateEvent({ ...input, end: input.start }, 'member')).toContain('after')
    expect(validateEvent({ ...input, audience: { mode: 'targeted', traits: [] } }, 'member')).toContain('at least one')
    expect(validateEvent({ ...input, type: 'announcement' }, 'member')).toContain('Only organizers')
  })
})
