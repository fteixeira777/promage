import type {Process} from '../types';
import type {OfficeExpense} from './officeExpenses';
import {officeCashflowProcess} from './officeExpenses.ts';
import {cashflow,projectFinance} from './finance.ts';
import {paymentState,remaining} from './payments.ts';
import {phaseTimeComparison} from './phaseTime.ts';
export function dashboardSummary(processes:Process[],office:OfficeExpense[],day:string,opening:number){
 const movements=processes.flatMap(p=>(p.payments||[]).filter(m=>paymentState(m,p,day)==='Em atraso').map(m=>({process:p,payment:m,amount:remaining(m)})));
 const overdueOffice=office.filter(e=>e.status==='planned'&&e.dueDate<day);
 const sum=(values:number[])=>Math.round(values.reduce((s,v)=>s+v,0)*100)/100;
 const risks=processes.map(process=>({process,finance:projectFinance(process),hours:phaseTimeComparison(process.phases,process.timeEntries||[])}))
 .filter(r=>r.finance.marginAfterWork<0||r.hours.exceeded>0||r.finance.unpricedMinutes>0);
 const forecast=cashflow([...processes,officeCashflowProcess(office)],day,opening);
 return {movements,overdueOffice,risks,months:forecast.months,
  overdueIncome:sum(movements.filter(m=>m.payment.direction==='INCOME').map(m=>m.amount)),
  overdueExpense:sum([...movements.filter(m=>m.payment.direction==='EXPENSE').map(m=>m.amount),...overdueOffice.map(e=>e.amount)])};
}
