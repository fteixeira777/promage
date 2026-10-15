-- Executar em desenvolvimento após as três migrações. Todas as fixtures são revertidas.
-- Não testa o transporte real de ficheiros: testar upload/download também com duas contas na aplicação.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('41000000-0000-0000-0000-000000000001','portal-owner@example.invalid',now()),
 ('41000000-0000-0000-0000-000000000002','portal-client@example.invalid',now()),
 ('41000000-0000-0000-0000-000000000003','portal-other@example.invalid',now()),
 ('41000000-0000-0000-0000-000000000004','portal-unconfirmed@example.invalid',null);
insert into public.organizations(id,name) values('42000000-0000-0000-0000-000000000001','Portal test');
insert into public.organization_members(organization_id,user_id,role) values('42000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','owner');
insert into public.clients(organization_id,id,name) values('42000000-0000-0000-0000-000000000001','client','Client'),('42000000-0000-0000-0000-000000000001','other','Other');
insert into public.processes(organization_id,id,client_id,code,title,status,budget,pricing_mode,start_date) values('42000000-0000-0000-0000-000000000001','p','client','TEST','Portal test','Início',9999,'GLOBAL',current_date);
insert into public.phases(organization_id,process_id,id,name,value,status,position,blocker) values
 ('42000000-0000-0000-0000-000000000001','p','visible','Public phase',999,'Pendente',0,'Private note'),
 ('42000000-0000-0000-0000-000000000001','p','hidden','Secret phase',777,'Pendente',1,'Secret');
set local role authenticated;
select set_config('request.jwt.claim.sub','41000000-0000-0000-0000-000000000001',true);
select public.configure_client_portal('42000000-0000-0000-0000-000000000001','p',true,array['visible'],array['portal-client@example.invalid','portal-unconfirmed@example.invalid']);
select set_config('test.request',public.request_client_document('42000000-0000-0000-0000-000000000001','p','Planta','PDF',current_date)::text,true);
select set_config('request.jwt.claim.sub','41000000-0000-0000-0000-000000000002',true);
do $$ declare result jsonb; upload jsonb; denied boolean:=false; begin
 result:=public.portal_project_data('42000000-0000-0000-0000-000000000001','p');
 if jsonb_array_length(result->'phases')<>1 or result::text like '%999%' or result::text like '%Private note%' or result::text like '%Secret%' then raise exception 'FAIL: private fields leaked'; end if;
 if exists(select 1 from public.processes) or exists(select 1 from public.organization_members) then raise exception 'FAIL: client received internal membership or records'; end if;
 upload:=public.prepare_client_upload(current_setting('test.request')::uuid,'plan.pdf','application/pdf',100);
 perform set_config('test.file',upload->>'id',true); perform set_config('test.path',upload->>'path',true);
 if not private.can_upload_client_file(upload->>'path') or private.can_read_client_file(upload->>'path') then raise exception 'FAIL: pending file policy'; end if;
 begin perform public.finish_client_upload((upload->>'id')::uuid); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: finalized nonexistent object'; end if;
 denied:=false;
 begin perform public.configure_client_portal('42000000-0000-0000-0000-000000000001','p',true,array['hidden'],array['portal-other@example.invalid']); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: client changed publication'; end if;
end $$;
select set_config('request.jwt.claim.sub','41000000-0000-0000-0000-000000000003',true);
do $$ declare denied boolean:=false; begin
 if public.my_client_projects()<>'[]'::jsonb then raise exception 'FAIL: unrelated client sees projects'; end if;
 if private.can_upload_client_file(current_setting('test.path')) or private.can_read_client_file(current_setting('test.path')) then raise exception 'FAIL: unrelated file access'; end if;
 begin perform public.portal_project_data('42000000-0000-0000-0000-000000000001','p'); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: guessed project access'; end if;
end $$;
select set_config('request.jwt.claim.sub','41000000-0000-0000-0000-000000000004',true);
do $$ begin if public.my_client_projects()<>'[]'::jsonb then raise exception 'FAIL: unconfirmed email access'; end if; end $$;
-- Alterar o cliente titular invalida imediatamente o acesso anterior.
reset role;
update public.processes set client_id='other' where organization_id='42000000-0000-0000-0000-000000000001' and id='p';
set local role authenticated;
select set_config('request.jwt.claim.sub','41000000-0000-0000-0000-000000000002',true);
do $$ begin
 if public.my_client_projects()<>'[]'::jsonb or private.can_upload_client_file(current_setting('test.path')) then raise exception 'FAIL: changed client retains access'; end if;
end $$;
reset role;
rollback;
