import type { Phase, Process, Task, PaymentSchedule } from '../types';
export function paymentFromRow(row: any): PaymentSchedule {
  return { id: row.id, description: row.description, direction: row.direction, amount: Number(row.amount),
    subcontractId: row.subcontract_id || undefined, expenseId: row.expense_id || undefined,
    rule: row.rule, dueDate: row.due_date || undefined, phaseId: row.phase_id || undefined, offsetDays: row.offset_days,
    settlements: (row.settlements || []).map((s: any) => ({ id: s.id, amount: Number(s.amount), date: s.date })) };
}
export function paymentToRow(organizationId: string, processId: string, payment: PaymentSchedule) {
  return { organization_id: organizationId, process_id: processId, id: payment.id, description: payment.description,
    direction: payment.direction, amount: payment.amount, rule: payment.rule,
    ...(payment.direction === 'EXPENSE' ? { subcontract_id: payment.subcontractId || null, expense_id: payment.expenseId || null } : {}),
    due_date: payment.rule === 'DATE' ? payment.dueDate : null,
    phase_id: payment.rule === 'PHASE' ? payment.phaseId : null,
    offset_days: payment.rule === 'PHASE' ? payment.offsetDays : 0 };
}
export function phaseFromRow(row: any): Phase {
  return { id: row.id, name: row.name, value: Number(row.value), status: row.status,
    ...(row.planned_minutes != null ? {plannedMinutes:Number(row.planned_minutes)} : {}),
    startDate: row.start_date || undefined, endDate: row.end_date || undefined, completedAt: row.completed_at || undefined,
    responsible: row.responsible || '', blocker: row.blocker || '' };
}
export function processFromRow(row: any): Process {
  return { id: row.id, code: row.code, title: row.title, clientId: row.client_id || '', status: row.status,
    budget: row.pricing_mode === 'PHASES' ? (row.phases || []).reduce((sum: number, phase: any) => sum + Number(phase.value), 0) : Number(row.budget), pricingMode: row.pricing_mode, startDate: row.start_date,
    sourcePortfolioId: row.source_portfolio_id || undefined,
    phases: [...(row.phases || [])].sort((a, b) => a.position - b.position).map(phaseFromRow),
    payments: (row.payment_schedules || []).map(paymentFromRow),
    subcontracts: (row.subcontracts || []).map((s: any) => ({ id: s.id, companyName: s.company_name, service: s.service,
      value: Number(s.value), phases: (row.phases || []).filter((p: any) => (s.phase_ids || []).includes(p.id)).map(phaseFromRow) })),
    expenses: (row.expenses || []).map((e: any) => ({ id: e.id, description: e.description, value: Number(e.value), date: e.date })), documents: [] };
}
export function taskFromRow(row: any): Task {
  return { id: row.id, processId: row.process_id || undefined, phaseId: row.phase_id || undefined,
    title: row.title, priority: row.priority, status: row.status, startDate: row.start_date || undefined,
    dueDate: row.due_date, assignedTo: row.assigned_to || '', notes: row.notes || '', legacyTicket: row.legacy_ticket || undefined };
}
export function phaseToRow(organizationId: string, processId: string, phase: Phase, position: number) {
  return { organization_id: organizationId, process_id: processId, id: phase.id, name: phase.name,
    planned_minutes: phase.plannedMinutes ?? null,
    value: phase.value, status: phase.status, start_date: phase.startDate || null, end_date: phase.endDate || null,
    completed_at: phase.completedAt || null, responsible: phase.responsible || null, blocker: phase.blocker || null, position };
}
export function taskToRow(organizationId: string, task: Task) {
  return { organization_id: organizationId, id: task.id, process_id: task.processId || null, phase_id: task.phaseId || null,
    title: task.title, priority: task.priority, status: task.status, start_date: task.startDate || null,
    due_date: task.dueDate, assigned_to: task.assignedTo || null, notes: task.notes || null, legacy_ticket: task.legacyTicket || null };
}
