do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and policyname='media readable by signed-in users') then
    create policy "media readable by signed-in users" on storage.objects for select to authenticated
      using (bucket_id = 'media');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and policyname='media writable by admins') then
    create policy "media writable by admins" on storage.objects for insert to authenticated
      with check (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and policyname='media updatable by admins') then
    create policy "media updatable by admins" on storage.objects for update to authenticated
      using (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and policyname='media deletable by admins') then
    create policy "media deletable by admins" on storage.objects for delete to authenticated
      using (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));
  end if;
end $$;