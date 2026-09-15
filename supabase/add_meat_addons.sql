-- Meat / protein add-ons that customers can add to Fried Rice, Kottu and
-- Noodles dishes. Run once in Supabase SQL Editor.

create table if not exists addons (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  price numeric not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

alter table addons enable row level security;

create policy "staff manage own addons" on addons
  for all using (restaurant_id = current_restaurant_id());

create policy "public can view available addons" on addons
  for select using (is_available = true);

-- Which categories offer add-ons. Items in these categories will show the
-- meat options in the POS; everything else won't.
alter table menu_items add column if not exists allows_addons boolean not null default false;

update menu_items set allows_addons = true
where category in ('Fried Rice Variety', 'Kottu Specialities', 'Noodles');

-- ---------- SEED THE ADD-ONS ----------
-- ⚠️ Prices below are placeholders — change them to the real add-on prices
-- before going live.
insert into addons (restaurant_id, name, price)
select (select id from restaurants where name = 'Sun Shine Kitchen'), a.name, a.price
from (values
  ('Extra Chicken',    400),
  ('Extra Fish',       400),
  ('Extra Pork',       500),
  ('Extra Prawns',     600),
  ('Extra Cuttlefish', 600)
) as a(name, price);
