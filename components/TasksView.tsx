import React, { useState } from 'react';
import { Process, Task, TeamMember } from '../types';
import { today } from '../lib/payments';
import { dailyTasks } from '../lib/planning';
import { Plus, X, CheckCircle2, Clock } from 'lucide-react';

interface Props { initialWindow?: 'today' | 'week' | 'all'; processes: Process[]; tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; team: TeamMember[]; processId?: string; onSaveTask?: (task: Task) => Promise<void> }
const input = 'w-full border rounded-xl p-3 bg-white text-sm';
export default function TasksView({ processes, tasks, setTasks, team, processId, onSaveTask, initialWindow }: Props) {
  const [window, setWindow] = useState<'today' | 'week' | 'all'>(initialWindow || (processId ? 'all' : 'today'));
  const [assignee, setAssignee] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<Partial<Task> | null>(null);
  const [selectedProcess, setSelectedProcess] = useState(processId || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const persist = async (task: Task) => {
    setBusy(true); setError('');
    try { await onSaveTask?.(task); setTasks(prev => [...prev.filter(t => t.id !== task.id), task]); return true; }
    catch (e) { setError(String((e as { message?: string })?.message || 'Não foi possível guardar a tarefa.')); return false; }
    finally { setBusy(false); }
  };
  const scoped = tasks.filter(t => !processId || t.processId === processId);
  const pending = dailyTasks(scoped, today(), window, assignee);
  const visible = showDone ? scoped.filter(t => t.status === 'Concluído' && (!assignee || t.assignedTo === assignee)) : pending;
  const process = processes.find(p => p.id === selectedProcess);
  const open = (task: Partial<Task>) => { setEditing(task); setSelectedProcess(task.processId || processId || ''); setError(''); };
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    const title = String(data.get('title')).trim(); const phaseId = String(data.get('phaseId') || '');
    const startDate = String(data.get('startDate') || ''); const dueDate = String(data.get('dueDate') || '');
    if (!title || !dueDate || (startDate && startDate > dueDate)) { setError('Indica um título e um prazo igual ou posterior ao início.'); return; }
    if (selectedProcess && !process?.phases.some(p => p.id === phaseId)) { setError('Seleciona uma fase válida. Se o processo ainda não tem fases, cria uma primeiro.'); return; }
    const status = String(data.get('status')) as Task['status'];
    if (status !== 'Concluído' && process?.phases.find(p => p.id === phaseId)?.status === 'Concluído') { setError('Reabre a fase antes de lhe atribuir uma tarefa pendente.'); return; }
    const task: Task = { ...editing, id: editing?.id || crypto.randomUUID(), title, processId: selectedProcess || undefined, phaseId: phaseId || undefined,
      startDate, dueDate, assignedTo: String(data.get('assignedTo') || ''), priority: Number(data.get('priority')) as Task['priority'],
      status, notes: String(data.get('notes') || '') };
    if (await persist(task)) setEditing(null);
  };
  const names = [...new Set([...team.map(m => m.id), ...tasks.map(t => t.assignedTo).filter(Boolean)])];
  const name = (id: string) => team.find(m => m.id === id)?.name || id || 'Sem responsável';
  return <section className="space-y-5">
    {error && !editing && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <fieldset disabled={busy} className="space-y-5">
    <div className="flex flex-wrap gap-3 justify-between items-start"><div><h2 className="text-2xl font-bold">{processId ? 'Tarefas das fases' : 'Trabalho diário'}</h2><p className="text-sm text-slate-500 mt-1">Os prazos ultrapassados aparecem em Hoje e nos próximos sete dias.</p></div><button onClick={() => open({ status: 'Pendente', priority: 3 })} className="bg-[#2D4E4E] text-white rounded-xl px-4 py-3 font-bold text-sm"><Plus size={16} className="inline mr-1"/> Nova tarefa</button></div>
    <div className="flex flex-wrap gap-3"><select aria-label="Período das tarefas" value={window} onChange={e => { setWindow(e.target.value as typeof window); setShowDone(false); }} className={input + ' !w-auto'}><option value="today">Hoje e atrasadas</option><option value="week">Próximos 7 dias</option><option value="all">Todas as pendentes</option></select><select aria-label="Filtrar responsável" value={assignee} onChange={e => setAssignee(e.target.value)} className={input + ' !w-auto'}><option value="">Toda a equipa</option>{names.map(id => <option key={id} value={id}>{name(id)}</option>)}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}/> Mostrar concluídas</label></div>
    {!visible.length && <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">Sem tarefas neste filtro.</div>}
    <div className="space-y-3">{visible.map(task => {
      const p = processes.find(p => p.id === task.processId); const phase = p?.phases.find(p => p.id === task.phaseId);
      return <article key={task.id} className="rounded-2xl border bg-white p-4 space-y-3"><div className="flex justify-between gap-3"><div><h3 className="font-bold">{task.title}</h3><p className="text-xs text-slate-500 mt-1">{p?.title || 'Tarefa do gabinete'} · {phase?.name || (task.phaseId ? 'Fase indisponível' : 'Sem fase')} · {name(task.assignedTo || '')}</p></div><span className="text-xs font-bold">Prioridade {task.priority}/5</span></div><div className="flex flex-wrap gap-3 items-center"><span className={`text-sm ${task.status !== 'Concluído' && task.dueDate < today() ? 'text-red-700 font-bold' : 'text-slate-500'}`}><Clock size={14} className="inline mr-1"/>{task.dueDate}</span><select aria-label={`Estado da tarefa ${task.title}`} value={task.status} className="border rounded-lg p-2 text-sm" onChange={e => {
        const status = e.target.value as Task['status'];
        if (status !== 'Concluído' && phase?.status === 'Concluído') { open(task); setError('Reabre a fase antes de reabrir esta tarefa.'); return; }
        void persist({ ...task, status });
      }}>{['Pendente', 'Em Curso', 'Concluído'].map(s => <option key={s}>{s}</option>)}</select><button onClick={() => open(task)} className="text-sm font-bold underline text-[#2D4E4E]">Editar</button>{phase?.blocker && <span className="text-xs text-amber-800">Fase bloqueada: {phase.blocker}</span>}</div>{task.notes && <p className="text-sm text-slate-600 whitespace-pre-wrap">{task.notes}</p>}{task.legacyTicket?.attachments?.length > 0 && <div className="flex flex-wrap gap-2">{task.legacyTicket.attachments.map(a => <a key={a.id} href={a.dataUrl} download={a.name} className="text-sm underline text-[#2D4E4E]">{a.name}</a>)}</div>}</article>;
    })}</div>
    {editing && <div className="fixed inset-0 z-50 bg-slate-900/40 p-4 flex justify-center items-center" role="dialog" aria-modal="true" aria-labelledby="task-title"><div className="bg-white rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto"><div className="flex justify-between mb-5"><h3 id="task-title" className="text-xl font-bold">{editing.id ? 'Editar tarefa' : 'Nova tarefa'}</h3><button aria-label="Fechar" onClick={() => setEditing(null)}><X/></button></div><form onSubmit={save} className="space-y-4">
      <label className="block text-sm">Título<input name="title" required defaultValue={editing.title} className={input}/></label>
      <label className="block text-sm">Processo<select aria-label="Processo da tarefa" value={selectedProcess} disabled={!!processId} onChange={e => setSelectedProcess(e.target.value)} className={input}><option value="">Tarefa geral do gabinete</option>{processes.map(p => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}</select></label>
      {selectedProcess && <label className="block text-sm">Fase<select key={selectedProcess} name="phaseId" defaultValue={editing.processId === selectedProcess ? editing.phaseId || '' : ''} required className={input}><option value="">Selecionar fase</option>{process?.phases.map(p => <option key={p.id} value={p.id}>{p.name}{p.status === 'Concluído' ? ' (concluída)' : ''}</option>)}</select></label>}
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Início<input type="date" name="startDate" defaultValue={editing.startDate} className={input}/></label><label className="text-sm">Prazo<input type="date" name="dueDate" required defaultValue={editing.dueDate || today()} className={input}/></label></div>
      <label className="block text-sm">Responsável<select name="assignedTo" defaultValue={editing.assignedTo || ''} className={input}><option value="">Sem responsável</option>{names.map(id => <option key={id} value={id}>{name(id)}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Prioridade<select name="priority" defaultValue={editing.priority || 3} className={input}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{n === 5 ? ' · Urgente' : ''}</option>)}</select></label><label className="text-sm">Estado<select name="status" defaultValue={editing.status || 'Pendente'} className={input}>{['Pendente', 'Em Curso', 'Concluído'].map(s => <option key={s}>{s}</option>)}</select></label></div>
      <label className="block text-sm">Notas<textarea name="notes" defaultValue={editing.notes} className={input}/></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button className="w-full bg-[#2D4E4E] text-white rounded-xl p-3 font-bold">Guardar tarefa</button>
    </form></div></div>}
    </fieldset>
  </section>;
}
