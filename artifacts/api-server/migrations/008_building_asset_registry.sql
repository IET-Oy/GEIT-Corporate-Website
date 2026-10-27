-- Organisation-scoped Buildings & Assets registry. Sites remain the existing
-- geit_energy_sites records; buildings belong to a site and assets belong to
-- the same site and optionally one of its buildings.
create function public.geit_energy_registry_metadata_valid(value jsonb) returns boolean
language sql immutable set search_path='' as $$
  select case
    when jsonb_typeof(value) <> 'object' then false
    else jsonb_object_length(value) <= 30
      and not exists (
        select 1 from jsonb_each(value) as item(key, value)
        where char_length(item.key) > 60
          or jsonb_typeof(item.value) not in ('string', 'number', 'boolean', 'null')
          or (jsonb_typeof(item.value) = 'string' and char_length(item.value #>> '{}') > 250)
      )
  end
$$;

create table public.geit_energy_buildings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
  site_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 120),
  building_type text not null check (char_length(trim(building_type)) between 2 and 80),
  address text check (address is null or char_length(trim(address)) <= 400),
  latitude numeric check (latitude between -90 and 90),
  longitude numeric check (longitude between -180 and 180),
  timezone text not null check (char_length(trim(timezone)) between 1 and 80),
  floor_area numeric check (floor_area > 0 and floor_area <= 1000000000),
  area_unit text not null default 'm2' check (area_unit in ('m2', 'ft2')),
  description text check (description is null or char_length(description) <= 2000),
  metadata jsonb not null default '{}'::jsonb
    check (public.geit_energy_registry_metadata_valid(metadata)),
  is_demo boolean not null default false,
  archived boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organisation_id, site_id, is_demo),
  foreign key (site_id, organisation_id, is_demo)
    references public.geit_energy_sites(id, organisation_id, is_demo),
  check ((latitude is null) = (longitude is null))
);

create unique index geit_energy_buildings_active_name_uidx
  on public.geit_energy_buildings (organisation_id, site_id, lower(trim(name)))
  where not archived;
create index geit_energy_buildings_org_site_idx
  on public.geit_energy_buildings (organisation_id, site_id, archived);

create table public.geit_energy_assets (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
  site_id uuid not null,
  building_id uuid,
  name text not null check (char_length(trim(name)) between 2 and 120),
  asset_type text not null check (char_length(trim(asset_type)) between 2 and 80),
  identifier text check (identifier is null or char_length(trim(identifier)) <= 120),
  description text check (description is null or char_length(description) <= 2000),
  manufacturer text check (manufacturer is null or char_length(trim(manufacturer)) <= 120),
  model text check (model is null or char_length(trim(model)) <= 120),
  serial_number text check (serial_number is null or char_length(trim(serial_number)) <= 120),
  commissioning_date date,
  status text not null default 'planned'
    check (status in ('planned', 'operational', 'maintenance', 'retired')),
  capacity numeric check (capacity > 0 and capacity <= 1000000000000),
  capacity_unit text check (capacity_unit is null or char_length(trim(capacity_unit)) between 1 and 32),
  metadata jsonb not null default '{}'::jsonb
    check (public.geit_energy_registry_metadata_valid(metadata)),
  is_demo boolean not null default false,
  archived boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organisation_id, site_id, is_demo),
  foreign key (site_id, organisation_id, is_demo)
    references public.geit_energy_sites(id, organisation_id, is_demo),
  foreign key (building_id, organisation_id, site_id, is_demo)
    references public.geit_energy_buildings(id, organisation_id, site_id, is_demo),
  check ((capacity is null and capacity_unit is null) or (capacity is not null and capacity_unit is not null))
);

create unique index geit_energy_assets_active_identifier_uidx
  on public.geit_energy_assets (organisation_id, lower(trim(identifier)))
  where not archived and identifier is not null and trim(identifier) <> '';
