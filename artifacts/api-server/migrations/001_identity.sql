-- Additive GEIT foundation. Runtime access uses authenticated JWTs, never DB owner.
create table public.geit_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  created_at timestamptz not null default now()
);
create table public.geit_organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  timezone text not null check (char_length(timezone) between 1 and 80),
  created_at timestamptz not null default now()
);
create table public.geit_memberships (
  organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner','admin','energy_manager','consultant','analyst','reader')),
  created_at timestamptz not null default now(),
  primary key (organisation_id,user_id)
);
create index geit_membership_user_idx on public.geit_memberships(user_id,organisation_id);
create table public.geit_audit_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.geit_organisations(id) on delete cascade,
  actor_id uuid not null,
  action text not null,
  subject_id uuid,
  created_at timestamptz not null default now()
);
create index geit_audit_org_idx on public.geit_audit_events(organisation_id,created_at);

create function public.geit_role(org uuid) returns text
language sql stable security definer set search_path='' as $$
  select role from public.geit_memberships where organisation_id=org and user_id=auth.uid()
$$;
create function public.geit_shared_profile(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select target=auth.uid() or exists (
    select 1 from public.geit_memberships a join public.geit_memberships b using(organisation_id)
    where a.user_id=auth.uid() and b.user_id=target
  )
$$;
alter table public.geit_profiles enable row level security;
alter table public.geit_organisations enable row level security;
alter table public.geit_memberships enable row level security;
alter table public.geit_audit_events enable row level security;
create policy profiles_read on public.geit_profiles for select to authenticated using(public.geit_shared_profile(user_id));
create policy organisations_read on public.geit_organisations for select to authenticated using(public.geit_role(id) is not null);
create policy memberships_read on public.geit_memberships for select to authenticated using(public.geit_role(organisation_id) is not null);
create policy audit_read on public.geit_audit_events for select to authenticated using(public.geit_role(organisation_id) in ('owner','admin'));
revoke all on public.geit_profiles, public.geit_organisations, public.geit_memberships, public.geit_audit_events from public, anon, authenticated;
grant select on public.geit_profiles, public.geit_organisations, public.geit_memberships, public.geit_audit_events to authenticated;

create function public.geit_sync_profile() returns void
language plpgsql security definer set search_path='' as $$
declare n text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),'GEIT member')
    into n from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if n is null then raise exception 'Verified email required' using errcode='42501'; end if;
  insert into public.geit_profiles(user_id,full_name) values(auth.uid(),left(n,120))
    on conflict(user_id) do nothing;
end $$;

create function public.geit_create_organisation(org_name text, org_timezone text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  perform public.geit_sync_profile();
  if not exists(select 1 from pg_timezone_names where name=org_timezone) then
    raise exception 'Invalid time zone' using errcode='22023';
  end if;
  insert into public.geit_organisations(name,timezone) values(trim(org_name),org_timezone) returning id into result;
  insert into public.geit_memberships(organisation_id,user_id,role) values(result,auth.uid(),'owner');
  insert into public.geit_audit_events(organisation_id,actor_id,action) values(result,auth.uid(),'organisation.created');
  return result;
end $$;

create function public.geit_update_organisation(org uuid, org_name text, org_timezone text) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.geit_organisations where id=org for update;
  if coalesce(public.geit_role(org),'') not in ('owner','admin') then
    raise exception 'Not permitted' using errcode='42501';
  end if;
  if not exists(select 1 from pg_timezone_names where name=org_timezone) then
    raise exception 'Invalid time zone' using errcode='22023';
  end if;
  update public.geit_organisations set name=trim(org_name),timezone=org_timezone where id=org;
  insert into public.geit_audit_events(organisation_id,actor_id,action) values(org,auth.uid(),'organisation.updated');
end $$;

create function public.geit_set_member(org uuid, member_email text, member_role text) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid; old_role text;
begin
  -- Serialise role changes per organisation to protect the final owner.
  perform 1 from public.geit_organisations where id=org for update;
  if coalesce(public.geit_role(org),'') <> 'owner' then
    raise exception 'Only an owner can manage members' using errcode='42501';
  end if;
  if member_role not in ('owner','admin','energy_manager','consultant','analyst','reader') then
    raise exception 'Invalid role' using errcode='22023';
  end if;
  select id into target from auth.users
    where lower(email)=lower(trim(member_email)) and email_confirmed_at is not null;
  if target is null then raise exception 'Account unavailable. Ask the person to register and verify their email first.' using errcode='22023'; end if;
  select role into old_role from public.geit_memberships where organisation_id=org and user_id=target;
  if old_role='owner' and member_role<>'owner' and
     (select count(*) from public.geit_memberships where organisation_id=org and role='owner')<=1 then
    raise exception 'An organisation must retain at least one owner' using errcode='22023';
  end if;
  insert into public.geit_profiles(user_id,full_name)
    select id,left(coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),'GEIT member'),120)
    from auth.users where id=target on conflict do nothing;
  insert into public.geit_memberships(organisation_id,user_id,role) values(org,target,member_role)
    on conflict(organisation_id,user_id) do update set role=excluded.role;
  insert into public.geit_audit_events(organisation_id,actor_id,action,subject_id)
    values(org,auth.uid(),'membership.saved',target);
end $$;

create function public.geit_remove_member(org uuid, member_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.geit_organisations where id=org for update;
  if coalesce(public.geit_role(org),'')<>'owner' then
    raise exception 'Only an owner can manage members' using errcode='42501';
  end if;
  if exists(select 1 from public.geit_memberships where organisation_id=org and user_id=member_id and role='owner')
     and (select count(*) from public.geit_memberships where organisation_id=org and role='owner')<=1 then
    raise exception 'An organisation must retain at least one owner' using errcode='22023';
  end if;
  delete from public.geit_memberships where organisation_id=org and user_id=member_id;
  insert into public.geit_audit_events(organisation_id,actor_id,action,subject_id)
    values(org,auth.uid(),'membership.removed',member_id);
end $$;

revoke all on function public.geit_role(uuid),public.geit_shared_profile(uuid),
  public.geit_sync_profile(),public.geit_create_organisation(text,text),
  public.geit_update_organisation(uuid,text,text),public.geit_set_member(uuid,text,text),
  public.geit_remove_member(uuid,uuid) from public,anon;
grant execute on function public.geit_role(uuid),public.geit_shared_profile(uuid),
  public.geit_sync_profile(),public.geit_create_organisation(text,text),
  public.geit_update_organisation(uuid,text,text),public.geit_set_member(uuid,text,text),
  public.geit_remove_member(uuid,uuid) to authenticated;
