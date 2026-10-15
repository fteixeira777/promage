import React, { useEffect, useState } from 'react';
import type { StudioAlert } from '../lib/alerts';
import { loadStudioAlerts } from '../services/alertsService';
import { money, today } from '../lib/payments';

export default function StudioAlerts({organizationId,role,onOpen}: {organizationId:string;role:string;onOpen:(alert:StudioAlert)=>void}) {
  const [data,setData]=useState<{alerts:StudioAlert[];warnings:string[]}|null>(null),[error,setError]=useState('');
  const [revision,setRevision]=useState(0),[category,setCategory]=useState('Todos'),[urgency,setUrgency]=useState('Todos');
  const [day,setDay]=useState(today()),[updated,setUpdated]=useState('');
  useEffect(()=>{const timer=setInterval(()=>setDay(today()),60000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{let alive=true;setData(null);setError('');loadStudioAlerts(organizationId,role).then(value=>{if(alive){setData(value);setUpdated(new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}));}}).catch(e=>{if(alive)setError(e.message||'Não foi possível carregar os alertas.');});return()=>{alive=false;};},[organizationId,role,revision,day]);
  const manager=role==='owner'||role==='manager';
  const visible=data?.alerts.filter(a=>(category==='Todos'||a.category===category)&&(urgency==='Todos'||a.urgency===urgency))||[];
  return <section className="space-y-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-bold">Alertas do gabinete</h2><p className="text-sm text-slate-500">Prazos próximos e assuntos que precisam de atenção.{data&&` Atualizado às ${updated}.`}</p></div><button disabled={!data&&!error} className="underline text-sm" onClick={()=>setRevision(r=>r+1)}>Atualizar alertas</button></div>
    {error&&<p role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</p>}
    {!data?!error&&<p role="status">A reunir alertas…</p>:<>
      {!!data.warnings.length&&<div role="alert" className="bg-amber-50 text-amber-900 rounded-xl p-4"><strong>Algumas informações não foram carregadas.</strong><ul>{data.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{['Atrasado','Hoje','Próximos 7 dias','Rever'].map(label=><button key={label} onClick={()=>setUrgency(urgency===label?'Todos':label)} aria-pressed={urgency===label} className={`text-left border rounded-2xl p-4 ${urgency===label?'bg-[#2D4E4E] text-white':'bg-white'}`}><p className="text-sm">{label==='Rever'?'Documentos por rever':label==='Atrasado'?'Em atraso':label}</p><p className="text-2xl font-bold">{data.alerts.filter(a=>a.urgency===label).length}</p></button>)}</div>
      <div className="flex flex-wrap gap-4"><label className="text-sm">Tipo<select value={category} onChange={e=>setCategory(e.target.value)} className="ml-2 border rounded-lg p-2">{['Todos','Tarefas','Fases',...(manager?['Documentos','Financeiro']:[])].map(s=><option key={s}>{s}</option>)}</select></label><label className="text-sm">Prioridade<select value={urgency} onChange={e=>setUrgency(e.target.value)} className="ml-2 border rounded-lg p-2">{['Todos','Atrasado','Hoje','Próximos 7 dias',...(manager?['Rever','Pendente']:[])].map(s=><option key={s}>{s}</option>)}</select></label></div>
      {!visible.length&&<p className="bg-white border rounded-2xl p-5 text-slate-600">{data.warnings.length?'Sem alertas nos dados disponíveis para estes filtros.':'Sem alertas para estes filtros.'}</p>}
      {visible.map(a=><article key={a.id} className="bg-white border rounded-2xl p-5 flex flex-wrap justify-between items-center gap-4"><div><p className={`text-xs font-bold ${a.urgency==='Atrasado'?'text-red-700':'text-slate-500'}`}>{a.category} · {a.urgency}</p><h3 className="font-bold mt-1">{a.title}</h3><p className="text-sm text-slate-500">{a.processTitle}</p><p className="text-sm mt-1">{a.detail}{a.date?` · Prazo: ${a.date.split('-').reverse().join('/')}`:''}{a.amount!==undefined?` · Em falta: ${money(a.amount)}`:''}</p></div><button className="bg-[#2D4E4E] text-white px-4 py-2 rounded-xl text-sm" onClick={()=>onOpen(a)}>{a.processId?'Abrir projeto':'Abrir tarefas'}</button></article>)}
      <p className="text-xs text-slate-500">Os avisos são calculados a partir dos registos atuais. Recarregam ao abrir esta área ou ao atualizar. Prestações dependentes de fases abertas não são consideradas em atraso. Não são enviados emails.</p>
    </>}
  </section>;
}
