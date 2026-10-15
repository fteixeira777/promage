import test from 'node:test';
import assert from 'node:assert/strict';
import {timeFromRow,timeTotals,durationLabel,timeError} from '../lib/timeEntries.ts';
import {projectFinance} from '../lib/finance.ts';
test('hourly snapshots distinguish free work, missing rates and member projections',()=>{
  const known=timeFromRow({minutes:90,hourly_cost:'20.50'});
  const missing=timeFromRow({minutes:30,hourly_cost:null});
  const free=timeFromRow({minutes:60,hourly_cost:0});
  const member=timeFromRow({minutes:15});
  assert.equal(Object.hasOwn(member,'hourlyCost'),false);
  assert.deepEqual(timeTotals([known,missing,free]),{minutes:180,cost:30.75,unpricedMinutes:30});
  assert.equal(durationLabel(90),'1h 30min');
});
test('each time entry rounds to cents, and editing duration recomputes with its captured rate',()=>{
  assert.equal(timeTotals([{minutes:1,hourlyCost:1},{minutes:1,hourlyCost:1}]).cost,0.04);
  assert.equal(timeTotals([{minutes:120,hourlyCost:20.5}]).cost,41);
});
test('internal cost changes margin without becoming a payment or duplicating external costs',()=>{
  const p={pricingMode:'GLOBAL',budget:1000,phases:[],subcontracts:[{value:200}],expenses:[],
    payments:[{direction:'INCOME',amount:1000,settlements:[{amount:100}]},{direction:'EXPENSE',amount:200,settlements:[{amount:50}]}],
    timeEntries:[{minutes:120,hourlyCost:25},{minutes:60,hourlyCost:null}]};
  const f=projectFinance(p);
  assert.equal(f.internalCost,50);assert.equal(f.marginAfterWork,750);assert.equal(f.unpricedMinutes,60);
  assert.equal(f.balance,800);assert.equal(f.cashBalance,50);assert.equal(f.toPay,150);assert.equal(f.costs,200);
});
test('missing migration is actionable without concealing a permission failure',()=>{
  assert.match(timeError({code:'PGRST202',message:'missing'}),/202610130005/);
  assert.equal(timeError({code:'42501',message:'Denied'}),'Denied');
});
