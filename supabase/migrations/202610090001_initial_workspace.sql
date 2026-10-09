-- Promage: estrutura inicial. Aplicar uma vez num projeto Supabase novo.
begin;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  created_at timestamptz not null default now()
);
create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members(user_id);

-- A leitura de membros usa uma função para evitar recursão das políticas RLS.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create function private.is_member(workspace uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.organization_members m where m.organization_id = workspace and m.user_id = (select auth.uid()));
$$;
create function private.is_manager(workspace uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.organization_members m where m.organization_id = workspace and m.user_id = (select auth.uid()) and m.role in ('owner', 'manager'));
$$;
revoke all on function private.is_member(uuid), private.is_manager(uuid) from public;
grant execute on function private.is_member(uuid), private.is_manager(uuid) to authenticated;

create function public.create_workspace(workspace_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare workspace_id uuid;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
  if workspace_name is null or length(trim(workspace_name)) not between 1 and 200 then raise exception 'Nome inválido'; end if;
  insert into public.organizations(name) values(trim(workspace_name)) returning id into workspace_id;
  insert into public.organization_members(organization_id, user_id, role) values(workspace_id, auth.uid(), 'owner');
  return workspace_id;
end;
$$;
revoke all on function public.create_workspace(text) from public;
grant execute on function public.create_workspace(text) to authenticated;

-- IDs text preservam os identificadores antigos. Todas as relações incluem o gabinete.
create table public.clients (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null, type text not null default 'Quente' check (type in ('Frio','Quente')),
  email text not null default '', phone text not null default '', address text, nif text,
  created_at timestamptz not null default now(), primary key (organization_id,id)
);
create table public.team_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null default gen_random_uuid()::text, name text not null, role text not null default '',
  fee numeric(14,2) not null default 0 check(fee >= 0), email text not null default '', phone text not null default '',
  status text not null default 'Ativo' check(status in ('Ativo','Inativo')),
  primary key(organization_id,id)
);
create table public.suppliers (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null default gen_random_uuid()::text, name text not null, category text not null default '',
  email text not null default '', phone text not null default '', address text, nif text,
  primary key(organization_id,id)
);
create table public.budgets (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null default gen_random_uuid()::text, client_id text, title text not null,
  value numeric(14,2) not null check(value >= 0), pricing_mode text not null check(pricing_mode in ('PHASES','GLOBAL')),
  status text not null check(status in ('Pendente','Aceite','Recusado','Cancelado')), date date not null,
  description text not null default '', phases jsonb not null default '[]'::jsonb check(jsonb_typeof(phases) = 'array'),
  primary key(organization_id,id), foreign key(organization_id,client_id) references public.clients(organization_id,id)
);
create table public.processes (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null default gen_random_uuid()::text, code text not null, title text not null, client_id text,
  status text not null check(status in ('Início','Projeto','Execução','Finalizado')),
  budget numeric(14,2) not null default 0 check(budget >= 0), pricing_mode text not null check(pricing_mode in ('PHASES','GLOBAL')),
  start_date date not null, source_portfolio_id text,
  created_at timestamptz not null default now(),
  primary key(organization_id,id), unique(organization_id,code), unique(organization_id,source_portfolio_id),
  foreign key(organization_id,client_id) references public.clients(organization_id,id)
);
create table public.phases (
  organization_id uuid not null, process_id text not null,
  id text not null default gen_random_uuid()::text, name text not null,
  value numeric(14,2) not null default 0 check(value >= 0),
  status text not null check(status in ('Pendente','Adjudicado','Em Execução','Concluído')),
  start_date date, end_date date, completed_at date, responsible text, blocker text,
  position integer not null default 0,
  primary key(organization_id,id), unique(organization_id,process_id,id),
  foreign key(organization_id,process_id) references public.processes(organization_id,id) on delete cascade,
  check(start_date is null or end_date is null or end_date >= start_date),
  check(completed_at is null or status = 'Concluído')
);
create table public.tasks (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null default gen_random_uuid()::text, process_id text, phase_id text, title text not null,
  priority integer not null default 3 check(priority between 1 and 5),
  status text not null check(status in ('Pendente','Em Curso','Concluído')),
  start_date date, due_date date not null, assigned_to text, notes text, legacy_ticket jsonb,
  primary key(organization_id,id),
  foreign key(organization_id,process_id) references public.processes(organization_id,id),
  foreign key(organization_id,process_id,phase_id) references public.phases(organization_id,process_id,id),
  check(phase_id is null or process_id is not null),
  check(start_date is null or due_date >= start_date)
);
create index tasks_due_idx on public.tasks(organization_id,due_date) where status <> 'Concluído';
create table public.payment_schedules (
  organization_id uuid not null, id text not null default gen_random_uuid()::text, process_id text not null,
  description text not null, direction text not null check(direction in ('INCOME','EXPENSE')),
  amount numeric(14,2) not null check(amount > 0), rule text not null check(rule in ('DATE','PHASE')),
  due_date date, phase_id text, offset_days integer not null default 0 check(offset_days >= 0),
  primary key(organization_id,id),
  foreign key(organization_id,process_id) references public.processes(organization_id,id),
  foreign key(organization_id,process_id,phase_id) references public.phases(organization_id,process_id,id),
  check((rule = 'DATE' and due_date is not null) or (rule = 'PHASE' and phase_id is not null))
);
create table public.settlements (
  organization_id uuid not null, id text not null default gen_random_uuid()::text, payment_id text not null,
  amount numeric(14,2) not null check(amount > 0), date date not null,
  primary key(organization_id,id),
  foreign key(organization_id,payment_id) references public.payment_schedules(organization_id,id)
);
-- Serializa liquidações da mesma parcela para impedir sobrepagamento concorrente.
create function private.check_settlement()
returns trigger language plpgsql set search_path = '' as $$
declare planned numeric; settled numeric;
begin
  select amount into planned from public.payment_schedules
    where organization_id = new.organization_id and id = new.payment_id for update;
  if planned is null then raise exception 'Parcela inexistente'; end if;
  select coalesce(sum(amount),0) into settled from public.settlements
    where organization_id = new.organization_id and payment_id = new.payment_id and id <> new.id;
  if settled + new.amount > planned then raise exception 'O movimento ultrapassa o saldo da parcela'; end if;
  if new.date > current_date then raise exception 'A data efetiva não pode estar no futuro'; end if;
  return new;
