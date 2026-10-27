import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Client, Company } from '../types';
import { supabase, initialAuthLink } from '../lib/supabase';
import PasswordRecovery from './PasswordRecovery';
const recoveryKey = 'promage.passwordRecoveryUser';
function storedRecovery() { try { return sessionStorage.getItem(recoveryKey); } catch { return null; } }
function rememberRecovery(userId: string | null) { try { if (userId) sessionStorage.setItem(recoveryKey, userId); else sessionStorage.removeItem(recoveryKey); } catch { /* Tab storage is optional. */ } }
import CloudPlanning, { type PlanningSection } from './CloudPlanning';
import WorkspaceShell from './WorkspaceShell';
import ClientPortal from './ClientPortal';
import { InvitationInbox } from './WorkspaceAccess';
import { createWorkspace, listWorkspaces, listRemoteClients, saveRemoteClient, workspaceRole } from '../services/workspaceService';
import { Building2, Users, LogOut, Plus, X, Cloud, ArrowLeft } from 'lucide-react';

const input = 'w-full p-3 rounded-xl border border-slate-200 bg-white text-sm';
const action = 'px-4 py-3 rounded-xl bg-[#2D4E4E] text-white font-bold text-sm disabled:opacity-50';
const message = (error: unknown) => error instanceof Error ? error.message : String((error as { message?: string })?.message || 'Não foi possível concluir a operação.');

