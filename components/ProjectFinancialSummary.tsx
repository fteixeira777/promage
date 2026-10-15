import React from 'react';
import type { Process } from '../types';
import { projectFinance } from '../lib/finance';
import { money, paymentDate, paymentState, remaining } from '../lib/payments';
import { durationLabel } from '../lib/timeEntries';

export default function ProjectFinancialSummary({ process }: { process: Process }) {
  const totals = projectFinance(process);
  const pending = (process.payments || []).filter(p => remaining(p) > 0)
    .sort((a,b) => (paymentDate(a,process) || '9999').localeCompare(paymentDate(b,process) || '9999'));
  const unlinked = (process.payments || []).filter(p => p.direction === 'EXPENSE' && !p.subcontractId && !p.expenseId);
  return <section className="space-y-3" aria-label="Resumo financeiro do projeto">
    <h3 className="text-xl font-bold">Resumo financeiro</h3>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{[
      ['Honorários contratados',totals.honorarios],['Recebido',totals.received],['Por receber',totals.toReceive],['Saldo de caixa do projeto',totals.cashBalance],
      ['Custos previstos',totals.costs],['Pago',totals.paid],['Por pagar',totals.toPay],['Margem prevista',totals.balance],
    ].map(([name,value]) => <div key={name} className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">{name}</p><p className="font-bold text-lg">{money(Number(value))}</p></div>)}</div>
    <div className="grid sm:grid-cols-3 gap-3">{[['Horas registadas',durationLabel(totals.workedMinutes)],['Custo interno registado',money(totals.internalCost)],['Margem após horas registadas',money(totals.marginAfterWork)]].map(([label,value])=><div key={label} className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">{label}</p><p className="font-bold text-lg">{value}</p></div>)}</div>
    {totals.unpricedMinutes>0 && <p className="bg-amber-50 text-amber-900 p-3 rounded-xl">{durationLabel(totals.unpricedMinutes)} sem tarifa definida: custo interno e margem incompletos. Consulta o separador Horas.</p>}
    <p className="text-sm text-slate-500">Margem prevista = honorários menos custos externos registados. A margem após horas desconta também o custo do trabalho registado; não estima horas futuras. Saldo de caixa = recebimentos menos pagamentos do projeto; registar horas não movimenta dinheiro. Não inclui despesas gerais nem impostos. Valores negativos por receber ou pagar indicam liquidações acima dos valores contratados ou previstos.</p>
    {!!unlinked.length && <p className="bg-amber-50 text-amber-900 rounded-xl p-3 text-sm">{unlinked.length} prestação(ões) de saída por associar a um custo, no total de {money(unlinked.reduce((sum,p) => sum+p.amount,0))}. Os seus pagamentos já contam no resumo do projeto, mas ainda não nos valores individuais de cada custo. Usa “Editar prestação” para fazer a associação.</p>}
    <details className="bg-white border rounded-2xl p-4"><summary className="font-bold cursor-pointer">Entradas e saídas pendentes ({pending.length})</summary>
      {!pending.length && <p className="text-sm mt-3">Sem prestações pendentes.</p>}
      <div className="mt-3 space-y-3">{pending.map(p => <div key={p.id} className="border-t pt-3 text-sm"><p className="font-bold">{p.direction === 'INCOME' ? 'Entrada' : 'Saída'} · {p.description} · {money(remaining(p))}</p><p className="text-slate-500">{paymentDate(p,process)?.split('-').reverse().join('/') || 'Sem data prevista'} · {paymentState(p,process)}{p.rule === 'PHASE' && !process.phases.find(f => f.id === p.phaseId)?.completedAt ? ' · Data estimada até ao fecho da fase' : ''}</p></div>)}</div>
    </details>
  </section>;
}
