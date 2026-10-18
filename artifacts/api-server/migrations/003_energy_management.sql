create extension if not exists btree_gist with schema extensions;
create function public.geit_energy_write(org uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(public.geit_role(org) in ('owner','admin','energy_manager','consultant','analyst'),false)
$$;
create function public.geit_energy_manage(org uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(public.geit_role(org) in ('owner','admin','energy_manager'),false)
$$;

create table public.geit_energy_sites(
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 2 and 120), timezone text not null,
 area_m2 numeric check(area_m2>0 and area_m2<1e9), is_demo boolean not null default false,
 archived boolean not null default false, unique(id,organisation_id,is_demo)
);
create table public.geit_energy_meters(
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
 site_id uuid not null, name text not null check(char_length(trim(name)) between 2 and 120),
 unit text not null check(unit in ('Wh','kWh','MWh','MJ','GJ','W','kW','MW')),
 is_demo boolean not null default false, archived boolean not null default false,
 foreign key(site_id,organisation_id,is_demo) references public.geit_energy_sites(id,organisation_id,is_demo),
 unique(id,organisation_id,is_demo)
);
create table public.geit_energy_tariffs(
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 2 and 120), currency text not null check(currency ~ '^[A-Z]{3}$'),
 energy_rate numeric not null check(energy_rate between 0 and 1000000),
 daily_charge numeric not null default 0 check(daily_charge between 0 and 1000000),
 demand_rate numeric not null default 0 check(demand_rate between 0 and 1000000),
 is_demo boolean not null default false, archived boolean not null default false, unique(id,organisation_id,is_demo)
);
create table public.geit_energy_imports(
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
 meter_id uuid not null, filename text not null check(char_length(filename) between 1 and 180),
 status text not null default 'preview' check(status in ('preview','committed')),
 row_count integer not null check(row_count between 0 and 5000), valid_count integer not null check(valid_count between 0 and row_count),
 errors jsonb not null, normalized_rows jsonb not null,
 created_by uuid not null, created_at timestamptz not null default now(), is_demo boolean not null,
 foreign key(meter_id,organisation_id,is_demo) references public.geit_energy_meters(id,organisation_id,is_demo),
 unique(id,organisation_id,is_demo)
);
create table public.geit_energy_readings(
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
 meter_id uuid not null, import_id uuid not null, start_at timestamptz not null, end_at timestamptz not null,
 quantity numeric not null check(quantity>=0 and quantity<1e12),
 unit text not null check(unit in ('Wh','kWh','MWh','MJ','GJ','W','kW','MW')),
 kwh numeric not null check(kwh>=0 and kwh<1e15), is_demo boolean not null,
 check(end_at>start_at and end_at-start_at<=interval '24 hours'),
 foreign key(meter_id,organisation_id,is_demo) references public.geit_energy_meters(id,organisation_id,is_demo),
 foreign key(import_id,organisation_id,is_demo) references public.geit_energy_imports(id,organisation_id,is_demo),
 unique(meter_id,start_at),
 exclude using gist (meter_id with =, tstzrange(start_at,end_at,'[)') with &&)
);
create index geit_readings_org_meter_time on public.geit_energy_readings(organisation_id,meter_id,start_at);
create table public.geit_energy_rules(
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
 meter_id uuid not null, name text not null check(char_length(trim(name)) between 2 and 120),
 metric text not null check(metric in ('daily_kwh','peak_kw')), threshold numeric not null check(threshold>0 and threshold<1e12),
 archived boolean not null default false, is_demo boolean not null,
 foreign key(meter_id,organisation_id,is_demo) references public.geit_energy_meters(id,organisation_id,is_demo)
);
create table public.geit_energy_analyses(
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
 meter_id uuid not null, tariff_id uuid, name text not null check(char_length(trim(name)) between 2 and 120),
 result jsonb not null, snapshot jsonb not null, created_by uuid not null,
 created_at timestamptz not null default now(), is_demo boolean not null,
 foreign key(meter_id,organisation_id,is_demo) references public.geit_energy_meters(id,organisation_id,is_demo),
 foreign key(tariff_id,organisation_id,is_demo) references public.geit_energy_tariffs(id,organisation_id,is_demo),
 unique(id,organisation_id,is_demo)
);
create table public.geit_energy_alerts(
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
 analysis_id uuid not null, message text not null, acknowledged boolean not null default false,
 created_at timestamptz not null default now(), is_demo boolean not null,
 foreign key(analysis_id,organisation_id,is_demo) references public.geit_energy_analyses(id,organisation_id,is_demo)
);
do $$
declare t text;
begin
 foreach t in array array['sites','meters','tariffs','imports','readings','rules','analyses','alerts'] loop
   execute format('alter table public.geit_energy_%I enable row level security',t);
   execute format('revoke all on public.geit_energy_%I from public,anon,authenticated',t);
   execute format('grant select on public.geit_energy_%I to authenticated',t);
   execute format('create policy tenant_read on public.geit_energy_%I for select to authenticated using(public.geit_role(organisation_id) is not null)',t);
 end loop;
 foreach t in array array['sites','meters','tariffs','rules'] loop
   execute format('grant insert,update on public.geit_energy_%I to authenticated',t);
   execute format('create policy manager_insert on public.geit_energy_%I for insert to authenticated with check(public.geit_energy_manage(organisation_id))',t);
   execute format('create policy manager_update on public.geit_energy_%I for update to authenticated using(public.geit_energy_manage(organisation_id)) with check(public.geit_energy_manage(organisation_id))',t);
 end loop;
