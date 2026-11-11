import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isAllowedEmail, normalizeEmail } from '../src/auth/domain.ts'
for (const email of ['name@tum.de', 'name@mytum.de', ' Name+tag@TUM.DE ', 'a.b@mytum.de']) {
  test(`accept ${email}`, () => assert.equal(isAllowedEmail(email), true))
}
for (const email of ['a@gmail.com','a@tum.de.evil.com','a@evil-tum.de','a@cs.tum.de','a@mytum.de.evil.com','a@tum.de@evil.com','a@@tum.de','@tum.de','a b@tum.de','a@tum.de/path','a@tum.de\nevil.com','a@tüm.de','a@tum.de.','a@mytumXde','']) {
  test(`reject ${JSON.stringify(email)}`, () => assert.equal(isAllowedEmail(email), false))
}
test('normalizes outer whitespace and email case', () => assert.equal(normalizeEmail(' Name@TUM.DE '), 'name@tum.de'))

import { isTerminalAuthError } from '../src/auth/sessionErrors.ts'
test('revoked or expired credentials require login', () => {
  for (const code of ['refresh_token_not_found','session_expired','bad_jwt','user_not_found']) assert.equal(isTerminalAuthError({ code }), true)
  assert.equal(isTerminalAuthError({ name: 'AuthSessionMissingError' }), true)
})
test('offline and transient server failure preserve refresh credentials', () => {
  assert.equal(isTerminalAuthError(new TypeError('Failed to fetch')), false)
  assert.equal(isTerminalAuthError({ status: 503 }), false)
  assert.equal(isTerminalAuthError(null), false)
})
