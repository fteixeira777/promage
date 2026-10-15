import type { Phase, TimeEntry } from '../types';

export function phaseTimeComparison(phases: Phase[], entries: TimeEntry[]) {
  const rows = phases.map(phase => {
    const actual = entries.filter(e=>e.phaseId===phase.id).reduce((sum,e)=>sum+e.minutes,0);
    const planned = phase.plannedMinutes;
    const difference = planned == null ? null : planned-actual;
    const percent = planned == null || planned===0 ? null : Math.round(actual/planned*100);
    const state = planned == null ? 'Sem previsão' : actual>planned ? 'Ultrapassada' : actual===planned ? 'Limite atingido' : actual>=planned*0.8 ? 'Próxima do limite' : 'Dentro da previsão';
    return {phase, actual, planned, difference, percent, state};
  });
  const unassigned = entries.filter(e=>!phases.some(p=>p.id===e.phaseId)).reduce((sum,e)=>sum+e.minutes,0);
  return {rows,unassigned,planned:rows.reduce((sum,r)=>sum+(r.planned??0),0),actual:entries.reduce((sum,e)=>sum+e.minutes,0),
    missing:rows.filter(r=>r.planned==null).length,exceeded:rows.filter(r=>r.state==='Ultrapassada').length};
}
