-- ============================================================
-- SEED DATA — Sun Shine Kitchen (Panadura)
-- Run this AFTER schema.sql, in the same Supabase SQL Editor.
-- ============================================================

-- ---------- RESTAURANT ----------
-- ⚠️ CONFIRM WITH CLIENT: menu card says corkage is FREE for food orders
-- above Rs. 3,000, but you told me Rs. 500 flat. Using 500 for now —
-- change the corkage_fee value below once confirmed.
insert into restaurants (name, address, phone, corkage_fee, service_charge_pct, pool_hourly_rate)
values ('Sun Shine Kitchen', 'NO. 90 Kiriberiya Waduramulla, Panadura', '070 410 4105 / 077 735 5202 / 077 687 1012', 500, 10, 500);

-- ---------- TABLES ----------
-- ⚠️ ASSUMED seat counts (client only gave "8 tables" total) — edit the
-- (number, seats) pairs below to match reality before going live.
insert into dining_tables (restaurant_id, number, seats)
select (select id from restaurants where name = 'Sun Shine Kitchen'), t.number, t.seats
from (values
  (1, 2), (2, 2), (3, 4), (4, 4), (5, 4), (6, 4), (7, 6), (8, 6)
) as t(number, seats);

-- ---------- MENU ----------
-- "X / Y" items on the card are split into separate rows (same price)
-- so each can be added to an order individually.

insert into menu_items (restaurant_id, name, category, type, price)
select (select id from restaurants where name = 'Sun Shine Kitchen'), m.name, m.category, m.type, m.price
from (values
  -- Appetizers & Bites
  ('Hot Butter Cuttlefish',        'Appetizers & Bites', 'Food', 2400),
  ('Devilled Pork',                'Appetizers & Bites', 'Food', 1800),
  ('Devilled Beef',                'Appetizers & Bites', 'Food', 1800),
  ('Devilled Chicken',             'Appetizers & Bites', 'Food', 1800),
  ('Garlic Butter Prawns',         'Appetizers & Bites', 'Food', 2600),
  ('French Fries & Dips',          'Appetizers & Bites', 'Food', 950),

  -- Fried Rice Variety
  ('Special Mixed Fried Rice',     'Fried Rice Variety', 'Food', 1950),
  ('Chicken Fried Rice',           'Fried Rice Variety', 'Food', 1450),
  ('Egg Fried Rice',               'Fried Rice Variety', 'Food', 1450),
  ('Seafood Fried Rice',           'Fried Rice Variety', 'Food', 1850),
  ('Nasi Goreng',                  'Fried Rice Variety', 'Food', 2100),

  -- Traditional Rice & Curry
  ('Chicken Rice & Curry Meal',    'Traditional Rice & Curry', 'Food', 1200),
  ('Fish Rice & Curry Meal',       'Traditional Rice & Curry', 'Food', 1000),
  ('Egg Rice & Curry Meal',        'Traditional Rice & Curry', 'Food', 1000),
  ('Special Pork Curry Plate',     'Traditional Rice & Curry', 'Food', 1500),

  -- Kottu Specialities
  ('Chicken Kottu Roti',           'Kottu Specialities', 'Food', 1400),
  ('Egg Kottu Roti',               'Kottu Specialities', 'Food', 1400),
  ('Seafood Kottu Roti',           'Kottu Specialities', 'Food', 1850),
  ('Cheese Chicken Kottu',         'Kottu Specialities', 'Food', 1750),
  ('Roast Paan String Hopper Kottu','Kottu Specialities', 'Food', 1600),

  -- Chef's Special Dishes
  ('Grilled Chicken Steak',        'Chef''s Special Dishes', 'Food', 2200),
  ('BBQ Grilled Pork Ribs',        'Chef''s Special Dishes', 'Food', 2800),
  ('Fish & Chips',                 'Chef''s Special Dishes', 'Food', 1900),

  -- Soft Drinks & Sodas
  ('Coca-Cola (Can)',              'Soft Drinks & Sodas', 'Drinks', 350),
  ('Coke Zero (Can)',              'Soft Drinks & Sodas', 'Drinks', 350),
  ('Sprite (300ml)',               'Soft Drinks & Sodas', 'Drinks', 300),
  ('Fanta (300ml)',                'Soft Drinks & Sodas', 'Drinks', 300),
  ('EGB Ginger Beer',              'Soft Drinks & Sodas', 'Drinks', 300),
  ('Elephant House Soda',          'Soft Drinks & Sodas', 'Drinks', 250),

  -- BYOB Mixers & Chasers
  ('Coca-Cola Mixer (1.5L Pitcher)','BYOB Mixers & Chasers', 'Drinks', 850),
  ('Sprite Mixer (1.5L Pitcher)',  'BYOB Mixers & Chasers', 'Drinks', 850),
  ('Soda Mixer (1.5L Pitcher)',    'BYOB Mixers & Chasers', 'Drinks', 700),
  ('Tonic Water (Can)',            'BYOB Mixers & Chasers', 'Drinks', 450),
  ('Red Bull Energy Drink',        'BYOB Mixers & Chasers', 'Drinks', 950),
  ('Cranberry Juice Mixer',        'BYOB Mixers & Chasers', 'Drinks', 800),
  ('Apple Juice Mixer',            'BYOB Mixers & Chasers', 'Drinks', 800),

  -- Juices & Chillers
  ('Fresh Lime Juice',             'Juices & Chillers', 'Drinks', 500),
  ('Fresh Lime Soda',              'Juices & Chillers', 'Drinks', 500),
  ('Passion Fruit Mocktail',       'Juices & Chillers', 'Drinks', 650),
  ('Watermelon Juice',             'Juices & Chillers', 'Drinks', 600),
  ('Mango Juice',                  'Juices & Chillers', 'Drinks', 600),
  ('Iced Milo Dinosaur',           'Juices & Chillers', 'Drinks', 600),

  -- BYOB Essentials
  ('Ice Bucket (Large)',           'BYOB Essentials', 'Food', 350),
  ('Extra Ice Refill',             'BYOB Essentials', 'Food', 200)
) as m(name, category, type, price);

-- Pool table row (one per restaurant, matches pool_hourly_rate above)
insert into pool_tables (restaurant_id, hourly_rate, status)
values ((select id from restaurants where name = 'Sun Shine Kitchen'), 500, 'available');

