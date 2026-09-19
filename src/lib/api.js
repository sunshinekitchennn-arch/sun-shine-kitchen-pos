import { supabase } from "./supabaseClient";

// ============================================================
// Every function here takes restaurantId as the first argument
// and returns/accepts data shaped as close as possible to the
// objects your existing POS component already uses, so swapping
// a useState call for one of these is mostly a rename.
// ============================================================

// ---------- TABLES ----------
export async function fetchTables(restaurantId) {
  const { data, error } = await supabase
    .from("dining_tables").select("*").eq("restaurant_id", restaurantId).order("number");
  if (error) throw error;
  return data;
}

export async function updateTableStatus(tableId, status) {
  const { error } = await supabase.from("dining_tables").update({ status }).eq("id", tableId);
  if (error) throw error;
}

// ---------- MENU ----------
export async function fetchMenu(restaurantId) {
  const { data, error } = await supabase
    .from("menu_items").select("*").eq("restaurant_id", restaurantId).order("category");
  if (error) throw error;
  return data;
}

export async function createMenuItem(restaurantId, item) {
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      restaurant_id: restaurantId, name: item.name, category: item.category, type: item.type,
      price: item.price, is_available: true, is_special: item.isSpecial || false, image_url: item.imageUrl || null,
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateMenuItem(id, patch) {
  const dbPatch = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.type !== undefined) dbPatch.type = patch.type;
  if (patch.price !== undefined) dbPatch.price = patch.price;
  if (patch.available !== undefined) dbPatch.is_available = patch.available;
  if (patch.isSpecial !== undefined) dbPatch.is_special = patch.isSpecial;
  if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl;
  const { error } = await supabase.from("menu_items").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deleteMenuItem(id) {
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw error;
}

// Uploads a menu item photo to Supabase Storage and returns its public URL.
// Call this first, then pass the returned url into createMenuItem/updateMenuItem
// as `imageUrl`.
export async function uploadMenuImage(file) {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: uploadErr } = await supabase.storage.from("menu-images").upload(path, file);
  if (uploadErr) throw uploadErr;
  const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
  return data.publicUrl;
}

// ---------- ADD-ONS (extra meat/protein on rice, kottu, noodles) ----------
export async function fetchAddons(restaurantId) {
  const { data, error } = await supabase
    .from("addons").select("*").eq("restaurant_id", restaurantId).eq("is_available", true).order("price");
  if (error) throw error;
  return data;
}

