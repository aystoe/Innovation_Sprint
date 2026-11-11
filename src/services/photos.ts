/** Decode via an object URL so the original file is not duplicated as a large base64 string. */
export function preparePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return Promise.reject(new Error('Please choose a JPEG, PNG or WebP photo.'))
  if (!file.size || file.size > 5 * 1024 * 1024) return Promise.reject(new Error('Each photo must be between 1 byte and 5 MB.'))
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), image = new Image()
    let settled = false
    const finish = (error?: Error, result?: string) => {
      if (settled) return
      settled = true; clearTimeout(timer); image.onload = null; image.onerror = null; URL.revokeObjectURL(url)
      if (error) reject(error); else resolve(result!)
    }
    const timer = setTimeout(() => finish(new Error('Photo processing timed out. Try a smaller image.')), 20000)
    image.onerror = () => finish(new Error('This file is not a supported photo.'))
    image.onload = () => {
      try {
        if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 60_000_000) throw new Error('This image is too large to process. Please choose a smaller image.')
        const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const context = canvas.getContext('2d'); if (!context) throw new Error('Photo processing is not available in this browser.')
        context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => {
          if (settled) return
          if (!blob || !blob.size || blob.size > 5 * 1024 * 1024) { finish(new Error('Could not prepare this photo. Try another image.')); return }
          try {
          const reader = new FileReader()
          reader.onabort = () => finish(new Error('Photo processing was cancelled.'))
          reader.onerror = () => finish(new Error('This photo could not be read.'))
          reader.onload = () => finish(undefined, String(reader.result))
          reader.readAsDataURL(blob)
          } catch { finish(new Error('This photo could not be read.')) }
        }, 'image/jpeg', 0.78)
      } catch (cause) { finish(cause instanceof Error ? cause : new Error('This photo could not be processed.')) }
    }
    image.src = url
  })
}
