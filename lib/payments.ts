import type { PaymentSchedule, Process } from '../types';

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const money = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
export const remaining = (payment: PaymentSchedule) => Math.max(0, Math.round((payment.amount - payment.settlements.reduce((sum, s) => sum + s.amount, 0)) * 100) / 100);
export function paymentDate(payment: PaymentSchedule, process: Process): string | undefined {
  if (payment.rule === 'DATE') return payment.dueDate || undefined;
  const phase = process.phases.find(p => p.id === payment.phaseId);
  const base = phase?.completedAt || phase?.endDate;
  if (!base) return undefined;
  const date = new Date(`${base}T12:00:00`);
  date.setDate(date.getDate() + payment.offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function paymentState(payment: PaymentSchedule, process: Process, now = today()) {
  if (remaining(payment) === 0) return 'Liquidado';
  if (payment.rule === 'PHASE' && !process.phases.find(p => p.id === payment.phaseId)?.completedAt) return 'Depende da fase';
  const date = paymentDate(payment, process);
  if (!date) return 'Sem data';
  return date < now ? 'Em atraso' : 'Previsto';
}
