import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardSummary} from '../lib/dashboard.ts';
const project={id:'p',title:'Test',pricingMode:'GLOBAL',budget:100,phases:[{id:'f',plannedMinutes:60}],expenses:[],subcontracts:[],timeEntries:[{phaseId:'f',minutes:120,hourlyCost:60}],payments:[]};
const payment=(id,direction,amount,dueDate,settlements=[])=>({id,direction,amount,dueDate,settlements,rule:'DATE',offsetDays:0});
test('dashboard combines confirmed arrears without counting paid, cancelled or open-phase estimates',()=>{
 const p={...project,payments:[payment('in','INCOME',100,'2026-10-01',[{amount:25}]),payment('out','EXPENSE',20,'2026-10-01'),{...payment('phase','INCOME',100,'2026-10-01'),rule:'PHASE',phaseId:'f'},payment('paid','EXPENSE',30,'2026-10-01',[{amount:30}])]};
 const office=[{id:'a',status:'planned',amount:10,dueDate:'2026-10-01'},{id:'b',status:'paid',amount:40,dueDate:'2026-10-01'},{id:'c',status:'cancelled',amount:50,dueDate:'2026-10-01'}];
 const result=dashboardSummary([p],office,'2026-10-15',500);
 assert.equal(result.overdueIncome,75);assert.equal(result.overdueExpense,30);assert.equal(result.movements.length,2);assert.equal(result.overdueOffice.length,1);
 assert.equal(result.risks.length,1);assert.equal(result.risks[0].hours.exceeded,1);assert.equal(result.risks[0].finance.marginAfterWork,-20);
 assert.equal(result.months[0].balance,500);
});
test('opening balance controls forecast risk; missing rates remain visible even with positive margin',()=>{
 const p={...project,timeEntries:[{phaseId:'f',minutes:30,hourlyCost:null}]};
 const office=[{id:'a',status:'planned',amount:200,dueDate:'2026-10-20'}];
 assert.equal(dashboardSummary([p],office,'2026-10-15',0).months[0].balance,-200);
 const result=dashboardSummary([p],office,'2026-10-15',300);
 assert.equal(result.months[0].balance,100);assert.equal(result.risks.length,1);assert.equal(result.risks[0].finance.unpricedMinutes,30);
 assert.equal(dashboardSummary([{...p,timeEntries:[]}],[],'2026-10-15',0).risks.length,0);
});
