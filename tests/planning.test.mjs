import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyTasks, importPortfolio, addCalendarDays } from '../lib/planning.ts';

const tasks = [
  { id: 'late', dueDate: '2026-10-01', status: 'Pendente', assignedTo: 'a', priority: 3 },
  { id: 'today', dueDate: '2026-10-09', status: 'Em Curso', assignedTo: 'b', priority: 2 },
  { id: 'next', dueDate: '2026-10-12', status: 'Pendente', assignedTo: 'a', priority: 5 },
  { id: 'done', dueDate: '2026-10-01', status: 'Concluído', assignedTo: 'a', priority: 3 },
];
test('daily view includes overdue tasks, excludes completed and future tasks', () => {
  assert.deepEqual(dailyTasks(tasks, '2026-10-09', 'today').map(t => t.id), ['late', 'today']);
});
test('week view filters by member and preserves overdue work', () => {
  assert.deepEqual(dailyTasks(tasks, '2026-10-09', 'week', 'a').map(t => t.id), ['late', 'next']);
});
test('calendar offsets are independent from daylight saving and cross leap days', () => {
  assert.equal(addCalendarDays('2028-02-28', 2), '2028-03-01');
  assert.equal(addCalendarDays('2026-10-24', 2), '2026-10-26');
});
test('portfolio import preserves task state, notes, files, dates and is idempotent', () => {
  const ticket = { id: 't', title: 'Sketch', startDate: '2026-10-09T12:00:00Z', durationDays: 3,
    status: 'in-progress', assignee: 'Ana', notes: [{ author: 'Ana', text: 'Rever', id: 'n', timestamp: '' }],
    attachments: [{ id: 'a', name: 'test.txt', dataUrl: 'data:text/plain;base64,QQ==', type: 'text/plain' }] };
  const projects = [{ id: 'p', name: 'Projeto antigo', description: '', color: '#fff', tickets: [ticket] }];
  const result = importPortfolio(projects, [], []);
  assert.equal(result.processes.length, 1);
  assert.equal(result.tasks[0].phaseId, result.processes[0].phases[0].id);
  assert.equal(result.tasks[0].dueDate, '2026-10-11');
  assert.equal(result.tasks[0].status, 'Em Curso');
  assert.equal(result.tasks[0].notes, 'Ana: Rever');
  assert.deepEqual(result.tasks[0].legacyTicket.attachments, ticket.attachments);
  const again = importPortfolio(projects, result.processes, result.tasks);
  assert.deepEqual(again, result);
  assert.equal(projects[0].tickets[0], ticket);
});
