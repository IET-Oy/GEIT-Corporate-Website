-- Replace Energy Manager and Consultant with the unified Editor role.
-- Existing memberships are mapped before the narrowed constraint is restored.
alter table public.geit_memberships
  drop constraint if exists geit_memberships_role_check;

update public.geit_memberships
set role = 'editor'
where role in ('energy_manager', 'consultant');

alter table public.geit_memberships
  add constraint geit_memberships_role_check
  check (role in ('owner', 'admin', 'editor', 'analyst', 'reader'));

create or replace function public.geit_set_member(org uuid, member_email text, member_role text) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid; old_role text;
begin
  -- Serialise role changes per organisation to protect the final owner.
  perform 1 from public.geit_organisations where id=org for update;
  if coalesce(public.geit_role(org),'') <> 'owner' then
    raise exception 'Only an owner can manage members' using errcode='42501';
  end if;
  if member_role not in ('owner','admin','editor','analyst','reader') then
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

-- Editor receives the combined operational capabilities of both former roles.
create or replace function public.geit_energy_write(org uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(public.geit_role(org) in ('owner','admin','editor','analyst'),false)
$$;

create or replace function public.geit_energy_manage(org uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(public.geit_role(org) in ('owner','admin','editor'),false)
$$;

alter policy geit_documents_insert on storage.objects
with check (
  bucket_id='geit-private-documents'
  and owner_id=(select auth.uid())::text
  and public.geit_storage_role(name) in ('owner','admin','editor','analyst')
);

alter policy geit_documents_delete on storage.objects
using (
  bucket_id='geit-private-documents'
  and (
    public.geit_storage_role(name) in ('owner','admin')
    or (owner_id=(select auth.uid())::text
      and public.geit_storage_role(name) in ('editor','analyst'))
  )
);
