import { requireSupabase } from '../lib/supabase';
import { phaseToRow, processFromRow, taskFromRow, taskToRow } from '../lib/databaseRows';
import type { Phase, Process, Task, TeamMember } from '../types';

export async function loadPlanning(organizationId: string, role = 'manager') {
  const db = requireSupabase();
  if (role === 'member') {
    const [planning, tasks] = await Promise.all([db.rpc('member_planning', { workspace: organizationId }), db.from('tasks').select('*').eq('organization_id', organizationId).order('due_date')]);
    if (planning.error) throw planning.error;
    if (tasks.error) throw tasks.error;
    return { processes: (planning.data.processes || []).map(processFromRow), tasks: (tasks.data || []).map(taskFromRow), team: planning.data.team as TeamMember[] };
  }
  const results = await Promise.all([
    db.from('processes').select('*,phases(*)').eq('organization_id', organizationId).order('created_at'),
    db.from('tasks').select('*').eq('organization_id', organizationId).order('due_date'),
    db.from('team_members').select('*').eq('organization_id', organizationId).order('name'),
  ]);
  for (const result of results) if (result.error) throw result.error;
  return { processes: (results[0].data || []).map(processFromRow), tasks: (results[1].data || []).map(taskFromRow),
    team: (results[2].data || []).map(row => ({ id: row.id, name: row.name, role: row.role, fee: Number(row.fee), email: row.email, phone: row.phone, status: row.status })) as TeamMember[] };
}
export async function saveRemoteProcess(organizationId: string, process: Process) {
  const { error } = await requireSupabase().from('processes').upsert({ organization_id: organizationId, id: process.id,
    code: process.code, title: process.title, client_id: process.clientId || null, status: process.status,
    budget: process.budget, pricing_mode: process.pricingMode, start_date: process.startDate,
    source_portfolio_id: process.sourcePortfolioId || null,
  }, { onConflict: 'organization_id,id' }).select('id').single();
  if (error) throw error;
}
export async function saveRemotePhase(organizationId: string, processId: string, phase: Phase, position: number) {
  const { error } = await requireSupabase().from('phases').upsert(phaseToRow(organizationId, processId, phase, position),
    { onConflict: 'organization_id,id' }).select('id').single();
  if (error) {
    if (error.code === 'PGRST204' && error.message.includes('planned_minutes')) throw new Error('Aplica a atualização das horas previstas no Supabase (202610130006_phase_time_budget.sql) antes de guardar fases.');
    throw error;
  }
}
export async function saveRemoteTask(organizationId: string, task: Task) {
  const { error } = await requireSupabase().from('tasks').upsert(taskToRow(organizationId, task),
    { onConflict: 'organization_id,id' }).select('id').single();
  if (error) throw error;
}
