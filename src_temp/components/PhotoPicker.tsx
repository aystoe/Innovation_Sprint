import { useEffect, useRef, useState } from 'react'
import { preparePhoto } from '../services/photos'
import { FormError } from './FormError'
import { Icon } from './Icon'
/** Controlled output, isolated upload state. Reused by profile and review forms. */
export function PhotoPicker({ photos, onChange, onBusyChange, max = 4, label = 'Choose review photos' }: { photos: string[]; onChange: (photos: string[]) => void; onBusyChange: (busy: boolean) => void; max?: number; label?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  async function upload(files: File[]) {
    setError(''); setBusy(true); onBusyChange(true)
    const next = max === 1 ? [] : [...photos]
    let message = ''
    try {
      for (const file of files) {
        if (next.length >= max) { message = `You can attach up to ${max} photos.`; break }
        try { next.push(await preparePhoto(file)) } catch (e) { message = e instanceof Error ? e.message : 'Photo upload failed.' }
        if (!active.current) return
      }
      if (active.current) { onChange(next.length ? next : photos); setError(message) }
    } finally { if (active.current) { setBusy(false); onBusyChange(false) } }
  }
  return <div>
    <label className="upload-label"><Icon name="photo" />{label}<input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} disabled={busy} onChange={e => { const files = Array.from(e.currentTarget.files ?? []); e.currentTarget.value = ''; if (files.length) void upload(files) }} /></label>
    <p className="help">{max === 1 ? 'One photo' : `Up to ${max} photos`} · JPEG, PNG or WebP · Up to 5 MB each</p>
    <div className="review-photos">{photos.map((photo, i) => <div className="preview-tile" key={`${i}-${photo.slice(-20)}`}><img src={photo} alt={`Selected photo ${i + 1}`} /><button type="button" aria-label={`Remove photo ${i + 1}`} disabled={busy} onClick={() => onChange(photos.filter((_, index) => index !== i))}>×</button></div>)}</div>
    <p className="pending" role="status" aria-live="polite">{busy ? 'Preparing your photos…' : photos.length ? `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} ready` : ''}</p>
    <FormError message={error} />
  </div>
}
