-- ============================================================
-- HHC Staff Management Module
-- Migration: 20261004100000_staff_management
-- ============================================================

-- ── 1. Storage Buckets ────────────────────────────────────
-- Only create if they don't already exist

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'staff-photos', 'staff-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']
where not exists (select 1 from storage.buckets where id = 'staff-photos');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'patient-photos', 'patient-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']
where not exists (select 1 from storage.buckets where id = 'patient-photos');

-- ── 2. Storage RLS Policies ──────────────────────────────
-- staff-photos bucket

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'staff-photos: authenticated select') then
    execute 'create policy "staff-photos: authenticated select" on storage.objects for select to authenticated using (bucket_id = ''staff-photos'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'staff-photos: authenticated insert') then
    execute 'create policy "staff-photos: authenticated insert" on storage.objects for insert to authenticated with check (bucket_id = ''staff-photos'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'staff-photos: authenticated update') then
    execute 'create policy "staff-photos: authenticated update" on storage.objects for update to authenticated using (bucket_id = ''staff-photos'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'staff-photos: authenticated delete') then
    execute 'create policy "staff-photos: authenticated delete" on storage.objects for delete to authenticated using (bucket_id = ''staff-photos'')';
  end if;
  -- patient-photos bucket
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'patient-photos: authenticated select') then
    execute 'create policy "patient-photos: authenticated select" on storage.objects for select to authenticated using (bucket_id = ''patient-photos'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'patient-photos: authenticated insert') then
    execute 'create policy "patient-photos: authenticated insert" on storage.objects for insert to authenticated with check (bucket_id = ''patient-photos'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'patient-photos: authenticated update') then
    execute 'create policy "patient-photos: authenticated update" on storage.objects for update to authenticated using (bucket_id = ''patient-photos'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'patient-photos: authenticated delete') then
    execute 'create policy "patient-photos: authenticated delete" on storage.objects for delete to authenticated using (bucket_id = ''patient-photos'')';
  end if;
end;
$$;

-- ── 3. Staff Table ────────────────────────────────────────

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  staff_id text unique not null,
  name text not null,
  father_husband_name text not null,
  gender text not null check (gender in ('male', 'female', 'other')),
  designation_type text not null check (designation_type in ('doctor', 'nurse', 'physio', 'psychiatrist', 'attendant', 'admin', 'other')),
  designation_custom text,
  address text,
  contact_number text not null,
  email text,
  whatsapp text,
  google_maps_url text,
  latitude numeric,
  longitude numeric,
  qualification text,
  photo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 4. updated_at trigger for staff ──────────────────────

create or replace function public.set_staff_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists staff_set_updated_at on public.staff;
create trigger staff_set_updated_at
  before update on public.staff
  for each row
  execute function public.set_staff_updated_at();

-- ── 5. RLS on staff table ─────────────────────────────────

alter table public.staff enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'staff' and policyname = 'staff: service role full access') then
    execute 'create policy "staff: service role full access" on public.staff to service_role using (true) with check (true)';
  end if;
end;
$$;

-- ── 6. Add photo_path to month_patients ──────────────────

alter table public.month_patients
  add column if not exists photo_path text;

comment on table public.staff is 'HHC staff members — doctors, nurses, physiotherapists, and other personnel.';
comment on column public.staff.staff_id is 'Human-readable staff identifier in format HHC-STF-NNNN.';
comment on column public.staff.photo_path is 'Supabase storage path (not full URL) in the staff-photos bucket.';
comment on column public.month_patients.photo_path is 'Supabase storage path (not full URL) in the patient-photos bucket.';
