import type { Process, Task } from '../types';
import type { PortalRequest } from './portal';
import { addCalendarDays } from './planning.ts';
import { paymentDate, paymentState, remaining } from './payments.ts';
export type AlertArea = 'Fases' | 'Tarefas' | 'Recebimentos' | 'Custos' | 'Portal';
export interface StudioAlert {
  id: string; title: string; processId?: string; processTitle: string; area: AlertArea;
  category: 'Tarefas'|'Fases'|'Documentos'|'Financeiro'; urgency: 'Atrasado'|'Hoje'|'Próximos 7 dias'|'Rever'|'Pendente';
  date?: string; amount?: number; detail: string;
}
export function buildAlerts(processes: Process[], tasks: Task[], documents: {processId:string;requests:PortalRequest[]}[], day: string, canManage: boolean) {
  const result: StudioAlert[]=[];
  const deadline = (date?:string): StudioAlert['urgency'] | undefined => !date ? undefined : date<day ? 'Atrasado' : date===day ? 'Hoje' : date<=addCalendarDays(day,7) ? 'Próximos 7 dias' : undefined;
  const context = (id?:string) => ({processId:id,processTitle:processes.find(p=>p.id===id)?.title || 'Tarefas gerais do gabinete'});
  for(const t of tasks) {
    const urgency=deadline(t.dueDate);
    if(t.status!=='Concluído' && urgency) result.push({id:`task:${t.id}`,title:t.title,...context(t.processId),category:'Tarefas',area:'Tarefas',urgency,date:t.dueDate,detail:`Tarefa · ${t.status}`});
  }
  for(const p of processes) {
    for(const f of p.phases) {
      const urgency=deadline(f.endDate);
      if(f.status!=='Concluído' && urgency) result.push({id:`phase:${p.id}:${f.id}`,title:f.name,...context(p.id),category:'Fases',area:'Fases',urgency,date:f.endDate,detail:`Fase · ${f.status}`});
    }
    if(canManage) for(const payment of p.payments || []) {
      if(paymentState(payment,p,day)!=='Em atraso') continue;
      result.push({id:`payment:${p.id}:${payment.id}`,title:payment.description,...context(p.id),category:'Financeiro',area:payment.direction==='INCOME'?'Recebimentos':'Custos',urgency:'Atrasado',date:paymentDate(payment,p),amount:remaining(payment),detail:payment.direction==='INCOME'?'Recebimento em atraso':'Pagamento em atraso'});
    }
  }
  if(canManage) for(const d of documents) for(const r of d.requests) {
    if(r.status==='accepted') continue;
    result.push({id:`document:${r.id}`,title:r.title,...context(d.processId),category:'Documentos',area:'Portal',urgency:r.status==='submitted'?'Rever':deadline(r.due_date)||'Pendente',date:r.due_date,detail:r.status==='submitted'?'Documento entregue · aguarda revisão':'Documento pedido · aguarda entrega'});
  }
  const order={'Atrasado':0,'Hoje':1,'Rever':2,'Próximos 7 dias':3,'Pendente':4};
  return result.sort((a,b)=>order[a.urgency]-order[b.urgency] || (a.date||'9999').localeCompare(b.date||'9999') || a.title.localeCompare(b.title,'pt'));
}