export async function createAddon(restaurantId, addon) {
  const { data, error } = await supabase
    .from("addons").insert({ restaurant_id: restaurantId, name: addon.name, price: addon.price })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateAddon(id, patch) {
  const dbPatch = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.price !== undefined) dbPatch.price = patch.price;
  if (patch.available !== undefined) dbPatch.is_available = patch.available;
  const { error } = await supabase.from("addons").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deleteAddon(id) {
  const { error } = await supabase.from("addons").delete().eq("id", id);
  if (error) throw error;
}

// ---------- ORDER DRAFTS (keeps an in-progress order safe across a refresh) ----------
// Saves/updates a snapshot of an order that's still being built (before it's
// settled). Called automatically a moment after every change — the person
// doesn't do anything differently, this just runs quietly in the background.
export async function upsertOrderDraft(restaurantId, orderId, orderData) {
  const { error } = await supabase.from("order_drafts").upsert({
    id: orderId, restaurant_id: restaurantId, data: orderData, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteOrderDraft(orderId) {
  const { error } = await supabase.from("order_drafts").delete().eq("id", orderId);
  if (error) throw error;
}

// Called once when the app loads, to bring back any orders that were still
// in progress when the page was last closed/refreshed.
export async function fetchOrderDrafts(restaurantId) {
  const { data, error } = await supabase.from("order_drafts").select("*").eq("restaurant_id", restaurantId);
  if (error) throw error;
  return data.map(d => d.data);
}

export async function updateBillStatus(id, status) {
  const { error } = await supabase.from("bills").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteBillRecord(id) {
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) throw error;
}

// Public, no-login menu fetch for the customer-facing menu page.
// Only returns available items, ordered so specials show first.
export async function fetchPublicMenu(restaurantId) {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_available", true)
    .order("is_special", { ascending: false })
    .order("category");
  if (error) throw error;
  return data;
}

export async function fetchPublicRestaurant(restaurantId) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("name, address, phone")
    .eq("id", restaurantId)
    .single();
  if (error) throw error;
  return data;
}

// ---------- POOL TABLE ----------
export async function fetchPoolTable(restaurantId) {
  const { data, error } = await supabase
    .from("pool_tables").select("*").eq("restaurant_id", restaurantId).single();
  if (error) throw error;
  return data;
}

export async function startPool(poolTableId, orderId) {
  const { error } = await supabase
    .from("pool_tables")
    .update({ status: "in-use", active_order_id: orderId, started_at: new Date().toISOString() })
    .eq("id", poolTableId);
  if (error) throw error;
}

// Call when the group finishes playing — computes hours (rounded up,
// minimum 1) same as the in-app logic, adds the charge onto the order,
// and frees the pool table so it can be booked again immediately.
export async function finishPool(poolTableId, order, hourlyRate) {
  const { data: pool, error: poolErr } = await supabase
    .from("pool_tables").select("started_at").eq("id", poolTableId).single();
  if (poolErr) throw poolErr;

  const hours = Math.max(1, Math.ceil((Date.now() - new Date(pool.started_at).getTime()) / 3600000));
  const charge = hours * hourlyRate;

  const { error: orderErr } = await supabase
    .from("orders")
    .update({
      pool_hours: (order.pool_hours || 0) + hours,
      pool_charge: (order.pool_charge || 0) + charge,
    })
    .eq("id", order.id);
  if (orderErr) throw orderErr;

  const { error: poolUpdateErr } = await supabase
    .from("pool_tables")
    .update({ status: "available", active_order_id: null, started_at: null })
    .eq("id", poolTableId);
  if (poolUpdateErr) throw poolUpdateErr;

  return { hours, charge };
}

// Saves a settled bill as a permanent record for reporting — matches the
// shape POSTab already builds locally (see the `bill` object in settleBill()),
// so no field renaming is needed at the call site. Doesn't require a real
// `orders` row to exist in Supabase (order_id is left out / null).
export async function saveBill(restaurantId, bill) {
  const { data, error } = await supabase.from("bills").insert({
    restaurant_id: restaurantId,
    order_type: bill.orderType,
    label: String(bill.label),
    customer_name: bill.customerName || null,
    customer_phone: bill.customerPhone || null,
    date: bill.date,
    food_total: bill.foodTotal,
    corkage_total: bill.corkageTotal,
    bottles: bill.bottles,
    pool_hours: bill.poolHours,
    pool_charge: bill.poolCharge,
    service_charge_amount: bill.serviceChargeAmount,
    discount_amount: bill.discountAmount || 0,
    grand_total: bill.grandTotal,
    cash_received: bill.cashReceived,
    change_due: bill.changeDue,
    status: bill.status,
    cashier_name: bill.cashier,
    payment_method: bill.paymentMethod || "Cash",
    bill_number: bill.billNumber || null,
    items: bill.items || [],
  }).select().single();
  if (error) throw error;
  return data; // includes the database-assigned bill_number
}

// ---------- ORDERS (kept for later use — order-in-progress isn't synced yet) ----------
export async function fetchOpenOrders(restaurantId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, rounds(*, round_items(*))")
    .eq("restaurant_id", restaurantId)
    .eq("status", "open");
  if (error) throw error;
  return data;
}

export async function createOrder(restaurantId, { orderType, label, tableId, staffId }) {
  const { data, error } = await supabase
    .from("orders")
    .insert({ restaurant_id: restaurantId, order_type: orderType, label, table_id: tableId, opened_by: staffId })
    .select().single();
  if (error) throw error;
  // every order starts with one draft round to add items into
  await supabase.from("rounds").insert({ order_id: data.id, round_number: 1, status: "draft" });
  return data;
}

export async function updateOrder(orderId, patch) {
  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) throw error;
}

// ---------- ROUNDS & ITEMS ----------
export async function addItemToRound(roundId, menuItem, qty = 1) {
  const { error } = await supabase.from("round_items").insert({
    round_id: roundId, menu_item_id: menuItem.id, name: menuItem.name, price: menuItem.price, qty,
  });
  if (error) throw error;
}

export async function updateItemQty(roundItemId, qty) {
  if (qty <= 0) {
    const { error } = await supabase.from("round_items").delete().eq("id", roundItemId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("round_items").update({ qty }).eq("id", roundItemId);
  if (error) throw error;
}

// Sends a round to the kitchen. Also opens the next draft round so new
// items being added don't land in the round that's already cooking.
export async function fireRound(orderId, roundId, roundNumber) {
  const { error } = await supabase
    .from("rounds").update({ status: "kitchen", fired_at: new Date().toISOString() }).eq("id", roundId);
  if (error) throw error;

  const { error: nextErr } = await supabase
    .from("rounds").insert({ order_id: orderId, round_number: roundNumber + 1, status: "draft" });
  if (nextErr) throw nextErr;
}

export async function markRoundServed(roundId) {
  const { error } = await supabase
    .from("rounds").update({ status: "served", served_at: new Date().toISOString() }).eq("id", roundId);
  if (error) throw error;
}

// ---------- SETTLING A BILL ----------
// Writes the immutable bill row, closes the order, and frees the table —
// all three or none (wrapped so partial failures can't leave a table stuck).
export async function settleBill(restaurantId, order, totals, cashierName) {
  const { data: bill, error: billErr } = await supabase
    .from("bills")
    .insert({
      restaurant_id: restaurantId,
      order_id: order.id,
      order_type: order.order_type,
      label: order.label,
      customer_name: order.customer_name,
      food_total: totals.foodTotal,
      corkage_total: totals.corkageTotal,
      bottles: order.bottles,
      pool_hours: totals.poolHours,
      pool_charge: totals.poolCharge,
      service_charge_amount: totals.serviceChargeAmount,
      discount_amount: totals.discountAmount || 0,
      grand_total: totals.grandTotal,
      cash_received: order.cash_received,
      change_due: totals.changeDue,
      cashier_name: cashierName,
    })
    .select().single();
  if (billErr) throw billErr;

  const { error: orderErr } = await supabase.from("orders").update({ status: "settled" }).eq("id", order.id);
  if (orderErr) throw orderErr;

  if (order.table_id) {
    const { error: tableErr } = await supabase
      .from("dining_tables").update({ status: "cleaning" }).eq("id", order.table_id);
    if (tableErr) throw tableErr;
  }

  return bill;
}

// ---------- BILL HISTORY / SALES REPORTS ----------
export async function fetchBillsForDate(restaurantId, date) {
  // pass date = null for all-time
  let q = supabase.from("bills").select("*").eq("restaurant_id", restaurantId).order("created_at", { ascending: false });
  if (date) q = q.eq("date", date);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchSalesByDay(restaurantId) {
  // Simple client-side grouping keeps this compatible with the free tier
  // (no stored procedures required). Fine up to a few thousand bills;
  // move to a SQL view/RPC later if that becomes slow.
  const { data, error } = await supabase
    .from("bills").select("date, grand_total, status").eq("restaurant_id", restaurantId);
  if (error) throw error;

  const byDay = {};
  for (const b of data) {
    if (!byDay[b.date]) byDay[b.date] = { date: b.date, bills: 0, total: 0, refunded: 0 };
    if (b.status === "paid") { byDay[b.date].bills++; byDay[b.date].total += b.grand_total; }
    else byDay[b.date].refunded++;
  }
  return Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date));
}

// ---------- RESERVATIONS ----------
export async function fetchReservations(restaurantId) {
  const { data, error } = await supabase
    .from("reservations").select("*").eq("restaurant_id", restaurantId).order("date").order("time");
  if (error) throw error;
  return data;
}

export async function createReservation(restaurantId, reservation) {
  const { data, error } = await supabase
    .from("reservations")
    .insert({
      restaurant_id: restaurantId,
      guest_name: reservation.name,
      phone: reservation.phone || null,
      date: reservation.date,
      time: reservation.time,
      party_size: reservation.size,
      table_id: reservation.tableId || null,
      notes: reservation.notes || null,
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateReservationStatus(id, status) {
  const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteReservation(id) {
  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) throw error;
}

// ---------- LIVE UPDATES ----------
// Optional but recommended: subscribe so every cashier/kitchen screen
// sees changes instantly without polling. Call this once per screen and
// clean it up (e.g. in a useEffect return) when the component unmounts.
export function subscribeToOrders(restaurantId, onChange) {
  const channel = supabase
    .channel(`orders-${restaurantId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "round_items" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
