-- Executar no SQL Editor de desenvolvimento após 202610130004_cost_payments.sql.
-- Verifica as restrições da base de dados; reverte todos os dados no fim.
begin;
do $$
declare org uuid := gen_random_uuid(); other_org uuid := gen_random_uuid(); denied boolean;
begin
  insert into public.organizations(id,name) values (org,'Cost test'),(other_org,'Other cost test');
  insert into public.processes(organization_id,id,code,title,status,budget,pricing_mode,start_date)
    values (org,'p','TEST1','Test','Início',2000,'GLOBAL',current_date),
           (org,'other','TEST2','Other','Início',2000,'GLOBAL',current_date),
           (other_org,'p','TEST1','Other office','Início',2000,'GLOBAL',current_date);
  insert into public.subcontracts(organization_id,process_id,id,company_name,value)
    values(org,'p','s','Engineer',2000),(org,'other','other-cost','Other',50),(other_org,'p','foreign-cost','Foreign',50);
  insert into public.expenses(organization_id,process_id,id,description,value,date)
    values(org,'p','e','Expense',100,current_date);
  insert into public.payment_schedules(organization_id,process_id,id,description,direction,amount,rule,due_date,subcontract_id)
    values(org,'p','a','First','EXPENSE',1000,'DATE',current_date,'s'),
          (org,'p','b','Second','EXPENSE',1000,'DATE',current_date,'s'),
          (org,'p','legacy','Legacy','EXPENSE',100,'DATE',current_date,null);
  insert into public.settlements(organization_id,payment_id,amount,date) values(org,'a',200,current_date);
  update public.payment_schedules set expense_id='e' where organization_id=org and id='legacy';
  denied:=false;
  begin update public.payment_schedules set expense_id='e' where organization_id=org and id='a';
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'FAIL: two costs accepted'; end if;
  denied:=false;
  begin update public.payment_schedules set direction='INCOME' where organization_id=org and id='a';
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'FAIL: income linked to a cost'; end if;
  denied:=false;
  begin update public.payment_schedules set subcontract_id='other-cost' where organization_id=org and id='a';
  exception when foreign_key_violation then denied:=true; end;
  if not denied then raise exception 'FAIL: cost from another project accepted'; end if;
  denied:=false;
  begin update public.payment_schedules set subcontract_id='foreign-cost' where organization_id=org and id='a';
  exception when foreign_key_violation then denied:=true; end;
  if not denied then raise exception 'FAIL: cost from another office accepted'; end if;
  if (select sum(amount) from public.settlements where organization_id=org and payment_id='a') <> 200 then raise exception 'FAIL: settlement changed'; end if;
end $$;
rollback;
