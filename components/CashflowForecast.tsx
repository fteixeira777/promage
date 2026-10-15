import React, { useState } from 'react';
import { Process } from '../types';
import { money, today } from '../lib/payments';
import { cashflow } from '../lib/finance';
import {officeCashflowProcess,type OfficeExpense} from '../lib/officeExpenses';

export default function CashflowForecast({ processes,officeExpenses }: { processes: Process[];officeExpenses?:OfficeExpense[] }) {
  const [opening, setOpening] = useState('0');
  const now = today();
  const { rows, months } = cashflow(officeExpenses ? [...processes,officeCashflowProcess(officeExpenses)] : processes, now, Number(opening));
  const undated = rows.filter(row => !row.date);
  const late = rows.filter(row => row.state === 'Em atraso');
  const past = rows.filter(row => row.date && row.date < now);
  return <section className="rounded-3xl bg-[#f4f7f6] border border-[#d9e4df] p-6 space-y-5">
    <div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-xl font-bold text-[#2D4E4E]">{officeExpenses ? 'Previsão de tesouraria do gabinete' : 'Previsão de tesouraria dos projetos'}</h2><p className="text-sm text-slate-600 mt-1">Próximos seis meses · parcelas ainda por liquidar, com base nas datas e fases.</p></div><label className="text-xs font-bold text-slate-600">Saldo disponível hoje (€)<input aria-label="Saldo disponível hoje" type="number" step="0.01" value={opening} onChange={e => setOpening(e.target.value)} className="block border rounded-xl p-2 mt-1 bg-white w-40"/></label></div>
    <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="text-slate-500"><th className="p-3">Mês</th><th className="p-3">Entradas previstas</th><th className="p-3">Saídas previstas</th><th className="p-3">Saldo projetado</th></tr></thead><tbody>{months.map(month => <tr key={month.key} className="border-t border-slate-200"><td className="p-3 capitalize font-medium">{month.label}</td><td className="p-3 text-emerald-700">{money(month.income)}</td><td className="p-3 text-orange-700">{money(month.expense)}</td><td className={`p-3 font-bold ${month.balance < 0 ? 'text-red-700' : 'text-slate-800'}`}>{money(month.balance)}</td></tr>)}</tbody></table></div>
    <p className="text-xs text-slate-500">O saldo inicial é uma simulação. {officeExpenses ? 'Inclui planos dos projetos e despesas gerais pendentes. Horas da equipa não geram saídas de caixa; salários devem ser registados nas despesas gerais. Evita registar a mesma saída também num projeto.' : 'Inclui apenas os planos dos projetos; despesas gerais não incluídas.'} Os custos dos projetos não são somados novamente. Datas anteriores a hoje ficam fora da projeção até serem revistas.</p>
    {!rows.length && <p className="bg-white rounded-xl p-4 text-sm text-slate-600">Cria parcelas dentro de um processo, nas áreas de recebimentos e custos, para preencher a previsão.</p>}
    {(undated.length > 0 || past.length > 0) && <p className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">{undated.length} parcelas sem data · {past.length} com previsão anterior a hoje · {late.length} em atraso confirmado.</p>}
    {rows.length > 0 && <div className="space-y-2"><h3 className="text-sm font-bold">Compromissos por liquidar</h3>{[...rows].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).map(row => <div key={`${row.process.id}-${row.payment.id}`} className="bg-white rounded-xl p-3 flex flex-wrap justify-between gap-2 text-sm"><div><p className="font-semibold">{row.payment.description}</p><p className="text-xs text-slate-500">{row.process.code} · {row.process.title} · {row.date || 'Sem data'}</p></div><div className="text-right"><p className="font-bold">{row.payment.direction === 'INCOME' ? '+' : '−'} {money(row.balance)}</p><p className="text-xs text-slate-500">{row.state}</p></div></div>)}</div>}
  </section>;
}
