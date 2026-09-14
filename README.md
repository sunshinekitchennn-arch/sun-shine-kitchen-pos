# BYOB POS — connecting a real backend

This gives your POS a permanent database instead of browser memory, so data
survives refreshes, works across multiple devices at once, and each staff
login only sees your restaurant's data.

## What you're getting
- `supabase/schema.sql` — the full database structure (run once)
- `src/lib/supabaseClient.js` — connects your app to Supabase
- `src/lib/auth.js` — staff login/logout
- `src/lib/api.js` — one function per action your POS already does
  (create order, fire round, settle bill, etc.) — same shapes, now backed
  by the database instead of `useState`

## Setup (about 20 minutes)

### 1. Create a Supabase project
Go to supabase.com → New project. Free tier is enough to start (500MB
database, more than enough for years of restaurant orders).

### 2. Run the schema
Project → SQL Editor → New query → paste everything in `supabase/schema.sql`
→ Run. This creates all the tables and locks each one down so staff can
only see their own restaurant's data.

### 3. Create your first login + restaurant row
- Authentication → Users → Add user → enter an email + password for
  yourself (the owner/admin).
- Copy that user's ID (shown in the users list).
- Back in SQL Editor, uncomment and run the two `insert` lines at the
  bottom of `schema.sql`, replacing the placeholder UUID with your real
  restaurant name and the user ID you just copied.

### 4. Get your API keys
Project Settings → API → copy the **Project URL** and **anon public** key.

### 5. Set up your project
```bash
npm create vite@latest byob-pos -- --template react
cd byob-pos
npm install @supabase/supabase-js
```
Copy the `src/lib/` folder from this delivery into your new project's
`src/lib/`. Create a `.env` file in the project root:
```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```
Add `.env` to your `.gitignore` — never commit real keys.

### 6. Wire it into your existing POS component
Your current component (`byob-restaurant-system.jsx`) manages everything
with `useState`. The pattern to switch each piece over:

**Before (local state):**
```js
const [orders, setOrders] = useState([]);
function fireRound(roundId) {
  const newRounds = activeOrder.rounds.map(r =>
    r.id === roundId ? { ...r, status: "kitchen" } : r
  );
  updateOrder({ rounds: newRounds });
}
```

**After (Supabase, same function name and call sites):**
```js
import { fetchOpenOrders, fireRound as apiFireRound, subscribeToOrders } from "./lib/api";

const [orders, setOrders] = useState([]);

useEffect(() => {
  fetchOpenOrders(restaurantId).then(setOrders);
  return subscribeToOrders(restaurantId, () => {
    fetchOpenOrders(restaurantId).then(setOrders); // simplest approach: refetch on any change
  });
}, [restaurantId]);

function fireRound(roundId) {
  apiFireRound(activeOrder.id, roundId, activeOrder.rounds.length);
  // no need to setOrders manually — the subscription above picks up the change
}
```

Do this one section at a time — tables first, then menu, then orders/rounds,
then bills/reservations/pool — testing after each so you always know which
change broke something if the screen goes blank.

### 7. Add a login screen
Wrap your app so nothing renders until `onAuthChange` (from `lib/auth.js`)
reports a logged-in session; otherwise show an email/password form calling
`signIn()`. Once logged in, call `getStaffProfile(user.id)` to get the
`restaurant_id` every API function needs.

### 8. Deploy
```bash
npm run build
```
Push the project to GitHub, then connect it on vercel.com or netlify.com
(free tier) — either will auto-deploy on every push and give you a live
URL. Add your Supabase env vars in their dashboard settings too (same two
values as your `.env`).

## Adding more staff later
Authentication → Users → Add user for each cashier/waiter, then insert a
matching row into `staff` (SQL Editor) with their role. No code changes
needed — RLS policies already scope everyone to your restaurant.

## If you want to sell this to other restaurants (multi-tenant)
The schema already supports it — every table has `restaurant_id` and RLS
already isolates each restaurant's data. What's still missing: a signup
flow that creates a new `restaurants` row + first admin `staff` row
together (currently that insert is manual, see step 3). Worth doing once
you have your first paying customer, not before.
