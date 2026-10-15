import React, { useEffect, useState } from 'react';
import type { Process } from '../types';
import { loadFinance } from '../services/financeService';
import { projectFinance } from '../lib/finance';
import { money } from '../lib/payments';
import CashflowForecast from './CashflowForecast';
import OfficeExpenses from './OfficeExpenses';
import {loadOfficeExpenses} from '../services/officeExpensesService';
import type {OfficeExpense} from '../lib/officeExpenses';

export default function CloudFinance({ organizationId,onBusy }: { organizationId: string;onBusy?:(busy:boolean)=>void }) {
  const [processes, setProcesses] = useState<Process[] | null>(null);
  const [office,setOffice]=useState<OfficeExpense[] | null>(null);
  const [officeError,setOfficeError]=useState('');
  const [busy,setBusy]=useState(false);
  const [error, setError] = useState('');
  useEffect(()=>{onBusy?.(busy);return ()=>onBusy?.(false);},[busy,onBusy]);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true; setProcesses(null); setError('');setOffice(null);setOfficeError('');
    loadOfficeExpenses(organizationId).then(rows=>{if(alive)setOffice(rows);}).catch(e=>{if(alive)setOfficeError(e.message);});
    loadFinance(organizationId).then(rows => { if (alive) setProcesses(rows); }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [organizationId, revision]);
  return <section className="space-y-5"><div className="flex justify-between gap-3"><h2 className="text-2xl font-bold">Financeiro do gabinete</h2><button disabled={busy} className="underline text-sm" onClick={() => setRevision(r => r+1)}>Atualizar financeiro</button></div>
    {error && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
    {!processes ? <p>{error ? 'Atualiza para voltar a tentar.' : 'A carregar financeiro…'}</p> : <>
      <CashflowForecast processes={processes} officeExpenses={office ?? undefined}/>
      {officeError && <p role="alert" className="bg-amber-50 text-amber-900 p-3 rounded-xl">{officeError} A previsão acima inclui apenas projetos.</p>}
      {office ? <OfficeExpenses organizationId={organizationId} expenses={office} onBusy={setBusy} onChange={rows=>{setOffice(rows);if(!rows)setOfficeError('Guardado, mas não foi possível atualizar as despesas. Usa Atualizar financeiro.');}}/> : !officeError && <p>A carregar despesas gerais… A previsão ainda inclui apenas projetos.</p>}
      <section className="bg-white border rounded-2xl p-5 space-y-3"><h3 className="text-lg font-bold">Situação por projeto</h3><p className="text-sm text-slate-500">Saldo após custos externos = honorários − subcontratos − outras despesas registadas. Os pagamentos são a liquidação desses custos e não são subtraídos novamente. A margem após horas desconta o custo interno registado, sem estimar trabalho futuro. Despesas gerais e impostos não estão incluídos.</p>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{['Projeto','Honorários','Custos externos','Saldo após custos externos','Custo interno','Margem após horas','Recebido','Pago'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{processes.map(p => { const f = projectFinance(p); return <tr key={p.id} className="border-t"><td className="p-3">{p.title}<p className="text-xs text-slate-500">{p.code}</p>{f.unpricedMinutes > 0 && <p className="text-xs text-amber-800">Horas sem tarifa: margem incompleta</p>}{f.unplannedCosts !== 0 && <p className="text-xs text-amber-800">{f.unplannedCosts > 0 ? `Falta planear saídas: ${money(f.unplannedCosts)}` : `Saídas acima dos custos: ${money(-f.unplannedCosts)}`}</p>}</td>{[f.honorarios,f.costs,f.balance,f.internalCost,f.marginAfterWork,f.received,f.paid].map((value,index) => <td key={index} className={`p-3 whitespace-nowrap ${value < 0 ? 'text-red-700' : ''}`}>{money(value)}</td>)}</tr>; })}</tbody></table></div>
        {!processes.length && <p className="text-sm text-slate-500">Cria um projeto para começar.</p>}
      </section>
    </>}
  </section>;
}