export default function CloudApp({ onLocal }: { onLocal?: () => void }) {
  const [recovering, setRecovering] = useState(() => initialAuthLink.recovery || initialAuthLink.invalid || Boolean(storedRecovery()));
  const [recoveryUser, setRecoveryUser] = useState<string | null>(storedRecovery);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [clientMode, setClientMode] = useState(false);
  const [register, setRegister] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [role, setRole] = useState('member');
  const [clientForm, setClientForm] = useState<Partial<Client> | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [navigationRevision, setNavigationRevision] = useState(0);
  const workspaceTab = activeSection === 'clients' ? 'clients' : 'planning';
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let alive = true;
    supabase!.auth.getSession().then(({ data, error }) => { if (alive) { setSession(data.session); setLoading(false); if (error) setError(error.message); } }).catch(e => { if (alive) { setError(message(e)); setLoading(false); } });
    const { data } = supabase!.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY' && next) { rememberRecovery(next.user.id); setRecoveryUser(next.user.id); setRecovering(true); }
      if (event === 'SIGNED_OUT') { rememberRecovery(null); setRecoveryUser(null); }
      setSession(next); setLoading(false);
      if (!next) { setClientMode(false); setCompany(null); setClients([]); setCompanies([]); }
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!session || recovering) return;
    let alive = true; setLoading(true); setError('');
    listWorkspaces().then(data => { if (alive) { setCompanies(data || []); if (!data?.length) setClientMode(true); } }).catch(e => { if (alive) setError(message(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [session?.user.id, refresh, recovering]);
  useEffect(() => {
    setClients([]); setClientForm(null); setRole('member');
    if (!company || !session || recovering) return;
    let alive = true; setLoading(true); setError('');
    Promise.all([listRemoteClients(company.id), workspaceRole(company.id, session.user.id)])
      .then(([data, memberRole]) => { if (alive) { setClients(data); setRole(memberRole); } })
      .catch(e => { if (alive) setError(message(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [company?.id, session?.user.id, recovering]);
  const authenticate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true); setError(''); setNotice('');
    const credentials = { email: String(data.get('email')).trim(), password: String(data.get('password')) };
    try {
      if (register) {
        const { data, error } = await supabase!.auth.signUp({ ...credentials, options: { emailRedirectTo: window.location.origin } }); if (error) throw error;
        setNotice(data.session ? 'Conta criada.' : 'Consulta o teu email para confirmar o registo. Depois podes iniciar sessão.');
      } else {
        const { error } = await supabase!.auth.signInWithPassword(credentials); if (error) throw error;
      }
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const addCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = e.currentTarget; const name = String(new FormData(form).get('name')).trim(); if (!name) return;
    setBusy(true); setError('');
    try { const id = await createWorkspace(name); setCompanies(prev => [...prev, { id, name }]); setCompany({ id, name }); form.reset(); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const saveClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!company || !clientForm) return;
    const data = new FormData(e.currentTarget); const name = String(data.get('name')).trim(); if (!name) return;
    const client: Client = { id: clientForm.id || crypto.randomUUID(), name, type: String(data.get('type')) as Client['type'],
      email: String(data.get('email') || '').trim(), phone: String(data.get('phone') || '').trim(),
      address: String(data.get('address') || '').trim(), nif: String(data.get('nif') || '').trim() };
    setBusy(true); setError('');
    try { await saveRemoteClient(company.id, client); setClients(prev => [...prev.filter(c => c.id !== client.id), client].sort((a, b) => a.name.localeCompare(b.name))); setClientForm(null); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const logout = async () => { setBusy(true); setError(''); try { const { error } = await supabase!.auth.signOut(); if (error) throw error; } catch (e) { setError(message(e)); } finally { setBusy(false); } };
  const feedback = <>{error && <p role="alert" className="bg-red-50 text-red-800 rounded-xl p-3 text-sm">{error}</p>}{notice && <p role="status" className="bg-emerald-50 text-emerald-800 rounded-xl p-3 text-sm">{notice}</p>}</>;
  if (recovering) return <PasswordRecovery checking={loading} canReset={Boolean(session && recoveryUser === session.user.id)} invalid={initialAuthLink.invalid || (!loading && initialAuthLink.recovery && !recoveryUser)} onExit={() => { rememberRecovery(null); setRecoveryUser(null); setRecovering(false); setError(''); setNotice(''); window.history.replaceState(null, '', window.location.pathname); }} />;
  if (!session) return <div className="h-screen overflow-y-auto bg-slate-100 flex items-center justify-center p-6"><div className="bg-white border rounded-3xl p-8 w-full max-w-md space-y-5"><div className="flex items-center gap-3 text-[#2D4E4E]"><Building2/><h1 className="text-2xl font-bold">Promage</h1></div><h2 className="font-bold text-lg">{register ? 'Criar conta' : 'Entrar no gabinete'}</h2><p className="text-sm text-slate-500">Versão alfa · Gere o teu gabinete e acompanha os teus projetos.</p>{feedback}{loading ? <p role="status">A verificar sessão…</p> : <form onSubmit={authenticate} className="space-y-4"><label className="block text-sm">Email<input name="email" type="email" autoComplete="email" required className={input}/></label><label className="block text-sm">Palavra-passe<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} required className={input}/></label><button disabled={busy} className={action + ' w-full'}>{busy ? 'A processar…' : register ? 'Criar conta' : 'Entrar'}</button></form>}{!register && <button disabled={busy || loading} onClick={() => { setRecovering(true); setError(''); setNotice(''); }} className="block text-sm underline text-[#2D4E4E]">Esqueci-me da palavra-passe</button>}<button disabled={busy} onClick={() => { setRegister(!register); setError(''); setNotice(''); }} className="text-sm underline text-[#2D4E4E]">{register ? 'Já tenho conta' : 'Ainda não tenho conta'}</button>{onLocal && <div className="border-t pt-4"><button disabled={busy} onClick={onLocal} className="text-sm underline text-slate-500">Abrir protótipo local</button></div>}</div></div>;
  return <WorkspaceShell companyName={company?.name} email={session.user.email} role={role} clientMode={clientMode} section={activeSection==='dashboard'&&role==='member'?'alerts':activeSection} busy={busy}
    onNavigate={section => { setActiveSection(section); setNavigationRevision(r => r + 1); setError(''); }}
    onSwitchCompany={() => { setCompany(null); setActiveSection('dashboard'); setError(''); }}
    onSwitchMode={() => setClientMode(value => !value)} onLogout={logout} onLocal={onLocal}>
    {feedback}
    {clientMode ? <ClientPortal onBusy={setBusy}/> : !company ? <section className="max-w-2xl mx-auto bg-white border rounded-3xl p-6 space-y-5"><h1 className="text-2xl font-bold">Os teus gabinetes</h1>{loading && <p role="status">A carregar…</p>}{!loading && !companies.length && <p className="text-slate-500">Ainda não pertences a nenhum gabinete. Cria o primeiro.</p>}<div className="space-y-2">{companies.map(c => <button key={c.id} onClick={() => { setCompany(c); setError(''); }} className="w-full text-left border rounded-xl p-4 font-bold hover:bg-slate-50">{c.name}</button>)}</div><button onClick={() => setRefresh(r => r + 1)} className="text-sm underline">Atualizar lista</button><InvitationInbox onAccepted={() => setRefresh(r => r + 1)} onBusy={setBusy}/><form onSubmit={addCompany} className="border-t pt-5 space-y-3"><label className="block text-sm">Nome do gabinete<input name="name" required maxLength={200} className={input}/></label><button disabled={busy || loading} className={action}>Criar gabinete</button></form></section> : <main className="space-y-5">
      {workspaceTab === 'clients' && <div className="flex justify-between items-center gap-3"><h1 className="text-2xl font-bold">Clientes</h1>{role !== 'member' && <button disabled={loading || busy} onClick={() => { setClientForm({ type: 'Quente' }); setError(''); }} className={action}><Plus size={16} className="inline mr-1"/> Novo cliente</button>}</div>}
      {workspaceTab === 'planning' ? (loading ? <p>A carregar gabinete…</p> : <div key={company.id}><CloudPlanning organizationId={company.id} clients={clients} role={role} onBusy={setBusy} section={(activeSection==='dashboard'&&role==='member'?'alerts':activeSection) as PlanningSection} onSectionChange={setActiveSection} navigationRevision={navigationRevision} /></div>) :
      <div className="bg-white border rounded-3xl p-6 space-y-4"><h2 className="font-bold flex items-center gap-2"><Users size={18}/> Clientes do gabinete</h2>{loading ? <p role="status">A carregar clientes…</p> : !clients.length ? <p className="text-slate-500">Sem clientes registados neste gabinete.</p> : clients.map(c => <article key={c.id} className="border-t py-4 flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{c.name}</h3><p className="text-sm text-slate-500">{c.email || 'Sem email'} · {c.phone || 'Sem telefone'} · {c.type}</p>{c.address && <p className="text-sm text-slate-500">{c.address}</p>}</div>{role !== 'member' && <button onClick={() => { setClientForm(c); setError(''); }} className="text-sm underline text-[#2D4E4E]">Editar cliente</button>}</article>)}</div>}

    </main>}
    {clientForm && company && <div className="fixed inset-0 z-50 bg-slate-900/40 flex justify-center items-center p-4" role="dialog" aria-modal="true" aria-labelledby="cloud-client-title"><div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"><div className="flex justify-between mb-5"><h2 id="cloud-client-title" className="font-bold text-xl">{clientForm.id ? 'Editar cliente' : 'Novo cliente'}</h2><button aria-label="Fechar" disabled={busy} onClick={() => setClientForm(null)}><X/></button></div><form onSubmit={saveClient} className="space-y-3"><label className="block text-sm">Nome<input name="name" required defaultValue={clientForm.name} className={input}/></label><label className="block text-sm">Email<input name="email" type="email" defaultValue={clientForm.email} className={input}/></label><label className="block text-sm">Telefone<input name="phone" defaultValue={clientForm.phone} className={input}/></label><label className="block text-sm">Morada<input name="address" defaultValue={clientForm.address} className={input}/></label><label className="block text-sm">NIF<input name="nif" defaultValue={clientForm.nif} className={input}/></label><label className="block text-sm">Tipo<select name="type" defaultValue={clientForm.type || 'Quente'} className={input}><option>Quente</option><option>Frio</option></select></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} className={action + ' w-full'}>{busy ? 'A guardar…' : 'Guardar cliente'}</button></form></div></div>}
  </WorkspaceShell>;
}
