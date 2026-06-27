-- Fresh Shramik Shanti Campus CMS schema for:
-- https://gxpgbrdldnwbuodawxsz.supabase.co
--
-- Run this whole file in Supabase SQL Editor.
-- Then create an admin email/password user in Authentication.
-- Any authenticated user can manage the CMS, so only create trusted admin accounts.

create extension if not exists "pgcrypto";

drop policy if exists "Public reads campus assets" on storage.objects;
drop policy if exists "Admins upload campus assets" on storage.objects;
drop policy if exists "Admins update campus assets" on storage.objects;
drop policy if exists "Admins delete campus assets" on storage.objects;

drop table if exists public.admin_profiles cascade;
drop table if exists public.inquiries cascade;
drop table if exists public.popup_notices cascade;
drop table if exists public.resources cascade;
drop table if exists public.notices cascade;
drop table if exists public.site_settings cascade;
drop function if exists public.is_admin() cascade;

create table public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null default 'General',
  file_url text,
  is_pinned boolean not null default false,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('syllabus', 'result')),
  program text,
  file_url text not null,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.popup_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  link_url text,
  button_label text default 'Open',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'contact',
  name text,
  email text,
  phone text,
  program text,
  subject text,
  message text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;

alter table public.site_settings enable row level security;
alter table public.notices enable row level security;
alter table public.resources enable row level security;
alter table public.popup_notices enable row level security;
alter table public.inquiries enable row level security;

create policy "Published settings are public"
on public.site_settings for select
to anon, authenticated
using (true);

create policy "Admins manage settings"
on public.site_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public reads published notices"
on public.notices for select
to anon, authenticated
using (is_published = true or public.is_admin());

create policy "Admins manage notices"
on public.notices for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public reads published resources"
on public.resources for select
to anon, authenticated
using (is_published = true or public.is_admin());

create policy "Admins manage resources"
on public.resources for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public reads active popups"
on public.popup_notices for select
to anon, authenticated
using (is_active = true or public.is_admin());

create policy "Admins manage popups"
on public.popup_notices for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Anyone can submit inquiry"
on public.inquiries for insert
to anon, authenticated
with check (true);

create policy "Admins read inquiries"
on public.inquiries for select
to authenticated
using (public.is_admin());

create policy "Admins delete inquiries"
on public.inquiries for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('campus-assets', 'campus-assets', true)
on conflict (id) do update set public = excluded.public;

create policy "Public reads campus assets"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'campus-assets');

create policy "Admins upload campus assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'campus-assets' and public.is_admin());

create policy "Admins update campus assets"
on storage.objects for update
to authenticated
using (bucket_id = 'campus-assets' and public.is_admin())
with check (bucket_id = 'campus-assets' and public.is_admin());

create policy "Admins delete campus assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'campus-assets' and public.is_admin());

insert into public.site_settings (key, value) values
('hero_title', 'Future-Ready Education Starts Here'),
('hero_subtitle', 'Shramik Shanti Campus in Chyasal-9, Lalitpur prepares students for modern careers in artificial intelligence, information technology and law.'),
('about_summary', 'Established in 2007, Shramik Shanti Campus is a constituent campus of Pokhara University. It transitioned to Pokhara University in 2025 and expanded into Law, Information Technology and Artificial Intelligence.');

insert into public.notices (title, body, category, is_pinned, is_published)
values
('Admissions Open for BAIDS, BCSIT and BA LL.B', 'Contact Shramik Shanti Campus at 015404111 for admission details.', 'Admission', true, true),
('Welcome to the Pokhara University Constituent Campus Website', 'Official notices, syllabus files and results will be published here by the campus administration.', 'General', false, true);

insert into public.popup_notices (title, body, image_url, link_url, button_label, is_active)
values
('Admissions Open', 'Join BAIDS, BCSIT or BA LL.B at Shramik Shanti Campus.', 'images/admission_popup_2026.jpeg', 'admissions.html', 'Apply Now', true);
