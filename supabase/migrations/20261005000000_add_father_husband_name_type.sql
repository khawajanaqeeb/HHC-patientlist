-- ============================================================
-- HHC Staff: Add father_husband_name_type column
-- Migration: 20261005000000_add_father_husband_name_type
-- ============================================================

alter table public.staff
  add column if not exists father_husband_name_type text
    not null default 'father'
    check (father_husband_name_type in ('father', 'husband'));

comment on column public.staff.father_husband_name_type is
  'Relationship type for father_husband_name: ''father'' (S/O) or ''husband'' (W/O).';
