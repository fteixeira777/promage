import type { Process } from '../types';
import { paymentDate, paymentState, remaining } from './payments.ts';
import { timeTotals } from './timeEntries.ts';

const round = (value: number) => Math.round(value * 100) / 100;
export function costFinance(process: Process, kind: 'subcontract' | 'expense', id: string, value: number) {
  const payments = (process.payments || []).filter(p => p.direction === 'EXPENSE' && (kind === 'subcontract' ? p.subcontractId === id : p.expenseId === id));
  const planned = round(payments.reduce((sum,p) => sum + p.amount, 0));
  const paid = round(payments.reduce((sum,p) => sum + p.settlements.reduce((s,r) => s+r.amount,0),0));
  return { planned, paid, unpaid: round(value-paid), unplanned: round(value-planned) };
}
export function projectFinance(process: Process) {
  const honorarios = process.pricingMode === 'PHASES' ? process.phases.reduce((s,p) => s + p.value, 0) : process.budget;
  const subcontracts = process.subcontracts.reduce((s,c) => s + c.value, 0);
  const expenses = process.expenses.reduce((s,c) => s + c.value, 0);
  const outgoing = (process.payments || []).filter(p => p.direction === 'EXPENSE');
  const incoming = (process.payments || []).filter(p => p.direction === 'INCOME');
  const settled = (payments: typeof outgoing) => round(payments.reduce((s,p) => s + p.settlements.reduce((a,r) => a+r.amount, 0), 0));
  const costs = round(subcontracts + expenses);
  const work = timeTotals(process.timeEntries || []);
  return { honorarios: round(honorarios), subcontracts: round(subcontracts), expenses: round(expenses), costs,
    internalCost:work.cost, workedMinutes:work.minutes, unpricedMinutes:work.unpricedMinutes, marginAfterWork:round(honorarios-costs-work.cost),
    balance: round(honorarios - costs), received: settled(incoming), paid: settled(outgoing),
    toReceive: round(honorarios-settled(incoming)), toPay: round(costs-settled(outgoing)), cashBalance: round(settled(incoming)-settled(outgoing)),
    unplannedCosts: round(costs - outgoing.reduce((s,p) => s+p.amount, 0)) };
}
export function cashflow(processes: Process[], now: string, opening = 0) {
  const rows = processes.flatMap(process => (process.payments || []).map(payment => ({ process, payment,
    date: paymentDate(payment, process), balance: remaining(payment), state: paymentState(payment, process, now) }))).filter(r => r.balance > 0);
  let running = Number.isFinite(opening) ? opening : 0;
  const months = Array.from({length: 6}, (_, index) => {
    const date = new Date(`${now.slice(0,7)}-01T12:00:00`); date.setMonth(date.getMonth() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
    const matching = rows.filter(r => r.date && r.date >= now && r.date.startsWith(key));
    const sum = (direction: string) => round(matching.filter(r => r.payment.direction === direction).reduce((s,r) => s+r.balance, 0));
    const income = sum('INCOME'), expense = sum('EXPENSE'); running = round(running + income - expense);
    return { key, label: date.toLocaleDateString('pt-PT', {month:'long',year:'numeric'}), income, expense, balance: running };
  });
  return { rows, months };
}
