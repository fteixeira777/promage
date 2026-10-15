import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAlerts } from '../lib/alerts.ts';
const p={id:'p',title:'Projeto',phases:[{id:'f',name:'Fase',status:'Pendente',endDate:'2026-10-11'}],payments:[]};
test('deadlines include today and the seventh day, exclude completed items and sort overdue first',()=>{
 const tasks=[{id:'today',title:'Hoje',dueDate:'2026-10-12',status:'Pendente'}, {id:'week',title:'Semana',dueDate:'2026-10-19',status:'Pendente'}, {id:'future',dueDate:'2026-10-20',status:'Pendente'}, {id:'done',dueDate:'2026-10-01',status:'Concluído'}];
 const rows=buildAlerts([p],tasks,[],'2026-10-12',false);
 assert.deepEqual(rows.map(r=>r.id),['phase:p:f','task:today','task:week']);
 assert.equal(rows[1].processId,undefined); assert.equal(rows[1].area,'Tarefas');
});
test('financial alerts use remaining balance and never mark open-phase forecasts overdue',()=>{
 const payments=[{id:'fixed',description:'Entrada',direction:'INCOME',amount:500,rule:'DATE',dueDate:'2026-10-01',settlements:[{amount:200}]}, {id:'phase',description:'Fase',direction:'EXPENSE',amount:300,rule:'PHASE',phaseId:'f',offsetDays:0,settlements:[]}];
 const rows=buildAlerts([{...p,payments}],[],[],'2026-10-12',true).filter(r=>r.category==='Financeiro');
 assert.equal(rows.length,1); assert.equal(rows[0].amount,300); assert.equal(rows[0].area,'Recebimentos');
 assert.equal(buildAlerts([{...p,payments}],[],[],'2026-10-12',false).some(r=>r.category==='Financeiro'),false);
});
test('submitted documents require review regardless of old deadline; accepted documents disappear',()=>{
 const docs=[{processId:'p',requests:[{id:'review',title:'Planta',status:'submitted',due_date:'2026-10-01'}, {id:'waiting',title:'Certidão',status:'requested'}, {id:'done',status:'accepted'}]}];
 const rows=buildAlerts([],[],docs,'2026-10-12',true);
 assert.deepEqual(rows.map(r=>r.urgency),['Rever','Pendente']); assert.equal(rows[0].area,'Portal');
 assert.deepEqual(buildAlerts([],[],docs,'2026-10-12',false),[]);
});
test('paid obligations and concluded phases do not create alerts',()=>{
 assert.deepEqual(buildAlerts([{...p,phases:[{...p.phases[0],status:'Concluído'}],payments:[{id:'paid',amount:10,rule:'DATE',dueDate:'2026-01-01',settlements:[{amount:10}]}]}],[],[],'2026-10-12',true),[]);
});
