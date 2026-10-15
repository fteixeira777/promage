-- Repetível; não apaga despesas nem pagamentos.
begin;
create table if not exists public.office_expense_plans (
 organization_id uuid not null references public.organizations(id), id uuid not null,
 description text not null check(length(trim(description)) between 1 and 200), category text not null,
 amount numeric(14,2) not null check(amount>0), first_due date not null,
 occurrences integer not null check(occurrences between 1 and 60), created_at timestamptz not null default now(),
 primary key(organization_id,id)
);
create table if not exists public.office_expenses (
 organization_id uuid not null, id uuid not null default gen_random_uuid(), plan_id uuid not null,
 occurrence integer not null, description text not null, category text not null,
 amount numeric(14,2) not null check(amount>0), due_date date not null,
 status text not null default 'planned' check(status in ('planned','paid','cancelled')),
 paid_on date, primary key(organization_id,id), unique(organization_id,plan_id,occurrence),
 foreign key(organization_id,plan_id) references public.office_expense_plans(organization_id,id),
 check((status='paid' and paid_on is not null) or (status<>'paid' and paid_on is null))
);
create index if not exists office_expenses_due_idx on public.office_expenses(organization_id,due_date,id);
alter table public.office_expense_plans enable row level security;
alter table public.office_expenses enable row level security;
revoke all on public.office_expense_plans,public.office_expenses from anon,authenticated;
grant select on public.office_expense_plans,public.office_expenses to authenticated;
drop policy if exists office_plan_read on public.office_expense_plans;
create policy office_plan_read on public.office_expense_plans for select to authenticated using(private.is_manager(organization_id));
drop policy if exists office_expense_read on public.office_expenses;
create policy office_expense_read on public.office_expenses for select to authenticated using(private.is_manager(organization_id));

create or replace function public.create_office_expenses(workspace uuid, request_id uuid, title text, expense_category text, value numeric, first_date date, months integer) returns void
language plpgsql security definer set search_path='' as $$
declare previous public.office_expense_plans;
begin
 perform 1 from public.organizations where id=workspace for update;
 if not private.is_manager(workspace) then raise exception 'Apenas a gestão pode registar despesas gerais.'; end if;
 if request_id is null or title is null or length(trim(title)) not between 1 and 200 or expense_category is null or expense_category not in ('Renda','Salários','Software','Seguros','Serviços','Impostos','Outros') or value is null or value<=0 or value<>round(value,2) or first_date is null or months is null or months not between 1 and 60 then raise exception 'Preenche descrição, categoria, valor positivo, data e número de ocorrências entre 1 e 60.'; end if;
 select * into previous from public.office_expense_plans where organization_id=workspace and id=request_id;
 if found then
   if previous.description=trim(title) and previous.category=expense_category and previous.amount=value and previous.first_due=first_date and previous.occurrences=months then return; end if;
   raise exception 'Esta operação já foi guardada com outros valores. Atualiza a lista.';
 end if;
 insert into public.office_expense_plans(organization_id,id,description,category,amount,first_due,occurrences) values(workspace,request_id,trim(title),expense_category,value,first_date,months);
 -- Calcula sempre a partir da primeira data: 31 jan → 28/29 fev → 31 mar.
 insert into public.office_expenses(organization_id,plan_id,occurrence,description,category,amount,due_date)
 select workspace,request_id,i+1,trim(title),expense_category,value,(first_date + i*interval '1 month')::date from generate_series(0,months-1) i;
end $$;

create or replace function public.change_office_expense(workspace uuid, expense uuid, operation text, expected_amount numeric, payment_date date default null, new_amount numeric default null, new_due date default null) returns void
language plpgsql security definer set search_path='' as $$
declare item public.office_expenses;
begin
 if not private.is_manager(workspace) then raise exception 'Apenas a gestão pode alterar despesas gerais.'; end if;
 select * into item from public.office_expenses where organization_id=workspace and id=expense for update;
 if not found then raise exception 'Despesa indisponível.'; end if;
 if expected_amount is distinct from item.amount then raise exception 'O valor foi alterado. Atualiza antes de continuar.'; end if;
 if operation='pay' and item.status='paid' and item.paid_on=payment_date then return; end if;
 if item.status='paid' then raise exception 'Um pagamento registado não pode ser alterado nesta versão.'; end if;
 if operation='pay' then
   if item.status<>'planned' or payment_date is null or payment_date>(now() at time zone 'Europe/Lisbon')::date then raise exception 'Indica uma data até hoje para uma despesa pendente.'; end if;
   update public.office_expenses set status='paid',paid_on=payment_date where organization_id=workspace and id=expense;
 elsif operation='cancel' then
   update public.office_expenses set status='cancelled' where organization_id=workspace and id=expense;
 elsif operation='restore' then
   update public.office_expenses set status='planned' where organization_id=workspace and id=expense;
 elsif operation='edit' then
   if item.status<>'planned' or new_amount is null or new_amount<=0 or new_amount<>round(new_amount,2) or new_due is null then raise exception 'Indica valor positivo e vencimento para uma despesa pendente.'; end if;
   update public.office_expenses set amount=new_amount,due_date=new_due where organization_id=workspace and id=expense;
 else raise exception 'Operação inválida.';
 end if;
end $$;
revoke all on function public.create_office_expenses(uuid,uuid,text,text,numeric,date,integer),public.change_office_expense(uuid,uuid,text,numeric,date,numeric,date) from public;
grant execute on function public.create_office_expenses(uuid,uuid,text,text,numeric,date,integer),public.change_office_expense(uuid,uuid,text,numeric,date,numeric,date) to authenticated;
notify pgrst,'reload schema';
commit;
