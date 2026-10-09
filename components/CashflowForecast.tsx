import React, { useState } from 'react';
import { Process } from '../types';
import { money, paymentDate, paymentState, remaining, today } from '../lib/payments';

export default function CashflowForecast({ processes }: { processes: Process[] }) {
  const [opening, setOpening] = useState('0');
  const rows = processes.flatMap(process => (process.payments || []).map(payment => ({
    process, payment, date: paymentDate(payment, process), balance: remaining(payment), state: paymentState(payment, process),
  }))).filter(row => row.balance > 0);
  const now = today();
  const undated = rows.filter(row => !row.date);
  const late = rows.filter(row => row.state === 'Em atraso');
  let running = Number(opening) || 0;
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${now}T12:00:00`); d.setDate(1); d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const matching = rows.filter(row => row.date?.startsWith(key) && row.date >= now);
    const income = matching.filter(row => row.payment.direction === 'INCOME').reduce((sum, row) => sum + row.balance, 0);
    const expense = matching.filter(row => row.payment.direction === 'EXPENSE').reduce((sum, row) => sum + row.balance, 0);
    running += income - expense;
    return { key, label: d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }), income, expense, balance: running };
  });
  const past = rows.filter(row => row.date && row.date < now);
  return <section className="rounded-3xl bg-[#f4f7f6] border border-[#d9e4df] p-6 space-y-5">
    <div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-xl font-bold text-[#2D4E4E]">Previsão de tesouraria dos projetos</h2><p className="text-sm text-slate-600 mt-1">Próximos seis meses · parcelas ainda por liquidar, com base nas datas e fases.</p></div><label className="text-xs font-bold text-slate-600">Saldo disponível hoje (€)<input aria-label="Saldo disponível hoje" type="number" step="0.01" value={opening} onChange={e => setOpening(e.target.value)} className="block border rounded-xl p-2 mt-1 bg-white w-40"/></label></div>
    <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="text-slate-500"><th className="p-3">Mês</th><th className="p-3">Entradas previstas</th><th className="p-3">Saídas previstas</th><th className="p-3">Saldo projetado</th></tr></thead><tbody>{months.map(month => <tr key={month.key} className="border-t border-slate-200"><td className="p-3 capitalize font-medium">{month.label}</td><td className="p-3 text-emerald-700">{money(month.income)}</td><td className="p-3 text-orange-700">{money(month.expense)}</td><td className={`p-3 font-bold ${month.balance < 0 ? 'text-red-700' : 'text-slate-800'}`}>{money(month.balance)}</td></tr>)}</tbody></table></div>
    <p className="text-xs text-slate-500">O saldo inicial é uma simulação. Esta previsão inclui apenas os planos de pagamento dos processos; os movimentos antigos e despesas gerais abaixo não são somados. Datas anteriores a hoje ficam fora da projeção até serem revistas.</p>
    {!rows.length && <p className="bg-white rounded-xl p-4 text-sm text-slate-600">Cria parcelas dentro de um processo, na área Fases e pagamentos, para preencher a previsão.</p>}
    {(undated.length > 0 || past.length > 0) && <p className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">{undated.length} parcelas sem data · {past.length} com previsão anterior a hoje · {late.length} em atraso confirmado.</p>}
    {rows.length > 0 && <div className="space-y-2"><h3 className="text-sm font-bold">Compromissos por liquidar</h3>{[...rows].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).map(row => <div key={`${row.process.id}-${row.payment.id}`} className="bg-white rounded-xl p-3 flex flex-wrap justify-between gap-2 text-sm"><div><p className="font-semibold">{row.payment.description}</p><p className="text-xs text-slate-500">{row.process.code} · {row.process.title} · {row.date || 'Sem data'}</p></div><div className="text-right"><p className="font-bold">{row.payment.direction === 'INCOME' ? '+' : '−'} {money(row.balance)}</p><p className="text-xs text-slate-500">{row.state}</p></div></div>)}</div>}
  </section>;
}
