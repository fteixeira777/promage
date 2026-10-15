import {requireSupabase} from '../lib/supabase';
import {officeExpenseFromRow,officeError,type OfficeExpense} from '../lib/officeExpenses';
export async function loadOfficeExpenses(organizationId:string):Promise<OfficeExpense[]> {
 const rows:OfficeExpense[]=[];
 for(let offset=0;;offset+=1000){
  const {data,error}=await requireSupabase().from('office_expenses').select('*').eq('organization_id',organizationId).order('id').range(offset,offset+999);
  if(error)throw new Error(officeError(error));rows.push(...(data||[]).map(officeExpenseFromRow));if((data||[]).length<1000)break;
 }return rows;
}
export async function createOfficeExpenses(workspace:string,requestId:string,title:string,category:string,value:number,date:string,months:number){
 const {error}=await requireSupabase().rpc('create_office_expenses',{workspace,request_id:requestId,title,expense_category:category,value,first_date:date,months});if(error)throw new Error(officeError(error));
}
export async function changeOfficeExpense(workspace:string,item:OfficeExpense,operation:'pay'|'cancel'|'restore'|'edit',date?:string,amount?:number){
 const {error}=await requireSupabase().rpc('change_office_expense',{workspace,expense:item.id,operation,expected_amount:item.amount,payment_date:operation==='pay'?date:null,new_due:operation==='edit'?date:null,new_amount:operation==='edit'?amount:null});if(error)throw new Error(officeError(error));
}
