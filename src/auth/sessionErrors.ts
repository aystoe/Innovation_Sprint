/** Network/5xx errors are recoverable; invalid or revoked credentials require a new login. */
export function isTerminalAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const value = error as { code?: string; name?: string; status?: number }
  return value.name === 'AuthSessionMissingError' ||
    ['refresh_token_not_found', 'refresh_token_already_used', 'invalid_refresh_token', 'session_not_found',
      'session_expired', 'bad_jwt', 'user_not_found', 'user_banned'].includes(value.code ?? '')
}
