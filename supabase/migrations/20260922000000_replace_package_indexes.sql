alter table public.month_patients
  add column if not exists package_id bigint references public.packages(id) on delete set null;

with ordered_packages as (
  select id, row_number() over (order by sort_order, id) - 1 as package_index
  from public.packages
)
update public.month_patients as patients
set package_id = packages.id
from ordered_packages as packages
where patients.pkg_idx = packages.package_index
  and patients.package_id is null;

alter table public.month_patients
  drop column if exists pkg_idx;

create index if not exists month_patients_package_idx
  on public.month_patients (package_id);
