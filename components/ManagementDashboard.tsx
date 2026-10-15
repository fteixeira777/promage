import React,{useEffect,useState} from 'react';
import type {Process} from '../types';
import type {OfficeExpense} from '../lib/officeExpenses';
import type {AlertArea,StudioAlert} from '../lib/alerts';
import {loadFinance} from '../services/financeService';
import {loadOfficeExpenses} from '../services/officeExpensesService';
import {loadStudioAlerts} from '../services/alertsService';
import {dashboardSummary} from '../lib/dashboard';
import {money,today} from '../lib/payments';
import {durationLabel} from '../lib/timeEntries';
type Snapshot={processes:Process[]|null;office:OfficeExpense[]|null;alerts:StudioAlert[]|null;warnings:string[];date:string;time:string};
export default function ManagementDashboard({organizationId,role,onProject,onFinance,onAlerts,onDaily}:{organizationId:string;role:string;onProject:(id:string,area:AlertArea|'Horas')=>void;onFinance:()=>void;onAlerts:()=>void;onDaily:()=>void}){
 const [data,setData]=useState<Snapshot|null>(null),[revision,setRevision]=useState(0),[opening,setOpening]=useState('0');
 useEffect(()=>{let alive=true;setData(null);
  Promise.allSettled([loadFinance(organizationId),loadOfficeExpenses(organizationId),loadStudioAlerts(organizationId,role)]).then(([finance,office,alerts])=>{
   if(!alive)return;const warnings:string[]=[];
   if(finance.status==='rejected')warnings.push('Financeiro dos projetos indisponível. Não foi possível calcular as margens nem os atrasos dos projetos.');
   if(office.status==='rejected')warnings.push('Despesas gerais indisponíveis. Os totais de pagamentos e a previsão estão incompletos.');
   if(alerts.status==='rejected')warnings.push('Não foi possível consultar os prazos e documentos.');else warnings.push(...alerts.value.warnings);
   setData({processes:finance.status==='fulfilled'?finance.value:null,office:office.status==='fulfilled'?office.value:null,alerts:alerts.status==='fulfilled'?alerts.value.alerts:null,warnings,date:today(),time:new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})});
  });return()=>{alive=false;};
 },[organizationId,role,revision]);
 const validOpening=opening.trim()!==''&&Number.isFinite(Number(opening));
 const summary=data?dashboardSummary(data.processes||[],data.office||[],data.date,validOpening?Number(opening):0):null;
 const complete=!!data?.processes&&!!data?.office;
 const attention=data?.alerts?.filter(a=>a.category!=='Financeiro')||[];
 return <section className="space-y-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-bold">Visão geral do gabinete</h2><p className="text-sm text-slate-500">{data?`Atualizado em ${data.date.split('-').reverse().join('/')} às ${data.time}`:'A reunir os dados do gabinete…'}</p></div><button disabled={!data} className="underline text-sm" onClick={()=>setRevision(r=>r+1)}>Atualizar painel</button></div>
 {!data||!summary?<p role="status">A carregar o painel…</p>:<>
 {data.warnings.map((w,i)=><p key={i} role="alert" className="bg-amber-50 text-amber-900 p-3 rounded-xl">{w}</p>)}
 <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{[
 ['Recebimentos em atraso',data.processes?money(summary.overdueIncome):'Indisponível'],
 ['Pagamentos em atraso',complete?money(summary.overdueExpense):'Incompleto'],
 ['Projetos a rever',data.processes?String(summary.risks.length):'Indisponível'],
 ['Prazos e documentos pendentes',data.alerts?String(attention.length):'Indisponível'],
 ].map(([label,value])=><div key={label} className="bg-white border rounded-2xl p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-bold mt-2">{value}</p></div>)}</div>
 <section className="bg-white border rounded-2xl p-5 space-y-3"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold text-lg">Tesouraria dos próximos seis meses</h3><button className="underline text-sm" onClick={onFinance}>Abrir financeiro</button></div><label className="block text-sm">Saldo disponível hoje (€)<input type="number" step="0.01" value={opening} onChange={e=>setOpening(e.target.value)} className="block border rounded-xl p-2 mt-1 w-48"/></label>
 {!complete?<p className="text-amber-800">A previsão requer os dados dos projetos e das despesas gerais. Atualiza o painel para voltar a tentar.</p>:!validOpening?<p className="text-amber-800">Indica um saldo inicial válido.</p>:<><p className="text-sm">{summary.months.some(m=>m.balance<0)?`Saldo projetado negativo em ${summary.months.filter(m=>m.balance<0).length} mês(es).`:'Sem saldo negativo na projeção com este saldo inicial.'}</p><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{['Mês','Entradas','Saídas','Saldo previsto'].map(t=><th key={t} className="p-2">{t}</th>)}</tr></thead><tbody>{summary.months.map(m=><tr key={m.key} className="border-t"><td className="p-2 capitalize">{m.label}</td><td className="p-2">{money(m.income)}</td><td className="p-2">{money(m.expense)}</td><td className={`p-2 font-bold ${m.balance<0?'text-red-700':''}`}>{money(m.balance)}</td></tr>)}</tbody></table></div></>}
 <p className="text-xs text-slate-500">Simulação com o saldo indicado (inicia a zero e não fica guardado). Inclui prestações e despesas gerais pendentes a partir de hoje. Valores vencidos ficam fora da projeção até rever as datas; datas de fases abertas são estimativas. Os custos das horas não geram saídas de caixa.</p></section>
 <section className="bg-white border rounded-2xl p-5 space-y-3"><h3 className="font-bold text-lg">Projetos que precisam de atenção</h3>{data.processes&&!summary.risks.length&&<p className="text-sm">Sem margens negativas, fases acima das horas previstas ou horas sem tarifa nos registos consultados.</p>}{summary.risks.map(r=><article key={r.process.id} className="border-t pt-3 space-y-2"><p className="font-bold">{r.process.title}</p><p className="text-sm">Margem após horas registadas: {money(r.finance.marginAfterWork)} · {r.hours.exceeded} fase(s) acima da previsão</p>{r.finance.unpricedMinutes>0&&<p className="text-sm text-amber-800">{durationLabel(r.finance.unpricedMinutes)} sem tarifa: margem incompleta.</p>}<div className="flex gap-4 text-sm"><button className="underline" onClick={()=>onProject(r.process.id,'Custos')}>Ver custos</button><button className="underline" onClick={()=>onProject(r.process.id,'Horas')}>Ver horas</button></div></article>)}<p className="text-xs text-slate-500">As margens descontam custos externos e horas registadas; não incluem trabalho futuro nem despesas gerais.</p></section>
 <section className="bg-white border rounded-2xl p-5 space-y-3"><h3 className="font-bold text-lg">Valores em atraso</h3>{complete&&!summary.movements.length&&!summary.overdueOffice.length&&<p className="text-sm">Sem valores em atraso.</p>}{summary.movements.map(m=><button key={`${m.process.id}:${m.payment.id}`} className="block w-full text-left border-t pt-3 text-sm" onClick={()=>onProject(m.process.id,m.payment.direction==='INCOME'?'Recebimentos':'Custos')}><strong>{m.payment.direction==='INCOME'?'Receber':'Pagar'} · {money(m.amount)}</strong> · {m.payment.description}<p className="text-slate-500">{m.process.title} →</p></button>)}{summary.overdueOffice.map(e=><button key={e.id} className="block w-full text-left border-t pt-3 text-sm" onClick={onFinance}><strong>Pagar · {money(e.amount)}</strong> · {e.description}<p className="text-slate-500">Despesa geral · {e.dueDate.split('-').reverse().join('/')} →</p></button>)}</section>
 <section className="bg-white border rounded-2xl p-5 space-y-3"><div className="flex justify-between gap-3"><h3 className="font-bold text-lg">Prazos e documentos</h3><button className="underline text-sm" onClick={onAlerts}>Ver todos os alertas</button></div>{data.alerts&&!attention.length&&<p className="text-sm">Sem prazos próximos ou documentos pendentes nos dados consultados.</p>}{attention.slice(0,8).map(a=><button key={a.id} className="block w-full text-left border-t pt-3 text-sm" onClick={()=>a.processId?onProject(a.processId,a.area):onDaily()}><strong>{a.title}</strong> · {a.urgency}<p className="text-slate-500">{a.processTitle} · {a.detail} →</p></button>)}{attention.length>8&&<p className="text-xs text-slate-500">A mostrar 8 de {attention.length}. Consulta a área Alertas para ver os restantes.</p>}</section>
 </>}
 </section>;
}
