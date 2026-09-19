-- Adds the customer_phone column that's missing from your live database —
-- this is why EVERY bill was failing to save (not just ones with a phone
-- number), since the save always tries to include this column.
alter table bills add column if not exists customer_phone text;
alter table bills add column if not exists items jsonb;
alter table bills add column if not exists bill_number integer;
alter table bills add column if not exists bill_number int;

-- A simple, short, sequential number for staff and customers to reference
-- ("Bill #47") instead of the long random receipt code. The database
-- assigns this automatically and safely even if more than one device is
-- settling bills at the same time.
alter table bills add column if not exists bill_number bigserial;
alter table bills add column if not exists items jsonb default '[]'::jsonb;

-- ============================================================
-- ORDER DRAFTS — keeps an in-progress order (before it's settled) safe
-- across a page refresh. Previously, only settled bills were saved to the
-- database; an order being built (items added, not yet billed) only lived
-- in the browser's memory, so refreshing the page lost it completely.
-- ============================================================
create table if not exists order_drafts (
  id text primary key,               -- matches the app's local order id
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  data jsonb not null,               -- the whole order object (rounds, items, customer info, etc.)
  updated_at timestamptz not null default now()
);

alter table order_drafts enable row level security;

drop policy if exists "staff manage own order_drafts" on order_drafts;
create policy "staff manage own order_drafts" on order_drafts
  for all using (restaurant_id = current_restaurant_id());
