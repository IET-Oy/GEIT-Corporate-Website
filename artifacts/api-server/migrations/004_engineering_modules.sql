create table public.geit_engineering_projects(
 id uuid primary key default gen_random_uuid(),
 organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
 module text not null check(module in ('energy-consulting','energy-auditing','renewable-energy','battery-flexibility')),
 name text not null check(char_length(trim(name)) between 2 and 120),
 facility text not null check(char_length(trim(facility)) between 2 and 160),
 brief text not null check(char_length(trim(brief)) between 10 and 4000),
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 status text not null default 'draft' check(status in ('draft','active','completed')),
 archived boolean not null default false, created_by uuid not null,
 created_at timestamptz not null default now(), unique(id,organisation_id,module)
);
create table public.geit_engineering_scenarios(
 id uuid primary key default gen_random_uuid(),
 organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
 project_id uuid not null, module text not null,
 name text not null check(char_length(trim(name)) between 2 and 120),
 inputs jsonb not null, result jsonb not null, project_snapshot jsonb not null,
 input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'),
 signature text not null check(signature ~ '^[a-f0-9]{64}$'),
 created_by uuid not null, created_at timestamptz not null default now(),
 foreign key(project_id,organisation_id,module) references public.geit_engineering_projects(id,organisation_id,module)
);
create index geit_engineering_projects_scope on public.geit_engineering_projects(organisation_id,module);
create index geit_engineering_scenarios_scope on public.geit_engineering_scenarios(organisation_id,module,project_id,created_at);
alter table public.geit_engineering_projects enable row level security;
alter table public.geit_engineering_scenarios enable row level security;
revoke all on public.geit_engineering_projects,public.geit_engineering_scenarios from public,anon,authenticated;
grant select on public.geit_engineering_projects,public.geit_engineering_scenarios to authenticated;
create policy project_tenant_read on public.geit_engineering_projects for select to authenticated
 using(public.geit_role(organisation_id) is not null);
create policy scenario_tenant_read on public.geit_engineering_scenarios for select to authenticated
 using(public.geit_role(organisation_id) is not null);

create function public.geit_engineering_save_project(p_org uuid,p_module text,p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare p public.geit_engineering_projects; target uuid;
begin
 if not public.geit_energy_write(p_org) then raise exception 'Not permitted' using errcode='42501'; end if;
 if p_payload->>'id' is not null then
  select * into p from public.geit_engineering_projects where id=(p_payload->>'id')::uuid
    and organisation_id=p_org and module=p_module for update;
  if not found then raise exception 'Project not available' using errcode='22023'; end if;
  if p.currency<>p_payload->>'currency' and exists(select 1 from public.geit_engineering_scenarios where project_id=p.id) then
   raise exception 'Project currency is locked after the first saved scenario' using errcode='22023';
  end if;
  update public.geit_engineering_projects set name=trim(p_payload->>'name'),facility=trim(p_payload->>'facility'),
   brief=trim(p_payload->>'brief'),currency=p_payload->>'currency',status=p_payload->>'status',
   archived=coalesce((p_payload->>'archived')::boolean,p.archived) where id=p.id returning id into target;
 else
  insert into public.geit_engineering_projects(organisation_id,module,name,facility,brief,currency,status,created_by)
   values(p_org,p_module,trim(p_payload->>'name'),trim(p_payload->>'facility'),trim(p_payload->>'brief'),
     p_payload->>'currency',p_payload->>'status',auth.uid()) returning id into target;
 end if;
 insert into public.geit_audit_events(organisation_id,actor_id,action,subject_id) values(p_org,auth.uid(),'engineering.project.saved',target);
 return target;
end $$;

create function public.geit_engineering_save_scenario(p_org uuid,p_module text,p_project uuid,p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare p public.geit_engineering_projects; target uuid; snapshot jsonb;
begin
 if not public.geit_energy_write(p_org) then raise exception 'Not permitted' using errcode='42501'; end if;
 select * into p from public.geit_engineering_projects where id=p_project and organisation_id=p_org and module=p_module for update;
 if not found or p.archived then raise exception 'Project not available' using errcode='22023'; end if;
 snapshot:=p_payload->'project_snapshot';
 if snapshot->>'id' is distinct from p.id::text or snapshot->>'module' is distinct from p.module
  or snapshot->>'currency' is distinct from p.currency or snapshot->>'name' is distinct from p.name
  or snapshot->>'facility' is distinct from p.facility or snapshot->>'brief' is distinct from p.brief
  or snapshot->>'status' is distinct from p.status then
  raise exception 'Project changed. Reload before saving a scenario' using errcode='22023';
 end if;
 insert into public.geit_engineering_scenarios(organisation_id,module,project_id,name,inputs,result,project_snapshot,input_hash,signature,created_by)
 values(p_org,p_module,p_project,trim(p_payload->>'name'),p_payload->'inputs',p_payload->'result',snapshot,
  p_payload->>'input_hash',p_payload->>'signature',auth.uid()) returning id into target;
 insert into public.geit_audit_events(organisation_id,actor_id,action,subject_id) values(p_org,auth.uid(),'engineering.scenario.saved',target);
 return target;
end $$;
revoke all on function public.geit_engineering_save_project(uuid,text,jsonb),public.geit_engineering_save_scenario(uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.geit_engineering_save_project(uuid,text,jsonb),public.geit_engineering_save_scenario(uuid,text,uuid,jsonb) to authenticated;
