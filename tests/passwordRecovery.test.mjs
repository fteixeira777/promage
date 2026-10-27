import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryLinkState, passwordValidation, recoveryError } from '../lib/passwordRecovery.ts';

test('recovery links are distinguished from signup and expired links without returning tokens', () => {
  assert.deepEqual(recoveryLinkState('#access_token=private&type=recovery'), { recovery: true, invalid: false });
  assert.deepEqual(recoveryLinkState('#type=signup'), { recovery: false, invalid: false });
  assert.deepEqual(recoveryLinkState('#error=access_denied&error_code=otp_expired'), { recovery: false, invalid: true });
  assert.deepEqual(recoveryLinkState(''), { recovery: false, invalid: false });
});
test('password confirmation is exact, preserves spaces and rejects short passwords', () => {
  assert.ok(passwordValidation('short', 'short'));
  assert.ok(passwordValidation('abcdefgh ', 'abcdefgh'));
  assert.equal(passwordValidation('abcdefgh ', 'abcdefgh '), '');
});
test('auth errors do not expose backend details or account existence', () => {
  assert.match(recoveryError({status:429}), /Aguarda/);
  assert.match(recoveryError({code:'otp_expired'}), /novo link/);
  assert.match(recoveryError({code:'same_password'}), /diferente/);
  assert.equal(recoveryError({code:'user_not_found'}), recoveryError({code:'unexpected_failure'}));
});
