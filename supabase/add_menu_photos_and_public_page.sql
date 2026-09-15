-- Adds photo support + "this week's special" highlighting to menu items,
-- and opens up public (no-login) read access so a customer-facing menu
-- page can work. Run once in Supabase SQL Editor.

alter table menu_items add column if not exists image_url text;
alter table menu_items add column if not exists is_special boolean not null default false;

-- Storage bucket for menu photos (public read, so images load on the
-- customer menu page without needing a login).
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- Anyone can view files in this bucket (needed for the public menu page).
create policy "public can view menu images" on storage.objects
  for select using (bucket_id = 'menu-images');

-- Only logged-in staff can upload/replace/delete menu images.
create policy "staff can upload menu images" on storage.objects
  for insert with check (bucket_id = 'menu-images' and auth.role() = 'authenticated');
create policy "staff can update menu images" on storage.objects
  for update using (bucket_id = 'menu-images' and auth.role() = 'authenticated');
create policy "staff can delete menu images" on storage.objects
  for delete using (bucket_id = 'menu-images' and auth.role() = 'authenticated');

-- Public (no login) read access for the customer-facing menu page —
-- only shows items marked available, and only the restaurant's public
-- details (name/address/phone/logo), never bills, orders, or staff data.
create policy "public can view available menu items" on menu_items
  for select using (is_available = true);

create policy "public can view restaurant details" on restaurants
  for select using (true);
