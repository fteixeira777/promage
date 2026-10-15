-- Executar após as duas migrações, em desenvolvimento. Não deixa dados: ROLLBACK no fim.
begin;
insert into auth.users(id,email,email_confirmed_at) values
('31000000-0000-0000-0000-000000000001','owner@test.invalid',now()),
('31000000-0000-0000-0000-000000000002','member@test.invalid',now()),
('31000000-0000-0000-0000-000000000003','other@test.invalid',now());
insert into public.organizations(id,name) values('32000000-0000-0000-0000-000000000001','Test access');
insert into public.organization_members(organization_id,user_id,role) values('32000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','owner');
insert into public.processes(organization_id,id,code,title,status,budget,pricing_mode,start_date) values('32000000-0000-0000-0000-000000000001','test-process','TEST','Test','Início',12345,'GLOBAL',current_date);
set local role authenticated;
select set_config('request.jwt.claim.sub','31000000-0000-0000-0000-000000000001',true);
select set_config('test.invitation',public.invite_workspace_member('32000000-0000-0000-0000-000000000001','member@test.invalid','member')::text,true);
select set_config('request.jwt.claim.sub','31000000-0000-0000-0000-000000000003',true);
do $$ declare denied boolean:=false; begin
 begin perform public.accept_workspace_invitation(current_setting('test.invitation')::uuid); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: wrong email accepted invitation'; end if;
 if exists(select 1 from public.my_workspace_invitations()) then raise exception 'FAIL: invitation exposed to another email'; end if;
end $$;
select set_config('request.jwt.claim.sub','31000000-0000-0000-0000-000000000002',true);
select public.accept_workspace_invitation(current_setting('test.invitation')::uuid);
do $$ declare denied boolean:=false; planning jsonb; begin
 if exists(select 1 from public.processes where id='test-process') then raise exception 'FAIL: financial process fields exposed'; end if;
 planning:=public.member_planning('32000000-0000-0000-0000-000000000001');
 if planning->'processes'->0->>'title'<>'Test' or (planning->'processes'->0->>'budget')::numeric<>0 then raise exception 'FAIL: unsafe planning projection'; end if;
 begin perform public.change_workspace_access('32000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000002','manager'); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: member elevated privileges'; end if;
 denied:=false;
 begin perform public.accept_workspace_invitation(current_setting('test.invitation')::uuid); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: reused invitation'; end if;
end $$;
select set_config('request.jwt.claim.sub','31000000-0000-0000-0000-000000000001',true);
do $$ declare denied boolean:=false; begin
 begin perform public.change_workspace_access('32000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001',null); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: removed owner'; end if;
end $$;
select public.change_workspace_access('32000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000002',null);
select set_config('request.jwt.claim.sub','31000000-0000-0000-0000-000000000002',true);
do $$ declare denied boolean:=false; begin
 begin perform public.member_planning('32000000-0000-0000-0000-000000000001'); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: removed member still accesses planning'; end if;
end $$;
reset role;
rollback;
