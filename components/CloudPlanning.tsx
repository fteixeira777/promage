import React, { useEffect, useState } from 'react';
import type { Client, Phase, Process, Task, TeamMember } from '../types';
import { loadPlanning, saveRemoteProcess, saveRemotePhase, saveRemoteTask } from '../services/planningService';
import { requireSupabase } from '../lib/supabase';
import { today, money } from '../lib/payments';
import ProcessTimeline from './ProcessTimeline';
import TasksView from './TasksView';
import CloudPayments from './CloudPayments';
import CloudCosts from './CloudCosts';
import CloudFinance from './CloudFinance';
import WorkspaceAccess from './WorkspaceAccess';
import ProjectPortal from './ProjectPortal';
import StudioAlerts from './StudioAlerts';
import ManagementDashboard from './ManagementDashboard';
import ProjectTime from './ProjectTime';
import { Plus, X, ArrowLeft } from 'lucide-react';

export type PlanningSection = 'dashboard' | 'processes' | 'gantt' | 'daily' | 'team' | 'finance' | 'alerts';
const field = 'w-full border rounded-xl p-3 bg-white text-sm';
const button = 'bg-[#2D4E4E] text-white rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50';
export default function CloudPlanning({ organizationId, clients, role, onBusy, section, onSectionChange, navigationRevision }: { organizationId: string; clients: Client[]; role: string; onBusy?: (busy: boolean) => void; section: PlanningSection; onSectionChange: (section: PlanningSection) => void; navigationRevision: number }) {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const tab = section; const setTab = onSectionChange;
  const [dailyWindow, setDailyWindow] = useState<'today' | 'all'>('today');
  const [selectedId, setSelectedId] = useState('');
  const [detailTab, setDetailTab] = useState<'Fases' | 'Tarefas' | 'Recebimentos' | 'Custos' | 'Portal' | 'Horas'>('Fases');
  const [processForm, setProcessForm] = useState<Partial<Process> | null>(null);
  const [phaseForm, setPhaseForm] = useState<Partial<Phase> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  const canManage = role === 'owner' || role === 'manager';
  useEffect(() => { setSelectedId(''); setDailyWindow('today'); setError(''); }, [navigationRevision]);
  const selected = processes.find(p => p.id === selectedId);
  useEffect(() => {
    let alive = true; setLoading(true); setError('');
    loadPlanning(organizationId, role).then(data => { if (alive) { setProcesses(data.processes); setTasks(data.tasks); setTeam(data.team); } })
      .catch(e => { if (alive) setError(String(e.message)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [organizationId, refresh, role]);
  const open = (process: Process, nextTab: 'Fases' | 'Tarefas') => { setSelectedId(process.id); setDetailTab(nextTab); setTab('processes'); setError(''); };
  const saveProcess = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    const title = String(data.get('title')).trim(); const code = String(data.get('code')).trim(); const budget = Number(data.get('budget'));
    if (!title || !code || !Number.isFinite(budget) || budget < 0) { setError('Indica nome, código e um valor válido.'); return; }
    const process: Process = { ...processForm, id: processForm?.id || crypto.randomUUID(), code, title,
      clientId: String(data.get('clientId') || ''), status: String(data.get('status')) as Process['status'],
      budget, pricingMode: String(data.get('pricingMode')) as Process['pricingMode'], startDate: String(data.get('startDate')),
      phases: processForm?.phases || [], subcontracts: [], expenses: [], documents: [] };
    setBusy(true); setError('');
    try { await saveRemoteProcess(organizationId, process); setProcesses(prev => [...prev.filter(p => p.id !== process.id), process]); setProcessForm(null); open(process, 'Fases'); }
    catch (e) { setError(String((e as any).message)); } finally { setBusy(false); }
  };
  const persistPhase = async (phase: Phase) => {
    if (!selected) return false;
    setBusy(true); setError(''); const index = selected.phases.findIndex(p => p.id === phase.id);
    try {
      await saveRemotePhase(organizationId, selected.id, phase, index < 0 ? selected.phases.length : index);
      setProcesses(prev => prev.map(p => p.id === selected.id ? { ...p, phases: index < 0 ? [...p.phases, phase] : p.phases.map(old => old.id === phase.id ? phase : old) } : p));
      return true;
    } catch (e) { setError(String((e as any).message)); return false; } finally { setBusy(false); }
  };
  const savePhase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const data = new FormData(e.currentTarget); const startDate = String(data.get('startDate') || ''); const endDate = String(data.get('endDate') || '');
    if (startDate && endDate && startDate > endDate) { setError('O fim previsto deve ser igual ou posterior ao início.'); return; }
    const plannedHours = String(data.get('plannedHours') || '').trim();
    const plannedMinutes = plannedHours === '' ? undefined : Number(plannedHours)*60;
    if(plannedMinutes != null && (!Number.isSafeInteger(plannedMinutes) || plannedMinutes<0 || plannedMinutes>2147483647)){setError('Indica uma previsão de horas válida, igual ou superior a zero.');return;}
    const phase: Phase = { ...phaseForm, plannedMinutes, id: phaseForm?.id || crypto.randomUUID(), name: String(data.get('name')).trim(),
      value: Number(data.get('value')), status: phaseForm?.status || 'Pendente', startDate, endDate,
      responsible: String(data.get('responsible') || '').trim(), blocker: String(data.get('blocker') || '').trim() };
    if (!phase.name || !Number.isFinite(phase.value) || phase.value < 0) { setError('Preenche um nome e honorários válidos.'); return; }
    if (await persistPhase(phase)) setPhaseForm(null);
  };
  const changePhase = (phase: Phase, status: Phase['status']) => {
    const pending = tasks.filter(t => t.processId === selected?.id && t.phaseId === phase.id && t.status !== 'Concluído').length;
    if (status === 'Concluído' && pending && !window.confirm(`Existem ${pending} tarefas pendentes. Fechar a fase mantendo essas tarefas?`)) return;
    void persistPhase({ ...phase, status, completedAt: status === 'Concluído' ? phase.completedAt || today() : undefined });
  };
  const createTeamMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); const name = String(data.get('name')).trim(); if (!name) return;
    setBusy(true); setError('');
    try {
      const member: TeamMember = { id: crypto.randomUUID(), name, role: String(data.get('role') || ''), email: String(data.get('email') || ''), phone: '', fee: 0, status: 'Ativo' };
      const { error } = await requireSupabase().from('team_members').insert({ organization_id: organizationId, ...member }).select('id').single();
      if (error) throw error; setTeam(prev => [...prev, member]); form.reset();
    } catch (e) { setError(String((e as any).message)); } finally { setBusy(false); }
  };
  const taskView = (processId?: string) => <TasksView initialWindow={processId ? 'all' : dailyWindow} processes={processes} tasks={tasks} setTasks={setTasks} team={team} processId={processId} onSaveTask={async task => {
    setBusy(true);
    try { await saveRemoteTask(organizationId, task); } finally { setBusy(false); }
  }} />;
  return <section className="space-y-5">
    <div className="flex justify-end"><button disabled={busy || loading} onClick={() => setRefresh(r => r + 1)} className="text-sm text-slate-500 underline">Atualizar dados</button></div>
    {error && <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</p>}
    {loading ? <p role="status">A carregar planeamento…</p> : <>
      {tab === 'gantt' && <ProcessTimeline processes={processes} tasks={tasks} legacyProjects={[]} onImport={() => {}} onOpen={open} />}
      {tab === 'daily' && taskView()}
      {tab === 'dashboard' && canManage && <ManagementDashboard organizationId={organizationId} role={role} onProject={(id,area)=>{setSelectedId(id);setDetailTab(area);setRefresh(r=>r+1);setTab('processes');}} onFinance={()=>setTab('finance')} onAlerts={()=>setTab('alerts')} onDaily={()=>{setDailyWindow('all');setTab('daily');}}/>}
      {tab === 'alerts' && <StudioAlerts organizationId={organizationId} role={role} onOpen={alert => {
        setError(''); setRefresh(r => r + 1);
        if (alert.processId) { setSelectedId(alert.processId); setDetailTab(alert.area); setTab('processes'); }
        else { setSelectedId(''); setDailyWindow('all'); setTab('daily'); }
      }}/>}
      {tab === 'finance' && canManage && <CloudFinance organizationId={organizationId} onBusy={setBusy}/>}
      {tab === 'team' && role === 'owner' && <WorkspaceAccess organizationId={organizationId} onBusy={setBusy}/>}
      {tab === 'team' && <div className="bg-white border rounded-3xl p-6 space-y-4"><h2 className="text-xl font-bold">Equipa do gabinete</h2>{team.map(m => <div key={m.id} className="border-t py-3"><p className="font-bold">{m.name}</p><p className="text-sm text-slate-500">{m.role} · {m.email}</p></div>)}{!team.length && <p className="text-slate-500">Adiciona os responsáveis para os poderes atribuir às tarefas.</p>}{canManage && <form onSubmit={createTeamMember} className="space-y-3 border-t pt-4"><label className="block text-sm">Nome<input name="name" required className={field}/></label><label className="block text-sm">Função<input name="role" className={field}/></label><label className="block text-sm">Email<input name="email" type="email" className={field}/></label><button disabled={busy} className={button}>Adicionar à equipa</button><p className="text-xs text-slate-500">Este cadastro permite atribuir tarefas. Para dar acesso à plataforma, o proprietário deve criar um convite na área Acessos ao gabinete.</p></form>}</div>}
      {tab === 'processes' && !selected && <div className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-2xl font-bold">Processos do gabinete</h2>{canManage && <button disabled={busy} onClick={() => { setProcessForm({ pricingMode: 'GLOBAL', budget: 0, status: 'Início', startDate: today(), code: `PR${today().slice(0,4)}/${crypto.randomUUID().slice(0,6).toUpperCase()}` }); setError(''); }} className={button}><Plus size={16} className="inline mr-1"/> Novo processo</button>}</div>{!processes.length && <p className="bg-white rounded-2xl border p-6 text-slate-500">Cria um processo para começar o planeamento.</p>}{processes.map(p => <button key={p.id} onClick={() => open(p,'Fases')} className="w-full bg-white border rounded-2xl p-5 text-left"><p className="text-xs text-slate-500">{p.code} · {p.status}</p><h3 className="font-bold mt-1">{p.title}</h3><p className="text-sm text-slate-500">{clients.find(c => c.id === p.clientId)?.name || 'Sem cliente'} · {p.phases.filter(f => f.status === 'Concluído').length}/{p.phases.length} fases concluídas · {tasks.filter(t => t.processId === p.id && t.status !== 'Concluído').length} tarefas pendentes</p></button>)}</div>}
      {tab === 'processes' && selected && <div className="space-y-5"><button disabled={busy} onClick={() => setSelectedId('')} className="flex gap-2 text-sm items-center"><ArrowLeft size={16}/> Todos os processos</button><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs text-slate-500">{selected.code} · {selected.status}</p><h2 className="text-2xl font-bold">{selected.title}</h2><p className="text-sm text-slate-500">{clients.find(c => c.id === selected.clientId)?.name || 'Sem cliente'} {canManage && <>· Honorários {money(selected.pricingMode === 'PHASES' ? selected.phases.reduce((s,p) => s+p.value,0) : selected.budget)}</>}</p></div>{canManage && <button disabled={busy} className={button} onClick={() => { setProcessForm(selected); setError(''); }}>Editar processo</button>}</div><div className="flex flex-wrap gap-3 border-b pb-3"><button disabled={busy} className="underline font-bold" onClick={() => setDetailTab('Fases')}>Fases</button><button disabled={busy} className="underline font-bold" onClick={() => setDetailTab('Tarefas')}>Tarefas</button><button disabled={busy} className="underline font-bold" onClick={() => setDetailTab('Horas')}>Horas</button>{canManage && <><button disabled={busy} className="underline font-bold" onClick={() => setDetailTab('Recebimentos')}>Recebimentos</button><button disabled={busy} className="underline font-bold" onClick={() => setDetailTab('Custos')}>Custos</button><button disabled={busy} className="underline font-bold" onClick={() => setDetailTab('Portal')}>Portal e documentos</button></>}</div>
        {detailTab === 'Horas' ? <div key={selected.id}><ProjectTime organizationId={organizationId} process={selected} canManage={canManage} onBusy={setBusy} onManageTeam={()=>setTab('team')}/></div> : detailTab === 'Portal' && canManage ? <div key={selected.id}><ProjectPortal organizationId={organizationId} process={selected} onBusy={setBusy}/></div> : detailTab === 'Custos' ? <div key={selected.id}><CloudCosts organizationId={organizationId} process={selected} canManage={canManage} onBusy={setBusy}/></div> : detailTab === 'Recebimentos' ? <div key={selected.id}><CloudPayments organizationId={organizationId} process={selected} canManage={canManage} onBusy={setBusy}/></div> : detailTab === 'Tarefas' ? <div key={selected.id}>{taskView(selected.id)}</div> : <div className="space-y-3">{canManage && <button disabled={busy} className={button} onClick={() => { setPhaseForm({ value: 0 }); setError(''); }}>Nova fase</button>}{!selected.phases.length && <p className="text-slate-500">Ainda não existem fases neste processo.</p>}{selected.phases.map(phase => <article key={phase.id} className="bg-white border rounded-2xl p-5 space-y-3"><div className="flex justify-between gap-3"><h3 className="font-bold">{phase.name}</h3>{canManage && <span>{money(phase.value)}</span>}</div><p className="text-sm text-slate-500">{phase.responsible || 'Sem responsável'} · {phase.startDate || 'Início por definir'} → {phase.endDate || 'Fim por definir'}</p>{phase.blocker && <p className="text-sm bg-amber-50 text-amber-800 p-3 rounded-xl">Bloqueio: {phase.blocker}</p>}<p className="text-xs text-slate-500">{tasks.filter(t => t.phaseId === phase.id && t.status === 'Concluído').length}/{tasks.filter(t => t.phaseId === phase.id).length} tarefas concluídas{phase.completedAt ? ` · Fechada em ${phase.completedAt}` : ''}</p><div className="flex gap-4"><select aria-label={`Estado de ${phase.name}`} disabled={!canManage || busy} value={phase.status} onChange={e => changePhase(phase,e.target.value as Phase['status'])} className="border rounded-lg p-2 text-sm">{['Pendente','Adjudicado','Em Execução','Concluído'].map(s => <option key={s}>{s}</option>)}</select>{canManage && <button disabled={busy} className="underline text-sm" onClick={() => { setPhaseForm(phase); setError(''); }}>Editar fase</button>}</div></article>)}</div>}
      </div>}
    </>}
    {(processForm || phaseForm) && <div className="fixed inset-0 z-50 bg-slate-900/40 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="remote-form-title"><div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"><div className="flex justify-between mb-4"><h2 id="remote-form-title" className="text-xl font-bold">{processForm ? processForm.id ? 'Editar processo' : 'Novo processo' : phaseForm?.id ? 'Editar fase' : 'Nova fase'}</h2><button disabled={busy} aria-label="Fechar" onClick={() => { setProcessForm(null); setPhaseForm(null); setError(''); }}><X/></button></div><form onSubmit={processForm ? saveProcess : savePhase} className="space-y-4"><fieldset disabled={busy} className="space-y-4">{processForm ? <><label className="block text-sm">Nome do processo<input name="title" required defaultValue={processForm.title} className={field}/></label><label className="block text-sm">Código<input name="code" required defaultValue={processForm.code} className={field}/></label><label className="block text-sm">Cliente<select name="clientId" defaultValue={processForm.clientId || ''} className={field}><option value="">Sem cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="block text-sm">Início<input name="startDate" type="date" required defaultValue={processForm.startDate || today()} className={field}/></label><label className="block text-sm">Estado<select name="status" defaultValue={processForm.status || 'Início'} className={field}>{['Início','Projeto','Execução','Finalizado'].map(s => <option key={s}>{s}</option>)}</select></label><label className="block text-sm">Honorários (€)<input name="budget" type="number" min="0" step="0.01" defaultValue={processForm.budget || 0} className={field}/></label><label className="block text-sm">Preço<select name="pricingMode" defaultValue={processForm.pricingMode || 'GLOBAL'} className={field}><option value="GLOBAL">Global</option><option value="PHASES">Soma das fases</option></select></label></> : <><label className="block text-sm">Nome da fase<input name="name" required defaultValue={phaseForm?.name} className={field}/></label><label className="block text-sm">Honorários (€)<input name="value" type="number" min="0" step="0.01" required defaultValue={phaseForm?.value || 0} className={field}/></label><label className="block text-sm">Horas previstas da equipa<input name="plannedHours" type="number" min="0" step="0.25" defaultValue={phaseForm?.plannedMinutes == null ? '' : phaseForm.plannedMinutes/60} placeholder="Por definir" className={field}/><span className="text-xs text-slate-500">Total de trabalho previsto para esta fase. Deixa vazio se ainda não existir uma estimativa; 1,5 corresponde a 1h30.</span></label><div className="grid grid-cols-2 gap-3"><label className="text-sm">Início previsto<input name="startDate" type="date" defaultValue={phaseForm?.startDate} className={field}/></label><label className="text-sm">Fim previsto<input name="endDate" type="date" defaultValue={phaseForm?.endDate} className={field}/></label></div><label className="block text-sm">Responsável<input name="responsible" defaultValue={phaseForm?.responsible} className={field}/></label><label className="block text-sm">Bloqueio<textarea name="blocker" defaultValue={phaseForm?.blocker} className={field}/></label></>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button className={button + ' w-full'}>{busy ? 'A guardar…' : 'Guardar'}</button></fieldset></form></div></div>}
  </section>;
}
