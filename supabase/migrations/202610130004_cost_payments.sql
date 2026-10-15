-- Liga cada saída a um custo do mesmo gabinete e projeto.
-- As prestações anteriores ficam sem associação até serem classificadas.
begin;
alter table public.subcontracts add constraint subcontracts_project_id_key unique (organization_id,process_id,id);
alter table public.expenses add constraint expenses_project_id_key unique (organization_id,process_id,id);
alter table public.payment_schedules
  add column subcontract_id text,
  add column expense_id text,
  add constraint payment_one_cost check (not (subcontract_id is not null and expense_id is not null)),
  add constraint payment_outgoing_cost check (direction = 'EXPENSE' or (subcontract_id is null and expense_id is null)),
  add constraint payment_subcontract_fk foreign key (organization_id,process_id,subcontract_id)
    references public.subcontracts(organization_id,process_id,id),
  add constraint payment_expense_fk foreign key (organization_id,process_id,expense_id)
    references public.expenses(organization_id,process_id,id);
create index payment_subcontract_idx on public.payment_schedules(organization_id,process_id,subcontract_id) where subcontract_id is not null;
create index payment_expense_idx on public.payment_schedules(organization_id,process_id,expense_id) where expense_id is not null;
notify pgrst, 'reload schema';
commit;
