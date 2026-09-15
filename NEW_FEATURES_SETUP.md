# New features — setup steps

Three things were added: **menu photos + weekly specials**, a **public
customer menu page**, and **extra-meat add-ons**. Do these in order.

## 1. Run the two SQL files

Supabase → SQL Editor → New query → paste → Run. One at a time:

1. `supabase/add_menu_photos_and_public_page.sql` — adds photo + specials
   columns, creates the image storage bucket, and opens public read access
   so the customer menu page works without a login.
2. `supabase/add_meat_addons.sql` — creates the add-ons table and seeds
   chicken / fish / pork / prawns / cuttlefish.

> ⚠️ **The add-on prices in that second file are placeholders** (400–600).
> Change them to the real prices before running it, or edit them afterwards
> in Table Editor → `addons`.

## 2. Get the restaurant ID for the public menu

The public menu has no login, so it needs the restaurant's id spelled out.

1. Supabase → **Table Editor** → `restaurants` table.
2. Copy the value in the **id** column (a long uuid).
3. Open `.env` and replace `paste-your-restaurant-id-here` with it.
4. Add the same value in Netlify: **Project configuration → Environment
   variables → Add a variable** → Key `VITE_RESTAURANT_ID`, Value = that uuid.

## 3. Push and redeploy

```
git add .
git commit -m "menu photos, specials, public menu page, meat add-ons"
git push
```
Netlify redeploys on its own in a minute or two.

## How each feature works

**Weekly specials** — Menu tab → click the ⭐ next to any item to mark it
as this week's special, or tick the box when adding/editing. Specials show
with a ⭐ in the POS and get their own highlighted section at the top of the
customer menu. Unstar them next week and star the new ones.

**Photos** — Menu tab → when adding or editing an item, choose a photo.
It uploads to Supabase Storage and appears on the customer menu (large for
specials, thumbnail for everything else).

**Public customer menu** — add `/menu` to the end of the live site address:
`https://your-site.netlify.app/menu`

No login. Open it on a monitor in the restaurant, or turn it into a QR code
(any free QR generator) for the tables. It refreshes itself every 5 minutes,
so a screen left running picks up menu changes without anyone touching it.

**Extra-meat add-ons** — in the POS, dishes in *Fried Rice Variety*,
*Kottu Specialities* and *Noodles* show small buttons underneath
(`+ Chicken Rs. 400` etc). Click one and it adds a line right under the dish
(`↳ Extra Chicken (Chicken Fried Rice)`), so the kitchen ticket and the bill
both show exactly what was added to what.

To change which categories offer add-ons, in Table Editor → `menu_items`,
toggle the `allows_addons` column. To change the add-on list or prices, edit
the `addons` table.
