-- Aplicar depois das migrações 001 e 002. Sem alteração dos documentos internos existentes.
begin;
create table public.portal_projects (
 organization_id uuid not null, process_id text not null, client_id text not null,
 enabled boolean not null default false, phase_ids text[] not null default '{}',
 primary key(organization_id,process_id),
 foreign key(organization_id,process_id) references public.processes(organization_id,id),
 foreign key(organization_id,client_id) references public.clients(organization_id,id)
);
create table public.portal_access (
 organization_id uuid not null, process_id text not null, email text not null check(email=lower(trim(email))),
 primary key(organization_id,process_id,email),
 foreign key(organization_id,process_id) references public.portal_projects(organization_id,process_id) on delete cascade
);
create table public.portal_requests (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, process_id text not null,
 title text not null check(length(trim(title)) between 1 and 200), instructions text not null default '',
 due_date date, status text not null default 'requested' check(status in ('requested','submitted','accepted')),
 feedback text not null default '', created_at timestamptz not null default now(),
 unique(organization_id,process_id,id),
 foreign key(organization_id,process_id) references public.portal_projects(organization_id,process_id)
);
create table public.portal_files (
 id uuid primary key, organization_id uuid not null, process_id text not null, request_id uuid not null,
 name text not null check(length(name) between 1 and 200), mime text not null, size bigint not null check(size between 1 and 10485760),
 storage_path text not null unique, uploaded_by uuid not null references auth.users(id),
 ready boolean not null default false, created_at timestamptz not null default now(),
 foreign key(organization_id,process_id,request_id) references public.portal_requests(organization_id,process_id,id)
);
alter table public.portal_projects enable row level security;
alter table public.portal_access enable row level security;
alter table public.portal_requests enable row level security;
alter table public.portal_files enable row level security;
revoke all on public.portal_projects,public.portal_access,public.portal_requests,public.portal_files from anon,authenticated;

create function private.is_portal_client(workspace uuid, project text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_access a join public.portal_projects s using(organization_id,process_id)
 join public.processes p on p.organization_id=s.organization_id and p.id=s.process_id and p.client_id=s.client_id
 join auth.users u on u.id=auth.uid() and lower(u.email)=a.email and u.email_confirmed_at is not null
 where a.organization_id=workspace and a.process_id=project and s.enabled);
$$;
revoke all on function private.is_portal_client(uuid,text) from public;
grant execute on function private.is_portal_client(uuid,text) to authenticated;

create function public.configure_client_portal(workspace uuid, project text, active boolean, published_phases text[], emails text[]) returns void
language plpgsql security definer set search_path='' as $$
declare client text; address text;
begin
 if not private.is_manager(workspace) then raise exception 'Apenas gestores podem configurar o portal.'; end if;
 select client_id into client from public.processes where organization_id=workspace and id=project for update;
 if client is null then raise exception 'Associa primeiro um cliente ao projeto.'; end if;
 if active is null or published_phases is null or emails is null then raise exception 'Configuração inválida.'; end if;
 if exists(select 1 from unnest(published_phases) v where not exists(select 1 from public.phases where organization_id=workspace and process_id=project and id=v)) then raise exception 'Fase de outro projeto.'; end if;
 foreach address in array emails loop
   if address is null or lower(trim(address)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Email inválido.'; end if;
 end loop;
 -- Não reutilizar os documentos do cliente anterior ao mudar o titular do projeto.
 if exists(select 1 from public.portal_projects where organization_id=workspace and process_id=project and client_id<>client) then
   if not active then update public.portal_projects set enabled=false where organization_id=workspace and process_id=project; return; end if;
   raise exception 'Este portal pertence ao cliente anterior. Cria um projeto separado para outro titular, preservando o histórico privado.';
 end if;
 insert into public.portal_projects(organization_id,process_id,client_id,enabled,phase_ids) values(workspace,project,client,active,published_phases)
 on conflict(organization_id,process_id) do update set enabled=excluded.enabled,phase_ids=excluded.phase_ids;
 delete from public.portal_access where organization_id=workspace and process_id=project;
 insert into public.portal_access(organization_id,process_id,email) select workspace,project,lower(trim(e)) from unnest(emails) e on conflict do nothing;
end;
$$;
create function public.portal_project_data(workspace uuid, project text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare manager boolean:=private.is_manager(workspace); result jsonb;
begin
 if not manager and not private.is_portal_client(workspace,project) then raise exception 'Sem acesso a este projeto.'; end if;
 select jsonb_build_object('organization_id',p.organization_id,'process_id',p.id,'title',p.title,'status',p.status,
 'enabled',coalesce(s.enabled,false),'phase_ids',coalesce(s.phase_ids,'{}'::text[]),
 'emails',case when manager then coalesce((select jsonb_agg(a.email) from public.portal_access a where a.organization_id=workspace and a.process_id=project),'[]'::jsonb) else '[]'::jsonb end,
 'phases',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'status',f.status,'end_date',f.end_date,'completed_at',f.completed_at) order by f.position) from public.phases f where f.organization_id=workspace and f.process_id=project and (manager or f.id=any(s.phase_ids))),'[]'::jsonb),
 'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'instructions',r.instructions,'due_date',r.due_date,'status',r.status,'feedback',r.feedback,
 'files',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'size',d.size,'storage_path',d.storage_path,'created_at',d.created_at) order by d.created_at) from public.portal_files d where d.request_id=r.id and d.ready),'[]'::jsonb)) order by r.created_at) from public.portal_requests r where r.organization_id=workspace and r.process_id=project),'[]'::jsonb)) into result
 from public.processes p left join public.portal_projects s on s.organization_id=p.organization_id and s.process_id=p.id where p.organization_id=workspace and p.id=project;
 if result is null then raise exception 'Projeto indisponível.'; end if;
 return result;
