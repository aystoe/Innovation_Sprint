import { requireSupabase } from '../lib/supabase'
import type { Profile } from '../types'
import { isPhoto } from '../utils/avatar'

export type ProfileRow = {
  id: string; name: string; occupation: string; bio: string; major: string
  interests: string; courses: string; photo_path: string | null; social: string; social_other: string
  topics: string[]; open_to: NonNullable<Profile['openTo']>; contact_preference: NonNullable<Profile['contactPreference']>
}
export const profileColumns = 'id,name,occupation,bio,major,interests,courses,photo_path,social,social_other,topics,open_to,contact_preference'
export function fromRow(row: ProfileRow, photo: string): Profile {
  return { id: row.id, name: row.name, occupation: row.occupation, bio: row.bio, major: row.major,
    interests: row.interests, courses: row.courses, photo, photoPath: row.photo_path ?? undefined,
    social: row.social, socialOther: row.social_other, topics: row.topics, openTo: row.open_to,
    contactPreference: row.contact_preference, attendedEventIds: [] }
}
function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read profile photo.'))
    reader.readAsDataURL(blob)
  })
}
export async function hydrateProfile(row: ProfileRow): Promise<Profile> {
  let photo = ''
  let photoUnavailable = false
  if (row.photo_path) {
    try {
      const result = await requireSupabase().storage.from('avatars').download(row.photo_path)
      if (result.error) throw result.error
      photo = await asDataUrl(result.data)
    } catch { photoUnavailable = true }
  }
  return { ...fromRow(row,photo),photoUnavailable }
}
export async function loadProfile(userId: string, signal?: AbortSignal): Promise<Profile | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return null
  }

  let query = requireSupabase()
    .from('profiles')
    .select(profileColumns)
    .eq('id', userId)

  if (signal) query = query.abortSignal(signal)

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (!data) return null

  return hydrateProfile(data as ProfileRow)
}
export const loadOwnProfile = loadProfile
export async function persistOwnProfile(userId: string, draft: Profile, previous: Profile | null): Promise<{ profile: Profile; warning: string }> {
  const client = requireSupabase()
  if (draft.id !== userId) throw new Error('You can only save your own profile.')
  if (!draft.name.trim()) throw new Error('Please enter your name.')
  let path = previous?.photoPath ?? null
  let uploaded: string | null = null
  if (previous?.photoPath && !draft.photoPath && !draft.photo) path = null
  if (draft.photo !== (previous?.photo ?? '')) {
    if (!draft.photo) path = null
    else {
      if (!isPhoto(draft.photo)) throw new Error('Choose a JPEG, PNG or WebP profile photo.')
      const [header, encoded] = draft.photo.split(',')
      const mime = header.slice(5, header.indexOf(';'))
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
      if (bytes.length > 5 * 1024 * 1024) throw new Error('Profile photos must be 5 MB or smaller.')
      path = `${userId}/${crypto.randomUUID()}.${mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]}`
      const result = await client.storage.from('avatars').upload(path, bytes, { contentType: mime, upsert: false })
      if (result.error) throw result.error
      uploaded = path
    }
  }
  const values = { name: draft.name.trim(), occupation: draft.occupation, bio: draft.bio, major: draft.major,
    interests: draft.interests, courses: draft.courses, photo_path: path, social: draft.social,
    social_other: draft.socialOther, topics: draft.topics, open_to: draft.openTo ?? [],
    contact_preference: draft.contactPreference ?? 'gray' }
  const query = previous
    ? client.from('profiles').update(values).eq('id', userId)
    : client.from('profiles').insert({ id: userId, ...values })
  const { data, error } = await query.select(profileColumns).single()
  if (error) {
    if (uploaded && ['23514','23505','23503','42501'].includes(error.code)) {
      await client.storage.from('avatars').remove([uploaded])
    }
    throw error // Keep the form and allow retry; do not display a successful save.
  }
  let warning = ''
  if (previous?.photoPath && previous.photoPath !== path) {
    const removed = await client.storage.from('avatars').remove([previous.photoPath])
    if (removed.error) warning = 'Profile saved. The previous photo could not be removed; retry cleanup later.'
  }
  return { profile: fromRow(data as ProfileRow, draft.photo), warning }
}
