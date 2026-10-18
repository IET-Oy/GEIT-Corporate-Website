-- Storage bytes remain in Supabase Storage, never in application tables.
-- Abort rather than silently changing an existing bucket with a conflicting ID.
do $$
begin
  if exists(select 1 from storage.buckets where id='geit-private-documents') then
    raise exception 'GEIT storage bucket already exists without this migration; inspect before adopting it';
  end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'geit-private-documents','geit-private-documents',false,10485760,
  array['application/pdf','image/png','image/jpeg','text/csv']
);

-- A strict UUID/UUID.ext key prevents traversal, UUID cast errors and files
-- outside the tenant namespace. Original filenames must not form object keys.
create function public.geit_storage_role(object_name text) returns text
language sql stable security definer set search_path='' as $$
  select case when object_name ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](pdf|png|jpg|csv)$'
    then public.geit_role(split_part(object_name,'/',1)::uuid)
    else null end
$$;
revoke all on function public.geit_storage_role(text) from public,anon;
grant execute on function public.geit_storage_role(text) to authenticated;

create policy geit_documents_read on storage.objects
for select to authenticated using (
  bucket_id='geit-private-documents' and public.geit_storage_role(name) is not null
);
create policy geit_documents_insert on storage.objects
for insert to authenticated with check (
  bucket_id='geit-private-documents'
  and owner_id=(select auth.uid())::text
  and public.geit_storage_role(name) in ('owner','admin','energy_manager','consultant','analyst')
);
create policy geit_documents_delete on storage.objects
for delete to authenticated using (
  bucket_id='geit-private-documents'
  and (
    public.geit_storage_role(name) in ('owner','admin')
    or (owner_id=(select auth.uid())::text
      and public.geit_storage_role(name) in ('energy_manager','consultant','analyst'))
  )
);
-- No UPDATE policy: immutable object keys, no overwrite/upsert/move operations.
-- This policy boundary does not perform malware scanning or trust MIME headers.
