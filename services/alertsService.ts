import { loadPlanning } from './planningService';
import { loadFinance } from './financeService';
import { getPortalProject } from './portalService';
import { buildAlerts } from '../lib/alerts';
import { today } from '../lib/payments';

export async function loadStudioAlerts(organizationId: string, role: string) {
  const canManage=role==='owner'||role==='manager';
  const planning=await loadPlanning(organizationId,role);
  const warnings:string[]=[];
  let processes=planning.processes;
  const documents: {processId:string;requests:Awaited<ReturnType<typeof getPortalProject>>['requests']}[]=[];
  if(canManage) {
    // A failure in one source must not hide deadlines or look like zero pending items.
    const finance=await Promise.allSettled([loadFinance(organizationId)]);
    if(finance[0].status==='fulfilled') processes=finance[0].value;
    else warnings.push('Não foi possível consultar o financeiro. Os alertas de pagamentos podem estar incompletos.');
    // Bound concurrency while reusing the portal's manager-only projection.
    for(let i=0;i<processes.length;i+=5) {
      const batch=processes.slice(i,i+5);
      const results=await Promise.allSettled(batch.map(p=>getPortalProject(organizationId,p.id)));
      results.forEach((r,index)=>{if(r.status==='fulfilled') documents.push({processId:batch[index].id,requests:r.value.requests}); else warnings.push(`Não foi possível consultar os documentos de ${batch[index].title}.`);});
    }
  }
  return {alerts:buildAlerts(processes,planning.tasks,documents,today(),canManage),warnings};
}
