/** Compress photos before storing. Used by event, profile and review uploads. */
export function preparePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return Promise.reject(new Error('Please choose a JPEG, PNG or WebP photo.'))
  if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('Each photo must be 5 MB or smaller.'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('This photo could not be read.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('This file is not a supported photo.'))
      image.onload = () => {
        try {
          const scale = Math.min(1, 1200 / Math.max(image.width, image.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
          const context = canvas.getContext('2d')
          if (!context) throw new Error()
          context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
          context.drawImage(image, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.78))
        } catch { reject(new Error('This photo could not be processed.')) }
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
