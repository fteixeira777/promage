import { requireSupabase } from '../lib/supabase';
import { processFromRow } from '../lib/databaseRows';
import { timeFromRow, timeError } from '../lib/timeEntries';
import type { Expense, Process, Subcontract } from '../types';

export async function loadFinance(organizationId: string, processId?: string): Promise<Process[]> {
  let query = requireSupabase().from('processes').select('*,phases(*),subcontracts(*),expenses(*),payment_schedules(*,settlements(*))')
    .eq('organization_id', organizationId).order('created_at');
  if (processId) query = query.eq('id', processId);
  const { data, error } = await query;
  if (error) throw error;
  const entries = [];
  for (let offset=0;;offset+=1000) {
    let timeQuery = requireSupabase().from('time_entries').select('id,process_id,phase_id,member_id,date,minutes,description,hourly_cost').eq('organization_id',organizationId).order('id').range(offset,offset+999);
    if (processId) timeQuery = timeQuery.eq('process_id',processId);
    const time = await timeQuery;
    if(time.error) throw new Error(timeError(time.error));
    entries.push(...(time.data || []));
    if((time.data || []).length < 1000) break;
  }
  return (data || []).map(row => ({...processFromRow(row),timeEntries:entries.filter(e=>e.process_id===row.id).map(timeFromRow)}));
}
export async function saveCost(organizationId: string, processId: string, cost: Subcontract | Expense, existing: boolean) {
  const subcontract = 'companyName' in cost;
  const row = subcontract ? { company_name: cost.companyName, service: cost.service, value: cost.value, phase_ids: cost.phases.map(p => p.id) }
    : { description: cost.description, value: cost.value, date: cost.date };
  const table = requireSupabase().from(subcontract ? 'subcontracts' : 'expenses');
  const query = existing ? table.update(row).eq('organization_id', organizationId).eq('process_id', processId).eq('id', cost.id)
    : table.insert({ ...row, organization_id: organizationId, process_id: processId, id: cost.id });
  const { error } = await query.select('id').single();
  if (error) throw error;
}
