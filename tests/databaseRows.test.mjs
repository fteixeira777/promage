import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseToRow, phaseFromRow, taskToRow, taskFromRow, processFromRow, paymentToRow, paymentFromRow } from '../lib/databaseRows.ts';

test('cost references round trip and reassignment clears the previous link', () => {
  const payment = {id:'p',direction:'EXPENSE',amount:100,rule:'DATE',subcontractId:'s',settlements:[]};
  const row = paymentToRow('org','project',payment);
  assert.equal(row.subcontract_id,'s'); assert.equal(row.expense_id,null);
  assert.equal(paymentFromRow(row).subcontractId,'s');
  const reassigned = paymentToRow('org','project',{...payment,subcontractId:undefined,expenseId:'e'});
  assert.equal(reassigned.subcontract_id,null); assert.equal(reassigned.expense_id,'e');
  const legacy = paymentFromRow({id:'legacy',amount:100});
  assert.equal(legacy.subcontractId,undefined); assert.equal(legacy.expenseId,undefined);
});

test('changing payment rule clears stale date/phase references and scopes writes to the office', () => {
  const payment = { id: 'payment', description: 'Entrada', amount: 1000, direction: 'INCOME', rule: 'DATE', dueDate: '2026-10-12', phaseId: 'old-phase', offsetDays: 15 };
  const fixed = paymentToRow('office', 'project', payment);
  assert.equal(fixed.organization_id, 'office'); assert.equal(fixed.process_id, 'project');
  assert.equal(fixed.phase_id, null); assert.equal(fixed.offset_days, 0);
  const phased = paymentToRow('office', 'project', { ...payment, rule: 'PHASE' });
  assert.equal(phased.due_date, null); assert.equal(phased.phase_id, 'old-phase'); assert.equal(phased.offset_days, 15);
});
test('remote decimal amounts and partial receipts become numeric values', () => {
  const payment = paymentFromRow({ id: 'payment', amount: '1000.10', offset_days: 0, settlements: [{ id: 'receipt', amount: '200.05', date: '2026-10-12' }] });
  assert.equal(payment.amount, 1000.10); assert.equal(payment.settlements[0].amount, 200.05);
  assert.equal(payment.settlements[0].date, '2026-10-12');
  assert.deepEqual(paymentFromRow({ amount: '50' }).settlements, []);
});

test('phase mapping keeps the tenant, parent process and actual closure date', () => {
  const phase = { id: 'f', name: 'Estudo', value: 2000, status: 'Concluído', completedAt: '2026-10-09', startDate: '2026-10-01', endDate: '2026-10-30', responsible: 'Ana', blocker: '' };
  const row = phaseToRow('office', 'process', phase, 2);
  assert.equal(row.organization_id, 'office'); assert.equal(row.process_id, 'process');
  assert.equal(row.position, 2); assert.deepEqual(phaseFromRow(row), phase);
});
test('general tasks use null foreign keys and phase tasks preserve associations', () => {
  const task = { id: 't', title: 'Rever', priority: 3, status: 'Pendente', dueDate: '2026-10-09' };
  const general = taskToRow('office', task);
  assert.equal(general.process_id, null); assert.equal(general.phase_id, null);
  const linked = taskToRow('office', { ...task, processId: 'p', phaseId: 'f', notes: 'Detalhes' });
  const back = taskFromRow(linked);
  assert.equal(back.processId, 'p'); assert.equal(back.phaseId, 'f'); assert.equal(back.notes, 'Detalhes');
});
test('phases are ordered by their saved position, independently of API return order', () => {
  const process = processFromRow({ id: 'p', code: 'PR1', title: 'Projeto', budget: '100', pricing_mode: 'GLOBAL', phases: [
    { id: 'second', position: 1, name: 'Dois', value: '20', status: 'Pendente' },
    { id: 'first', position: 0, name: 'Um', value: '80', status: 'Pendente' },
  ] });
  assert.deepEqual(process.phases.map(p => p.id), ['first', 'second']); assert.equal(process.budget, 100);
});
test('phase pricing derives the total from the saved phases', () => {
  assert.equal(processFromRow({ pricing_mode: 'PHASES', budget: '999', phases: [
    { value: '100.50' }, { value: '200' },
  ] }).budget, 300.50);
});
