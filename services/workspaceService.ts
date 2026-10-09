import { requireSupabase } from '../lib/supabase';

// Fundação do acesso remoto. A interface atual continua em modo local.
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
  return data;
}
