import React, { lazy, Suspense, useState } from 'react';
import CloudApp from './CloudApp';
import { isSupabaseConfigured } from '../lib/supabase';

const development = (import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV;
const App = development ? lazy(() => import('../App')) : null;

export default function AppEntry() {
  const [local, setLocal] = useState(!isSupabaseConfigured);
  if (!development && !isSupabaseConfigured) return <main className="min-h-screen flex items-center justify-center p-6"><div className="bg-white rounded-xl p-8 max-w-md"><h1 className="text-xl font-bold">Promage</h1><p className="mt-4">A plataforma está a ser preparada. Tenta novamente mais tarde.</p></div></main>;
  if (!local || !development) return <CloudApp onLocal={development ? () => setLocal(true) : undefined} />;
  return <div>{isSupabaseConfigured && <div className="fixed right-4 bottom-4 z-40"><button onClick={() => setLocal(false)} className="bg-[#2D4E4E] text-white border shadow-lg rounded-xl px-4 py-3 text-xs font-bold">Modo local · Voltar à plataforma</button></div>}{App && <Suspense fallback={<p>A carregar…</p>}><App/></Suspense>}</div>;
}
