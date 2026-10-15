import { requireSupabase } from '../lib/supabase';
import type { Client } from '../types';

// Operações por registo; os acessos são validados pelas políticas do servidor.
export async function signIn(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function listWorkspaces() {
  const { data, error } = await requireSupabase().from('organizations').select('id, name, created_at').order('name');
  if (error) throw error;
  return data;
}

export async function createWorkspace(name: string) {
  const { data, error } = await requireSupabase().rpc('create_workspace', { workspace_name: name });
  if (error) throw error;
  return data as string;
}

export async function listRemoteClients(organizationId: string) {
  const { data, error } = await requireSupabase().from('clients').select('*').eq('organization_id', organizationId).order('name');
  if (error) throw error;
  return (data || []).map(row => ({ id: row.id, name: row.name, type: row.type,
    email: row.email, phone: row.phone, address: row.address || '', nif: row.nif || '' })) as Client[];
}

export async function saveRemoteClient(organizationId: string, client: Client) {
  const { data, error } = await requireSupabase().from('clients').upsert({
    organization_id: organizationId, id: client.id, name: client.name, type: client.type,
    email: client.email, phone: client.phone, address: client.address || null, nif: client.nif || null,
  }, { onConflict: 'organization_id,id' }).select('id').single();
  if (error) throw error;
  return data;
}

export async function workspaceRole(organizationId: string, userId: string) {
  const { data, error } = await requireSupabase().from('organization_members').select('role')
    .eq('organization_id', organizationId).eq('user_id', userId).single();
  if (error) throw error;
  return data.role as 'owner' | 'manager' | 'member';
}
