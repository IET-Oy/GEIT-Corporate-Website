alter table public.geit_engineering_projects drop constraint geit_engineering_projects_module_check;
alter table public.geit_engineering_projects add constraint geit_engineering_projects_module_check
 check(module in ('energy-consulting','energy-auditing','renewable-energy','battery-flexibility','carbon-footprint','digital-energy'));

create table public.geit_emission_factors(
 id uuid primary key default gen_random_uuid(),
 organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
 code text not null check(code ~ '^[A-Z0-9_-]{2,64}$'),
 version integer not null check(version>0), definition jsonb not null,
 created_by uuid not null, created_at timestamptz not null default now(),
 unique(organisation_id,code,version),
 check(definition->>'code'=code),
 check(length(trim(definition->>'name')) between 2 and 160),
 check(length(trim(definition->>'source')) between 10 and 1000),
 check(definition->>'sourceUrl' ~ '^https://[^/ ]+'),
 check(length(trim(definition->>'geography')) between 2 and 120),
 check(length(trim(definition->>'gwpBasis')) between 5 and 160),
 check((definition->>'value')::numeric between 0 and 1000000000),
 check(definition->>'activityUnit' in ('kWh','MWh','GJ','L','m3','kg','km','passenger_km','tonne_km')),
 check(definition->>'emissionUnit' in ('kgCO2e','tCO2e')),
 check((definition->>'validUntil')::date>(definition->>'validFrom')::date),
 check((definition->>'scope'='scope1' and definition->>'category' in ('stationary_combustion','mobile_combustion','fugitive','process') and definition->>'scope2Method' is null)
  or (definition->>'scope'='scope2' and definition->>'category' in ('purchased_electricity','purchased_heat') and definition->>'scope2Method' in ('location_based','market_based'))
  or (definition->>'scope'='scope3' and definition->>'category' in ('purchased_goods','upstream_fuel_energy','waste','business_travel','employee_commuting','upstream_transport','downstream_transport') and definition->>'scope2Method' is null))
);
alter table public.geit_emission_factors enable row level security;
revoke all on public.geit_emission_factors from public,anon,authenticated;
grant select on public.geit_emission_factors to authenticated;
create policy factor_tenant_read on public.geit_emission_factors for select to authenticated
 using(public.geit_role(organisation_id) is not null);
create function public.geit_create_emission_factor(p_org uuid,p_definition jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare next_version integer; target uuid;
begin
 if not public.geit_energy_write(p_org) then raise exception 'Not permitted' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_org::text||':factor:'||(p_definition->>'code'),71));
 select coalesce(max(version),0)+1 into next_version from public.geit_emission_factors
   where organisation_id=p_org and code=p_definition->>'code';
 insert into public.geit_emission_factors(organisation_id,code,version,definition,created_by)
 values(p_org,p_definition->>'code',next_version,p_definition,auth.uid()) returning id into target;
 insert into public.geit_audit_events(organisation_id,actor_id,action,subject_id)
 values(p_org,auth.uid(),'carbon.factor.version.created',target);
 return target;
end $$;
revoke all on function public.geit_create_emission_factor(uuid,jsonb) from public,anon;
grant execute on function public.geit_create_emission_factor(uuid,jsonb) to authenticated;
