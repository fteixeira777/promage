import type {Process} from '../types';
export interface OfficeExpense {id:string;planId:string;occurrence:number;description:string;category:string;amount:number;dueDate:string;status:'planned'|'paid'|'cancelled';paidOn?:string}
export const officeCategories=['Renda','Salários','Software','Seguros','Serviços','Impostos','Outros'];
export function officeExpenseFromRow(r:any):OfficeExpense {
 return {id:r.id,planId:r.plan_id,occurrence:r.occurrence,description:r.description,category:r.category,amount:Number(r.amount),dueDate:r.due_date,status:r.status,paidOn:r.paid_on||undefined};
}
// Adaptador apenas para a previsão; nunca entra nos totais económicos dos projetos.
export function officeCashflowProcess(expenses:OfficeExpense[]):Process {
 return {id:'office-expenses',code:'Gabinete',title:'Despesas gerais',clientId:'',status:'Execução',budget:0,pricingMode:'GLOBAL',startDate:'',phases:[],subcontracts:[],expenses:[],documents:[],
 payments:expenses.filter(e=>e.status==='planned').map(e=>({id:e.id,description:`${e.category} · ${e.description}`,direction:'EXPENSE',amount:e.amount,rule:'DATE',dueDate:e.dueDate,offsetDays:0,settlements:[]}))};
}
export function officeExpenseTotals(expenses:OfficeExpense[],date:string) {
 const sum=(list:OfficeExpense[])=>list.reduce((s,e)=>s+Math.round(e.amount*100),0)/100;
 return {pending:sum(expenses.filter(e=>e.status==='planned')),overdue:sum(expenses.filter(e=>e.status==='planned'&&e.dueDate<date)),
 paidThisMonth:sum(expenses.filter(e=>e.status==='paid'&&e.paidOn?.slice(0,7)===date.slice(0,7)))};
}
export function officeError(error:{code?:string;message:string}) {
 return ['PGRST202','PGRST205','42P01'].includes(error.code||'') ? 'Aplica a atualização de despesas gerais no Supabase (202610150007_office_expenses.sql).' : error.message;
}
