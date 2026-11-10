export const splitTraits = (value: string) => [...new Set(value.split(/[,;\n]/).map(v => v.trim()).filter(Boolean))]
export const dateLabel = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const dateTime = (value: string) => new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const isEnded = (event: { end: string }, now = Date.now()) => new Date(event.end).getTime() <= now
export const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
export function isWebUrl(value: string) { try { return ['https:', 'http:', '@'].includes(new URL(value).protocol) } catch { return false } }
