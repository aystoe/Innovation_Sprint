/** Inline placeholder artwork: no remote image requests or network dependency. */
export function avatarImage(color = '#d9e5c6', shirt = '#567455') {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="${color}"/><circle cx="196" cy="38" r="71" fill="#fff" opacity=".2"/><path d="M34 240v-22a86 81 0 0 1 172 0v22" fill="${shirt}"/><rect x="100" y="130" width="40" height="47" rx="15" fill="#c99a74"/><ellipse cx="120" cy="94" rx="46" ry="56" fill="#deb38b"/><path d="M74 95c-8-58 24-72 50-72 39 0 54 30 43 76l-13-30c-18 5-38 0-48-10L79 98Z" fill="#3b3e32"/><path d="M105 121q15 12 30 0" fill="none" stroke="#a26d50" stroke-width="3" stroke-linecap="round"/><circle cx="103" cy="97" r="3" fill="#3b3e32"/><circle cx="138" cy="97" r="3" fill="#3b3e32"/></svg>`)
}
export const isPhoto = (value: unknown): boolean => typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
export function photoSource(photo?: string): string {
  if (typeof photo === 'string' && (isPhoto(photo) || photo.startsWith('data:image/svg+xml;charset=utf-8,'))) return photo
  return avatarImage()
}
