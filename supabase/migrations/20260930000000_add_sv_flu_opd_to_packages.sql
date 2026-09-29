alter table public.packages
  add column if not exists sv integer not null default 0,
  add column if not exists flu integer not null default 0,
  add column if not exists opd integer not null default 0;
