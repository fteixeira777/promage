-- Pode ser repetido sem alterar previsões ou horas já registadas.
begin;
alter table public.phases add column if not exists planned_minutes integer
  check (planned_minutes >= 0);
-- Mantém as permissões existentes: apenas a gestão lê/escreve diretamente as fases.
-- A projeção do colaborador e o portal continuam sem totais internos da equipa.
notify pgrst, 'reload schema';
commit;
