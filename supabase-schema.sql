-- Chạy đoạn SQL này trong Supabase -> SQL Editor để tạo bảng đồng bộ cho IELTS with Hani

create table if not exists public.hani_profiles (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.hani_profiles enable row level security;

-- Chính sách cho web tĩnh dùng Anon Key + Sync ID bí mật của riêng bạn
-- (Nên đặt Sync ID dài & khó đoán, ví dụ: hani-ielts-secret-2026)
drop policy if exists "Allow anon read write hani_profiles" on public.hani_profiles;
create policy "Allow anon read write hani_profiles"
  on public.hani_profiles
  for all
  to anon, authenticated
  using (true)
  with check (true);
