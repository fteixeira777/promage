import React, { useEffect, useState } from 'react';
import type { PortalProject, PortalProjectRef } from '../lib/portal';
import { portalError } from '../lib/portal';
import { getPortalProject, listClientProjects } from '../services/portalService';
import PortalDocuments from './PortalDocuments';
export default function ClientPortal({onBusy}: {onBusy:(busy:boolean)=>void}) {
  const [items,setItems]=useState<PortalProjectRef[]>([]),[selected,setSelected]=useState<PortalProjectRef|null>(null),[data,setData]=useState<PortalProject|null>(null);
  const [error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{let alive=true;setLoading(true);setError('');setData(null);
    (selected?getPortalProject(selected.organization_id,selected.process_id).then(value=>{if(alive)setData(value);}):listClientProjects().then(value=>{if(alive)setItems(value);})).catch(e=>{if(alive)setError(portalError(e));}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[selected,revision]);
  const lock=(value:boolean)=>{setBusy(value);onBusy(value);};
  return <section className="max-w-4xl mx-auto space-y-5"><div className="flex justify-between gap-3"><h1 className="text-2xl font-bold">Os meus projetos</h1><button disabled={busy||loading} className="underline" onClick={()=>setRevision(r=>r+1)}>Atualizar portal</button></div>{selected&&<button disabled={busy} className="underline" onClick={()=>setSelected(null)}>Voltar aos meus projetos</button>}
    {error&&<p role="alert" className="bg-red-50 text-red-700 rounded-xl p-3">{error}</p>}{loading?<p>A carregar projetos…</p>:!error&&!selected?<><p className="text-slate-600">Consulta as fases partilhadas pelo gabinete e entrega os documentos pedidos.</p>{!items.length&&<p className="bg-white border rounded-xl p-5">Ainda não tens projetos associados. Pede ao gabinete para autorizar o email confirmado desta conta.</p>}{items.map(p=><button key={`${p.organization_id}/${p.process_id}`} onClick={()=>setSelected(p)} className="block w-full text-left bg-white border rounded-2xl p-5"><strong>{p.title}</strong><p className="text-sm text-slate-500">{p.organization_name}</p></button>)}</>:data&&<><div><h2 className="text-xl font-bold">{data.title}</h2><p className="text-slate-500">Estado do projeto: {data.status}</p></div><section className="bg-white border rounded-2xl p-5 space-y-3"><h3 className="font-bold">Fases partilhadas</h3>{!data.phases.length&&<p className="text-sm text-slate-500">O gabinete ainda não publicou fases.</p>}{data.phases.map(f=><article key={f.id} className="border-t pt-3"><p className="font-bold">{f.name}</p><p className="text-sm">{f.status}{f.end_date?` · Fim previsto: ${f.end_date.split('-').reverse().join('/')}`:''}{f.completed_at?` · Concluída em ${f.completed_at.split('-').reverse().join('/')}`:''}</p></article>)}</section><PortalDocuments requests={data.requests} manager={false} onChanged={()=>setRevision(r=>r+1)} onBusy={lock}/></>}
  </section>;
}
