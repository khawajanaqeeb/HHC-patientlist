-- Add is_active column to month_patients table to support deactivating patients
alter table public.month_patients
  add column if not exists is_active boolean default true;

comment on column public.month_patients.is_active is
  'Whether the patient is active or deactivated in the practice';
