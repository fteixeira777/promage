import test from 'node:test';
import assert from 'node:assert/strict';
import {phaseTimeComparison} from '../lib/phaseTime.ts';
import {phaseFromRow,phaseToRow} from '../lib/databaseRows.ts';
test('missing estimate differs from an explicit zero and unassigned work is visible',()=>{
 const result=phaseTimeComparison([{id:'a'},{id:'b',plannedMinutes:0}],[{phaseId:'a',minutes:30},{phaseId:'b',minutes:15},{minutes:20},{phaseId:'removed',minutes:10}]);
 assert.equal(result.rows[0].state,'Sem previsão');assert.equal(result.rows[0].difference,null);
 assert.equal(result.rows[1].state,'Ultrapassada');assert.equal(result.rows[1].percent,null);
 assert.equal(result.missing,1);assert.equal(result.unassigned,30);assert.equal(result.actual,75);
});
test('thresholds compare whole team minutes and closing a phase preserves overruns',()=>{
 const phases=[{id:'a',plannedMinutes:100},{id:'b',plannedMinutes:100},{id:'c',plannedMinutes:100},{id:'d',plannedMinutes:100,status:'Concluído'}];
 const entries=[{phaseId:'a',minutes:79},{phaseId:'b',minutes:40},{phaseId:'b',minutes:40},{phaseId:'c',minutes:100},{phaseId:'d',minutes:101}];
 const result=phaseTimeComparison(phases,entries);
 assert.deepEqual(result.rows.map(r=>r.state),['Dentro da previsão','Próxima do limite','Limite atingido','Ultrapassada']);
 assert.equal(result.rows[3].difference,-1);assert.equal(result.rows[3].percent,101);assert.equal(result.exceeded,1);
 assert.equal(result.planned,400);assert.equal(result.actual,360);
});
test('phase estimates round trip, preserve zero and can be cleared',()=>{
 const p={id:'a',plannedMinutes:90};
 assert.equal(phaseFromRow(phaseToRow('org','project',p,0)).plannedMinutes,90);
 assert.equal(phaseFromRow({planned_minutes:0}).plannedMinutes,0);
 assert.equal(phaseToRow('org','project',{id:'a'},0).planned_minutes,null);
 assert.equal(phaseFromRow({planned_minutes:null}).plannedMinutes,undefined);
});
