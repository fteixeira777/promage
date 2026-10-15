-- Aplicar depois de 202610090001_initial_workspace.sql. Operação transacional.
begin;
create function private.is_owner(workspace uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_members where organization_id=workspace and user_id=auth.uid() and role='owner');
$$;
revoke all on function private.is_owner(uuid) from public;
grant execute on function private.is_owner(uuid) to authenticated;

create table public.workspace_invitations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 email text not null check(email=lower(trim(email)) and position('@' in email)>1),
 role text not null check(role in ('manager','member')), invited_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days',
 accepted_at timestamptz, revoked_at timestamptz
);
create unique index invitation_pending_email on public.workspace_invitations(organization_id,email) where accepted_at is null and revoked_at is null;
alter table public.workspace_invitations enable row level security;
revoke all on public.workspace_invitations from anon, authenticated;
alter table public.team_members add column user_id uuid references auth.users(id) on delete set null;
create unique index team_account_unique on public.team_members(organization_id,user_id) where user_id is not null;

create function public.invite_workspace_member(workspace uuid, recipient text, access_role text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; address text:=lower(trim(recipient));
begin
 perform 1 from public.organizations where id=workspace for update;
 if not private.is_owner(workspace) then raise exception 'Apenas o proprietário pode convidar.'; end if;
 if access_role is null or access_role not in ('manager','member') or address is null or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Email ou nível de acesso inválido.'; end if;
 if exists(select 1 from public.organization_members m join auth.users u on u.id=m.user_id where m.organization_id=workspace and lower(u.email)=address) then raise exception 'Esta conta já pertence ao gabinete.'; end if;
 update public.workspace_invitations set revoked_at=now() where organization_id=workspace and email=address and accepted_at is null and revoked_at is null and expires_at<=now();
 if exists(select 1 from public.workspace_invitations where organization_id=workspace and email=address and accepted_at is null and revoked_at is null) then raise exception 'Já existe um convite pendente para este email.'; end if;
 insert into public.workspace_invitations(organization_id,email,role,invited_by) values(workspace,address,access_role,auth.uid()) returning id into result;
 return result;
end;
$$;
create function public.my_workspace_invitations() returns table(id uuid, organization_name text, role text, expires_at timestamptz)
language sql stable security definer set search_path='' as $$
 select i.id,o.name,i.role,i.expires_at from public.workspace_invitations i join public.organizations o on o.id=i.organization_id
 join auth.users u on u.id=auth.uid() and lower(u.email)=i.email and u.email_confirmed_at is not null
 where i.accepted_at is null and i.revoked_at is null and i.expires_at>now()
 and exists(select 1 from public.organization_members m where m.organization_id=i.organization_id and m.user_id=i.invited_by and m.role='owner');
$$;
create function public.accept_workspace_invitation(invitation uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare invite public.workspace_invitations; workspace uuid; address text;
begin
 select organization_id into workspace from public.workspace_invitations where id=invitation;
 -- Mesma ordem de bloqueio usada nas alterações de acesso e revogações.
 perform 1 from public.organizations where id=workspace for update;
 select * into invite from public.workspace_invitations where id=invitation for update;
 select lower(email) into address from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if invite.id is null or address is null or address<>invite.email or invite.accepted_at is not null or invite.revoked_at is not null or invite.expires_at<=now()
 or not exists(select 1 from public.organization_members where organization_id=workspace and user_id=invite.invited_by and role='owner') then raise exception 'Convite indisponível para esta conta.'; end if;
 insert into public.organization_members(organization_id,user_id,role) values(workspace,auth.uid(),invite.role) on conflict do nothing;
 insert into public.team_members(organization_id,user_id,name,email,role) values(workspace,auth.uid(),address,address,'Colaborador') on conflict(organization_id,user_id) where user_id is not null do update set status='Ativo';
 update public.workspace_invitations set accepted_at=now() where id=invitation;
 return workspace;
end;
$$;
create function public.workspace_access(workspace uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_owner(workspace) then raise exception 'Apenas o proprietário pode consultar os acessos.'; end if;
 return jsonb_build_object('members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'role',m.role)) from public.organization_members m join auth.users u on u.id=m.user_id where m.organization_id=workspace),'[]'::jsonb),
 'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'email',email,'role',role,'expires_at',expires_at)) from public.workspace_invitations where organization_id=workspace and accepted_at is null and revoked_at is null),'[]'::jsonb));
end;
$$;
create function public.revoke_workspace_invitation(workspace uuid, invitation uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.organizations where id=workspace for update;
 if not private.is_owner(workspace) then raise exception 'Apenas o proprietário pode revogar convites.'; end if;
 update public.workspace_invitations set revoked_at=now() where id=invitation and organization_id=workspace and accepted_at is null and revoked_at is null;
end;
$$;
create function public.change_workspace_access(workspace uuid, account uuid, access_role text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.organizations where id=workspace for update;
 if not private.is_owner(workspace) then raise exception 'Apenas o proprietário pode gerir acessos.'; end if;
 if account=auth.uid() or exists(select 1 from public.organization_members where organization_id=workspace and user_id=account and role='owner') then raise exception 'O acesso do proprietário não pode ser alterado aqui.'; end if;
 if access_role is null then
   delete from public.organization_members where organization_id=workspace and user_id=account;
   update public.team_members set status='Inativo' where organization_id=workspace and user_id=account;
 elsif access_role in ('manager','member') then
   update public.organization_members set role=access_role where organization_id=workspace and user_id=account;
 else raise exception 'Nível de acesso inválido.';
 end if;
end;
$$;

-- Colaboradores obtêm apenas a projeção de planeamento, sem campos financeiros.
do $$ declare t text; begin
 foreach t in array array['processes','phases','team_members','budgets','suppliers','subcontracts','expenses','payment_schedules','settlements','financial_transactions'] loop
   execute format('drop policy tenant_read on public.%I',t);
   execute format('create policy tenant_read on public.%I for select to authenticated using(private.is_manager(organization_id))',t);
 end loop;
end $$;
create function public.member_planning(workspace uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_member(workspace) then raise exception 'Sem acesso ao gabinete.'; end if;
 return jsonb_build_object('processes',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'code',p.code,'title',p.title,'client_id',p.client_id,'status',p.status,'start_date',p.start_date,'budget',0,'pricing_mode','GLOBAL',
 'phases',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'value',0,'status',f.status,'start_date',f.start_date,'end_date',f.end_date,'completed_at',f.completed_at,'responsible',f.responsible,'blocker',f.blocker,'position',f.position)) from public.phases f where f.organization_id=workspace and f.process_id=p.id),'[]'::jsonb))) from public.processes p where p.organization_id=workspace),'[]'::jsonb),
 'team',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'role',role,'email',email,'phone',phone,'status',status,'fee',0)) from public.team_members where organization_id=workspace),'[]'::jsonb));
end;
$$;
revoke all on function public.invite_workspace_member(uuid,text,text), public.my_workspace_invitations(), public.accept_workspace_invitation(uuid), public.workspace_access(uuid), public.revoke_workspace_invitation(uuid,uuid), public.change_workspace_access(uuid,uuid,text), public.member_planning(uuid) from public;
grant execute on function public.invite_workspace_member(uuid,text,text), public.my_workspace_invitations(), public.accept_workspace_invitation(uuid), public.workspace_access(uuid), public.revoke_workspace_invitation(uuid,uuid), public.change_workspace_access(uuid,uuid,text), public.member_planning(uuid) to authenticated;
commit;
