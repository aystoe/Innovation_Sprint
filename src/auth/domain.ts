/** Exact domains only; no suffix matching or subdomains. Keep aligned with migration 004. */
export function normalizeEmail(value: string): string { return value.trim().toLowerCase() }
export function isAllowedEmail(value: string): boolean {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(tum\.de|mytum\.de)$/.test(normalizeEmail(value))
}
export const EMAIL_ERROR = 'Use an email ending in @tum.de or @mytum.de.'
export const MIN_PASSWORD_LENGTH = 12
