import React, { useState } from 'react';
import { Process, Task, Project } from '../types';
import { addCalendarDays } from '../lib/planning';
import { today } from '../lib/payments';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const ordinal = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000;
export default function ProcessTimeline({ processes, tasks, legacyProjects, onImport, onOpen }: {
  processes: Process[]; tasks: Task[]; legacyProjects: Project[]; onImport: () => void;
  onOpen: (process: Process, tab: 'Fases' | 'Tarefas') => void;
}) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [filter, setFilter] = useState('');
  const [showTasks, setShowTasks] = useState(true);
  const start = `${month}-01`;
  const dates = Array.from({ length: 90 }, (_, i) => addCalendarDays(start, i));
  const visible = processes.filter(p => !filter || p.id === filter);
  const pendingImports = legacyProjects.filter(project => !processes.some(p => p.sourcePortfolioId === project.id));
  const changeMonth = (amount: number) => {
    const d = new Date(`${start}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + amount); setMonth(d.toISOString().slice(0, 7));
  };
  const row = (id: string, label: string, status: string, startDate: string | undefined, endDate: string | undefined, onClick: () => void, isTask = false) => {
    const from = startDate || endDate; const to = endDate || startDate;
    const offset = from ? ordinal(from) - ordinal(start) : 0;
    const end = to ? ordinal(to) - ordinal(start) : 0;
    const left = Math.max(0, offset); const right = Math.min(89, end);
    const valid = from && to && Number.isFinite(offset) && Number.isFinite(end) && end >= offset;
    const shown = valid && right >= left;
    const color = status === 'Concluído' ? '#059669' : to && to < today() ? '#be123c' : isTask ? '#64748b' : '#2D4E4E';
    return <div key={id} className="flex border-b min-h-12"><button onClick={onClick} className={`w-64 shrink-0 sticky left-0 z-10 bg-white border-r p-3 text-left text-sm hover:bg-slate-50 ${isTask ? 'pl-8' : 'font-bold'}`}><span className="block truncate">{isTask ? '↳ ' : ''}{label}</span><span className="block text-xs font-normal text-slate-500">{status} · {from || 'Sem datas'}{to && to !== from ? ` → ${to}` : ''}</span></button><div className="relative w-[1800px] shrink-0 min-h-12" style={{ backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 19px, #e2e8f0 19px, #e2e8f0 20px)' }}>
      {shown ? <button aria-label={`Abrir ${label}`} title={`${label}: ${from} a ${to}`} onClick={onClick} className="absolute top-3 h-7 rounded-md text-white text-xs px-2 truncate text-left" style={{ left: left * 20, width: Math.max(20, (right - left + 1) * 20), backgroundColor: color }}>{label}</button> : <span className="absolute left-4 top-4 text-xs text-slate-400">{valid ? 'Fora deste período' : 'Datas por definir'}</span>}
      {dates.includes(today()) && <div className="absolute inset-y-0 border-l-2 border-amber-500 pointer-events-none" style={{ left: (ordinal(today()) - ordinal(start)) * 20 }}/>}
    </div></div>;
  };
  return <div className="space-y-5">
    <div><h2 className="text-2xl font-bold flex items-center gap-2"><CalendarDays/> Planeamento do gabinete</h2><p className="text-sm text-slate-500 mt-2">As fases e tarefas são as mesmas que aparecem nos processos. Clica numa linha para abrir os detalhes.</p></div>
    {pendingImports.length > 0 && <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap justify-between gap-3"><p className="text-sm text-amber-900">Existem {pendingImports.length} projetos no planeamento anterior. Podes importá-los como processos, preservando tarefas, notas e anexos.</p><button onClick={onImport} className="text-sm font-bold underline">Importar planeamento anterior</button></div>}
    <div className="flex flex-wrap items-center gap-3"><button aria-label="Mês anterior" className="border rounded-lg p-2" onClick={() => changeMonth(-1)}><ChevronLeft size={18}/></button><input aria-label="Mês inicial do Gantt" type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} className="border rounded-lg p-2"/><button aria-label="Mês seguinte" className="border rounded-lg p-2" onClick={() => changeMonth(1)}><ChevronRight size={18}/></button><button onClick={() => setMonth(today().slice(0, 7))} className="text-sm underline">Hoje</button><select aria-label="Filtrar processo no Gantt" value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg p-2 text-sm"><option value="">Todos os processos</option>{processes.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select><label className="text-sm flex items-center gap-2"><input type="checkbox" checked={showTasks} onChange={e => setShowTasks(e.target.checked)}/> Mostrar tarefas</label></div>
    <div className="overflow-x-auto rounded-2xl border bg-white"><div className="min-w-[2056px]"><div className="flex border-b bg-slate-50"><div className="w-64 shrink-0 sticky left-0 z-20 bg-slate-50 p-3 font-bold text-sm">Processo / fase / tarefa</div><div className="flex">{dates.map(date => <div key={date} className={`w-5 shrink-0 border-l text-center py-2 text-[9px] ${date === today() ? 'bg-amber-100 font-bold' : ''}`} title={date}><span className="block">{date.slice(8)}</span>{date.endsWith('-01') && <span>{date.slice(5, 7)}</span>}</div>)}</div></div>
      {visible.map(process => <div key={process.id}><button onClick={() => onOpen(process, 'Fases')} className="block sticky left-0 w-64 p-3 text-left font-bold text-sm bg-slate-100">{process.code} · {process.title}</button>{!process.phases.length && <p className="sticky left-0 w-64 p-3 text-sm text-slate-500">Sem fases. Abre o processo para planear.</p>}{process.phases.map(phase => <React.Fragment key={phase.id}>{row(phase.id, phase.name, phase.status, phase.startDate, phase.endDate, () => onOpen(process, 'Fases'))}{showTasks && tasks.filter(t => t.processId === process.id && t.phaseId === phase.id).map(task => row(task.id, task.title, task.status, task.startDate, task.dueDate, () => onOpen(process, 'Tarefas'), true))}</React.Fragment>)}{showTasks && tasks.filter(t => t.processId === process.id && !process.phases.some(p => p.id === t.phaseId)).map(task => row(task.id, task.title, task.status, task.startDate, task.dueDate, () => onOpen(process, 'Tarefas'), true))}</div>)}
    </div></div>
    <p className="text-xs text-slate-500">Janela de 90 dias. Verde: concluído · Vermelho: prazo ultrapassado · Linha amarela: hoje. Datas em falta não são estimadas.</p>
  </div>;
}
