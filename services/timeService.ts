import { requireSupabase } from '../lib/supabase';
import { timeFromRow, timeError } from '../lib/timeEntries';
import type { TimeEntry } from '../types';
export interface TimePerson { id:string; name:string; status:string; hourlyCost?:number | null }
export async function loadTime(organizationId: string, processId:string) {
  const {data,error} = await requireSupabase().rpc('project_time_data',{workspace:organizationId,project:processId});
  if(error) throw new Error(timeError(error));
  return {people:data.people as TimePerson[], entries:data.entries.map(timeFromRow) as TimeEntry[]};
}
export async function saveTime(organizationId:string, entry:TimeEntry) {
  const {error} = await requireSupabase().rpc('save_time_entry',{workspace:organizationId,entry_id:entry.id,project:entry.processId,
    phase:entry.phaseId || null,person:entry.memberId,work_date:entry.date,duration:entry.minutes,notes:entry.description});
  if(error) throw new Error(timeError(error));
}
export async function setHourlyCost(organizationId:string, person:string, rate:number) {
  const {error} = await requireSupabase().rpc('set_team_hourly_cost',{workspace:organizationId,person,rate});
  if(error) throw new Error(timeError(error));
}
