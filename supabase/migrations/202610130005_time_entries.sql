-- Pode ser repetido após uma instalação anterior desta atualização, sem apagar dados.
begin;
alter table public.team_members add column if not exists hourly_cost numeric(12,2) check(hourly_cost >= 0);
create table if not exists public.time_entries (
  organization_id uuid not null,
  id uuid not null default gen_random_uuid(),
  process_id text not null,
  phase_id text,
  member_id text not null,
  date date not null,
  minutes integer not null check(minutes between 1 and 1440),
  description text not null check(length(trim(description)) between 1 and 2000),
  hourly_cost numeric(12,2) check(hourly_cost >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(organization_id,id),
  foreign key(organization_id,process_id) references public.processes(organization_id,id),
  foreign key(organization_id,process_id,phase_id) references public.phases(organization_id,process_id,id),
  foreign key(organization_id,member_id) references public.team_members(organization_id,id)
);
create index if not exists time_entries_project_idx on public.time_entries(organization_id,process_id,date);
create index if not exists time_entries_person_day_idx on public.time_entries(organization_id,member_id,date);
alter table public.time_entries enable row level security;
revoke all on public.time_entries from anon, authenticated;
grant select on public.time_entries to authenticated;
drop policy if exists time_manager_read on public.time_entries;
create policy time_manager_read on public.time_entries for select to authenticated using(private.is_manager(organization_id));

-- Colaboradores recebem apenas as próprias horas; tarifas nunca saem nesta projeção.
create or replace function public.project_time_data(workspace uuid, project text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare manager boolean := private.is_manager(workspace);
begin
  if not private.is_member(workspace) then raise exception 'Sem acesso ao gabinete.'; end if;
  if not exists(select 1 from public.processes where organization_id=workspace and id=project) then raise exception 'Projeto indisponível.'; end if;
  return jsonb_build_object(
    'people',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'status',t.status) ||
       case when manager then jsonb_build_object('hourlyCost',t.hourly_cost) else '{}'::jsonb end order by t.name)
       from public.team_members t where t.organization_id=workspace and (manager or t.user_id=auth.uid())),'[]'::jsonb),
    'entries',coalesce((select jsonb_agg((to_jsonb(e)-'hourly_cost'-'created_by') ||
       case when manager then jsonb_build_object('hourly_cost',e.hourly_cost) else '{}'::jsonb end order by e.date desc,e.created_at desc)
       from public.time_entries e join public.team_members t on t.organization_id=e.organization_id and t.id=e.member_id
       where e.organization_id=workspace and e.process_id=project and (manager or t.user_id=auth.uid())),'[]'::jsonb));
end $$;

create or replace function public.save_time_entry(workspace uuid, entry_id uuid, project text, phase text, person text, work_date date, duration integer, notes text) returns void
language plpgsql security definer set search_path='' as $$
declare person_row public.team_members; previous public.time_entries; rate numeric; manager boolean := private.is_manager(workspace);
begin
  -- Um bloqueio por gabinete serializa alterações de pessoa e limites diários.
  perform 1 from public.organizations where id=workspace for update;
  if not private.is_member(workspace) then raise exception 'Sem acesso ao gabinete.'; end if;
  select * into person_row from public.team_members where organization_id=workspace and id=person;
  if person_row.id is null or person_row.status <> 'Ativo' or (not manager and person_row.user_id is distinct from auth.uid()) then raise exception 'Não podes registar horas para esta pessoa.'; end if;
  if entry_id is null or work_date is null or work_date > current_date or duration is null or duration not between 1 and 1440 or notes is null or length(trim(notes)) not between 1 and 2000 then raise exception 'Indica data até hoje, duração entre 1 e 1440 minutos e descrição.'; end if;
  select * into previous from public.time_entries where organization_id=workspace and id=entry_id;
  if previous.id is not null and (previous.process_id<>project or (not manager and previous.member_id<>person)) then raise exception 'Registo indisponível para edição.'; end if;
  if duration + (select coalesce(sum(minutes),0) from public.time_entries where organization_id=workspace and member_id=person and date=work_date and id<>entry_id) > 1440 then raise exception 'O total diário desta pessoa ultrapassa 24 horas.'; end if;
  -- Alterar a tarifa não recalcula o passado. Registos sem tarifa são sinalizados.
  rate := case when previous.id is not null and previous.member_id=person and previous.hourly_cost is not null then previous.hourly_cost else person_row.hourly_cost end;
  insert into public.time_entries(organization_id,id,process_id,phase_id,member_id,date,minutes,description,hourly_cost,created_by)
    values(workspace,entry_id,project,nullif(phase,''),person,work_date,duration,trim(notes),rate,auth.uid())
    on conflict(organization_id,id) do update set phase_id=excluded.phase_id,member_id=excluded.member_id,date=excluded.date,minutes=excluded.minutes,description=excluded.description,hourly_cost=excluded.hourly_cost;
end $$;

create or replace function public.set_team_hourly_cost(workspace uuid, person text, rate numeric) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.organizations where id=workspace for update;
  if not private.is_manager(workspace) then raise exception 'Apenas a gestão pode definir custos.'; end if;
  if rate is null or rate < 0 or rate > 9999999999.99 then raise exception 'Custo por hora inválido.'; end if;
  update public.team_members set hourly_cost=round(rate,2) where organization_id=workspace and id=person;
  if not found then raise exception 'Pessoa indisponível.'; end if;
end $$;
revoke all on function public.project_time_data(uuid,text), public.save_time_entry(uuid,uuid,text,text,text,date,integer,text), public.set_team_hourly_cost(uuid,text,numeric) from public;
grant execute on function public.project_time_data(uuid,text), public.save_time_entry(uuid,uuid,text,text,text,date,integer,text), public.set_team_hourly_cost(uuid,text,numeric) to authenticated;
notify pgrst, 'reload schema';
commit;
