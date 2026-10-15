import test from 'node:test';
import assert from 'node:assert/strict';
import {officeExpenseFromRow,officeCashflowProcess,officeExpenseTotals,officeError} from '../lib/officeExpenses.ts';
import {cashflow,projectFinance} from '../lib/finance.ts';
const expense=(id,status,amount,dueDate,paidOn)=>({id,status,amount,dueDate,paidOn,category:'Renda',description:'Gabinete'});
test('office forecast includes pending occurrences only and flags past dates separately',()=>{
 const expenses=[expense('a','planned',100,'2026-10-20'),expense('b','paid',50,'2026-10-21','2026-10-15'),expense('c','cancelled',75,'2026-10-22'),expense('d','planned',30,'2026-10-01'),expense('e','planned',100,'2026-11-20')];
 const result=cashflow([officeCashflowProcess(expenses)],'2026-10-15',500);
 assert.equal(result.months[0].expense,100);assert.equal(result.months[0].balance,400);assert.equal(result.months[1].balance,300);assert.equal(result.rows.length,3);
 assert.equal(result.rows.find(r=>r.payment.id==='d').state,'Em atraso');
 assert.deepEqual(officeExpenseTotals(expenses,'2026-10-15'),{pending:230,overdue:30,paidThisMonth:50});
});
test('salaries enter cashflow once while recorded work changes project margin only',()=>{
 const p={...officeCashflowProcess([]),id:'project',budget:1000,timeEntries:[{minutes:120,hourlyCost:25}],payments:[{id:'in',direction:'INCOME',amount:1000,rule:'DATE',dueDate:'2026-10-20',offsetDays:0,settlements:[]}]};
 const f=projectFinance(p);const forecast=cashflow([p,officeCashflowProcess([expense('salary','planned',500,'2026-10-30')])],'2026-10-15');
 assert.equal(f.marginAfterWork,950);assert.equal(f.paid,0);assert.equal(f.costs,0);assert.equal(forecast.months[0].expense,500);assert.equal(forecast.months[0].balance,500);
});
test('paid month follows actual payment date and totals keep cents',()=>{
 assert.deepEqual(officeExpenseTotals([expense('a','paid',100,'2026-09-30','2026-10-01'),expense('b','paid',50,'2026-10-20','2026-09-30'),expense('c','planned',0.1,'2026-10-15'),expense('d','planned',0.2,'2026-10-16')],'2026-10-15'),{pending:0.3,overdue:0,paidThisMonth:100});
 assert.equal(officeExpenseFromRow({amount:'12.34',due_date:'2026-10-15'}).amount,12.34);
 assert.match(officeError({code:'PGRST205',message:'missing'}),/202610150007/);
 assert.equal(officeError({code:'42501',message:'Denied'}),'Denied');
});
