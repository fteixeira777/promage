-- Executar no SQL Editor APÓS a migração, num projeto de desenvolvimento.
-- Tudo é revertido no final. Estes testes ainda não foram executados num servidor.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-0000-0000-000000000001','rls-a@example.invalid'),
 ('10000000-0000-0000-0000-000000000002','rls-b@example.invalid');
insert into public.organizations(id,name) values
 ('20000000-0000-0000-0000-000000000001','RLS A'),
 ('20000000-0000-0000-0000-000000000002','RLS B');
insert into public.organization_members(organization_id,user_id,role) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','owner'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','owner');
insert into public.clients(organization_id,id,name) values
 ('20000000-0000-0000-0000-000000000001','rls-client','Cliente A'),
 ('20000000-0000-0000-0000-000000000002','rls-client','Cliente B');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
declare blocked boolean := false; affected integer;
begin
  if not exists(select 1 from public.clients where name = 'Cliente A') then raise exception 'Falhou: acesso ao próprio gabinete'; end if;
  if exists(select 1 from public.clients where name = 'Cliente B') then raise exception 'Falhou: leitura entre gabinetes'; end if;
  begin
    insert into public.clients(organization_id,id,name) values('20000000-0000-0000-0000-000000000002','unauthorized','Não permitido');
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'Falhou: inserção entre gabinetes'; end if;
  update public.clients set name = 'Não permitido' where organization_id = '20000000-0000-0000-0000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Falhou: alteração entre gabinetes'; end if;
end;
$$;
reset role;
set local role anon;
do $$
declare blocked boolean := false;
begin
  begin
    perform 1 from public.clients;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'Falhou: acesso sem autenticação'; end if;
end;
$$;
reset role;
rollback;
