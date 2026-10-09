import React from 'react';
import { Process, Task } from '../types';
import { money, remaining, today } from '../lib/payments';
import { ArrowRight, Building2, CalendarDays, AlertTriangle, Wallet } from 'lucide-react';

export default function StudioOverview({ processes, tasks, onOpen }: { processes: Process[]; tasks: Task[]; onOpen: (process: Process) => void }) {
  const active = processes.filter(p => p.status !== 'Finalizado');
  const overdue = active.flatMap(p => p.phases).filter(p => p.status !== 'Concluído' && p.endDate && p.endDate < today());
  const blocked = active.filter(p => p.phases.some(phase => phase.status !== 'Concluído' && phase.blocker));
  const receivable = processes.flatMap(p => p.payments || []).filter(p => p.direction === 'INCOME').reduce((sum, p) => sum + remaining(p), 0);
  const dueTasks = tasks.filter(t => t.status !== 'Concluído').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return <div className="space-y-7">
    <div><p className="text-xs font-bold uppercase tracking-widest text-[#2D4E4E]">Promage · Gabinete</p><h1 className="text-3xl font-bold text-slate-900 mt-2">O gabinete, num só lugar</h1><p className="text-slate-500 mt-2">Fases, bloqueios e compromissos financeiros dos teus processos.</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[{ label: 'Processos ativos', value: active.length, icon: <Building2/> }, { label: 'Fases com prazo ultrapassado', value: overdue.length, icon: <CalendarDays/> }, { label: 'Processos com bloqueios', value: blocked.length, icon: <AlertTriangle/> }, { label: 'Honorários por receber', value: money(receivable), icon: <Wallet/> }].map(card => <div key={card.label} className="rounded-2xl bg-white border p-5"><div className="text-[#2D4E4E] mb-4">{card.icon}</div><p className="text-2xl font-bold">{card.value}</p><p className="text-sm text-slate-500 mt-1">{card.label}</p></div>)}
    </div>
    <section className="rounded-3xl border bg-white p-6"><h2 className="font-bold text-lg mb-4">Estado dos processos</h2>{!active.length && <p className="text-slate-500">Cria um processo no Portfólio ou aceita um orçamento para começar.</p>}<div className="space-y-3">{active.map(process => {
      const completed = process.phases.filter(p => p.status === 'Concluído').length;
      const next = process.phases.find(p => p.status !== 'Concluído');
      const pendingTasks = tasks.filter(t => t.processId === process.id && t.status !== 'Concluído');
      return <button key={process.id} onClick={() => onOpen(process)} className="w-full text-left rounded-2xl border p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
        <div className="flex-1"><p className="text-xs text-slate-500">{process.code} · {process.status}</p><h3 className="font-bold mt-1">{process.title}</h3><p className="text-sm text-slate-500 mt-1">{next ? `Próxima fase: ${next.name} · ${next.responsible || 'Sem responsável'} · ${next.endDate || 'Sem prazo'}` : process.phases.length ? 'Todas as fases concluídas' : 'Planeamento por definir'}</p>{next?.blocker && <p className="text-sm text-amber-700 mt-1">Bloqueio: {next.blocker}</p>}<p className="text-xs text-slate-500 mt-2">{pendingTasks.length} tarefas pendentes · {pendingTasks.filter(t => t.dueDate < today()).length} atrasadas</p><div className="h-1.5 rounded-full bg-slate-100 mt-3"><div className="h-full rounded-full bg-[#2D4E4E]" style={{ width: `${process.phases.length ? completed / process.phases.length * 100 : 0}%` }}/></div><p className="text-xs text-slate-500 mt-1">{completed} de {process.phases.length} fases concluídas</p></div><ArrowRight size={20} className="text-[#2D4E4E] shrink-0"/>
      </button>;
    })}</div></section>
    <section className="rounded-3xl border bg-white p-6"><h2 className="font-bold text-lg mb-4">Tarefas pendentes</h2><p className="text-xs text-slate-500 mb-3">Lista existente de tarefas do gabinete, ordenada pelo prazo.</p>{!dueTasks.length && <p className="text-slate-500">Sem tarefas pendentes.</p>}{dueTasks.slice(0, 8).map(task => <div key={task.id} className="border-t py-3 flex justify-between gap-4 text-sm"><span>{task.title}</span><span className={task.dueDate < today() ? 'text-red-700 font-bold' : 'text-slate-500'}>{task.dueDate}</span></div>)}</section>
  </div>;
}
