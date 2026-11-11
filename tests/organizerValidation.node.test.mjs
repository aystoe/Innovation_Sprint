import test from 'node:test'
import assert from 'node:assert/strict'
import { escapeSearch, validateRequest } from '../src/services/organizerValidation.ts'

test('name search treats SQL wildcard characters as literal text', () => {
  assert.equal(escapeSearch('A_B%\\'), 'A\\_B\\%\\\\')
  assert.equal(escapeSearch('김민수'), '김민수')
})
test('requests reject blank text and self-contact', () => {
  assert.throws(() => validateRequest('a','a','Title','Message'))
  assert.throws(() => validateRequest('a','b','  ','Message'))
  assert.throws(() => validateRequest('a','b','Title','\n'))
})
test('request lengths match the database limits after trimming', () => {
  assert.doesNotThrow(() => validateRequest('a','b',' '+ 'x'.repeat(150), 'x'.repeat(2000)+' '))
  assert.throws(() => validateRequest('a','b','x'.repeat(151),'Message'))
  assert.throws(() => validateRequest('a','b','Title','x'.repeat(2001)))
})
