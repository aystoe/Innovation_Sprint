import { describe, expect, it, vi } from 'vitest'
import { emptyProfile } from '../src/data/profiles'
import { STORAGE_KEY, freshSnapshot, loadSnapshot, saveSnapshot, clearSnapshot } from '../src/services/localRepository'

describe('browser storage adapter', () => {
  it('starts unregistered and ignores the old HTML storage namespace', () => {
    localStorage.setItem('common-ground-fresh-profile-20261109-v1', JSON.stringify({ name: 'Old user' }))
    const { snapshot } = loadSnapshot()
    expect(snapshot.profile).toBe(null)
    expect(snapshot.events).toHaveLength(8)
  })
  it('round-trips profile, courses, participation and review data', () => {
    const snapshot = freshSnapshot()
    snapshot.profile = { ...emptyProfile(), name: 'Hyein', courses: 'Innovation Sprint 26w', topics: ['Robotics'], attendedEventIds: ['social-3'] }
    snapshot.events[0].reviews.push({ id: 'review', name: 'Hyein', text: 'Great!', photos: [], date: new Date().toISOString() })
    expect(saveSnapshot(snapshot)).toBe(true)
    expect(loadSnapshot().snapshot).toEqual(snapshot)
  })
  it('recovers safely from malformed data and reports storage failures', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    expect(loadSnapshot().snapshot.profile).toBe(null)
    expect(loadSnapshot().warning).not.toBe('')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    expect(saveSnapshot(freshSnapshot())).toBe(false)
  })
  it('reset removes only this app’s key', () => {
    localStorage.setItem('other-app', 'keep')
    saveSnapshot(freshSnapshot())
    expect(clearSnapshot()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(null)
    expect(localStorage.getItem('other-app')).toBe('keep')
  })
})
