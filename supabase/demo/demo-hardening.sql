-- Applied ONLY to the public demo project, never to a real household's database.
-- Visitors share one demo account, so file uploads would turn the bucket into free hosting
-- for anyone. Receipts stay readable; writing files is not allowed.
drop policy if exists receipts_storage_hogar on storage.objects;
drop policy if exists receipts_storage_demo_read on storage.objects;
create policy receipts_storage_demo_read on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = public.current_household_id()::text);
