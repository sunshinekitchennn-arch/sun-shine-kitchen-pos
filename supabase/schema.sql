-- ============================================================
-- BYOB Restaurant POS — Supabase schema
-- Run this in Supabase: Project → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. RESTAURANTS (kept even for single-restaurant use, so this schema
--    can support more restaurants later with zero migration pain)
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  corkage_fee numeric not null default 0,
  service_charge_pct numeric not null default 0,
  pool_hourly_rate numeric not null default 500,
  created_at timestamptz not null default now()
);

-- 2. STAFF ACCOUNTS (cashiers/waiters/admins). Uses Supabase Auth's
--    built-in users table (auth.users) — this just adds restaurant-specific info.
create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  full_name text not null,
  role text not null default 'cashier' check (role in ('admin', 'cashier', 'kitchen')),
  created_at timestamptz not null default now()
);

-- 3. DINING TABLES
create table dining_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  number int not null,
  seats int not null default 2,
  status text not null default 'available' check (status in ('available', 'occupied', 'reserved', 'cleaning')),
  created_at timestamptz not null default now(),
  unique (restaurant_id, number)
);

-- 4. POOL TABLE(S)
create table pool_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  hourly_rate numeric not null default 500,
  status text not null default 'available' check (status in ('available', 'in-use')),
  active_order_id uuid,           -- set while in-use, references orders(id) (added after orders table)
  started_at timestamptz
);

-- 5. MENU ITEMS
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  category text not null,
  type text not null default 'Food' check (type in ('Food', 'Drinks')),
  price numeric not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

-- 6. ORDERS (one row per open table/takeaway ticket)
create table orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_type text not null check (order_type in ('dine-in', 'takeaway')),
  label text not null,                 -- table number or takeaway number shown on screen
  table_id uuid references dining_tables(id),
  customer_name text,
  customer_phone text,
  bottles int not null default 0,
  cash_received numeric,
  pool_hours int not null default 0,   -- accumulated finished pool sessions this visit
  pool_charge numeric not null default 0,
  status text not null default 'open' check (status in ('open', 'settled')),
  opened_by uuid references staff(id),
  created_at timestamptz not null default now()
);

alter table pool_tables
  add constraint pool_tables_active_order_fk
  foreign key (active_order_id) references orders(id) on delete set null;

-- 7. ROUNDS (each "send to kitchen" batch within an order)
create table rounds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  round_number int not null,
  status text not null default 'draft' check (status in ('draft', 'kitchen', 'served')),
  fired_at timestamptz,
  served_at timestamptz
);

-- 8. ROUND ITEMS (line items within a round)
create table round_items (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  name text not null,          -- snapshot of name at order time (price/name changes later shouldn't rewrite history)
  price numeric not null,      -- snapshot of price at order time
  qty int not null default 1
);

-- 9. SETTLED BILLS (immutable record created when an order is closed out)
create table bills (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid references orders(id),
  order_type text not null,
  label text not null,
  customer_name text,
  date date not null default current_date,
  food_total numeric not null default 0,
  corkage_total numeric not null default 0,
  bottles int not null default 0,
  pool_hours int not null default 0,
  pool_charge numeric not null default 0,
  service_charge_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  grand_total numeric not null default 0,
  cash_received numeric,
  change_due numeric,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'Card', 'Bank Transfer', 'QR')),
  cashier_name text,
  created_at timestamptz not null default now()
);

-- 10. RESERVATIONS
create table reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid references dining_tables(id),
  guest_name text not null,
  phone text,
  date date not null,
  time text not null,
  party_size int not null default 2,
  notes text,
  status text not null default 'confirmed' check (status in ('confirmed', 'seated', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security — every table is locked down so a logged-in
-- staff member can only see/edit their own restaurant's data.
-- (Skip/adjust this section if you only ever run one restaurant
-- and want simpler policies — but it's safe to leave on.)
-- ============================================================
alter table restaurants enable row level security;
alter table staff enable row level security;
alter table dining_tables enable row level security;
alter table pool_tables enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table rounds enable row level security;
alter table round_items enable row level security;
alter table bills enable row level security;
alter table reservations enable row level security;

-- Helper: current user's restaurant_id
create or replace function current_restaurant_id() returns uuid as $$
  select restaurant_id from staff where id = auth.uid();
$$ language sql stable security definer;

create policy "staff see own restaurant" on restaurants
  for select using (id = current_restaurant_id());

create policy "staff manage own dining_tables" on dining_tables
  for all using (restaurant_id = current_restaurant_id());

create policy "staff manage own pool_tables" on pool_tables
  for all using (restaurant_id = current_restaurant_id());

create policy "staff manage own menu_items" on menu_items
  for all using (restaurant_id = current_restaurant_id());

create policy "staff manage own orders" on orders
  for all using (restaurant_id = current_restaurant_id());

create policy "staff manage own rounds" on rounds
  for all using (order_id in (select id from orders where restaurant_id = current_restaurant_id()));

create policy "staff manage own round_items" on round_items
  for all using (round_id in (
    select r.id from rounds r join orders o on o.id = r.order_id
    where o.restaurant_id = current_restaurant_id()
  ));

create policy "staff manage own bills" on bills
  for all using (restaurant_id = current_restaurant_id());

create policy "staff manage own reservations" on reservations
  for all using (restaurant_id = current_restaurant_id());

create policy "staff see own row" on staff
  for select using (restaurant_id = current_restaurant_id());

-- ============================================================
-- Seed: one restaurant + one admin-linked row so the app has
-- somewhere to point at immediately after signup. Run this AFTER
-- you create your first user in Supabase Auth, then replace the
-- placeholder UUID below with that user's id (Authentication → Users).
-- ============================================================
-- insert into restaurants (id, name) values ('00000000-0000-0000-0000-000000000001', 'My Restaurant');
-- insert into staff (id, restaurant_id, full_name, role)
--   values ('<paste-your-auth-user-id-here>', '00000000-0000-0000-0000-000000000001', 'Owner', 'admin');
