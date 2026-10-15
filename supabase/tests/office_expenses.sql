-- Após migração 007, em desenvolvimento. Reverte todos os dados.
begin;
insert into auth.users(id,email,email_confirmed_at) values
('71000000-0000-0000-0000-000000000001','expense-owner@test.invalid',now()),
('71000000-0000-0000-0000-000000000002','expense-member@test.invalid',now());
insert into public.organizations(id,name) values('72000000-0000-0000-0000-000000000001','Expenses test'),('72000000-0000-0000-0000-000000000002','Other office');
insert into public.organization_members(organization_id,user_id,role) values
('72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','owner'),
('72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000002','member');
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
select public.create_office_expenses('72000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001','Rent','Renda',100,'2028-01-31',3);
select public.create_office_expenses('72000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001','Rent','Renda',100,'2028-01-31',3);
do $$ declare item uuid; denied boolean:=false; dates date[]; begin
 select array_agg(due_date order by occurrence) into dates from public.office_expenses where organization_id='72000000-0000-0000-0000-000000000001';
 if dates<>array['2028-01-31'::date,'2028-02-29'::date,'2028-03-31'::date] then raise exception 'FAIL: recurring dates or retry duplicates'; end if;
 select id into item from public.office_expenses where organization_id='72000000-0000-0000-0000-000000000001' and occurrence=1;
 perform public.change_office_expense('72000000-0000-0000-0000-000000000001',item,'edit',100,null,120,'2028-02-01');
 begin perform public.change_office_expense('72000000-0000-0000-0000-000000000001',item,'pay',100,current_date); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: stale amount accepted'; end if;
 denied:=false;
 begin perform public.change_office_expense('72000000-0000-0000-0000-000000000001',item,'pay',120,current_date+2); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: future payment accepted'; end if;
 perform public.change_office_expense('72000000-0000-0000-0000-000000000001',item,'pay',120,current_date);
 perform public.change_office_expense('72000000-0000-0000-0000-000000000001',item,'pay',120,current_date);
 denied:=false;
 begin perform public.change_office_expense('72000000-0000-0000-0000-000000000001',item,'cancel',120); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: paid record cancelled'; end if;
 select id into item from public.office_expenses where organization_id='72000000-0000-0000-0000-000000000001' and occurrence=2;
 perform public.change_office_expense('72000000-0000-0000-0000-000000000001',item,'cancel',100);
 perform public.change_office_expense('72000000-0000-0000-0000-000000000001',item,'restore',100);
 if (select status from public.office_expenses where id=item)<>'planned' then raise exception 'FAIL: restore'; end if;
 denied:=false;
 begin perform public.change_office_expense('72000000-0000-0000-0000-000000000002',item,'pay',100,current_date); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: other workspace accepted'; end if;
end $$;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000002',true);
do $$ declare denied boolean:=false; begin
 if exists(select 1 from public.office_expenses) or exists(select 1 from public.office_expense_plans) then raise exception 'FAIL: member reads financial data'; end if;
 begin perform public.create_office_expenses('72000000-0000-0000-0000-000000000001',gen_random_uuid(),'Rent','Renda',100,current_date,1); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: member writes financial data'; end if;
end $$;
reset role;
rollback;
