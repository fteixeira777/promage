import { requireSupabase } from '../lib/supabase';
import { PORTAL_BUCKET, validatePortalFile } from '../lib/portal';
import type { PortalProject, PortalProjectRef, PortalFile } from '../lib/portal';
export async function portalRpc<T = unknown>(name: string, args: object = {}): Promise<T> {
  const {data,error} = await requireSupabase().rpc(name,args);
  if(error) throw error;
  return data as T;
}
export const listClientProjects = () => portalRpc<PortalProjectRef[]>('my_client_projects');
export const getPortalProject = (workspace: string, project: string) => portalRpc<PortalProject>('portal_project_data',{workspace,project});
export async function uploadPortalFile(requestId: string, file: File) {
  validatePortalFile(file);
  const reserved = await portalRpc<{id:string;path:string}>('prepare_client_upload', {document_request:requestId,filename:file.name,content_type:file.type,bytes:file.size});
  const {error} = await requireSupabase().storage.from(PORTAL_BUCKET).upload(reserved.path,file,{contentType:file.type,upsert:false});
  if(error) throw error;
  return reserved.id;
}
export const finishPortalUpload = (id: string) => portalRpc('finish_client_upload',{file_id:id});
export async function downloadPortalFile(file: PortalFile) {
  const {data,error} = await requireSupabase().storage.from(PORTAL_BUCKET).download(file.storage_path);
  if(error) throw error;
  const url = URL.createObjectURL(data), link = document.createElement('a');
  link.href=url; link.download=file.name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
