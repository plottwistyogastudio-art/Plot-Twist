-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  whatsapp text,
  consent_at timestamptz,         -- when they agreed to the privacy policy
  consent_version text,           -- which version of the privacy policy (data/legal.ts)
  terms_version text,             -- which version of the terms of use
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists credit_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  package_id text not null,
  total int not null,
  remaining int not null,
  expires_at timestamptz,        -- null until the first booking for packs that start on first booking
  valid_days int,                 -- set for packs whose validity starts at the first booking
  is_first_plot boolean not null default false,
  created_at timestamptz not null default now()
);
-- First Plot can only be bought once per person (enforced by the database)
create unique index if not exists one_first_plot_per_user
  on credit_packs (user_id) where is_first_plot;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  package_id text not null,
  class_key text,            -- class to book automatically after payment
  amount int not null,
  status text not null default 'pending' check (status in ('pending','paid','expired')),
  payment_ref text,          -- id from the payment gateway (later)
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  class_key text not null,   -- "YYYY-MM-DD_HH:MM"
  status text not null check (status in ('booked','waitlist','cancelled')),
  pack_id uuid references credit_packs(id),
  created_at timestamptz not null default now()
);
create unique index if not exists one_active_booking_per_class
  on bookings (user_id, class_key) where status in ('booked','waitlist');
create index if not exists bookings_class_idx on bookings (class_key, status, created_at);

-- Only the server (service role key) touches these tables.
alter table profiles enable row level security;
alter table credit_packs enable row level security;
alter table orders enable row level security;
alter table bookings enable row level security;

-- ---- Admin dashboard additions (safe to run more than once) ----
alter table profiles add column if not exists email text;
alter table bookings add column if not exists checked_in_at timestamptz;
create table if not exists credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  delta int not null,
  reason text not null,
  admin_email text,
  created_at timestamptz not null default now()
);
alter table credit_adjustments enable row level security;

-- ---- Keep payment records (without a name) when an account is deleted ----
alter table orders alter column user_id drop not null;
alter table orders drop constraint if exists orders_user_id_fkey;
alter table orders add constraint orders_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;

-- ---- Mat choice (studio mat or own mat) ----
alter table bookings add column if not exists mat text check (mat in ('studio','own'));

-- ---- Editable schedule + teachers (Admin → Schedule) ----
create table if not exists site_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table site_config enable row level security;

-- ---- Referral programme ----
alter table profiles add column if not exists referral_code text;
alter table profiles add column if not exists referred_by uuid references auth.users(id) on delete set null;
alter table profiles add column if not exists referral_qualified_at timestamptz;  -- set when the referred member pays their first order
create unique index if not exists profiles_referral_code_key on profiles (referral_code) where referral_code is not null;
alter table orders add column if not exists discount int not null default 0;     -- IDR taken off by a referral discount
