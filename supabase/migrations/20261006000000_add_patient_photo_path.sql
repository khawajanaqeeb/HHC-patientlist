-- Add photo_path column to month_patients table for patient photo support
alter table public.month_patients
  add column if not exists photo_path text default null;

comment on column public.month_patients.photo_path is
  'Storage path in patient-photos bucket. Null if no photo uploaded.';
