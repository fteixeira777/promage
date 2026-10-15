export const PORTAL_BUCKET = 'promage-client-documents';
export const MAX_PORTAL_FILE_SIZE = 10 * 1024 * 1024;
export function validatePortalFile(file: { name: string; size: number; type: string }) {
  const extensions: Record<string,string> = { 'application/pdf': 'pdf', 'image/jpeg':'jpe?g', 'image/png':'png' };
  const extension = extensions[file.type];
  if (!extension || !new RegExp(`\\.(${extension})$`, 'i').test(file.name)) throw new Error('Escolhe um ficheiro PDF, JPG ou PNG.');
  if (file.size <= 0 || file.size > MAX_PORTAL_FILE_SIZE) throw new Error('O ficheiro deve ter conteúdo e não ultrapassar 10 MB.');
  if (file.name.length > 200) throw new Error('O nome do ficheiro deve ter até 200 caracteres.');
}
export function portalError(error: any): string {
  return ['PGRST202','42883'].includes(error?.code)
    ? 'O portal do cliente ainda não foi ativado. Atualiza esta área depois da ativação pelo gabinete.'
    : error?.message || 'Não foi possível concluir a operação.';
}
export interface PortalProjectRef { organization_id: string; process_id: string; title: string; organization_name?: string }
export interface PortalFile { id: string; name: string; size: number; storage_path: string; created_at: string }
export interface PortalRequest { id: string; title: string; instructions: string; due_date?: string; status: 'requested'|'submitted'|'accepted'; feedback: string; files: PortalFile[] }
export interface PortalProject extends PortalProjectRef {
  status: string; enabled: boolean; emails: string[]; phase_ids: string[];
  phases: {id:string;name:string;status:string;end_date?:string;completed_at?:string}[];
  requests: PortalRequest[];
}
