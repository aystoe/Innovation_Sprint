import { useEffect, useRef, useState } from 'react'
import { preparePhoto } from '../services/photos'
import { FormError } from './FormError'
import { Icon } from './Icon'

interface Props {
  photos: string[]
  onChange: (photos: string[]) => void
  onBusyChange: (busy: boolean) => void
  max?: number
  label?: string
}

export function PhotoPicker({
  photos,
  onChange,
  onBusyChange,
  max = 4,
  label = 'Choose review photos',
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const fileInput = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const active = useRef(false)
  const processing = useRef(false)

  // Hooks는 컴포넌트 본문에서 호출합니다.
  useEffect(() => {
    active.current = true

    const input = fileInput.current
    const handleCancel = () => {
      trigger.current?.focus({ preventScroll: true })
    }

    input?.addEventListener('cancel', handleCancel)

    return () => {
      active.current = false
      input?.removeEventListener('cancel', handleCancel)
    }
  }, [])

  async function upload(files: File[]) {
    if (processing.current) return

    processing.current = true
    setError('')
    setBusy(true)
    onBusyChange(true)

    const next = max === 1 ? [] : [...photos]
    let message = ''

    try {
      for (const file of files) {
        if (next.length >= max) {
          message = `You can attach up to ${max} photos.`
          break
        }

        try {
          const photo = await preparePhoto(file)
          if (!active.current) return
          next.push(photo)
        } catch (cause) {
          message =
            cause instanceof Error
              ? cause.message
              : 'Photo processing failed.'
        }
      }

      if (active.current) {
        onChange(next.length ? next : photos)
        setError(message)
      }
    } catch (cause) {
      if (active.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not prepare this photo.',
        )
      }
    } finally {
      processing.current = false

      if (active.current) {
        setBusy(false)
        onBusyChange(false)
      }
    }
  }

  return (
    <div>
      <button
        ref={trigger}
        type="button"
        className="upload-label photo-picker-trigger"
        disabled={busy}
        onClick={() => fileInput.current?.click()}
      >
        <Icon name="photo" />
        {label}
      </button>

      <input
        ref={fileInput}
        hidden
        style={{ display: 'none' }}
        tabIndex={-1}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={max > 1}
        disabled={busy}
        aria-label={label}
        onChange={event => {
          const files = Array.from(event.currentTarget.files ?? [])
          event.currentTarget.value = ''

          trigger.current?.focus({ preventScroll: true })

          if (files.length) {
            void upload(files)
          }
        }}
      />

      <p className="help">
        {max === 1 ? 'One photo' : `Up to ${max} photos`}
        {' · JPEG, PNG or WebP · Up to 5 MB each'}
      </p>

      <div className="review-photos">
        {photos.map((photo, index) => (
          <div className="preview-tile" key={`${index}-${photo.slice(-20)}`}>
            <img src={photo} alt={`Selected photo ${index + 1}`} />

            <button
              type="button"
              aria-label={`Remove photo ${index + 1}`}
              disabled={busy}
              onClick={() =>
                onChange(photos.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <p className="pending" role="status" aria-live="polite">
        {busy
          ? 'Preparing your photos…'
          : photos.length
            ? `${photos.length} photo(s) ready`
            : ''}
      </p>

      <FormError message={error} />
    </div>
  )
}