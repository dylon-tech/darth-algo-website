import test from 'node:test';
import assert from 'node:assert/strict';
import { pilot, pilotJobKeys, assertPilotRequest } from '../app/lib/business-os/pilot-policy.ts';

test('pilot is bounded to eight original assignments and a dollar', () => {
  assert.equal(new Set(pilotJobKeys).size, 8);
  assert.equal(pilot.maxAttempts * pilot.reservationUsd, 1);
  // Conservative byte-as-token bound, plus 25k tokens for framing overhead.
  const upper = (pilot.maxRequestBytes + 25000) * pilot.inputUsdPerMillion / 1e6
    + pilot.maxOutputTokens * pilot.outputUsdPerMillion / 1e6;
  assert.ok(upper < pilot.reservationUsd);
  assert.doesNotThrow(() => assertPilotRequest('a'.repeat(pilot.maxRequestBytes)));
  assert.throws(() => assertPilotRequest('a'.repeat(pilot.maxRequestBytes + 1)), /PILOT_INPUT_LIMIT/);
  assert.throws(() => assertPilotRequest('🦊'.repeat(30000)), /PILOT_INPUT_LIMIT/);
});
