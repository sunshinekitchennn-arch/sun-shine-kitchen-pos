-- Fixes two bugs:
-- 1. WhatsApp orders/bills were being rejected by the database (constraint
--    only allowed 'dine-in' and 'takeaway') — WhatsApp bills were silently
--    failing to save.
-- 2. Customer phone numbers were never actually being saved to bills, so
--    they disappeared after a page refresh.
-- Run once in Supabase SQL Editor.

alter table bills drop constraint if exists bills_order_type_check;
alter table bills add constraint bills_order_type_check
  check (order_type in ('dine-in', 'takeaway', 'whatsapp'));

alter table orders drop constraint if exists orders_order_type_check;
alter table orders add constraint orders_order_type_check
  check (order_type in ('dine-in', 'takeaway', 'whatsapp'));
