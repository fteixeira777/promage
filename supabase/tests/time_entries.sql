-- Executar em desenvolvimento após a migração 005. Todos os dados são revertidos.
begin;
insert into auth.users(id,email,email_confirmed_at) values
('51000000-0000-0000-0000-000000000001','hours-owner@test.invalid',now()),
('51000000-0000-0000-0000-000000000002','hours-member@test.invalid',now()),
('51000000-0000-0000-0000-000000000003','hours-outsider@test.invalid',now());
insert into public.organizations(id,name) values('52000000-0000-0000-0000-000000000001','Hours test');
insert into public.organization_members(organization_id,user_id,role) values
('52000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','owner'),
('52000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000002','member');
insert into public.team_members(organization_id,id,name,user_id) values
('52000000-0000-0000-0000-000000000001','member','Member','51000000-0000-0000-0000-000000000002'),
('52000000-0000-0000-0000-000000000001','other','Other',null);
insert into public.processes(organization_id,id,code,title,status,budget,pricing_mode,start_date) values
('52000000-0000-0000-0000-000000000001','p','HOURS1','Test','Início',1000,'GLOBAL',current_date),
('52000000-0000-0000-0000-000000000001','q','HOURS2','Other','Início',1000,'GLOBAL',current_date);
insert into public.phases(organization_id,process_id,id,name,value,status) values
('52000000-0000-0000-0000-000000000001','q','foreign-phase','Other phase',0,'Pendente');
set local role authenticated;
select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000001',true);
select public.set_team_hourly_cost('52000000-0000-0000-0000-000000000001','member',25);
select public.save_time_entry('52000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000001','p',null,'member',current_date,90,'First');
select public.set_team_hourly_cost('52000000-0000-0000-0000-000000000001','member',50);
-- A mesma chave pode ser repetida e editada sem duplicar, mantendo a tarifa original.
select public.save_time_entry('52000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000001','p',null,'member',current_date,120,'Edited');
do $$ declare denied boolean:=false; begin
 if (select hourly_cost from public.time_entries where id='53000000-0000-0000-0000-000000000001')<>25 then raise exception 'FAIL: historical rate changed'; end if;
 begin perform public.save_time_entry('52000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000002','p','foreign-phase','member',current_date,30,'Bad phase');
 exception when foreign_key_violation then denied:=true; end;
 if not denied then raise exception 'FAIL: phase from another project accepted'; end if;
end $$;
select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000002',true);
do $$ declare result jsonb; denied boolean:=false; begin
 result:=public.project_time_data('52000000-0000-0000-0000-000000000001','p');
 if jsonb_array_length(result->'entries')<>1 or result->'entries'->0 ? 'hourly_cost' or result->'people'->0 ? 'hourlyCost' then raise exception 'FAIL: unsafe member projection'; end if;
 if exists(select 1 from public.time_entries) then raise exception 'FAIL: member reads raw financial rows'; end if;
 if exists(select 1 from public.team_members) then raise exception 'FAIL: member reads raw rates'; end if;
 begin perform public.set_team_hourly_cost('52000000-0000-0000-0000-000000000001','member',1);
 exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: member changes hourly cost'; end if;
 denied:=false;
 begin perform public.save_time_entry('52000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000002','p',null,'other',current_date,30,'Impersonation');
 exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: member records hours for another person'; end if;
 denied:=false;
 begin perform public.save_time_entry('52000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000002','q',null,'member',current_date,1400,'Too long');
 exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: daily limit across projects'; end if;
 denied:=false;
 begin perform public.save_time_entry('52000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000002','p',null,'member',current_date+1,30,'Future');
 exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: future time accepted'; end if;
end $$;
select public.save_time_entry('52000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000002','p',null,'member',current_date,30,'Own work');
select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000003',true);
do $$ declare denied boolean:=false; begin
 begin perform public.project_time_data('52000000-0000-0000-0000-000000000001','p');
 exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: outsider access'; end if;
end $$;
reset role;
rollback;
