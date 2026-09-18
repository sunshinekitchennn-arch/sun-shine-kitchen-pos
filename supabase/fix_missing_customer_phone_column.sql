-- Adds the customer_phone column that's missing from your live database —
-- this is why EVERY bill was failing to save (not just ones with a phone
-- number), since the save always tries to include this column.
alter table bills add column if not exists customer_phone text;

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

create policy "staff manage own order_drafts" on order_drafts
  for all using (restaurant_id = current_restaurant_id());
