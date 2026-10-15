import React, { useState } from 'react';
import { LayoutDashboard, Building2, Bell, FolderOpen, CalendarDays, ListTodo, Users, Contact, Wallet, Menu, X, LogOut, ChevronDown, ArrowLeft, ExternalLink } from 'lucide-react';
export const workspaceSections = [
  {id:'dashboard',label:'Visão geral',icon:LayoutDashboard},
  {id:'alerts',label:'Alertas',icon:Bell}, {id:'processes',label:'Projetos',icon:FolderOpen},
  {id:'gantt',label:'Planeamento',icon:CalendarDays}, {id:'daily',label:'Trabalho diário',icon:ListTodo},
  {id:'clients',label:'Clientes',icon:Contact}, {id:'team',label:'Equipa',icon:Users}, {id:'finance',label:'Financeiro',icon:Wallet},
];
export default function WorkspaceShell({children,companyName,email,role,clientMode,section,busy,onNavigate,onSwitchCompany,onSwitchMode,onLogout,onLocal}: {
  children?: React.ReactNode;companyName?:string;email?:string;role:string;clientMode:boolean;section:string;busy:boolean;
  onNavigate:(section:string)=>void;onSwitchCompany:()=>void;onSwitchMode:()=>void;onLogout:()=>void;onLocal?:()=>void;
}) {
  const [mobileOpen,setMobileOpen]=useState(false);
  const hasSidebar=!!companyName&&!clientMode;
  const menu=workspaceSections.filter(s=>(s.id!=='finance'&&s.id!=='dashboard')||role==='owner'||role==='manager');
  const navigate=(id:string)=>{onNavigate(id);setMobileOpen(false);};
  return <div className="h-screen flex bg-[#F4F6F8] text-slate-800 overflow-hidden">
    {hasSidebar&&<>
      {mobileOpen&&<button aria-label="Fechar menu" className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={()=>setMobileOpen(false)}/>}
      <aside className={`${mobileOpen?'flex':'hidden'} lg:flex fixed lg:static inset-y-0 left-0 z-40 w-60 shrink-0 bg-[#203E3E] text-white flex-col`}>
        <div className="h-20 shrink-0 px-6 flex items-center justify-between border-b border-white/10"><span className="flex items-center gap-3 text-xl font-bold"><Building2 size={25}/>Promage</span><button aria-label="Fechar navegação" className="lg:hidden p-1" onClick={()=>setMobileOpen(false)}><X size={20}/></button></div>
        <div className="px-6 pt-7 pb-3 text-xs uppercase tracking-widest text-white/50">Gestão do gabinete</div>
        <nav aria-label="Navegação do gabinete" className="flex-1 overflow-y-auto p-3 space-y-1">{menu.map(({id,label,icon:Icon})=><button key={id} disabled={busy} aria-current={section===id?'page':undefined} onClick={()=>navigate(id)} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-left transition-colors disabled:opacity-50 ${section===id?'bg-white text-[#203E3E] font-bold shadow-sm':'text-white/80 hover:bg-white/10'}`}><Icon size={19}/>{label}</button>)}</nav>
        <div className="border-t border-white/10 p-4"><button disabled={busy} onClick={()=>{onSwitchMode();setMobileOpen(false);}} className="flex gap-3 items-center text-sm w-full p-2 text-white/80 hover:text-white"><ExternalLink size={17}/>Portal do cliente</button></div>
      </aside>
    </>}
    <div className="min-w-0 flex-1 flex flex-col">
      <header className="min-h-20 shrink-0 bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">{hasSidebar?<button aria-label="Abrir menu" aria-expanded={mobileOpen} disabled={busy} className="lg:hidden p-2 rounded-lg border" onClick={()=>setMobileOpen(true)}><Menu size={20}/></button>:<Building2 className="text-[#2D4E4E]" size={25}/>}
          <div className="min-w-0"><p className="font-bold truncate">{clientMode?'Portal do cliente':companyName||'Promage'}</p><p className="text-xs text-slate-500">{clientMode?'Acompanhamento dos teus projetos':companyName?({owner:'Proprietário',manager:'Gestor',member:'Colaborador'}[role]||'Gabinete'):'Seleciona o teu gabinete'}</p></div>
          {hasSidebar&&<button disabled={busy} onClick={onSwitchCompany} className="flex items-center gap-1 text-xs text-slate-500 rounded-lg border px-2 py-1.5 ml-2">Mudar de gabinete<ChevronDown size={14}/></button>}
        </div>
        <div className="flex items-center gap-3 text-sm">{(!hasSidebar||clientMode)&&<button disabled={busy} onClick={onSwitchMode} className="text-[#2D4E4E] flex items-center gap-1"><ArrowLeft size={15}/>{clientMode?'Área do gabinete':'Portal do cliente'}</button>}
          <details className="relative"><summary className="cursor-pointer list-none flex items-center gap-2 rounded-xl border px-3 py-2"><span className="rounded-full bg-[#E7EEEB] text-[#2D4E4E] w-7 h-7 flex items-center justify-center font-bold">{email?.slice(0,1).toUpperCase()||'U'}</span><span className="hidden sm:block max-w-48 truncate">{email}</span><ChevronDown size={14}/></summary><div className="absolute right-0 mt-2 w-64 bg-white shadow-xl border rounded-xl p-3 z-20 space-y-2"><p className="text-xs text-slate-500 break-all px-2 py-1">{email}</p><button disabled={busy} onClick={onLogout} className="w-full text-left p-2 rounded-lg hover:bg-slate-50 flex gap-2 items-center"><LogOut size={16}/>Terminar sessão</button>{onLocal && <button disabled={busy} onClick={onLocal} className="w-full text-left p-2 rounded-lg text-xs text-slate-500 hover:bg-slate-50">Abrir protótipo local</button>}</div></details>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8"><div className="max-w-[1600px] mx-auto space-y-5">{children}</div></div>
    </div>
  </div>;
}
