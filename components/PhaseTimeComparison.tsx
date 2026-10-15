import React from 'react';
import type {Phase,TimeEntry} from '../types';
import {phaseTimeComparison} from '../lib/phaseTime';
import {durationLabel} from '../lib/timeEntries';

export default function PhaseTimeComparison({phases,entries}:{phases:Phase[];entries:TimeEntry[]}) {
  const result=phaseTimeComparison(phases,entries);
  return <section className="bg-white border rounded-2xl p-4 space-y-3">
    <h4 className="font-bold text-lg">Horas previstas e realizadas por fase</h4>
    <p className="text-sm text-slate-500">Define as horas previstas em Fases → Editar fase. A comparação inclui as horas registadas por toda a equipa. A percentagem mede o consumo da previsão, não a conclusão da fase.</p>
    <p className="text-sm">Previsão definida: <strong>{durationLabel(result.planned)}</strong> · Realizado no projeto: <strong>{durationLabel(result.actual)}</strong> · Fases acima da previsão: <strong>{result.exceeded}</strong></p>
    {result.missing>0 && <p className="text-sm text-amber-800">{result.missing} fase(s) sem previsão. A previsão total está incompleta.</p>}
    {result.unassigned>0 && <p className="text-sm text-amber-800">{durationLabel(result.unassigned)} sem fase associada. Edita esses registos para os incluir na comparação de uma fase.</p>}
    {!phases.length ? <p className="text-sm">Cria fases para distribuir a previsão de trabalho.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{['Fase','Previsto','Realizado','Disponível / excesso','Consumo','Estado'].map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{result.rows.map(row=><tr key={row.phase.id} className="border-t"><td className="p-2">{row.phase.name}<p className="text-xs text-slate-500">{row.phase.status}</p></td><td className="p-2 whitespace-nowrap">{row.planned==null?'Por definir':durationLabel(row.planned)}</td><td className="p-2 whitespace-nowrap">{durationLabel(row.actual)}</td><td className="p-2 whitespace-nowrap">{row.difference==null?'—':row.difference<0?`Excesso: ${durationLabel(-row.difference)}`:durationLabel(row.difference)}</td><td className="p-2">{row.percent==null?'—':`${row.percent}%`}</td><td className={`p-2 font-medium ${row.state==='Ultrapassada'?'text-red-700':row.state==='Próxima do limite'||row.state==='Limite atingido'?'text-amber-800':'text-slate-600'}`}>{row.state}</td></tr>)}</tbody></table></div>}
    <p className="text-xs text-slate-500">O aviso de proximidade começa nos 80%. Alterar a previsão não modifica as horas realizadas nem os custos. Fechar uma fase não elimina diferenças.</p>
  </section>;
}
