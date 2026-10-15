import React, { useEffect, useState } from 'react';
import type { Process, TimeEntry } from '../types';
import { loadTime, saveTime, setHourlyCost, type TimePerson } from '../services/timeService';
import { durationLabel, timeTotals } from '../lib/timeEntries';
import { money, today } from '../lib/payments';
import PhaseTimeComparison from './PhaseTimeComparison';
const field = 'w-full border rounded-xl p-3 bg-white text-sm';
const button = 'bg-[#2D4E4E] text-white rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50';

export default function ProjectTime({organizationId,process,canManage,onBusy,onManageTeam}: {organizationId:string;process:Process;canManage:boolean;onBusy:(busy:boolean)=>void;onManageTeam:()=>void}) {
  const [data,setData] = useState<{people:TimePerson[];entries:TimeEntry[]} | null>(null);
  const [draft,setDraft] = useState<TimeEntry | null>(null);
  const [error,setError] = useState(''); const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false); const [revision,setRevision] = useState(0);
  useEffect(() => { let alive=true; setData(null);setError('');
    loadTime(organizationId,process.id).then(d=>{if(alive)setData(d);}).catch(e=>{if(alive)setError(e.message);});
    return ()=>{alive=false;};
  },[organizationId,process.id,revision]);
  const persist = async(action:()=>Promise<void>) => {
    setBusy(true);onBusy(true);setError('');setNotice('');
    try { await action();setDraft(null);setNotice('Registo guardado.');
      try {setData(await loadTime(organizationId,process.id));}
      catch {setData(null);setError('Guardado, mas não foi possível atualizar. Usa Atualizar horas.');}
    } catch(e){setError((e as Error).message);} finally{setBusy(false);onBusy(false);}
  };
  const submit = (event:React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();if(!draft)return;
    const form=new FormData(event.currentTarget);
    const hours=Number(form.get('hours')), minutes=Number(form.get('minutes'));
    const entry={...draft,memberId:String(form.get('person')),phaseId:String(form.get('phase')||'')||undefined,date:String(form.get('date')),description:String(form.get('description')||'').trim(),minutes:hours*60+minutes};
    if(!Number.isInteger(hours)||!Number.isInteger(minutes)||minutes<0||minutes>59||hours<0||entry.minutes<1||entry.minutes>1440||!entry.description||!entry.date||entry.date>today()){setError('Preenche a descrição, uma data até hoje e uma duração entre 1 minuto e 24 horas.');return;}
    void persist(()=>saveTime(organizationId,entry));
  };
  const needsPerson = !!data && !data.people.some(p=>p.status==='Ativo');
  const totals=data ? timeTotals(data.entries) : null;
  return <section className="space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><h3 className="text-xl font-bold">Horas do projeto</h3><div className="flex gap-3"><button disabled={busy} className="underline text-sm" onClick={()=>setRevision(r=>r+1)}>Atualizar horas</button>{canManage && needsPerson ? <button disabled={busy} className={button} onClick={onManageTeam}>Adicionar pessoa à equipa</button> : <button disabled={busy||!data?.people.some(p=>p.status==='Ativo')} className={button} onClick={()=>{setError('');setDraft({id:crypto.randomUUID(),processId:process.id,memberId:data!.people.find(p=>p.status==='Ativo')!.id,date:today(),minutes:60,description:''});}}>Registar horas</button>}</div></div>
    {error && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!data ? <p>{error ? 'Atualiza depois de resolver o problema indicado.' : 'A carregar horas…'}</p> : <>
      <p className="text-sm text-slate-500">{canManage ? 'Consulta as horas de toda a equipa neste projeto.' : 'Consulta e regista as tuas horas neste projeto.'}</p>
      {canManage && <PhaseTimeComparison phases={process.phases} entries={data.entries}/>}
      {!data.people.some(p=>p.status==='Ativo') && <p className="bg-amber-50 p-3 rounded-xl">{canManage ? 'Para registar horas, adiciona primeiro quem realizou o trabalho na área Equipa. Se trabalhas sozinho, adiciona o teu nome; a conta de proprietário não cria esse cadastro automaticamente.' : 'A tua conta precisa de estar associada a uma pessoa ativa da equipa. Contacta o proprietário.'}</p>}
      <div className="bg-white border rounded-2xl p-4"><strong>{durationLabel(totals!.minutes)}</strong>{canManage && <> · Custo interno registado: <strong>{money(totals!.cost)}</strong>{totals!.unpricedMinutes>0 && <p className="text-amber-800">{durationLabel(totals!.unpricedMinutes)} sem custo por hora definido. O custo total está incompleto.</p>}</>}</div>
      {canManage && <details className="bg-white border rounded-2xl p-4"><summary className="font-bold cursor-pointer">Custos por hora da equipa</summary><p className="text-sm text-slate-500 my-3">Valores internos, visíveis apenas à gestão. Aplicam-se aos novos registos de todos os projetos. Alterações não recalculam horas anteriores. Para valorizar horas sem tarifa, define o custo e volta a guardar esses registos.</p>{data.people.map(p=><form key={`${p.id}:${p.hourlyCost}`} onSubmit={e=>{e.preventDefault();const rate=Number(new FormData(e.currentTarget).get('rate'));if(Number.isFinite(rate)&&rate>=0)void persist(()=>setHourlyCost(organizationId,p.id,rate));}} className="flex items-end gap-3 py-2"><label className="text-sm flex-1">{p.name} · €/hora<input name="rate" aria-label={`Custo por hora de ${p.name}`} type="number" required min="0" max="9999999999.99" step="0.01" defaultValue={p.hourlyCost ?? ''} placeholder="Por definir" disabled={busy} className={field}/></label><button disabled={busy} className={button}>Guardar custo</button></form>)}</details>}
      <div className="grid md:grid-cols-2 gap-3">{[{name:'Por pessoa',items:data.people.map(p=>({id:p.id,name:p.name,entries:data.entries.filter(e=>e.memberId===p.id)}))},{name:'Por fase',items:[...process.phases.map(p=>({id:p.id,name:p.name,entries:data.entries.filter(e=>e.phaseId===p.id)})),{id:'none',name:'Sem fase',entries:data.entries.filter(e=>!e.phaseId)}]}].map(group=><div key={group.name} className="bg-white border rounded-2xl p-4"><h4 className="font-bold">{group.name}</h4>{group.items.filter(i=>i.entries.length).map(i=><p key={i.id} className="text-sm mt-2">{i.name}: {durationLabel(timeTotals(i.entries).minutes)}</p>)}</div>)}</div>
      {!data.entries.length && <p>Ainda não existem horas registadas.</p>}
      {data.entries.map(e=><article key={e.id} className="bg-white border rounded-2xl p-4 space-y-2"><p className="font-bold">{data.people.find(p=>p.id===e.memberId)?.name || 'Pessoa indisponível'} · {durationLabel(e.minutes)}</p><p className="text-sm text-slate-500">{e.date.split('-').reverse().join('/')} · {process.phases.find(p=>p.id===e.phaseId)?.name || 'Sem fase'}</p><p className="text-sm whitespace-pre-wrap">{e.description}</p>{canManage && <p className="text-sm">{e.hourlyCost == null ? 'Custo por hora por definir' : `${money(e.hourlyCost)}/hora · ${money(timeTotals([e]).cost)}`}</p>}<button disabled={busy} className="underline text-sm" onClick={()=>{setError('');setDraft(e);}}>Editar horas</button></article>)}
    </>}
    {draft && <div role="dialog" aria-modal="true" aria-labelledby="time-title" className="fixed inset-0 z-50 bg-slate-900/40 p-4 flex items-center justify-center"><form onSubmit={submit} className="bg-white p-6 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><h3 id="time-title" className="font-bold text-xl mb-4">Registo de horas</h3><fieldset disabled={busy} className="space-y-4">
      <label className="block text-sm">Pessoa<select name="person" defaultValue={draft.memberId} required className={field}>{data?.people.filter(p=>p.status==='Ativo'||p.id===draft.memberId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="block text-sm">Fase<select name="phase" defaultValue={draft.phaseId||''} className={field}><option value="">Sem fase</option>{process.phases.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="block text-sm">Data<input name="date" type="date" required max={today()} defaultValue={draft.date} className={field}/></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Horas<input name="hours" type="number" min="0" max="24" step="1" required defaultValue={Math.floor(draft.minutes/60)} className={field}/></label><label className="text-sm">Minutos<input name="minutes" type="number" min="0" max="59" step="1" required defaultValue={draft.minutes%60} className={field}/></label></div>
      <label className="block text-sm">Trabalho realizado<textarea name="description" required maxLength={2000} defaultValue={draft.description} className={field}/></label>
      {error && <p role="alert" className="text-red-700">{error}</p>}<div className="flex justify-end gap-4"><button type="button" onClick={()=>setDraft(null)}>Cancelar</button><button className={button}>{busy ? 'A guardar…':'Guardar horas'}</button></div>
    </fieldset></form></div>}
  </section>;
}
