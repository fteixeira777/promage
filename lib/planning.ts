import type { Process, Project, Task } from '../types';

export function addCalendarDays(date: string, days: number) {
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function dailyTasks(tasks: Task[], day: string, window: 'today' | 'week' | 'all', assignee = '') {
  const end = window === 'today' ? day : addCalendarDays(day, 7);
  return tasks.filter(t => t.status !== 'Concluído' && (!assignee || t.assignedTo === assignee) &&
    (window === 'all' || (t.dueDate && t.dueDate <= end)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || b.priority - a.priority);
}
export function importPortfolio(projects: Project[], processes: Process[], tasks: Task[]) {
  const pending = projects.filter(p => !processes.some(process => process.sourcePortfolioId === p.id));
  const imported = pending.map(project => {
    const id = `portfolio-${project.id}`;
    const phaseId = `${id}-phase`;
    const dates = project.tickets.map(ticket => ({ start: ticket.startDate.slice(0, 10), end: addCalendarDays(ticket.startDate, Math.max(0, ticket.durationDays - 1)) }));
    const startDate = dates.map(d => d.start).sort()[0];
    const endDate = dates.map(d => d.end).sort().at(-1);
    const phaseStatus = project.tickets.length && project.tickets.every(t => t.status === 'done') ? 'Concluído' : 'Em Execução';
    const process: Process = {
      id, sourcePortfolioId: project.id, code: `IMP-${project.id}`, title: project.name, clientId: '',
      status: 'Projeto', budget: 0, pricingMode: 'GLOBAL', startDate: startDate || new Date().toISOString().slice(0, 10),
      phases: [{ id: phaseId, name: 'Planeamento importado', value: 0, status: phaseStatus, startDate, endDate }],
      subcontracts: [], expenses: [], documents: [], payments: [],
    };
    const importedTasks: Task[] = project.tickets.map((ticket, i) => ({
      id: `${id}-${ticket.id}`, processId: id, phaseId, title: ticket.title, startDate: dates[i].start, dueDate: dates[i].end,
      priority: ticket.isUrgent ? 5 : 3, status: ticket.status === 'done' ? 'Concluído' : ticket.status === 'in-progress' ? 'Em Curso' : 'Pendente',
      assignedTo: ticket.assignee, notes: ticket.notes?.map(n => `${n.author}: ${n.text}`).join('\n'), legacyTicket: ticket,
    }));
    return { process, tasks: importedTasks };
  });
  return { processes: [...processes, ...imported.map(p => p.process)], tasks: [...tasks, ...imported.flatMap(p => p.tasks)] };
}
