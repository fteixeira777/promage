import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { passwordValidation, recoveryError } from '../lib/passwordRecovery';

export default function PasswordRecovery({ canReset, checking, invalid, onExit }: {
  canReset: boolean; checking: boolean; invalid: boolean; onExit: () => void;
}) {
  const [request, setRequest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [done, setDone] = useState(false);
  const resetting = canReset && !request && !invalid;
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(''); setNotice('');
    if (resetting) {
      const validation = passwordValidation(String(data.get('password')), String(data.get('confirmation')));
      if (validation) { setError(validation); return; }
    }
    setBusy(true);
    try {
      if (resetting) {
        const { error } = await supabase!.auth.updateUser({ password: String(data.get('password')) });
        if (error) throw error;
        form.reset(); setDone(true);
      } else {
        const { error } = await supabase!.auth.resetPasswordForEmail(String(data.get('email')).trim(), { redirectTo: window.location.origin });
        if (error) throw error;
        setNotice('Se existir uma conta com esse email, receberás um link para definir uma nova palavra-passe. Verifica também a pasta de spam.');
      }
    } catch (error) { setError(recoveryError(error as { code?: string; status?: number })); }
    finally { setBusy(false); }
  };
  const field = 'w-full p-3 rounded-xl border border-slate-200 bg-white text-sm';
  return <main className="h-screen overflow-y-auto bg-slate-100 flex items-center justify-center p-6"><section className="bg-white border rounded-3xl p-8 w-full max-w-md space-y-5">
    <h1 className="text-2xl font-bold text-[#2D4E4E]">Promage</h1>
    <h2 className="font-bold text-lg">{done ? 'Palavra-passe atualizada' : resetting ? 'Definir nova palavra-passe' : 'Recuperar palavra-passe'}</h2>
    {checking ? <p role="status">A verificar o link…</p> : done ? <p role="status">A tua nova palavra-passe ficou guardada. Podes continuar para a plataforma.</p> : <>
      {invalid && <p role="alert" className="text-sm text-red-800">O link é inválido ou expirou. Introduz o teu email para pedir um novo.</p>}
      {resetting ? <p className="text-sm text-slate-500">Usa pelo menos 8 caracteres e uma palavra-passe que não uses noutros serviços.</p> : <p className="text-sm text-slate-500">Indica o email associado à tua conta.</p>}
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          {resetting ? <><label className="block text-sm">Nova palavra-passe<input autoComplete="new-password" type="password" name="password" required minLength={8} className={field}/></label><label className="block text-sm">Confirmar nova palavra-passe<input autoComplete="new-password" type="password" name="confirmation" required minLength={8} className={field}/></label></> : <label className="block text-sm">Email<input autoComplete="email" type="email" name="email" required className={field}/></label>}
          <button className="w-full p-3 rounded-xl bg-[#2D4E4E] text-white font-bold text-sm disabled:opacity-50">{busy ? 'A processar…' : resetting ? 'Guardar nova palavra-passe' : 'Enviar link de recuperação'}</button>
        </fieldset>
      </form>
      {resetting && <button disabled={busy} onClick={() => { setRequest(true); setError(''); }} className="text-sm underline">Pedir outro link</button>}
    </>}
    {error && <p role="alert" className="bg-red-50 text-red-800 p-3 rounded-xl text-sm">{error}</p>}
    {notice && <p role="status" className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-sm">{notice}</p>}
    <button disabled={busy || checking} onClick={onExit} className="text-sm underline text-[#2D4E4E]">{done || canReset ? 'Continuar para a plataforma' : 'Voltar ao início de sessão'}</button>
  </section></main>;
}
