import type { TimeEntry } from '../types';
export function timeFromRow(row: any): TimeEntry {
  return { id:row.id, processId:row.process_id, phaseId:row.phase_id || undefined, memberId:row.member_id,
    date:row.date, minutes:Number(row.minutes), description:row.description,
    ...(Object.hasOwn(row,'hourly_cost') ? {hourlyCost:row.hourly_cost === null ? null : Number(row.hourly_cost)} : {}) };
}
export function timeTotals(entries: TimeEntry[]) {
  return { minutes: entries.reduce((sum,e) => sum+e.minutes,0),
    cost: entries.reduce((sum,e) => sum+Math.round(e.minutes*(e.hourlyCost ?? 0)/60*100),0)/100,
    unpricedMinutes: entries.filter(e => e.hourlyCost == null).reduce((sum,e) => sum+e.minutes,0) };
}
export const durationLabel = (minutes: number) => `${Math.floor(minutes/60)}h ${minutes%60}min`;

export function timeError(error: {code?: string; message: string}) {
  if (['PGRST202','42P01','PGRST205'].includes(error.code || '')) return 'É necessário aplicar a atualização de registo de horas no Supabase (202610130005_time_entries.sql).';
  return error.message;
}
