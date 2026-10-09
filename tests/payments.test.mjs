import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentDate, paymentState, remaining } from '../lib/payments.ts';

const process = { phases: [{ id: 'phase', endDate: '2026-11-30' }] };
const payment = { amount: 2000, rule: 'PHASE', phaseId: 'phase', offsetDays: 15, settlements: [] };
test('uses the planned phase date while the phase is open', () => {
  assert.equal(paymentDate(payment, process), '2026-12-15');
  assert.equal(paymentState(payment, process, '2026-12-20'), 'Depende da fase');
});
test('closing a phase updates the expected date without settling the payment', () => {
  const closed = { phases: [{ ...process.phases[0], completedAt: '2026-12-05' }] };
  assert.equal(paymentDate(payment, closed), '2026-12-20');
  assert.equal(remaining(payment), 2000);
  assert.equal(paymentState(payment, closed, '2026-12-21'), 'Em atraso');
  assert.equal(paymentState(payment, closed, '2026-12-20'), 'Previsto');
});
test('fixed dates remain independent from phase completion', () => {
  assert.equal(paymentDate({ ...payment, rule: 'DATE', dueDate: '2026-11-01' }, process), '2026-11-01');
});
test('partial and full settlements preserve the remaining amount', () => {
  const partial = { ...payment, settlements: [{ amount: 750.25, date: '2026-12-20' }] };
  assert.equal(remaining(partial), 1249.75);
  const paid = { ...partial, settlements: [...partial.settlements, { amount: 1249.75, date: '2026-12-21' }] };
  assert.equal(paymentState(paid, process), 'Liquidado');
});
test('missing phases or dates do not invent a payment date', () => {
  assert.equal(paymentDate({ ...payment, phaseId: 'missing' }, process), undefined);
  assert.equal(paymentDate({ ...payment, rule: 'DATE' }, process), undefined);
});
test('offsets cross year boundaries correctly', () => {
  assert.equal(paymentDate({ ...payment, offsetDays: 2 }, { phases: [{ id: 'phase', endDate: '2026-12-31' }] }), '2027-01-02');
});
