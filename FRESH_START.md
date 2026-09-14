# Fresh Start — set up everything new

Follow these 4 parts in order. Don't skip ahead — each part needs the one before it.

## Part 1 — New Supabase project (database)

1. Go to supabase.com → sign in → **New project**.
2. Name it (e.g. "sun-shine-kitchen-pos"), set a database password (save it
   somewhere), pick a region close to Sri Lanka (Singapore/Mumbai), click
   **Create new project**. Wait ~2 minutes.
3. **SQL Editor** → **New query** → open `supabase/schema.sql` from this
   folder, copy ALL of it, paste, click **Run**. Wait for "Success."
4. **New query** again → open `supabase/seed_sunshine_kitchen.sql`, copy
   ALL of it, paste, click **Run**. This loads the restaurant, 8 tables,
   the full menu, and the pool table.
5. **Table Editor** → check `menu_items` has ~40 rows and `restaurants`
   has 1 row named "Sun Shine Kitchen". If not, stop and check for
   error messages before continuing.
6. **Authentication → Users → Add user** → enter an email + password for
   yourself (the owner/admin login). Turn on **Auto Confirm User**.
   Click the new user, copy the **User UID**.
7. **SQL Editor → New query**, paste this (replace the UID):
   ```sql
   insert into staff (id, restaurant_id, full_name, role)
   values (
     '<paste-the-user-uid-here>',
     (select id from restaurants where name = 'Sun Shine Kitchen'),
     'Owner',
     'admin'
   );
   ```
   Click **Run**.
8. **Project Settings → API** → copy the **Project URL** and the
   **anon public** key. You'll need both in Part 3.

## Part 2 — New GitHub repository (code)

1. Go to github.com → sign in with **the account you'll use for
   everything from now on** (this matters — see the warning below).
2. **New repository** → name it (e.g. "sun-shine-kitchen-pos") → choose
   **Public** (simplest, avoids a Vercel restriction — see warning) →
   **Create repository**.
3. On the empty repo page, click **uploading an existing file**.
4. Open the `byob-pos` folder on your computer (the one with `src`,
   `supabase`, `package.json` in it). Select everything **except**
   `node_modules` if it exists, and drag it into the GitHub upload page.
   (`.env` won't upload — GitHub hides files starting with a dot from
   drag-and-drop uploads on some browsers; that's fine, it's not needed
   on GitHub anyway, only on Vercel — see Part 3.)
5. Scroll down, click **Commit changes**.

> ⚠️ **Whichever GitHub account you upload with must be the same account
> you connect to Vercel in Part 3.** Mixing two different GitHub/Vercel
> accounts causes deployments to get silently "Blocked" — this bit us
> once already. One account, used consistently, for both.

## Part 3 — New Vercel project (hosting)

1. Go to vercel.com → **Continue with GitHub** → sign in with the
   **same GitHub account** you used in Part 2.
2. **Add New → Project** → find your new repo → **Import**.
3. Before clicking Deploy, open **Environment Variables** and add:
   - Name: `VITE_SUPABASE_URL` — Value: (the Project URL from Part 1 step 8)
   - Name: `VITE_SUPABASE_ANON_KEY` — Value: (the anon key from Part 1 step 8)
4. Click **Deploy**. Wait ~1-2 minutes for "Congratulations."
5. Open the live URL it gives you, log in with the email/password from
   Part 1 step 6, and confirm tables + menu show up.

## Part 4 — Making future changes

From now on, whenever you (or I) need to update the code:
1. Download the updated files.
2. On GitHub, open your repo → navigate into the changed file → click
   the **pencil (edit)** icon → paste the new content → **Commit
   changes**. Do this per file, OR use "Add file → Upload files" again
   to overwrite multiple files at once by dragging them in.
3. Vercel automatically redeploys within a minute or two of any commit.

This avoids git/terminal entirely for day-to-day updates — everything
happens through GitHub's website. It's slower for big changes but far
less error-prone than juggling `git clone`/`cd`/`git push` by hand.