end;
$$;
create trigger validate_settlement before insert on public.settlements for each row execute function private.check_settlement();
create function private.check_payment_amount()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.amount < (select coalesce(sum(amount),0) from public.settlements where organization_id = old.organization_id and payment_id = old.id) then
    raise exception 'O valor da parcela não pode ser inferior ao montante liquidado';
  end if;
  return new;
end;
$$;
create trigger validate_payment_amount before update on public.payment_schedules for each row execute function private.check_payment_amount();

create table public.subcontracts (
  organization_id uuid not null, id text not null default gen_random_uuid()::text, process_id text not null,
  company_name text not null, service text not null default '', value numeric(14,2) not null check(value >= 0),
  phase_ids text[] not null default '{}', primary key(organization_id,id),
  foreign key(organization_id,process_id) references public.processes(organization_id,id)
);
create table public.expenses (
  organization_id uuid not null, id text not null default gen_random_uuid()::text, process_id text not null,
  description text not null, value numeric(14,2) not null check(value > 0), date date not null,
  primary key(organization_id,id), foreign key(organization_id,process_id) references public.processes(organization_id,id)
);
create table public.financial_transactions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null default gen_random_uuid()::text, type text not null check(type in ('INCOME','EXPENSE')),
  category text not null, description text not null, value numeric(14,2) not null check(value > 0),
  date date not null, status text not null check(status in ('Pendente','Pago','Atrasado')),
  entity_name text not null, frequency text not null check(frequency in ('Pontual','Recorrente')),
  primary key(organization_id,id)
);
create table public.documents (
  organization_id uuid not null, id text not null default gen_random_uuid()::text, process_id text not null,
  name text not null, category text not null, type text not null, size text, date date not null,
  storage_path text, primary key(organization_id,id),
  foreign key(organization_id,process_id) references public.processes(organization_id,id)
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
create policy organizations_read on public.organizations for select to authenticated using(private.is_member(id));
create policy organizations_update on public.organizations for update to authenticated using(private.is_manager(id)) with check(private.is_manager(id));
create policy members_read on public.organization_members for select to authenticated using(private.is_member(organization_id));
-- Convites e alterações de cargos ficam reservados a uma futura função controlada.
revoke all on public.organizations, public.organization_members from authenticated;
grant select, update on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
revoke all on public.organizations, public.organization_members from anon;

do $$
declare table_name text;
begin
  foreach table_name in array array['clients','team_members','suppliers','budgets','processes','phases','tasks','payment_schedules','settlements','subcontracts','expenses','financial_transactions','documents'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on public.%I from anon',table_name);
    execute format('revoke all on public.%I from authenticated',table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated',table_name);
    execute format('create policy tenant_read on public.%I for select to authenticated using(private.is_member(organization_id))',table_name);
    execute format('create policy tenant_insert on public.%I for insert to authenticated with check(private.is_manager(organization_id))',table_name);
    if table_name <> 'settlements' then
      execute format('create policy tenant_update on public.%I for update to authenticated using(private.is_manager(organization_id)) with check(private.is_manager(organization_id))',table_name);
      execute format('create policy tenant_delete on public.%I for delete to authenticated using(private.is_manager(organization_id))',table_name);
    end if;
  end loop;
end;
$$;
-- A equipa pode atualizar tarefas. Dados financeiros continuam editáveis só por gestores.
create policy team_tasks_insert on public.tasks for insert to authenticated with check(private.is_member(organization_id));
create policy team_tasks_update on public.tasks for update to authenticated using(private.is_member(organization_id)) with check(private.is_member(organization_id));
-- Liquidações são imutáveis nesta primeira estrutura; correções exigem procedimento próprio.
revoke update, delete on public.settlements from authenticated;
commit;