create index geit_energy_assets_org_site_building_idx
  on public.geit_energy_assets (organisation_id, site_id, building_id, archived);

create function public.geit_energy_registry_updated_at() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.organisation_id is distinct from old.organisation_id
     or new.is_demo is distinct from old.is_demo
     or (new.created_by is distinct from old.created_by and new.created_by is not null) then
    raise exception 'Registry ownership fields cannot be changed' using errcode='42501';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger geit_energy_buildings_updated_at
before update on public.geit_energy_buildings
for each row execute function public.geit_energy_registry_updated_at();
create trigger geit_energy_assets_updated_at
before update on public.geit_energy_assets
for each row execute function public.geit_energy_registry_updated_at();

create function public.geit_energy_registry_parent_guard() returns trigger
language plpgsql set search_path='' as $$
declare parent_archived boolean;
begin
  if not new.archived then
    select archived into parent_archived
      from public.geit_energy_sites
      where id = new.site_id and organisation_id = new.organisation_id and is_demo = new.is_demo;
    if not found or parent_archived then
      raise exception 'Restore the parent site before activating this record' using errcode='23514';
    end if;
  end if;

  if tg_table_name = 'geit_energy_buildings' then
    if tg_op = 'UPDATE' and new.archived and not old.archived and exists (
      select 1 from public.geit_energy_assets
      where organisation_id = new.organisation_id and building_id = new.id and not archived
    ) then
      raise exception 'Archive active assets before archiving the building' using errcode='23514';
    end if;
  elsif not new.archived and new.building_id is not null then
    select archived into parent_archived
      from public.geit_energy_buildings
      where id = new.building_id and organisation_id = new.organisation_id
        and site_id = new.site_id and is_demo = new.is_demo
      for update;
    if not found or parent_archived then
      raise exception 'Restore the parent building before activating this asset' using errcode='23514';
    end if;
  end if;
  return new;
end $$;

create trigger geit_energy_buildings_parent_guard
before insert or update on public.geit_energy_buildings
for each row execute function public.geit_energy_registry_parent_guard();
create trigger geit_energy_assets_parent_guard
before insert or update on public.geit_energy_assets
for each row execute function public.geit_energy_registry_parent_guard();

revoke all on function public.geit_energy_registry_metadata_valid(jsonb) from public, anon;
grant execute on function public.geit_energy_registry_metadata_valid(jsonb) to authenticated;
revoke all on function public.geit_energy_registry_updated_at(), public.geit_energy_registry_parent_guard() from public, anon, authenticated;

alter table public.geit_energy_buildings enable row level security;
alter table public.geit_energy_assets enable row level security;
revoke all on public.geit_energy_buildings, public.geit_energy_assets from public, anon, authenticated;
grant select, insert, update on public.geit_energy_buildings, public.geit_energy_assets to authenticated;

create policy registry_buildings_read on public.geit_energy_buildings
for select to authenticated using (public.geit_role(organisation_id) is not null);
create policy registry_buildings_insert on public.geit_energy_buildings
for insert to authenticated with check (
  not is_demo and public.geit_energy_manage(organisation_id) and created_by = auth.uid()
);
create policy registry_buildings_update on public.geit_energy_buildings
for update to authenticated using (
  not is_demo and public.geit_energy_manage(organisation_id)
) with check (
  not is_demo and public.geit_energy_manage(organisation_id)
);

create policy registry_assets_read on public.geit_energy_assets
for select to authenticated using (public.geit_role(organisation_id) is not null);
create policy registry_assets_insert on public.geit_energy_assets
for insert to authenticated with check (
  not is_demo and public.geit_energy_manage(organisation_id) and created_by = auth.uid()
);
create policy registry_assets_update on public.geit_energy_assets
for update to authenticated using (
  not is_demo and public.geit_energy_manage(organisation_id)
) with check (
  not is_demo and public.geit_energy_manage(organisation_id)
);
