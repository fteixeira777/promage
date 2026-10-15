import React, { useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';

const labels: Record<string,string> = {owner:'Proprietário',manager:'Gestor',member:'Colaborador'};
const button = 'bg-[#2D4E4E] text-white rounded-xl px-4 py-2 disabled:opacity-50';
async function rpc(name: string, args = {}) {
  const {data,error} = await requireSupabase().rpc(name,args);
  if(error) throw error;
  return data;
}
function message(e: any) {
  return e.code === 'PGRST202' || e.code === '42883' ? 'Os acessos da equipa ainda precisam de ser ativados no Supabase. Aplica a migração 202610120002_team_access.sql e atualiza esta área.' : e.message || 'Não foi possível concluir a operação.';
}
export default function WorkspaceAccess({organizationId,onBusy}: {organizationId:string;onBusy:(busy:boolean)=>void}) {
  const [data,setData] = useState<any>(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [revision,setRevision] = useState(0);
  useEffect(() => { let alive=true; setData(null); setError('');
    rpc('workspace_access',{workspace:organizationId}).then(value=>{if(alive)setData(value);}).catch(e=>{if(alive)setError(message(e));});
    return ()=>{alive=false;};
  },[organizationId,revision]);
  const run = async (name:string,args:object) => {setBusy(true);onBusy(true);setError('');
    try {await rpc(name,args);setRevision(r=>r+1);} catch(e){setError(message(e));} finally{setBusy(false);onBusy(false);}
  };
  return <section className="bg-white border rounded-3xl p-6 space-y-4"><div className="flex justify-between"><h2 className="text-xl font-bold">Acessos ao gabinete</h2><button disabled={busy} className="underline" onClick={()=>setRevision(r=>r+1)}>Atualizar acessos</button></div>
    <p className="text-sm text-slate-600">O proprietário gere os acessos. O gestor gere projetos e finanças. O colaborador consulta o planeamento e atualiza tarefas, sem consultar valores financeiros.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!data ? <p>{error ? 'Ativação pendente.' : 'A carregar acessos…'}</p> : <fieldset disabled={busy} className="space-y-4">
      {data.members.map((m:any)=><article key={m.user_id} className="border-t pt-3 flex flex-wrap items-center gap-3"><span className="flex-1">{m.email}</span>{m.role==='owner'?<strong>Proprietário</strong>:<><select aria-label={`Acesso de ${m.email}`} value={m.role} onChange={e=>{const role=e.target.value;if(window.confirm(`Alterar o acesso de ${m.email} para ${labels[role]}?`))void run('change_workspace_access',{workspace:organizationId,account:m.user_id,access_role:role});}} className="border rounded-lg p-2"><option value="member">Colaborador</option><option value="manager">Gestor</option></select><button className="text-red-700 underline" onClick={()=>{if(window.confirm(`Retirar o acesso de ${m.email} a este gabinete?`))void run('change_workspace_access',{workspace:organizationId,account:m.user_id,access_role:null});}}>Retirar acesso</button></>}</article>)}
      <form className="border-t pt-4 space-y-3" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);void run('invite_workspace_member',{workspace:organizationId,recipient:String(form.get('email')).trim(),access_role:String(form.get('role'))});}}><h3 className="font-bold">Convidar para o gabinete</h3><label className="block">Email<input required name="email" type="email" className="w-full border rounded-xl p-3"/></label><label className="block">Acesso<select name="role" className="w-full border rounded-xl p-3"><option value="member">Colaborador · sem valores financeiros</option><option value="manager">Gestor · inclui acesso financeiro</option></select></label><p className="text-sm text-slate-500">O convite dura 7 dias. Pede à pessoa que crie conta, confirme o mesmo email e entre no Promage. O convite aparece na seleção de gabinetes. Não é enviado um email automático.</p><button className={button}>Criar convite</button></form>
      <h3 className="font-bold">Convites pendentes</h3>{!data.invitations.length&&<p className="text-sm text-slate-500">Sem convites pendentes.</p>}{data.invitations.map((i:any)=><article key={i.id} className="border-t pt-3 flex flex-wrap justify-between gap-3"><div>{i.email} · {labels[i.role]}<p className="text-sm text-slate-500">{new Date(i.expires_at)<new Date()?'Expirado':'Válido até'} {new Date(i.expires_at).toLocaleDateString('pt-PT')}</p></div><button className="underline" onClick={()=>void run('revoke_workspace_invitation',{workspace:organizationId,invitation:i.id})}>Revogar convite</button></article>)}
    </fieldset>}
  </section>;
}
export function InvitationInbox({onAccepted,onBusy}: {onAccepted:()=>void;onBusy:(busy:boolean)=>void}) {
  const [items,setItems]=useState<any[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{let alive=true;rpc('my_workspace_invitations').then(data=>{if(alive){setItems(data||[]);setError('');}}).catch(e=>{if(alive && e.code!=='PGRST202' && e.code!=='42883')setError(message(e));});return()=>{alive=false;};},[revision]);
  return <section className="border-t pt-4 space-y-3"><div className="flex justify-between"><h2 className="font-bold">Convites recebidos</h2><button disabled={busy} className="underline text-sm" onClick={()=>setRevision(r=>r+1)}>Atualizar convites</button></div>{error&&<p role="alert" className="text-red-700">{error}</p>}{!items.length&&<p className="text-sm text-slate-500">Sem convites disponíveis para este email.</p>}{items.map(i=><div key={i.id} className="border rounded-xl p-3 flex justify-between gap-3"><span>{i.organization_name} · {labels[i.role]}</span><button disabled={busy} className={button} onClick={async()=>{setBusy(true);onBusy(true);setError('');try{await rpc('accept_workspace_invitation',{invitation:i.id});setItems(old=>old.filter(x=>x.id!==i.id));onAccepted();}catch(e){setError(message(e));}finally{setBusy(false);onBusy(false);}}}>Aceitar convite</button></div>)}</section>;
}
