-- Bajet: Supabase Schema
-- Run this in the Supabase SQL Editor

-- Users profile (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  gross_income numeric(12,2) not null default 0,
  epf_rate numeric(5,2) not null default 11,
  marital_status text default 'single',
  num_children int default 0,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Monthly deductions
create table if not exists public.monthly_deductions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete cascade,
  epf_amount numeric(12,2) not null default 0,
  socso_amount numeric(12,2) not null default 0,
  eis_amount numeric(12,2) not null default 0,
  pcb_amount numeric(12,2) not null default 0,
  total numeric(12,2) generated always as
    (epf_amount + socso_amount + eis_amount + pcb_amount) stored,
  created_at timestamptz default now()
);

-- Fixed expenses
create table if not exists public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  icon text,
  created_at timestamptz default now()
);

-- Savings target
create table if not exists public.savings_target (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('percentage', 'amount')),
  value numeric(12,2) not null,
  computed_amount numeric(12,2) not null,
  created_at timestamptz default now()
);

-- Envelopes (variable expense categories)
create table if not exists public.envelopes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  icon text not null,
  monthly_budget numeric(12,2) not null,
  percentage numeric(5,2) not null,
  sort_order int default 0,
  color text,
  created_at timestamptz default now()
);

-- Budget periods
create table if not exists public.budget_periods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  total_variable_budget numeric(12,2) not null,
  days_in_period int not null,
  created_at timestamptz default now()
);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  envelope_id uuid references public.envelopes(id) on delete set null,
  budget_period_id uuid references public.budget_periods(id),
  amount numeric(12,2) not null,
  description text,
  transaction_date date not null default current_date,
  transaction_time time not null default current_time,
  created_at timestamptz default now()
);

-- Borrow-from-future log
create table if not exists public.future_borrows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  budget_period_id uuid references public.budget_periods(id),
  amount numeric(12,2) not null,
  source text not null check (source in ('savings', 'spread')),
  reason text,
  borrow_date date not null default current_date,
  created_at timestamptz default now()
);

-- Weekly savings snapshots
create table if not exists public.weekly_savings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  budget_period_id uuid references public.budget_periods(id),
  week_start date not null,
  week_end date not null,
  weekly_budget numeric(12,2) not null,
  weekly_spent numeric(12,2) not null,
  remainder numeric(12,2) not null,
  transferred_to_savings boolean default false,
  transferred_at timestamptz,
  created_at timestamptz default now()
);

-- Medals / achievements
create table if not exists public.medals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  medal_type text not null,
  title text not null,
  description text,
  earned_at timestamptz default now(),
  week_ref date,
  amount numeric(12,2),
  seen boolean default false
);

-- ============================================
-- Row Level Security
-- ============================================

alter table public.profiles enable row level security;
alter table public.monthly_deductions enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.savings_target enable row level security;
alter table public.envelopes enable row level security;
alter table public.budget_periods enable row level security;
alter table public.transactions enable row level security;
alter table public.future_borrows enable row level security;
alter table public.weekly_savings enable row level security;
alter table public.medals enable row level security;

-- Profiles: id = auth.uid() (separate policies for insert vs read/update)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users can delete own profile"
  on public.profiles for delete
  using (id = auth.uid());

-- All other tables: profile_id = auth.uid()
create policy "Users can CRUD own monthly_deductions"
  on public.monthly_deductions for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Users can CRUD own fixed_expenses"
  on public.fixed_expenses for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Users can CRUD own savings_target"
  on public.savings_target for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Users can CRUD own envelopes"
  on public.envelopes for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Users can CRUD own budget_periods"
  on public.budget_periods for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Users can CRUD own transactions"
  on public.transactions for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Users can CRUD own future_borrows"
  on public.future_borrows for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Users can CRUD own weekly_savings"
  on public.weekly_savings for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Users can CRUD own medals"
  on public.medals for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
