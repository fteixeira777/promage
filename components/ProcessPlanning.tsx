import React, { useState, useEffect } from 'react';
import { Phase, Process, PaymentSchedule, Task } from '../types';
import { money, paymentDate, paymentState, remaining, today } from '../lib/payments';
import { CalendarDays, CheckCircle2, Plus, Wallet, X } from 'lucide-react';

interface Props { process: Process; tasks: Task[]; onChange: (process: Process) => void }
const field = 'w-full border border-slate-200 rounded-xl p-3 bg-white text-sm';
const button = 'rounded-xl bg-[#2D4E4E] text-white px-4 py-2.5 text-sm font-bold';

export default function ProcessPlanning({ process, tasks, onChange }: Props) {
  const [form, setForm] = useState<'phase' | 'payment' | null>(null);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [settling, setSettling] = useState<PaymentSchedule | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setForm(null); setEditingPhase(null); setSettling(null); setError(''); }, [process.id]);
  const payments = process.payments || [];
  const savePhase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const startDate = String(data.get('startDate') || '');
    const endDate = String(data.get('endDate') || '');
    if (startDate && endDate && startDate > endDate) { setError('O fim previsto deve ser igual ou posterior ao início.'); return; }
    const phase: Phase = {
      ...editingPhase, id: editingPhase?.id || crypto.randomUUID(), name: String(data.get('name')).trim(),
      value: Number(data.get('value')), status: editingPhase?.status || 'Pendente', startDate, endDate,
      responsible: String(data.get('responsible') || '').trim(), blocker: String(data.get('blocker') || '').trim(),
    };
    if (!phase.name || !Number.isFinite(phase.value) || phase.value < 0) { setError('Preenche o nome e um valor válido.'); return; }
    const phases = editingPhase ? process.phases.map(p => p.id === phase.id ? phase : p) : [...process.phases, phase];
    onChange({ ...process, phases, budget: process.pricingMode === 'PHASES' ? phases.reduce((s, p) => s + p.value, 0) : process.budget });
    setForm(null); setEditingPhase(null); setError('');
  };
  const savePayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const rule = String(data.get('rule')) as PaymentSchedule['rule'];
    const phaseId = String(data.get('phaseId') || '');
    const dueDate = String(data.get('dueDate') || '');
    const amount = Number(data.get('amount'));
    const offsetDays = Number(data.get('offsetDays') || 0);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(offsetDays) || offsetDays < 0 ||
      (rule === 'DATE' && !dueDate) || (rule === 'PHASE' && !process.phases.some(p => p.id === phaseId))) {
      setError('Indica um valor positivo e uma data acordada ou uma fase válida.'); return;
    }
    const payment: PaymentSchedule = {
      id: crypto.randomUUID(), description: String(data.get('description')).trim(),
      direction: String(data.get('direction')) as PaymentSchedule['direction'], amount, rule, dueDate, phaseId,
      offsetDays, settlements: [],
    };
    if (!payment.description) { setError('Indica a descrição do pagamento.'); return; }
    onChange({ ...process, payments: [...payments, payment] }); setForm(null); setError('');
  };
  const settle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!settling) return;
    const data = new FormData(e.currentTarget);
    const amount = Number(data.get('amount'));
    const date = String(data.get('date'));
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining(settling) || !date || date > today()) {
      setError('O valor deve ser positivo e não ultrapassar o saldo. A data não pode estar no futuro.'); return;
    }
    onChange({ ...process, payments: payments.map(p => p.id === settling.id ? {
      ...p, settlements: [...p.settlements, { id: crypto.randomUUID(), amount, date }],
    } : p) }); setSettling(null); setError('');
  };
  const updatePhase = (phase: Phase, status: Phase['status']) => {
    const pending = tasks.filter(t => t.processId === process.id && t.phaseId === phase.id && t.status !== 'Concluído');
    if (status === 'Concluído' && pending.length && !window.confirm(`Esta fase tem ${pending.length} tarefas pendentes. Fechar a fase mesmo assim? As tarefas mantêm o seu estado.`)) return;
    onChange({ ...process,
    phases: process.phases.map(p => p.id === phase.id ? { ...p, status,
      completedAt: status === 'Concluído' ? (p.completedAt || today()) : undefined } : p),
    });
  };
  const close = () => { setForm(null); setEditingPhase(null); setSettling(null); setError(''); };
  return <div className="space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold text-lg flex gap-2 items-center"><CalendarDays size={20}/> Fases e próximos passos</h3><p className="text-sm text-slate-500 mt-1">O fecho é manual. Os recebimentos são confirmados separadamente.</p></div>
        <button className={button} onClick={() => { close(); setForm('phase'); }}><Plus size={16} className="inline mr-1"/> Nova fase</button></div>
      {!process.phases.length && <p className="rounded-xl bg-slate-50 p-5 text-slate-500">Adiciona a primeira fase para começar a planear este processo.</p>}
      {process.phases.map(phase => <article key={phase.id} className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex justify-between gap-3"><div><h4 className="font-bold">{phase.name}</h4><p className="text-xs text-slate-500 mt-1">{phase.responsible || 'Sem responsável'} · {phase.endDate ? `Fim previsto: ${phase.endDate}` : 'Sem prazo previsto'}</p></div><span className="font-bold whitespace-nowrap">{money(phase.value)}</span></div>
        {phase.blocker && <p className="text-sm bg-amber-50 text-amber-800 rounded-lg p-3">Bloqueio: {phase.blocker}</p>}
        <p className="text-xs text-slate-500">{tasks.filter(t => t.processId === process.id && t.phaseId === phase.id && t.status === 'Concluído').length} de {tasks.filter(t => t.processId === process.id && t.phaseId === phase.id).length} tarefas concluídas</p>
        <div className="flex flex-wrap items-center gap-3">
          <select aria-label={`Estado de ${phase.name}`} value={phase.status} className="border rounded-lg p-2 text-sm" onChange={e => updatePhase(phase, e.target.value as Phase['status'])}>
            {['Pendente', 'Adjudicado', 'Em Execução', 'Concluído'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button type="button" className="text-sm font-bold text-[#2D4E4E] underline" onClick={() => { close(); setEditingPhase(phase); setForm('phase'); }}>Editar fase</button>
          {phase.completedAt ? <span className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 size={14}/> Concluída em {phase.completedAt}</span> : phase.endDate && phase.endDate < today() ? <span className="text-xs text-red-700">Prazo ultrapassado</span> : null}
        </div>
      </article>)}
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold text-lg flex items-center gap-2"><Wallet size={20}/> Plano de recebimentos e pagamentos</h3><p className="text-sm text-slate-500 mt-1">Divide os honorários e subcontratos em parcelas com datas ou fases.</p></div><button className={button} onClick={() => { close(); setForm('payment'); }}>Nova parcela</button></div>
      {!payments.length && <p className="rounded-xl bg-slate-50 p-5 text-slate-500">Ainda não existem parcelas. O orçamento, por si só, não confirma um recebimento.</p>}
      {payments.map(payment => <article key={payment.id} className="border rounded-2xl p-4 space-y-3">
        <div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase text-slate-500">{payment.direction === 'INCOME' ? 'A receber' : 'A pagar'}</p><h4 className="font-bold mt-1">{payment.description}</h4><p className="text-sm text-slate-500">{payment.rule === 'DATE' ? 'Data acordada' : `${process.phases.find(p => p.id === payment.phaseId)?.name || 'Fase indisponível'} + ${payment.offsetDays} dias`} · {paymentDate(payment, process) || 'Sem previsão de data'}</p></div><div className="text-right"><p className="font-bold">{money(remaining(payment))}</p><p className="text-xs text-slate-500">por liquidar de {money(payment.amount)}</p></div></div>
        <div className="flex flex-wrap justify-between gap-2"><span className={`text-xs font-bold rounded-lg px-3 py-2 ${paymentState(payment, process) === 'Em atraso' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{paymentState(payment, process)}</span>
          {remaining(payment) > 0 && <button className="text-sm font-bold text-[#2D4E4E] underline" onClick={() => { close(); setSettling(payment); }}>Registar {payment.direction === 'INCOME' ? 'recebimento' : 'pagamento'}</button>}
          {!payment.settlements.length && <button className="text-sm text-red-700 underline" onClick={() => { if (window.confirm('Remover esta parcela do plano financeiro?')) onChange({ ...process, payments: payments.filter(p => p.id !== payment.id) }); }}>Remover parcela</button>}
        </div>
        {payment.settlements.map(s => <p key={s.id} className="text-xs text-emerald-700">{payment.direction === 'INCOME' ? 'Recebido' : 'Pago'}: {money(s.amount)} em {s.date}</p>)}
      </article>)}
    </section>
    {(form || settling) && <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="planning-title">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-5"><h3 id="planning-title" className="text-xl font-bold">{settling ? 'Registar movimento' : form === 'phase' ? (editingPhase ? 'Editar fase' : 'Nova fase') : 'Nova parcela'}</h3><button aria-label="Fechar" onClick={close}><X/></button></div>
        <form onSubmit={settling ? settle : form === 'phase' ? savePhase : savePayment} className="space-y-4">
          {settling ? <><p className="text-sm text-slate-500">{settling.description} · Saldo: {money(remaining(settling))}</p><label className="block text-sm">Valor efetivo<input name="amount" type="number" min="0.01" max={remaining(settling)} step="0.01" required defaultValue={remaining(settling)} className={field}/></label><label className="block text-sm">Data efetiva<input name="date" type="date" required defaultValue={today()} max={today()} className={field}/></label></> : form === 'phase' ? <>
            <label className="block text-sm">Nome da fase<input name="name" required defaultValue={editingPhase?.name} className={field}/></label>
            <label className="block text-sm">Honorários da fase (€)<input name="value" type="number" min="0" step="0.01" required defaultValue={editingPhase?.value || 0} className={field}/></label>
            <div className="grid grid-cols-2 gap-3"><label className="text-sm">Início previsto<input type="date" name="startDate" defaultValue={editingPhase?.startDate} className={field}/></label><label className="text-sm">Fim previsto<input type="date" name="endDate" defaultValue={editingPhase?.endDate} className={field}/></label></div>
            <label className="block text-sm">Responsável<input name="responsible" defaultValue={editingPhase?.responsible} className={field}/></label>
            <label className="block text-sm">O que bloqueia o avanço?<textarea name="blocker" defaultValue={editingPhase?.blocker} className={field}/></label>
          </> : <>
            <label className="block text-sm">Descrição<input name="description" required placeholder="Ex.: Honorários de licenciamento / engenheiro" className={field}/></label>
            <div className="grid grid-cols-2 gap-3"><label className="text-sm">Movimento<select name="direction" className={field}><option value="INCOME">Recebimento</option><option value="EXPENSE">Pagamento / subcontrato</option></select></label><label className="text-sm">Valor (€)<input name="amount" type="number" min="0.01" step="0.01" required className={field}/></label></div>
            <label className="block text-sm">Regra<select name="rule" className={field}><option value="DATE">Data acordada</option><option value="PHASE">Conclusão de fase + prazo</option></select></label>
            <label className="block text-sm">Data acordada<input name="dueDate" type="date" className={field}/></label>
            <label className="block text-sm">Fase associada<select name="phaseId" className={field}><option value="">Selecionar fase</option>{process.phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="block text-sm">Dias após conclusão (0 = no próprio dia)<input name="offsetDays" type="number" min="0" step="1" defaultValue="0" className={field}/></label>
          </>}
          {error && <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
          <button className={`${button} w-full`} type="submit">{settling ? 'Confirmar movimento' : 'Guardar'}</button>
        </form>
      </div>
    </div>}
  </div>;
}
