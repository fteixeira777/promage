import React, { useEffect, useState } from 'react';
import type { Process, Subcontract, Expense, PaymentSchedule } from '../types';
import { loadFinance, saveCost } from '../services/financeService';
import { projectFinance, costFinance } from '../lib/finance';
import { today, money } from '../lib/payments';
import CloudPayments from './CloudPayments';
import ProjectFinancialSummary from './ProjectFinancialSummary';

const field = 'w-full border rounded-xl p-3 bg-white text-sm';
const button = 'bg-[#2D4E4E] text-white rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50';
export default function CloudCosts({ organizationId, process, canManage, onBusy }: {
  organizationId: string; process: Process; canManage: boolean; onBusy: (busy: boolean) => void;
}) {
  const [data, setData] = useState<Process | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState<Subcontract | Expense | null>(null);
  const [paymentsStale, setPaymentsStale] = useState(false);
  useEffect(() => {
    let alive = true; setData(null); setError(''); setPaymentsStale(false);
    loadFinance(organizationId, process.id).then(rows => { if (alive) { if (!rows.length) setError('Projeto indisponível.'); else setData(rows[0]); } })
      .catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [organizationId, process.id, revision]);
  const lock = (value: boolean) => { setBusy(value); onBusy(value); };
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!draft || !data || !canManage) return;
    const form = new FormData(e.currentTarget); const value = Number(form.get('value'));
    const title = String(form.get('title') || '').trim();
    if (!title || !Number.isFinite(value) || value <= 0) { setError('Preenche um nome e um valor positivo.'); return; }
    const subcontract = 'companyName' in draft;
    const cost: Subcontract | Expense = subcontract
      ? { id: draft.id, companyName: title, service: String(form.get('service') || '').trim(), value, phases: process.phases.filter(p => form.getAll('phaseIds').includes(p.id)) }
      : { id: draft.id, description: title, value, date: String(form.get('date') || '') };
    const exists = [...data.subcontracts,...data.expenses].some(c => c.id === draft.id);
    lock(true); setError('');
    try {
      await saveCost(organizationId, process.id, cost, exists);
      setData(previous => previous ? subcontract
        ? { ...previous, subcontracts: [...previous.subcontracts.filter(c => c.id !== cost.id), cost as Subcontract] }
        : { ...previous, expenses: [...previous.expenses.filter(c => c.id !== cost.id), cost as Expense] } : previous);
      setDraft(null);
    } catch(e) { setError((e as Error).message); }
    finally { lock(false); }
  };
  const totals = data ? projectFinance({ ...data, phases: process.phases, budget: process.budget, pricingMode: process.pricingMode }) : null;
  const paymentsChanged = (payments: PaymentSchedule[] | null) => {
    setPaymentsStale(payments === null);
    if (payments) setData(previous => previous ? { ...previous, payments: [...(previous.payments || []).filter(p => p.direction !== 'EXPENSE'), ...payments] } : previous);
  };
  const costStatus = (kind: 'subcontract' | 'expense', cost: Subcontract | Expense) => {
    if (!data || paymentsStale) return <p className="text-sm text-amber-800">Atualiza os movimentos para consultar os valores.</p>;
    const status = costFinance(data,kind,cost.id,cost.value);
    return <div className="text-sm my-2 space-y-1"><p>Em prestações: {money(status.planned)} · Pago: {money(status.paid)} · Por pagar: {money(status.unpaid)}</p>{status.unplanned !== 0 && <p className="text-amber-800">{status.unplanned > 0 ? `Falta distribuir ${money(status.unplanned)} por prestações.` : `As prestações excedem este custo em ${money(-status.unplanned)}. Confirma os valores.`}</p>}</div>;
  };
  return <section className="space-y-5">
    <div className="flex flex-wrap justify-between gap-3"><h3 className="text-xl font-bold">Custos do projeto</h3><button disabled={busy} className="underline text-sm" onClick={() => setRevision(r => r+1)}>Atualizar custos</button></div>
    {error && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
    {!data ? <p>{error ? 'Não foi possível carregar os custos. Tenta atualizar.' : 'A carregar custos…'}</p> : <>
      {paymentsStale ? <p role="alert" className="text-amber-800">O resumo precisa de ser atualizado após o último registo. Atualiza os pagamentos abaixo.</p> : <ProjectFinancialSummary process={{...data, phases: process.phases, budget: process.budget, pricingMode: process.pricingMode}}/>}
      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white border rounded-2xl p-5 space-y-3"><h4 className="font-bold">Subcontratos</h4>{data.subcontracts.map(c => <article key={c.id} className="border-t pt-3"><p className="font-bold">{c.companyName} · {money(c.value)}</p><p className="text-sm text-slate-500">{c.service || 'Serviço por definir'} · {c.phases.map(p => p.name).join(', ') || 'Sem fase associada'}</p>{costStatus('subcontract', c)}{canManage && <button disabled={busy} className="underline text-sm" onClick={() => { setError(''); setDraft(c); }}>Editar subcontrato</button>}</article>)}{!data.subcontracts.length && <p className="text-sm text-slate-500">Sem subcontratos.</p>}{canManage && <button disabled={busy} className={button} onClick={() => { setError(''); setDraft({ id: crypto.randomUUID(), companyName:'', service:'', value:0, phases:[] }); }}>Novo subcontrato</button>}</section>
        <section className="bg-white border rounded-2xl p-5 space-y-3"><h4 className="font-bold">Outras despesas</h4>{data.expenses.map(c => <article key={c.id} className="border-t pt-3"><p className="font-bold">{c.description} · {money(c.value)}</p><p className="text-sm text-slate-500">Data do custo: {c.date.split('-').reverse().join('/')}</p>{costStatus('expense', c)}{canManage && <button disabled={busy} className="underline text-sm" onClick={() => { setError(''); setDraft(c); }}>Editar despesa</button>}</article>)}{!data.expenses.length && <p className="text-sm text-slate-500">Sem outras despesas.</p>}{canManage && <button disabled={busy} className={button} onClick={() => { setError(''); setDraft({ id:crypto.randomUUID(), description:'', value:0, date:today() }); }}>Nova despesa</button>}</section>
      </div>
      <p className="bg-slate-100 rounded-xl p-3 text-sm">Distribui cada custo pelas prestações abaixo e seleciona o respetivo “Custo associado”. Regista o pagamento quando o dinheiro sair. Uma prestação corresponde a um único custo; podes criar várias prestações para o mesmo custo.</p>
      <CloudPayments organizationId={organizationId} process={{...data, phases: process.phases}} direction="EXPENSE" costTotal={totals!.costs} canManage={canManage} onBusy={lock} onPaymentsChange={paymentsChanged}/>
    </>}
    {draft && <div role="dialog" aria-modal="true" aria-labelledby="cost-title" className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"><h3 id="cost-title" className="font-bold text-xl mb-4">{'companyName' in draft ? 'Subcontrato' : 'Despesa do projeto'}</h3><form onSubmit={save}><fieldset disabled={busy} className="space-y-4">
      <label className="block text-sm">{'companyName' in draft ? 'Fornecedor' : 'Descrição'}<input name="title" required defaultValue={'companyName' in draft ? draft.companyName : draft.description} className={field}/></label>
      <label className="block text-sm">Valor do custo (€)<input name="value" required min="0.01" step="0.01" type="number" defaultValue={draft.value || ''} className={field}/></label>
      {'companyName' in draft ? <><label className="block text-sm">Serviço<input name="service" defaultValue={draft.service} className={field}/></label><fieldset className="space-y-2"><legend className="text-sm font-bold">Fases associadas</legend>{process.phases.map(p => <label key={p.id} className="flex items-center gap-2 text-sm"><input name="phaseIds" type="checkbox" value={p.id} defaultChecked={draft.phases.some(f => f.id === p.id)}/>{p.name}</label>)}</fieldset></> : <label className="block text-sm">Data do custo<input name="date" required type="date" defaultValue={draft.date} className={field}/></label>}
      {error && <p role="alert" className="text-red-700">{error}</p>}<div className="flex justify-end gap-4"><button type="button" onClick={() => { setDraft(null); setError(''); }}>Cancelar</button><button className={button}>{busy ? 'A guardar…' : 'Guardar custo'}</button></div>
    </fieldset></form></div></div>}
  </section>;
}