end;
$$;
create function public.my_client_projects() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('organization_id',p.organization_id,'process_id',p.id,'title',p.title,'organization_name',o.name)), '[]'::jsonb)
 from public.processes p join public.organizations o on o.id=p.organization_id where private.is_portal_client(p.organization_id,p.id);
$$;
create function public.request_client_document(workspace uuid, project text, document_title text, details text, deadline date) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.is_manager(workspace) then raise exception 'Sem permissão para pedir documentos.'; end if;
 if not exists(select 1 from public.portal_projects where organization_id=workspace and process_id=project) then raise exception 'Guarda primeiro a configuração do portal.'; end if;
 insert into public.portal_requests(organization_id,process_id,title,instructions,due_date) values(workspace,project,trim(document_title),coalesce(details,''),deadline) returning id into result;
 return result;
end;
$$;
create function public.review_client_document(document_request uuid, accepted boolean, response text) returns void
language plpgsql security definer set search_path='' as $$
declare r public.portal_requests;
begin
 select * into r from public.portal_requests where id=document_request for update;
 if r.id is null or not private.is_manager(r.organization_id) then raise exception 'Sem acesso ao pedido.'; end if;
 if accepted is null then raise exception 'Revisão inválida.'; end if;
 if accepted and not exists(select 1 from public.portal_files where request_id=r.id and ready) then raise exception 'Não existem ficheiros entregues.'; end if;
 update public.portal_requests set status=case when accepted then 'accepted' else 'requested' end,feedback=coalesce(response,'') where id=r.id;
end;
$$;
create function public.prepare_client_upload(document_request uuid, filename text, content_type text, bytes bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.portal_requests; file_id uuid:=gen_random_uuid(); object_path text;
begin
 select * into r from public.portal_requests where id=document_request for update;
 if r.id is null or not private.is_portal_client(r.organization_id,r.process_id) or r.status='accepted' then raise exception 'Este pedido não aceita entregas desta conta.'; end if;
 if content_type is null or content_type not in ('application/pdf','image/jpeg','image/png') or bytes is null or bytes not between 1 and 10485760 or filename is null or length(trim(filename)) not between 1 and 200 then raise exception 'Usa PDF, JPG ou PNG até 10 MB.'; end if;
 if not ((content_type='application/pdf' and filename ~* '\.pdf$') or (content_type='image/jpeg' and filename ~* '\.jpe?g$') or (content_type='image/png' and filename ~* '\.png$')) then raise exception 'O tipo do ficheiro não corresponde à extensão.'; end if;
 object_path:=r.organization_id::text||'/'||file_id::text;
 insert into public.portal_files(id,organization_id,process_id,request_id,name,mime,size,storage_path,uploaded_by) values(file_id,r.organization_id,r.process_id,r.id,filename,content_type,bytes,object_path,auth.uid());
 return jsonb_build_object('id',file_id,'path',object_path);
end;
$$;
create function public.finish_client_upload(file_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare f public.portal_files; r public.portal_requests;
begin
 select * into f from public.portal_files where id=file_id;
 if f.id is null or f.uploaded_by<>auth.uid() or not private.is_portal_client(f.organization_id,f.process_id) then raise exception 'Sem acesso à entrega.'; end if;
 select * into r from public.portal_requests where id=f.request_id for update;
 if f.ready then return; end if;
 if r.status='accepted' then raise exception 'O pedido já foi aceite.'; end if;
 if not exists(select 1 from storage.objects where bucket_id='promage-client-documents' and name=f.storage_path and (metadata->>'size')::bigint=f.size and metadata->>'mimetype'=f.mime) then raise exception 'O ficheiro ainda não foi entregue por completo ou tem um tipo diferente do indicado.'; end if;
 update public.portal_files set ready=true where id=f.id;
 update public.portal_requests set status='submitted' where id=f.request_id;
end;
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('promage-client-documents','promage-client-documents',false,10485760,array['application/pdf','image/jpeg','image/png']);
create function private.can_upload_client_file(object_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_files f join public.portal_requests r on r.id=f.request_id where f.storage_path=object_path and f.uploaded_by=auth.uid() and not f.ready and f.created_at>now()-interval '15 minutes' and r.status<>'accepted' and private.is_portal_client(f.organization_id,f.process_id));
$$;
create function private.can_read_client_file(object_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_files f where f.storage_path=object_path and f.ready and (private.is_manager(f.organization_id) or private.is_portal_client(f.organization_id,f.process_id)));
$$;
revoke all on function private.can_upload_client_file(text),private.can_read_client_file(text) from public;
grant execute on function private.can_upload_client_file(text),private.can_read_client_file(text) to authenticated;
create policy portal_file_insert on storage.objects for insert to authenticated with check(bucket_id='promage-client-documents' and private.can_upload_client_file(name));
create policy portal_file_read on storage.objects for select to authenticated using(bucket_id='promage-client-documents' and private.can_read_client_file(name));
-- Sem UPDATE/DELETE: não substituir uma entrega anterior ou alterar o histórico.
revoke all on function public.configure_client_portal(uuid,text,boolean,text[],text[]),public.portal_project_data(uuid,text),public.my_client_projects(),public.request_client_document(uuid,text,text,text,date),public.review_client_document(uuid,boolean,text),public.prepare_client_upload(uuid,text,text,bigint),public.finish_client_upload(uuid) from public;
grant execute on function public.configure_client_portal(uuid,text,boolean,text[],text[]),public.portal_project_data(uuid,text),public.my_client_projects(),public.request_client_document(uuid,text,text,text,date),public.review_client_document(uuid,boolean,text),public.prepare_client_upload(uuid,text,text,bigint),public.finish_client_upload(uuid) to authenticated;
commit;
