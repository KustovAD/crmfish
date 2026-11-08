-- CRMFish: схема для Supabase. Выполните целиком в SQL Editor → New query → Run.
-- Скрипт можно запускать повторно.

create extension if not exists pgcrypto;

-- Товары
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  url             text        not null default '',
  title           text        not null,
  image_url       text,
  price_cny       numeric     not null default 0,
  delivery_rub    numeric     not null default 0,
  is_original     boolean     not null default false,
  is_ordered      boolean     not null default false,
  sale_price_rub  numeric     not null default 0,
  is_sold         boolean     not null default false,
  created_at      timestamptz not null default now(),
  ordered_at      timestamptz,
  sold_at         timestamptz
);

-- Для баз, созданных до появления поля доставки
alter table public.products add column if not exists delivery_rub numeric not null default 0;
alter table public.products add column if not exists image_url text;

-- Глобальные настройки (ровно одна строка с id = 1)
create table if not exists public.settings (
  id             int primary key default 1 check (id = 1),
  start_capital  numeric     not null default 100000,
  rate           numeric     not null default 11.5,
  updated_at     timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- Публичный доступ без авторизации (все видят и редактируют одни и те же данные).
-- ⚠️ Любой, у кого есть ссылка на приложение (и, следовательно, anon-ключ), может менять данные.
alter table public.products enable row level security;
alter table public.settings enable row level security;

drop policy if exists "crmfish public products" on public.products;
create policy "crmfish public products" on public.products
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "crmfish public settings" on public.settings;
create policy "crmfish public settings" on public.settings
  for all to anon, authenticated using (true) with check (true);

-- Realtime: изменения сразу прилетают всем открытым вкладкам
do $$
begin
  begin
    alter publication supabase_realtime add table public.products;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.settings;
  exception when duplicate_object then null;
  end;
end $$;
