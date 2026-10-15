import React, { useEffect, useState } from 'react';
import type { PaymentSchedule, Process } from '../types';
import { money, paymentDate, paymentState, remaining, today } from '../lib/payments';
import { loadPayments, recordReceipt, savePayment } from '../services/paymentsService';

const field = 'w-full border rounded-xl p-3 bg-white text-sm';
const button = 'bg-[#2D4E4E] text-white rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50';
const displayDate = (date?: string) => date ? date.split('-').reverse().join('/') : 'Por definir';
export default function CloudPayments({ organizationId, process, canManage, onBusy, direction = 'INCOME', costTotal = 0, onPaymentsChange }: {
  organizationId: string; process: Process; canManage: boolean; onBusy: (busy: boolean) => void; direction?: PaymentSchedule['direction']; costTotal?: number; onPaymentsChange?: (payments: PaymentSchedule[] | null) => void;
}) {
  const outgoing = direction === 'EXPENSE';
  const movement = outgoing ? 'pagamento' : 'recebimento';
  const done = outgoing ? 'Pago' : 'Recebido';
  const outstandingLabel = outgoing ? 'Falta pagar' : 'Falta receber';
  const [payments, setPayments] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState<PaymentSchedule | null>(null);
  const [receipt, setReceipt] = useState<{ payment: PaymentSchedule; id: string } | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true); setLoadFailed(false); setError('');
    loadPayments(organizationId, process.id, direction).then(data => { if (alive) { setPayments(data); onPaymentsChange?.(data); } })
      .catch(e => { if (alive) { onPaymentsChange?.(null); setError(e.message); setLoadFailed(true); } }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [organizationId, process.id, direction, revision]);
  const persist = async (action: () => Promise<void>) => {
    setBusy(true); onBusy(true); setError(''); setNotice('');
    try {
      await action();
      setDraft(null); setReceipt(null);
      setNotice('Registo guardado.');
      try { const updated = await loadPayments(organizationId, process.id, direction); setPayments(updated); onPaymentsChange?.(updated); }
      catch { onPaymentsChange?.(null); setError('O registo foi guardado, mas não foi possível atualizar os valores. Atualiza os movimentos para consultar os valores.'); setLoadFailed(true); }
    } catch (e) { setError(String((e as Error).message)); }
    finally { setBusy(false); onBusy(false); }
  };
  const submitPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!draft || !canManage) return;
    const data = new FormData(e.currentTarget);
    const payment = { ...draft, description: String(data.get('description')).trim(), amount: Number(data.get('amount')),
      dueDate: String(data.get('dueDate') || ''), phaseId: String(data.get('phaseId') || ''), offsetDays: Number(data.get('offsetDays') || 0) };
    if (outgoing) {
      const cost = String(data.get('cost') || '');
      payment.subcontractId = cost.startsWith('subcontract:') ? cost.slice(12) : undefined;
      payment.expenseId = cost.startsWith('expense:') ? cost.slice(8) : undefined;
      if ((payment.subcontractId && !process.subcontracts.some(c => c.id === payment.subcontractId)) || (payment.expenseId && !process.expenses.some(c => c.id === payment.expenseId))) { setError('Seleciona um custo deste projeto.'); return; }
    }
    const paid = draft.settlements.reduce((sum, s) => sum + s.amount, 0);
    if (!payment.description || !Number.isFinite(payment.amount) || payment.amount <= 0 || Math.round(payment.amount * 100) < Math.round(paid * 100)) { setError('Indica uma descrição e um valor positivo, igual ou superior ao montante já liquidado.'); return; }
    if (payment.rule === 'DATE' ? !payment.dueDate : !process.phases.some(p => p.id === payment.phaseId) || !Number.isInteger(payment.offsetDays) || payment.offsetDays < 0) { setError('Define uma data ou uma fase e um número de dias válido.'); return; }
    void persist(() => savePayment(organizationId, process.id, payment, payments.some(p => p.id === payment.id)));
  };
  const submitReceipt = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!receipt || !canManage) return;
    const data = new FormData(e.currentTarget); const amount = Number(data.get('amount')); const date = String(data.get('date'));
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) > Math.round(remaining(receipt.payment) * 100) || !date || date > today()) { setError('Indica um valor até ao saldo da prestação e uma data que não esteja no futuro.'); return; }
    void persist(() => recordReceipt(organizationId, receipt.payment.id, { id: receipt.id, amount, date }));
  };
  const honorarios = outgoing ? costTotal : process.pricingMode === 'PHASES' ? process.phases.reduce((s, p) => s + p.value, 0) : process.budget;
  const planned = payments.reduce((s, p) => s + p.amount, 0);
  const received = payments.reduce((s, p) => s + p.settlements.reduce((sum, r) => sum + r.amount, 0), 0);
  const outstanding = payments.reduce((s, p) => s + remaining(p), 0);
  const overdue = payments.filter(p => paymentState(p, process) === 'Em atraso').reduce((s, p) => s + remaining(p), 0);
  const difference = Math.round((honorarios - planned) * 100) / 100;
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold">{outgoing ? 'Plano de saídas' : 'Honorários e recebimentos'}</h3><div className="flex gap-3"><button disabled={busy} className="text-sm underline" onClick={() => { setNotice(''); setRevision(r => r + 1); }}>Atualizar {movement}s</button>{canManage && <button disabled={busy || loading || loadFailed} className={button} onClick={() => { setError(''); setNotice(''); setDraft({ id: crypto.randomUUID(), description: '', direction, amount: 0, rule: 'DATE', dueDate: today(), offsetDays: 0, settlements: [] }); }}>Nova prestação</button>}</div></div>
    {error && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl">{error}</p>}
    {notice && <p role="status" className="text-emerald-800">{notice}</p>}
    {loading ? <p role="status">A carregar movimentos…</p> : loadFailed ? <p>Atualiza os movimentos para consultar os valores.</p> : <>
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">{[[outgoing ? 'Custos registados' : 'Honorários',honorarios],['Plano de pagamentos',planned],[done,received],[outgoing ? 'Por pagar no plano' : 'Por receber no plano',outstanding],['Em atraso',overdue]].map(([label,value]) => <div key={label} className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold mt-1">{money(Number(value))}</p></div>)}</div>
      {difference !== 0 && <p className="bg-amber-50 text-amber-900 rounded-xl p-3 text-sm">{difference > 0 ? `Faltam distribuir ${money(difference)} de ${outgoing ? 'custos' : 'honorários'} por prestações.` : `O plano ultrapassa os ${outgoing ? 'custos registados' : 'honorários'} em ${money(-difference)}. Confirma os valores.`}</p>}
      <p className="text-sm text-slate-500">As prestações por fase usam o fim previsto como estimativa. O fecho manual da fase fixa o vencimento; {outgoing ? 'regista o pagamento quando o dinheiro sair.' : 'regista o recebimento quando o dinheiro entrar.'}</p>
      {!payments.length && <p className="bg-white border rounded-2xl p-6 text-slate-500">Ainda não existe um plano de pagamentos para este projeto.</p>}
      {[...payments].sort((a,b) => (paymentDate(a,process) || '9999').localeCompare(paymentDate(b,process) || '9999')).map(payment => {
        const state = paymentState(payment, process); const phase = process.phases.find(p => p.id === payment.phaseId);
        return <article key={payment.id} className="bg-white border rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap justify-between gap-2"><h4 className="font-bold">{payment.description}</h4><span className={state === 'Em atraso' ? 'text-red-700 font-bold' : state === 'Liquidado' ? 'text-emerald-700 font-bold' : 'text-slate-600'}>{state === 'Liquidado' ? done : state}</span></div>
          {outgoing && <p className="text-sm text-slate-600">Custo associado: {payment.subcontractId ? process.subcontracts.find(c => c.id === payment.subcontractId)?.companyName || 'Subcontrato indisponível' : payment.expenseId ? process.expenses.find(c => c.id === payment.expenseId)?.description || 'Despesa indisponível' : 'Por associar'}</p>}
          <p className="text-sm text-slate-500">{payment.rule === 'PHASE' ? `${phase?.name || 'Fase indisponível'} · ${payment.offsetDays} dias após fecho · ${phase?.completedAt ? 'Vencimento' : 'Previsão'}` : 'Vencimento'}: {displayDate(paymentDate(payment,process))}</p>
          <p className="text-sm">Valor: <strong>{money(payment.amount)}</strong> · {done}: <strong>{money(payment.amount - remaining(payment))}</strong> · {outstandingLabel}: <strong>{money(remaining(payment))}</strong></p>
          {canManage && <div className="flex gap-4"><button disabled={busy} className="underline text-sm" onClick={() => { setError(''); setNotice(''); setDraft(payment); }}>Editar prestação</button>{remaining(payment) > 0 && <button disabled={busy} className={button} onClick={() => { setError(''); setNotice(''); setReceipt({ payment, id: crypto.randomUUID() }); }}>Registar {movement}</button>}</div>}
          {!!payment.settlements.length && <details><summary className="text-sm cursor-pointer">Histórico de {movement}s ({payment.settlements.length})</summary><ul className="text-sm mt-2 space-y-1">{[...payment.settlements].sort((a,b) => a.date.localeCompare(b.date)).map(s => <li key={s.id}>{displayDate(s.date)} · {money(s.amount)}</li>)}</ul></details>}
        </article>;
      })}
    </>}
    {(draft || receipt) && <div className="fixed inset-0 z-50 bg-slate-900/40 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="payment-form-title"><div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <h3 id="payment-form-title" className="text-xl font-bold mb-4">{receipt ? 'Registar ' + movement : payments.some(p => p.id === draft?.id) ? 'Editar prestação' : 'Nova prestação'}</h3>
      <form onSubmit={receipt ? submitReceipt : submitPayment}><fieldset disabled={busy} className="space-y-4">
        {draft && <><label className="block text-sm">Descrição<input name="description" required defaultValue={draft.description} className={field}/></label><label className="block text-sm">Valor da prestação (€)<input name="amount" type="number" min="0.01" step="0.01" required defaultValue={draft.amount || ''} className={field}/></label>
          {outgoing && <label className="block text-sm">Custo associado<select name="cost" defaultValue={draft.subcontractId ? `subcontract:${draft.subcontractId}` : draft.expenseId ? `expense:${draft.expenseId}` : ''} className={field}><option value="">Por associar</option><optgroup label="Subcontratos">{process.subcontracts.map(c => <option key={c.id} value={`subcontract:${c.id}`}>{c.companyName} · {c.service || 'Subcontrato'} · {money(c.value)}</option>)}</optgroup><optgroup label="Outras despesas">{process.expenses.map(c => <option key={c.id} value={`expense:${c.id}`}>{c.description} · {money(c.value)}</option>)}</optgroup></select></label>}
          <label className="block text-sm">Vencimento<select className={field} value={draft.rule} onChange={e => setDraft({ ...draft, rule: e.target.value as PaymentSchedule['rule'] })}><option value="DATE">Data fixa</option><option value="PHASE" disabled={!process.phases.length}>Associado ao fecho de uma fase</option></select></label>
          {draft.rule === 'DATE' ? <label className="block text-sm">Data de vencimento<input name="dueDate" type="date" required defaultValue={draft.dueDate || today()} className={field}/></label> : <><label className="block text-sm">Fase<select name="phaseId" required defaultValue={draft.phaseId || ''} className={field}><option value="" disabled>Selecionar fase</option>{process.phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="block text-sm">Dias após o fecho<input name="offsetDays" type="number" min="0" step="1" required defaultValue={draft.offsetDays} className={field}/></label></>}
        </>}
        {receipt && <><p>{receipt.payment.description} · {outstandingLabel} {money(remaining(receipt.payment))}</p><label className="block text-sm">Valor {outgoing ? 'pago' : 'recebido'} (€)<input name="amount" type="number" min="0.01" max={remaining(receipt.payment)} step="0.01" required defaultValue={remaining(receipt.payment)} className={field}/></label><label className="block text-sm">Data do {movement}<input name="date" type="date" required max={today()} defaultValue={today()} className={field}/></label><p className="text-xs text-slate-500">Confirma o valor e a data. Os movimentos guardados não podem ser editados nesta versão.</p></>}
        {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
        <div className="flex justify-end gap-4"><button type="button" onClick={() => { setDraft(null); setReceipt(null); setError(''); }}>Cancelar</button><button className={button}>{busy ? 'A guardar…' : receipt ? 'Confirmar ' + movement : 'Guardar prestação'}</button></div>
      </fieldset></form>
    </div></div>}
  </section>;
}
