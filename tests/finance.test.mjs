import test from 'node:test';
import assert from 'node:assert/strict';
import { cashflow, projectFinance, costFinance } from '../lib/finance.ts';

const process = { id:'p', budget:1500, pricingMode:'GLOBAL', phases:[{id:'f',value:1500,endDate:'2026-11-10'}],
  subcontracts:[{value:400}], expenses:[{value:100}], payments:[] };
const payment = (id, direction, amount, dueDate, settlements=[]) => ({ id, direction, amount, dueDate, rule:'DATE', offsetDays:0, settlements });

test('project balance subtracts registered costs once; payments measure cash separately', () => {
  const totals = projectFinance({...process,payments:[payment('out','EXPENSE',500,'2026-11-01',[{amount:200}]),payment('in','INCOME',1500,'2026-11-01',[{amount:300}])]});
  assert.equal(totals.costs,500); assert.equal(totals.balance,1000);
  assert.equal(totals.received,300); assert.equal(totals.paid,200); assert.equal(totals.unplannedCosts,0);
  assert.equal(totals.toReceive,1200); assert.equal(totals.toPay,300); assert.equal(totals.cashBalance,100);
});

test('cost attribution separates costs with the same id, legacy payments and partial settlements', () => {
  const linked = {...process,payments:[
    {...payment('a','EXPENSE',1000,'2026-11-01',[{amount:200},{amount:100}]),subcontractId:'same'},
    {...payment('b','EXPENSE',1000,'2026-12-01'),subcontractId:'same'},
    {...payment('c','EXPENSE',50,'2026-11-01',[{amount:20}]),expenseId:'same'},
    payment('legacy','EXPENSE',100,'2026-11-01',[{amount:30}]),
  ]};
  assert.deepEqual(costFinance(linked,'subcontract','same',2000),{planned:2000,paid:300,unpaid:1700,unplanned:0});
  assert.deepEqual(costFinance(linked,'expense','same',40),{planned:50,paid:20,unpaid:20,unplanned:-10});
  assert.equal(projectFinance(linked).paid,350);
  assert.deepEqual(costFinance(linked,'expense','empty',0.3),{planned:0,paid:0,unpaid:0.3,unplanned:0.3});
});
test('cashflow uses unpaid amounts and excludes already settled, undated and past obligations', () => {
  const data = cashflow([{...process,payments:[
    payment('in','INCOME',1000,'2026-10-20',[{amount:200}]),
    payment('out','EXPENSE',400,'2026-10-25',[{amount:100}]),
    payment('paid','EXPENSE',50,'2026-10-12',[{amount:50}]),
    payment('late','INCOME',75,'2026-10-01'),
    {...payment('undated','EXPENSE',20),rule:'PHASE',phaseId:'missing'},
  ]}], '2026-10-12',100);
  assert.equal(data.months[0].income,800); assert.equal(data.months[0].expense,300); assert.equal(data.months[0].balance,600);
  assert.equal(data.rows.length,4); assert.equal(data.rows.find(r => r.payment.id==='late').state,'Em atraso');
});
test('phase closure moves the forecast, without recording income or expense', () => {
  const p = {...process,payments:[{...payment('out','EXPENSE',400),rule:'PHASE',phaseId:'f',offsetDays:5}]};
  const forecast = cashflow([p],'2026-10-12');
  assert.equal(forecast.months[1].expense,400); assert.equal(forecast.rows[0].state,'Depende da fase');
  const closed = {...p,phases:[{...p.phases[0],completedAt:'2026-10-12'}]};
  assert.equal(cashflow([closed],'2026-10-12').months[0].expense,400);
  assert.equal(projectFinance(closed).paid,0);
});
test('cashflow crosses years, includes today and keeps cents exact', () => {
  const result = cashflow([{...process,payments:[payment('a','EXPENSE',0.1,'2026-12-31'),payment('b','EXPENSE',0.2,'2027-01-01')]}], '2026-12-31',1);
  assert.equal(result.months[0].balance,0.9); assert.equal(result.months[1].key,'2027-01'); assert.equal(result.months[1].balance,0.7);
});
