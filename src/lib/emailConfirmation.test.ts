import test from 'node:test'
import assert from 'node:assert/strict'
import { readEmailAction } from './emailConfirmation.ts'
import { routeFromHash } from './navigation.ts'
test('email confirmation accepts only supported one-time actions on its own route', () => {
  const token = 'a'.repeat(64)
  assert.deepEqual(readEmailAction(`#/auth/confirm?token_hash=${token}&type=email`), { tokenHash: token, type: 'email' })
  assert.equal(readEmailAction(`#/auth/confirm?token_hash=${token}&type=recovery`)?.type, 'recovery')
  assert.equal(routeFromHash(`#/auth/confirm?token_hash=${token}&type=email`), 'confirm')
  assert.equal(readEmailAction(`#/dashboard?token_hash=${token}&type=email`), null)
  assert.equal(readEmailAction(`#/auth/confirm?token_hash=${token}&type=admin`), null)
  assert.equal(readEmailAction('#/auth/confirm?token_hash=short&type=email'), null)
  assert.equal(readEmailAction('#/auth/confirm?token_hash=https://evil.test&type=email'), null)
})
