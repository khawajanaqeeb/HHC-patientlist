-- Add extended patient profile fields to month_patients table
alter table public.month_patients
  add column if not exists subscriber_email text default '',
  add column if not exists father_husband_name text default '',
  add column if not exists dob text default '',
  add column if not exists gender text default '',
  add column if not exists address text default '',
  add column if not exists google_address_location text default '',
  add column if not exists assigned_doctor text default '';