end $$;
grant insert on public.geit_energy_imports to authenticated;
create policy import_preview_insert on public.geit_energy_imports for insert to authenticated
 with check(public.geit_energy_write(organisation_id) and created_by=auth.uid() and status='preview');
-- Restrict alert changes to acknowledgement; all other fields remain immutable.
grant update(acknowledged) on public.geit_energy_alerts to authenticated;
create policy alert_acknowledge on public.geit_energy_alerts for update to authenticated
 using(public.geit_energy_write(organisation_id)) with check(public.geit_energy_write(organisation_id));

create function public.geit_energy_commit_import(p_org uuid,p_import uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare imp public.geit_energy_imports; r jsonb; s timestamptz; e timestamptz; q numeric; u text; energy numeric; n integer:=0;
begin
 if not public.geit_energy_write(p_org) then raise exception 'Not permitted' using errcode='42501'; end if;
 select * into imp from public.geit_energy_imports where id=p_import and organisation_id=p_org for update;
 if not found then raise exception 'Import not found' using errcode='22023'; end if;
 if imp.status='committed' then return imp.valid_count; end if;
 if jsonb_array_length(imp.errors)<>0 or imp.valid_count=0 or imp.valid_count<>imp.row_count
   or jsonb_array_length(imp.normalized_rows)<>imp.valid_count then
   raise exception 'Fix all import errors before committing' using errcode='22023';
 end if;
 -- Serialise commits per meter; exclusion constraint also prevents races/overlap.
 perform 1 from public.geit_energy_meters m join public.geit_energy_sites s on s.id=m.site_id
   where m.id=imp.meter_id and m.organisation_id=p_org and not m.archived and not s.archived for update of m;
 if not found then raise exception 'Meter or site is archived' using errcode='22023'; end if;
 for r in select value from jsonb_array_elements(imp.normalized_rows) loop
   if (r->>'start') !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' or (r->>'end') !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then
     raise exception 'Timestamps require an explicit offset' using errcode='22023';
   end if;
   s:=(r->>'start')::timestamptz; e:=(r->>'end')::timestamptz; q:=(r->>'value')::numeric; u:=r->>'unit';
   energy:=case u when 'Wh' then q/1000 when 'kWh' then q when 'MWh' then q*1000
    when 'MJ' then q/3.6 when 'GJ' then q/0.0036
    when 'W' then q/1000*extract(epoch from e-s)/3600
    when 'kW' then q*extract(epoch from e-s)/3600
    when 'MW' then q*1000*extract(epoch from e-s)/3600 else null end;
   if energy is null then raise exception 'Unsupported unit' using errcode='22023'; end if;
   insert into public.geit_energy_readings(organisation_id,meter_id,import_id,start_at,end_at,quantity,unit,kwh,is_demo)
     values(p_org,imp.meter_id,imp.id,s,e,q,u,energy,imp.is_demo);
   n:=n+1;
 end loop;
 update public.geit_energy_imports set status='committed' where id=imp.id;
 insert into public.geit_audit_events(organisation_id,actor_id,action,subject_id)
 values(p_org,auth.uid(),'energy.import.committed',imp.id);
 return n;
end $$;

create function public.geit_energy_save_analysis(p_org uuid,p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare a uuid; m public.geit_energy_meters; r public.geit_energy_rules; val numeric; daily jsonb;
begin
 if not public.geit_energy_write(p_org) then raise exception 'Not permitted' using errcode='42501'; end if;
 select * into m from public.geit_energy_meters where id=(p_payload->>'meter_id')::uuid and organisation_id=p_org and not archived;
 if not found then raise exception 'Meter not available' using errcode='22023'; end if;
 insert into public.geit_energy_analyses(organisation_id,meter_id,tariff_id,name,result,snapshot,created_by,is_demo)
 values(p_org,m.id,nullif(p_payload->>'tariff_id','')::uuid,p_payload->>'name',p_payload->'result',p_payload->'snapshot',auth.uid(),m.is_demo)
 returning id into a;
 for r in select * from public.geit_energy_rules where organisation_id=p_org and meter_id=m.id and not archived loop
   if r.metric='peak_kw' then val:=(p_payload->'result'->>'peakKw')::numeric;
   else select max((d->>'kwh')::numeric) into val from jsonb_array_elements(p_payload->'result'->'daily') d; end if;
   if val>r.threshold then
     insert into public.geit_energy_alerts(organisation_id,analysis_id,message,is_demo)
     values(p_org,a,r.name||': '||round(val,3)||' exceeds '||r.threshold||' '||r.metric,m.is_demo);
   end if;
 end loop;
 insert into public.geit_audit_events(organisation_id,actor_id,action,subject_id)
 values(p_org,auth.uid(),'energy.analysis.saved',a);
 return a;
end $$;

create function public.geit_energy_seed_demo(p_org uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s uuid; m uuid; imp uuid; rows jsonb;
begin
 if not public.geit_energy_manage(p_org) then raise exception 'Not permitted' using errcode='42501'; end if;
 perform 1 from public.geit_organisations where id=p_org for update;
 if exists(select 1 from public.geit_energy_sites where organisation_id=p_org and is_demo) then return; end if;
 insert into public.geit_energy_sites(organisation_id,name,timezone,area_m2,is_demo) values(p_org,'DEMO — synthetic office','UTC',500,true) returning id into s;
 insert into public.geit_energy_meters(organisation_id,site_id,name,unit,is_demo) values(p_org,s,'DEMO — electricity','kWh',true) returning id into m;
 insert into public.geit_energy_tariffs(organisation_id,name,currency,energy_rate,daily_charge,demand_rate,is_demo)
 values(p_org,'DEMO — synthetic tariff','USD',0.15,1,2,true);
 select jsonb_agg(jsonb_build_object('start',to_char(t at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'end',to_char((t+interval '1 hour') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'value',case when extract(hour from t) between 8 and 17 then 12 else 4 end,'unit','kWh') order by t)
 into rows from generate_series('2026-01-01T00:00:00Z'::timestamptz,'2026-01-07T23:00:00Z'::timestamptz,interval '1 hour') t;
 insert into public.geit_energy_imports(organisation_id,meter_id,filename,row_count,valid_count,errors,normalized_rows,created_by,is_demo)
 values(p_org,m,'DEMO synthetic seed',168,168,'[]',rows,auth.uid(),true) returning id into imp;
 perform public.geit_energy_commit_import(p_org,imp);
end $$;
revoke all on function public.geit_energy_write(uuid),public.geit_energy_manage(uuid),
 public.geit_energy_commit_import(uuid,uuid),public.geit_energy_save_analysis(uuid,jsonb),public.geit_energy_seed_demo(uuid) from public,anon;
grant execute on function public.geit_energy_write(uuid),public.geit_energy_manage(uuid),
 public.geit_energy_commit_import(uuid,uuid),public.geit_energy_save_analysis(uuid,jsonb),public.geit_energy_seed_demo(uuid) to authenticated;
