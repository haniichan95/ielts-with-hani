-- Chạy đoạn SQL này 1 lần trong Supabase -> SQL Editor của project ielts-with-hani
-- Link nhanh: https://supabase.com/dashboard/project/czsuehadmrjyeayxcxtq/sql/new

create table if not exists public.hani_profiles (
  id text primary key check (char_length(id) >= 4 and char_length(id) <= 128),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.hani_profiles enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.hani_profiles to anon, authenticated;

drop policy if exists "Allow anon read write hani_profiles" on public.hani_profiles;
drop policy if exists "hani_profiles_select_by_sync_header" on public.hani_profiles;
drop policy if exists "hani_profiles_insert_by_sync_header" on public.hani_profiles;
drop policy if exists "hani_profiles_update_by_sync_header" on public.hani_profiles;

-- Chỉ cho phép đọc/ghi đúng dòng khớp với Mã đồng bộ (Sync ID) gửi qua header x-client-info
create policy "hani_profiles_select_by_sync_header"
  on public.hani_profiles
  for select
  to anon, authenticated
  using (
    ('hani-sync:' || id) = coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-client-info',
      ''
    )
  );

create policy "hani_profiles_insert_by_sync_header"
  on public.hani_profiles
  for insert
  to anon, authenticated
  with check (
    ('hani-sync:' || id) = coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-client-info',
      ''
    )
  );

create policy "hani_profiles_update_by_sync_header"
  on public.hani_profiles
  for update
  to anon, authenticated
  using (
    ('hani-sync:' || id) = coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-client-info',
      ''
    )
  )
  with check (
    ('hani-sync:' || id) = coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-client-info',
      ''
    )
  );
