import { useState, useEffect } from "react";
import {
  Wine, UtensilsCrossed, CalendarClock, Package, ClipboardList, Truck,
  Plus, Minus, Trash2, Check, X, AlertTriangle, Search, ChevronRight,
  Users, Clock, Receipt, Pencil, LayoutGrid, ShoppingBag, Printer,
  RotateCcw, History, Coffee, Lock, ChefHat, Flame, Undo2, LogOut
} from "lucide-react";
import { fetchTables, fetchMenu, saveBill, updateTableStatus, fetchBillsForDate, createMenuItem, updateMenuItem, deleteMenuItem, fetchReservations, createReservation, updateReservationStatus, deleteReservation, uploadMenuImage, fetchAddons } from "./lib/api";

/* ---------------- Design tokens ---------------- */
const C = {
  ink: "#221F26",
  paper: "#F7F3ED",
  card: "#FFFFFF",
  wine: "#7A2E3B",
  gold: "#B8923D",
  sage: "#4F6B47",
  sageBg: "#E9EFE5",
  rust: "#B5502F",
  rustBg: "#F6E3DA",
  slate: "#6B6560",
  line: "#E4DDD2",
  cream: "#FBF8F3",
};

const displayFont = "'Fraunces', Georgia, serif";
const bodyFont = "'Inter', system-ui, sans-serif";
const monoFont = "'JetBrains Mono', ui-monospace, monospace";

const fontLinks = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 4px; }
    @media print {
      body * { visibility: hidden; }
      .receipt-print, .receipt-print * { visibility: visible; }
      .receipt-print { position: fixed; top: 0; left: 0; width: 320px; }
      .no-print { display: none !important; }
    }
  `}</style>
);

/* ---------------- Seed data ---------------- */
// seedTables / seedMenu removed — tables and menu now load live from
// Supabase (see the useEffect in App() that calls fetchTables/fetchMenu).

// seedInventory removed — was demo data (Cuttlefish, Chicken breast, etc.).
// Inventory now starts empty; add real stock items from the app.
const seedInventory = [];

// seedReservations removed — was demo data (Perera family / K. Fernando)
// referencing old sample table IDs that no longer match the real Supabase
// tables. Reservations now start empty; add real ones from the app.
const seedReservations = [];

const uid = (p) => `${p}${Math.random().toString(36).slice(2, 8)}`;
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 0 })}`;
// Uses the browser's LOCAL date (Sri Lanka time on staff devices), not UTC —
// toISOString() would give the wrong date between 12am-5:30am local time
// since Sri Lanka is UTC+5:30.
const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fmtTime = (ts) => new Date(ts).toTimeString().slice(0, 5);

/* ---------------- Small primitives ---------------- */
function Pill({ children, tone = "slate" }) {
  const tones = {
    sage: { bg: C.sageBg, fg: C.sage },
    rust: { bg: C.rustBg, fg: C.rust },
    gold: { bg: "#F3E9D2", fg: "#8A6B22" },
    slate: { bg: "#EEEAE4", fg: C.slate },
    wine: { bg: "#F0DEE1", fg: C.wine },
  };
  const t = tones[tone];
  return (
    <span style={{
      background: t.bg, color: t.fg, fontFamily: bodyFont, fontWeight: 600,
      fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase",
      padding: "3px 9px", borderRadius: 20, display: "inline-block"
    }}>{children}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
      padding: 20, ...style
    }}>{children}</div>
  );
}

function Btn({ children, onClick, variant = "primary", small, disabled, icon: Icon }) {
  const variants = {
    primary: { bg: C.wine, fg: "#fff", border: C.wine },
    ghost: { bg: "transparent", fg: C.ink, border: C.line },
    danger: { bg: "transparent", fg: C.rust, border: C.rustBg },
    gold: { bg: C.gold, fg: "#fff", border: C.gold },
    sage: { bg: C.sage, fg: "#fff", border: C.sage },
  };
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
        borderRadius: 9, padding: small ? "6px 10px" : "9px 16px",
        fontFamily: bodyFont, fontWeight: 600, fontSize: small ? 12.5 : 14,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}
    >
      {Icon && <Icon size={small ? 14 : 15} />}
      {children}
    </button>
  );
}

function SectionTitle({ eyebrow, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
      <div>
        {eyebrow && <div style={{ fontFamily: bodyFont, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: C.gold, marginBottom: 4 }}>{eyebrow}</div>}
        <h2 style={{ fontFamily: displayFont, fontSize: 26, fontWeight: 600, color: C.ink, margin: 0 }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12, flex: 1 }}>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: C.slate, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = {
  width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`,
  fontFamily: bodyFont, fontSize: 13.5, background: C.cream, outline: "none"
};
const iconBtn = { width: 22, height: 22, borderRadius: 6, border: `1px solid ${C.line}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const iconBtnDark = { width: 18, height: 18, borderRadius: 5, border: "1px solid #ffffff33", background: "transparent", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

/* ---------------- App ---------------- */
export default function App({ restaurantId, cashierName: staffName, onLogout, onOpenSecurity }) {
  const [tab, setTab] = useState("dashboard");
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState(seedReservations);
  const [menu, setMenu] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [inventory, setInventory] = useState(seedInventory);
  const [orders, setOrders] = useState([]);
  const [billHistory, setBillHistory] = useState([]);
  const [externalOrders, setExternalOrders] = useState([]);
  const [corkageFee, setCorkageFee] = useState(500);
  const [serviceChargePct, setServiceChargePct] = useState(10);
  const [takeawayCounter, setTakeawayCounter] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const [kitchenTicket, setKitchenTicket] = useState(null);
  const [cashierName, setCashierName] = useState(staffName || "");
  const [poolTables, setPoolTables] = useState([{ id: "pool1", name: "Pool Table", hourlyRate: 500, status: "available", activeOrderId: null, startedAt: null }]);
  const [addons, setAddons] = useState([]);

  // Load this restaurant's real tables and menu from Supabase once, on login.
  // (Orders/bills are still handled locally for now — see project README for
  // the next phase of this integration.)
  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    setDataLoading(true);
    Promise.all([fetchTables(restaurantId), fetchMenu(restaurantId), fetchBillsForDate(restaurantId, null), fetchReservations(restaurantId), fetchAddons(restaurantId).catch(() => [])])
      .then(([tableRows, menuRows, billRows, reservationRows, addonRows]) => {
        if (cancelled) return;
        setAddons(addonRows.map(a => ({ id: a.id, name: a.name, price: Number(a.price) })));
        setTables(tableRows.map(t => ({ id: t.id, number: t.number, seats: t.seats, status: t.status })));
        setMenu(menuRows.map(m => ({
          id: m.id, name: m.name, type: m.type || "Food", category: m.category,
          price: Number(m.price), available: m.is_available, isSpecial: m.is_special || false,
          imageUrl: m.image_url || null, allowsAddons: m.allows_addons || false,
        })));
        setReservations(reservationRows.map(r => ({
          id: r.id, name: r.guest_name, phone: r.phone || "", date: r.date, time: r.time,
          size: r.party_size, tableId: r.table_id, notes: r.notes || "", status: r.status,
        })));
        setBillHistory(billRows.map(b => ({
          id: b.id,
          receiptNo: b.id.slice(0, 8).toUpperCase(),
          date: b.date,
          time: new Date(b.created_at).toTimeString().slice(0, 5),
          orderType: b.order_type,
          label: b.label,
          customerName: b.customer_name,
          customerPhone: null,
          bottles: b.bottles,
          corkageTotal: Number(b.corkage_total),
          foodTotal: Number(b.food_total),
          poolHours: b.pool_hours,
          poolCharge: Number(b.pool_charge),
          discountAmount: Number(b.discount_amount),
          serviceChargeAmount: Number(b.service_charge_amount),
          grandTotal: Number(b.grand_total),
          cashReceived: b.cash_received != null ? Number(b.cash_received) : null,
          changeDue: b.change_due != null ? Number(b.change_due) : null,
          cashier: b.cashier_name,
          paymentMethod: b.payment_method || "Cash",
          status: b.status,
        })));
        setDataError(null);
      })
      .catch(err => !cancelled && setDataError(err.message || "Failed to load restaurant data"))
      .finally(() => !cancelled && setDataLoading(false));
    return () => { cancelled = true; };
  }, [restaurantId]);

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "reservations", label: "Tables & Bookings", icon: CalendarClock },
    { id: "pos", label: "Orders & Billing", icon: ClipboardList },
    { id: "kitchen", label: "Kitchen Display", icon: ChefHat },
    { id: "bills", label: "Bill History", icon: History },
    { id: "menu", label: "Menu", icon: UtensilsCrossed },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "delivery", label: "Delivery (Uber etc.)", icon: Truck },
  ];

  const firingCount = orders.flatMap(o => o.rounds).filter(r => r.status === "kitchen").length;

  function markRoundServed(orderId, roundId) {
    setOrders(orders.map(o => o.id === orderId ? { ...o, rounds: o.rounds.map(r => r.id === roundId ? { ...r, status: "served" } : r) } : o));
  }
  function undoRoundServed(orderId, roundId) {
    setOrders(orders.map(o => o.id === orderId ? { ...o, rounds: o.rounds.map(r => r.id === roundId ? { ...r, status: "kitchen" } : r) } : o));
  }

  const lowStock = inventory.filter(i => i.qty <= i.threshold);
  const openOrders = orders.length;
  const todayBills = billHistory.filter(b => b.date === todayStr() && b.status === "paid");
  const todaysCorkage = todayBills.reduce((s, b) => s + b.corkageTotal, 0);
  const todaysFood = todayBills.reduce((s, b) => s + b.foodTotal, 0);
  const todaysNet = todayBills.reduce((s, b) => s + b.grandTotal, 0);

  return (
    <div style={{ display: "flex", minHeight: 640, background: C.paper, fontFamily: bodyFont, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.line}` }}>
      {fontLinks}

      {/* Sidebar */}
      <div className="no-print" style={{ width: 236, background: C.ink, padding: "22px 14px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px 20px 8px" }}>
          <img src="/logo.jpeg" alt="Logo" style={{ width: 34, height: 34, borderRadius: 9, objectFit: "cover" }} />
          <div>
            <div style={{ fontFamily: displayFont, color: "#fff", fontSize: 16.5, fontWeight: 600, lineHeight: 1.1 }}>Sun Shine Kitchen</div>
            <div style={{ color: "#ffffff88", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase" }}>BYOB Bistro Ops</div>
          </div>
        </div>
        {dataLoading && (
          <div style={{ color: "#ffffffaa", fontSize: 12, padding: "6px 8px" }}>Loading tables & menu…</div>
        )}
        {dataError && (
          <div style={{ color: "#F0A896", fontSize: 11.5, padding: "6px 8px", background: "#ffffff10", borderRadius: 6 }}>
            Couldn't load restaurant data: {dataError}
          </div>
        )}
        {nav.map(n => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 9, border: "none", cursor: "pointer", textAlign: "left",
              background: active ? C.wine : "transparent",
              color: active ? "#fff" : "#D9D5CE",
              fontFamily: bodyFont, fontWeight: 600, fontSize: 13.5
            }}>
              <Icon size={16} />
              {n.label}
              {n.id === "inventory" && lowStock.length > 0 && (
                <span style={{ marginLeft: "auto", background: C.rust, color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: "1px 7px" }}>{lowStock.length}</span>
              )}
              {n.id === "pos" && openOrders > 0 && (
                <span style={{ marginLeft: "auto", background: C.gold, color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: "1px 7px" }}>{openOrders}</span>
              )}
              {n.id === "kitchen" && firingCount > 0 && (
                <span style={{ marginLeft: "auto", background: C.wine, color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: "1px 7px" }}>{firingCount}</span>
              )}
            </button>
          );
        })}
        <div style={{ marginTop: "auto", padding: "12px 12px 4px", borderTop: "1px solid #ffffff1a", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={{ color: "#ffffff70", fontSize: 11 }}>Counter / cashier on duty</div>
            <input value={cashierName} onChange={e => setCashierName(e.target.value)} placeholder="e.g. Sanduni"
              style={{ width: "100%", marginTop: 4, background: "#ffffff14", border: "1px solid #ffffff2a", borderRadius: 6, color: "#fff", padding: "5px 8px", fontFamily: bodyFont, fontSize: 12.5 }} />
          </div>
          {onOpenSecurity && (
            <button onClick={onOpenSecurity} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
              borderRadius: 8, border: "1px solid #ffffff2a", background: "transparent", color: "#D9D5CE",
              fontFamily: bodyFont, fontWeight: 600, fontSize: 12.5, cursor: "pointer"
            }}>
              <Lock size={14} /> Security (2FA)
            </button>
          )}
          {onLogout && (
            <button onClick={onLogout} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginTop: 4,
              borderRadius: 8, border: "1px solid #ffffff2a", background: "transparent", color: "#D9D5CE",
              fontFamily: bodyFont, fontWeight: 600, fontSize: 12.5, cursor: "pointer"
            }}>
              <LogOut size={14} /> Log out
            </button>
          )}
          <div>
            <div style={{ color: "#ffffff70", fontSize: 11 }}>Corkage fee / bottle</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span style={{ color: C.gold, fontFamily: monoFont, fontSize: 13 }}>Rs.</span>
              <input value={corkageFee} onChange={e => setCorkageFee(Number(e.target.value) || 0)}
                style={{ width: 70, background: "#ffffff14", border: "1px solid #ffffff2a", borderRadius: 6, color: "#fff", padding: "4px 6px", fontFamily: monoFont, fontSize: 13 }} />
            </div>
          </div>
          <div>
            <div style={{ color: "#ffffff70", fontSize: 11 }}>Service charge %</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <input value={serviceChargePct} onChange={e => setServiceChargePct(Number(e.target.value) || 0)}
                style={{ width: 50, background: "#ffffff14", border: "1px solid #ffffff2a", borderRadius: 6, color: "#fff", padding: "4px 6px", fontFamily: monoFont, fontSize: 13 }} />
              <span style={{ color: C.gold, fontFamily: monoFont, fontSize: 13 }}>%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 28, overflowY: "auto", maxHeight: 900 }}>
        {tab === "dashboard" && (
          <Dashboard tables={tables} reservations={reservations} orders={orders} lowStock={lowStock}
            todaysCorkage={todaysCorkage} todaysFood={todaysFood} todaysNet={todaysNet}
            externalOrders={externalOrders} setTab={setTab} billHistory={billHistory} />
        )}
        {tab === "reservations" && (
          <ReservationsTab tables={tables} setTables={setTables} reservations={reservations} setReservations={setReservations} orders={orders} poolTables={poolTables} restaurantId={restaurantId} />
        )}
        {tab === "pos" && (
          <POSTab tables={tables} setTables={setTables} menu={menu} orders={orders} setOrders={setOrders}
            corkageFee={corkageFee} serviceChargePct={serviceChargePct}
            takeawayCounter={takeawayCounter} setTakeawayCounter={setTakeawayCounter}
            billHistory={billHistory} setBillHistory={setBillHistory} setReceipt={setReceipt}
            cashierName={cashierName} reservations={reservations} setReservations={setReservations}
            markRoundServed={markRoundServed} poolTables={poolTables} setPoolTables={setPoolTables}
            setKitchenTicket={setKitchenTicket} restaurantId={restaurantId} addons={addons} />
        )}
        {tab === "kitchen" && (
          <KitchenTab orders={orders} markRoundServed={markRoundServed} undoRoundServed={undoRoundServed} setKitchenTicket={setKitchenTicket} />
        )}
        {tab === "bills" && (
          <BillHistoryTab billHistory={billHistory} setBillHistory={setBillHistory} setReceipt={setReceipt} />
        )}
        {tab === "menu" && (
          <MenuTab menu={menu} setMenu={setMenu} restaurantId={restaurantId} />
        )}
        {tab === "inventory" && (
          <InventoryTab inventory={inventory} setInventory={setInventory} />
        )}
        {tab === "delivery" && (
          <DeliveryTab externalOrders={externalOrders} setExternalOrders={setExternalOrders} menu={menu} />
        )}
      </div>

      {receipt && <ReceiptModal bill={receipt} onClose={() => setReceipt(null)} />}
      {kitchenTicket && <KitchenTicketModal ticket={kitchenTicket} onClose={() => setKitchenTicket(null)} />}
    </div>
  );
}

/* ---------------- Receipt modal (printable) ---------------- */
// Turns a Sri Lankan number typed as "0771234567" or "+94771234567" into the
// "94771234567" format WhatsApp's wa.me links require (country code, no
// leading zero, no + or spaces).
function normalizeLkPhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("94")) return digits;
  if (digits.startsWith("0")) return "94" + digits.slice(1);
  return digits;
}

function buildWhatsAppReceiptText(bill) {
  const lines = [
    `*Sun Shine Kitchen* — Receipt #${bill.receiptNo}`,
    `${bill.date} ${bill.time}`,
    "",
    ...bill.items.map(i => `${i.qty}x ${i.name} — ${rs(i.price * i.qty)}`),
    "",
    `*Total: ${rs(bill.grandTotal)}*`,
    `Paid via: ${bill.paymentMethod || "Cash"}`,
    "",
    "Thank you for dining with us! We hope to see you again soon. 🙏",
  ];
  return lines.join("\n");
}

function ReceiptModal({ bill, onClose }) {
  const canWhatsApp = !!bill.customerPhone;
  function sendViaWhatsApp() {
    const phone = normalizeLkPhone(bill.customerPhone);
    const text = encodeURIComponent(buildWhatsAppReceiptText(bill));
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  }
  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "#00000066", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50
    }}>
      <div style={{ background: "#fff", borderRadius: 14, width: 360, maxHeight: "88vh", overflowY: "auto", padding: 22 }}>
        <div className="receipt-print" style={{ fontFamily: monoFont, fontSize: 12.5, color: "#111" }}>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <img src="/logo.jpeg" alt="Sun Shine Kitchen" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", marginBottom: 6 }} />
            <div style={{ fontFamily: displayFont, fontSize: 19, fontWeight: 700 }}>SUN SHINE KITCHEN</div>
            <div style={{ fontSize: 10, color: "#555" }}>NO. 90 Kiriberiya Waduramulla, Panadura</div>
            <div style={{ fontSize: 10, color: "#555" }}>070 410 4105 / 077 735 5202 / 077 687 1012</div>
            <div style={{ fontSize: 10.5, color: "#555", marginTop: 2 }}>Receipt #{bill.receiptNo}</div>
          </div>
          <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          <div>Date: {bill.date} {bill.time}</div>
          <div>{bill.orderType === "takeaway" ? `Takeaway #${bill.label}` : `Table ${bill.label}`}</div>
          {bill.customerName && <div>Customer: {bill.customerName}</div>}
          {bill.customerPhone && <div>Phone: {bill.customerPhone}</div>}
          {bill.cashier && <div>Billed by: {bill.cashier}</div>}
          {bill.status === "refunded" && <div style={{ color: "#B5502F", fontWeight: 700, marginTop: 4 }}>*** REFUNDED ***</div>}
          <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          {bill.items.map((i, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{i.qty}x {i.name}</span>
              <span>{rs(i.price * i.qty)}</span>
            </div>
          ))}
          {bill.bottles > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Corkage x{bill.bottles}</span>
              <span>{rs(bill.corkageTotal)}</span>
            </div>
          )}
          {bill.poolCharge > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Pool table ({bill.poolHours}h)</span>
              <span>{rs(bill.poolCharge)}</span>
            </div>
          )}
          <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{rs(bill.subtotal)}</span></div>
          {bill.discountAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount</span><span>-{rs(bill.discountAmount)}</span></div>
          )}
          {bill.serviceChargeAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Service charge ({bill.serviceChargePct}%)</span><span>{rs(bill.serviceChargeAmount)}</span></div>
          )}
          <div style={{ borderTop: "1px solid #111", margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}><span>TOTAL</span><span>{rs(bill.grandTotal)}</span></div>
          <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Paid via</span><span>{bill.paymentMethod || "Cash"}</span></div>
          {bill.cashReceived != null && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cash received</span><span>{rs(bill.cashReceived)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Change given</span><span>{rs(bill.changeDue)}</span></div>
            </>
          )}
          <div style={{ borderTop: "1px dashed #999", margin: "10px 0" }} />
          <div style={{ textAlign: "center", fontSize: 10.5, color: "#555" }}>Thank you, come again!</div>
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Btn onClick={() => window.print()} icon={Printer}>Print</Btn>
          {canWhatsApp && (
            <button onClick={sendViaWhatsApp} style={{
              background: "#25D366", color: "#fff", border: "1px solid #25D366", borderRadius: 9,
              padding: "9px 16px", fontFamily: bodyFont, fontWeight: 600, fontSize: 14, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}>
              📱 Send via WhatsApp
            </button>
          )}
          <Btn variant="ghost" onClick={onClose} icon={X}>Close</Btn>
        </div>
        {!canWhatsApp && (
          <div className="no-print" style={{ fontSize: 11.5, color: C.slate, marginTop: 8, textAlign: "center" }}>
            No phone number on this order — add one to enable WhatsApp sending.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Kitchen packing ticket (item-only, no prices) ---------------- */
function KitchenTicketModal({ ticket, onClose }) {
  useEffect(() => {
    // Auto-send this ticket to the printer as soon as it's ready — the kitchen
    // shouldn't have to wait for someone to click Print. If the printer/print
    // dialog doesn't come up (blocked pop-up, no printer set up, etc.) the
    // "Print" button below reprints it manually.
    const t = setTimeout(() => window.print(), 200);
    return () => clearTimeout(t);
  }, [ticket]);

  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "#00000066", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50
    }}>
      <div style={{ background: "#fff", borderRadius: 14, width: 340, maxHeight: "88vh", overflowY: "auto", padding: 22 }}>
        <div className="receipt-print" style={{ fontFamily: monoFont, fontSize: 12.5, color: "#111" }}>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: displayFont, fontSize: 18, fontWeight: 700 }}>KITCHEN TICKET</div>
            <div style={{ fontSize: 10.5, color: "#555" }}>{ticket.orderType === "takeaway" ? "TAKEAWAY — for packing" : `Table ${ticket.label}`}</div>
          </div>
          <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            {ticket.orderType === "takeaway" ? `Takeaway #${ticket.label}` : `Table ${ticket.label}`} · Round {ticket.roundNumber}
          </div>
          {ticket.customerName && <div>Customer: {ticket.customerName}</div>}
          {ticket.customerPhone && <div>Phone: {ticket.customerPhone}</div>}
          <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          {ticket.items.map((i, idx) => (
            <div key={idx} style={{ padding: "4px 0" }}>
              <div style={{ display: "flex", gap: 8, fontSize: 14 }}>
                <span style={{ fontWeight: 700, width: 24 }}>{i.qty}×</span>
                <span>{i.name}</span>
              </div>
              {i.note && (
                <div style={{ marginLeft: 24, fontSize: 13, fontWeight: 700, border: "1px solid #111", borderRadius: 4, padding: "2px 6px", display: "inline-block", marginTop: 2 }}>
                  ⚠ {i.note}
                </div>
              )}
            </div>
          ))}
          <div style={{ borderTop: "1px dashed #999", margin: "10px 0" }} />
          <div style={{ textAlign: "center", fontSize: 10.5, color: "#555" }}>
            {ticket.orderType === "takeaway" ? "Pack with the printed bill before handover." : "Kitchen prep copy — no prices."}
          </div>
        </div>
        <div className="no-print" style={{ fontSize: 11, color: "#7A756B", marginTop: 14, textAlign: "center" }}>
          Sent to the printer automatically. Didn't come out? Use the button below.
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Btn onClick={() => window.print()} icon={Printer}>Print again</Btn>
          <Btn variant="ghost" onClick={onClose} icon={X}>Close</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ tables, reservations, orders, lowStock, todaysCorkage, todaysFood, todaysNet, externalOrders, setTab, billHistory }) {
  const occupied = tables.filter(t => t.status === "occupied").length;
  const stats = [
    { label: "Tables occupied", value: `${occupied}/${tables.length}` },
    { label: "Reservations today", value: reservations.filter(r => r.date === todayStr() && r.status !== "cancelled").length },
    { label: "WhatsApp orders", value: externalOrders.filter(o => o.platform === "WhatsApp").length },
    { label: "Open tickets", value: orders.length },
    { label: "Low stock items", value: lowStock.length, warn: true },
  ];
  const refundedToday = billHistory.filter(b => b.date === todayStr() && b.status === "refunded").length;

  return (
    <div>
      <SectionTitle eyebrow="Tonight's service" title="Dashboard" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding: 18 }}>
            <div style={{ fontSize: 12, color: C.slate, fontWeight: 600, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: displayFont, fontSize: 32, fontWeight: 600, color: s.warn && s.value > 0 ? C.rust : C.ink }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: displayFont, fontSize: 18, fontWeight: 600 }}>Today's revenue</div>
            <Wine size={16} color={C.gold} />
          </div>
          <Row label="Food & beverage sales" value={rs(todaysFood)} />
          <Row label="Corkage fees collected" value={rs(todaysCorkage)} highlight />
          <Row label="Delivery orders (Uber etc.)" value={rs(externalOrders.filter(o => o.platform !== "WhatsApp").reduce((s, o) => s + o.total, 0))} />
          <Row label="WhatsApp orders" value={rs(externalOrders.filter(o => o.platform === "WhatsApp").reduce((s, o) => s + o.total, 0))} />
          {refundedToday > 0 && <Row label="Refunded bills today" value={refundedToday} />}
          <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontFamily: bodyFont }}>Total (dine-in/takeaway)</span>
            <span style={{ fontFamily: monoFont, fontWeight: 700, color: C.wine }}>{rs(todaysNet)}</span>
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: displayFont, fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Needs attention</div>
          {lowStock.length === 0 && <div style={{ color: C.slate, fontSize: 13.5 }}>Stock levels look healthy.</div>}
          {lowStock.slice(0, 5).map(i => (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
              <AlertTriangle size={14} color={C.rust} />
              <span style={{ fontSize: 13.5 }}>{i.name}</span>
              <span style={{ marginLeft: "auto", fontFamily: monoFont, fontSize: 12.5, color: C.rust }}>{i.qty} {i.unit}</span>
            </div>
          ))}
          {lowStock.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <Btn small variant="ghost" onClick={() => setTab("inventory")} icon={ChevronRight}>Go to inventory</Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13.5 }}>
      <span style={{ color: C.slate }}>{label}</span>
      <span style={{ fontFamily: monoFont, fontWeight: 600, color: highlight ? C.gold : C.ink }}>{value}</span>
    </div>
  );
}

/* ---------------- Reservations / Table floor plan ---------------- */
function ReservationsTab({ tables, setTables, reservations, setReservations, orders, poolTables, restaurantId }) {
  const [form, setForm] = useState({ name: "", phone: "", date: todayStr(), time: "", size: 2, tableId: "", notes: "" });
  const [lockMsg, setLockMsg] = useState(null);
  const [timeMissing, setTimeMissing] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const pool = poolTables[0];
  const poolOwnerOrder = pool.status === "in-use" ? orders.find(o => o.id === pool.activeOrderId) : null;
  const poolRunningHours = pool.status === "in-use" ? Math.max(1, Math.ceil((Date.now() - pool.startedAt) / 3600000)) : 0;
  const poolRunningCharge = poolRunningHours * pool.hourlyRate;

  const statusColor = { available: C.sage, occupied: C.wine, reserved: C.gold };
  const statusBg = { available: C.sageBg, occupied: "#F0DEE1", reserved: "#F3E9D2" };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  async function addReservation() {
    if (!form.time) { setTimeMissing(true); return; }
    if (!form.name) return;
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createReservation(restaurantId, form);
      const res = {
        id: created.id, name: created.guest_name, phone: created.phone || "", date: created.date,
        time: created.time, size: created.party_size, tableId: created.table_id, notes: created.notes || "", status: created.status,
      };
      setReservations([...reservations, res]);
      if (form.tableId) {
        setTables(tables.map(t => t.id === form.tableId ? { ...t, status: "reserved" } : t));
        updateTableStatus(form.tableId, "reserved").catch(err => console.error("Table status sync failed:", err));
      }
      setForm({ name: "", phone: "", date: todayStr(), time: "", size: 2, tableId: "", notes: "" });
      setTimeMissing(false);
    } catch (err) {
      setSaveError(err.message || "Couldn't save the booking — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function cycleStatus(id) {
    const activeOrder = orders.find(o => o.tableId === id);
    if (activeOrder) {
      const t = tables.find(t => t.id === id);
      setLockMsg(`Table ${t.number} has an active bill — settle or cancel it in Orders & Billing before changing its status.`);
      setTimeout(() => setLockMsg(null), 4000);
      return;
    }
    const order = ["available", "reserved", "occupied"];
    setTables(tables.map(t => t.id === id ? { ...t, status: order[(order.indexOf(t.status) + 1) % order.length] } : t));
  }

  function cancelReservation(id) {
    const r = reservations.find(r => r.id === id);
    if (r?.tableId && !orders.find(o => o.tableId === r.tableId)) {
      setTables(tables.map(t => t.id === r.tableId ? { ...t, status: "available" } : t));
      updateTableStatus(r.tableId, "available").catch(err => console.error("Table status sync failed:", err));
    }
    setReservations(reservations.filter(r => r.id !== id));
    deleteReservation(id).catch(err => console.error("Reservation delete sync failed:", err));
  }

  return (
    <div>
      <SectionTitle eyebrow="Floor plan" title="Tables & Bookings" />
      {lockMsg && (
        <div style={{ background: C.rustBg, color: C.rust, border: `1px solid ${C.rust}`, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Lock size={14} /> {lockMsg}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Card>
          <div style={{ fontFamily: displayFont, fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Dining room</div>
          <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 16 }}>Click a table to cycle its status — available → reserved → occupied. Tables with an active bill are locked until it's settled or cancelled.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {tables.map(t => {
              const locked = !!orders.find(o => o.tableId === t.id);
              return (
                <button key={t.id} onClick={() => cycleStatus(t.id)} style={{
                  border: `2px solid ${statusColor[t.status]}`, background: statusBg[t.status],
                  borderRadius: t.seats > 4 ? 16 : "50%", aspectRatio: "1", cursor: locked ? "not-allowed" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                  position: "relative", opacity: locked ? 0.85 : 1
                }}>
                  {locked && <Lock size={11} color={C.wine} style={{ position: "absolute", top: 6, right: 6 }} />}
                  <span style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 700, color: statusColor[t.status] }}>{t.number}</span>
                  <span style={{ fontSize: 10.5, color: C.slate, display: "flex", alignItems: "center", gap: 2 }}><Users size={10} />{t.seats}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 18, fontSize: 12 }}>
            {Object.entries(statusColor).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: v }} /> <span style={{ textTransform: "capitalize", color: C.slate }}>{k}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: displayFont, fontSize: 17, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <Flame size={16} color={pool.status === "in-use" ? C.wine : C.sage} /> Pool table
          </div>
          {pool.status === "available" ? (
            <div style={{ background: C.sageBg, borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.sage }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.sage }}>Available</div>
                <div style={{ fontSize: 11.5, color: C.slate }}>Rs. {pool.hourlyRate}/hr · start it from Orders & Billing</div>
              </div>
            </div>
          ) : (
            <div style={{ background: "#F0DEE1", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.wine }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.wine }}>
                    In use — {poolOwnerOrder ? (poolOwnerOrder.orderType === "takeaway" ? `Takeaway #${poolOwnerOrder.label}` : `Table ${poolOwnerOrder.label}`) : "—"}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.slate }}>Running since {new Date(pool.startedAt).toTimeString().slice(0, 5)}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12.5 }}>
                <span style={{ color: C.slate }}>Time so far</span>
                <span style={{ fontFamily: monoFont, fontWeight: 700 }}>{poolRunningHours}h</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 12.5 }}>
                <span style={{ color: C.slate }}>Running charge</span>
                <span style={{ fontFamily: monoFont, fontWeight: 700, color: C.wine }}>{rs(poolRunningCharge)}</span>
              </div>
            </div>
          )}
        </Card>
        </div>

        <Card>
          <div style={{ fontFamily: displayFont, fontSize: 17, fontWeight: 600, marginBottom: 12 }}>New booking</div>
          <Field label="Guest name"><input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nimal Perera" /></Field>
          <Field label="Phone"><input style={inp} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07X XXX XXXX" /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Date"><input type="date" style={inp} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Time — when the customer is arriving">
              <input type="time" style={{ ...inp, border: timeMissing ? `1px solid ${C.rust}` : inp.border }}
                value={form.time} onChange={e => { setForm({ ...form, time: e.target.value }); setTimeMissing(false); }} />
              {timeMissing && <div style={{ color: C.rust, fontSize: 11, marginTop: 3 }}>Please set the customer's arrival time.</div>}
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Party size"><input type="number" min={1} style={inp} value={form.size} onChange={e => setForm({ ...form, size: Number(e.target.value) })} /></Field>
            <Field label="Table (optional)">
              <select style={inp} value={form.tableId} onChange={e => setForm({ ...form, tableId: e.target.value })}>
                <option value="">Unassigned</option>
                {tables.filter(t => t.status === "available").map(t => <option key={t.id} value={t.id}>Table {t.number} ({t.seats} seats)</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes"><input style={inp} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="BYOB bottles, allergies, occasion..." /></Field>
          {saveError && <div style={{ color: C.rust, fontSize: 12, marginBottom: 8 }}>{saveError}</div>}
          <Btn onClick={addReservation} icon={Plus} disabled={saving}>{saving ? "Saving…" : "Confirm booking"}</Btn>

          <div style={{ marginTop: 20, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>Upcoming reservations</div>
            {(() => {
              const now = new Date();
              const nowTime = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
              const today = todayStr();
              const upcoming = reservations
                .filter(r => r.status === "confirmed" && (r.date > today || (r.date === today && r.time >= nowTime)))
                .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
              if (upcoming.length === 0) return <div style={{ color: C.slate, fontSize: 13 }}>No upcoming bookings.</div>;
              return upcoming.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
                  <Clock size={13} color={C.slate} />
                  <div style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{r.name} · {r.size}p</div>
                    <div style={{ color: C.slate, fontSize: 11.5 }}>{r.date} at {r.time}{r.tableId ? ` · Table ${tables.find(t => t.id === r.tableId)?.number}` : ""}</div>
                  </div>
                  <button onClick={() => cancelReservation(r.id)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}><X size={14} color={C.rust} /></button>
                </div>
              ));
            })()}
            {reservations.filter(r => r.status === "seated").length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: C.slate }}>
                {reservations.filter(r => r.status === "seated").length} guest(s) already seated from bookings today.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- POS / Orders ---------------- */
function POSTab({ tables, setTables, menu, orders, setOrders, corkageFee, serviceChargePct, takeawayCounter, setTakeawayCounter, billHistory, setBillHistory, setReceipt, cashierName, reservations, setReservations, markRoundServed, poolTables, setPoolTables, setKitchenTicket, restaurantId, addons }) {
  const [activeOrderId, setActiveOrderId] = useState(null);
  const activeOrder = orders.find(o => o.id === activeOrderId);
  const [menuFilter, setMenuFilter] = useState("All");
  const [menuSearch, setMenuSearch] = useState("");
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const pool = poolTables[0];

  function openTableOrder(tableId) {
    let ord = orders.find(o => o.tableId === tableId);
    if (!ord) {
      const linkedReservation = reservations.find(r => r.tableId === tableId && r.status === "confirmed" && r.date === todayStr());
      ord = {
        id: uid("o"), orderType: "dine-in", tableId, label: tables.find(t => t.id === tableId)?.number,
        rounds: [{ id: uid("rd"), items: [], status: "open", firedAt: null }],
        bottles: 0, poolHours: 0, poolCharge: 0, cashReceived: "", paymentMethod: "Cash",
        customerName: linkedReservation?.name || "", customerPhone: linkedReservation?.phone || "",
        discountType: "none", discountValue: 0, applyService: true, createdAt: Date.now()
      };
      setOrders([...orders, ord]);
      setTables(tables.map(t => t.id === tableId ? { ...t, status: "occupied" } : t));
      updateTableStatus(tableId, "occupied").catch(err => console.error("Table status sync failed:", err));
      if (linkedReservation) {
        setReservations(reservations.map(r => r.id === linkedReservation.id ? { ...r, status: "seated" } : r));
        updateReservationStatus(linkedReservation.id, "seated").catch(err => console.error("Reservation status sync failed:", err));
      }
    }
    setActiveOrderId(ord.id);
    setConfirmVoid(false);
  }

  function newTakeawayOrder() {
    const ord = {
      id: uid("o"), orderType: "takeaway", tableId: null, label: takeawayCounter,
      rounds: [{ id: uid("rd"), items: [], status: "open", firedAt: null }],
      bottles: 0, poolHours: 0, poolCharge: 0, cashReceived: "", paymentMethod: "Cash", customerName: "", customerPhone: "", discountType: "none", discountValue: 0, applyService: false, createdAt: Date.now()
    };
    setOrders([...orders, ord]);
    setTakeawayCounter(takeawayCounter + 1);
    setActiveOrderId(ord.id);
    setConfirmVoid(false);
  }

  function updateOrder(patch) {
    setOrders(orders.map(o => o.id === activeOrder.id ? { ...o, ...patch } : o));
  }

  // The round new items get added to. If the last round has already been fired/served, start a fresh round.
  function ensureOpenRound(order) {
    const last = order.rounds[order.rounds.length - 1];
    if (last && last.status === "open") return order.rounds;
    return [...order.rounds, { id: uid("rd"), items: [], status: "open", firedAt: null }];
  }

  function addItem(menuItem) {
    const rounds = ensureOpenRound(activeOrder);
    const openRound = rounds[rounds.length - 1];
    const items = [...openRound.items];
    const existing = items.find(i => i.menuItemId === menuItem.id);
    if (existing) existing.qty += 1;
    else items.push({ menuItemId: menuItem.id, name: menuItem.name, price: menuItem.price, qty: 1, type: menuItem.type, note: "" });
    const newRounds = rounds.map(r => r.id === openRound.id ? { ...r, items } : r);
    updateOrder({ rounds: newRounds });
  }

  function updateItemNote(roundId, menuItemId, note) {
    const newRounds = activeOrder.rounds.map(r => {
      if (r.id !== roundId) return r;
      return { ...r, items: r.items.map(i => i.menuItemId === menuItemId ? { ...i, note } : i) };
    });
    updateOrder({ rounds: newRounds });
  }

  // Adds an extra-meat line right under the dish it belongs to, so both the
  // kitchen ticket and the bill show clearly what was added to what.
  function addAddonTo(roundId, parentItem, addon) {
    const lineId = `${parentItem.menuItemId}::${addon.id}`;
    const newRounds = activeOrder.rounds.map(r => {
      if (r.id !== roundId) return r;
      const items = [...r.items];
      const existing = items.find(i => i.menuItemId === lineId);
      if (existing) {
        existing.qty += 1;
      } else {
        const parentIdx = items.findIndex(i => i.menuItemId === parentItem.menuItemId);
        items.splice(parentIdx + 1, 0, {
          menuItemId: lineId, name: `↳ ${addon.name} (${parentItem.name})`,
          price: addon.price, qty: 1, type: parentItem.type, note: "", isAddon: true,
        });
      }
      return { ...r, items };
    });
    updateOrder({ rounds: newRounds });
  }

  function changeQty(roundId, menuItemId, delta) {
    const newRounds = activeOrder.rounds.map(r => {
      if (r.id !== roundId) return r;
      const items = r.items.map(i => i.menuItemId === menuItemId ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0);
      return { ...r, items };
    });
    updateOrder({ rounds: newRounds });
  }

  function fireRound(roundId) {
    const newRounds = activeOrder.rounds.map(r => r.id === roundId ? { ...r, status: "kitchen", firedAt: Date.now() } : r);
    updateOrder({ rounds: newRounds });
    // Auto-print the kitchen copy right away so the order starts getting prepped
    // without someone having to go to Kitchen Display and click Print themselves.
    const round = activeOrder.rounds.find(r => r.id === roundId);
    const roundNumber = activeOrder.rounds.findIndex(r => r.id === roundId) + 1;
    if (round && round.items.length > 0) {
      setKitchenTicket({
        orderType: activeOrder.orderType, label: activeOrder.label, roundNumber,
        customerName: activeOrder.customerName, customerPhone: activeOrder.customerPhone,
        items: round.items,
      });
    }
  }

  function startPool() {
    setPoolTables(poolTables.map(p => p.id === pool.id ? { ...p, status: "in-use", activeOrderId: activeOrder.id, startedAt: Date.now() } : p));
  }

  function finishPool() {
    const hours = Math.max(1, Math.ceil((Date.now() - pool.startedAt) / 3600000));
    const charge = hours * pool.hourlyRate;
    setOrders(orders.map(o => o.id === activeOrder.id ? { ...o, poolHours: (o.poolHours || 0) + hours, poolCharge: (o.poolCharge || 0) + charge } : o));
    setPoolTables(poolTables.map(p => p.id === pool.id ? { ...p, status: "available", activeOrderId: null, startedAt: null } : p));
  }

  function voidOrder() {
    if (!confirmVoid) { setConfirmVoid(true); return; }
    if (activeOrder.tableId) {
      setTables(tables.map(t => t.id === activeOrder.tableId ? { ...t, status: "available" } : t));
      updateTableStatus(activeOrder.tableId, "available").catch(err => console.error("Table status sync failed:", err));
      const seated = reservations.find(r => r.tableId === activeOrder.tableId && r.status === "seated");
      if (seated) {
        setReservations(reservations.map(r => r.id === seated.id ? { ...r, status: "confirmed" } : r));
        updateReservationStatus(seated.id, "confirmed").catch(err => console.error("Reservation status sync failed:", err));
      }
    }
    if (pool.activeOrderId === activeOrder.id) {
      setPoolTables(poolTables.map(p => p.id === pool.id ? { ...p, status: "available", activeOrderId: null, startedAt: null } : p));
    }
    setOrders(orders.filter(o => o.id !== activeOrder.id));
    setActiveOrderId(null);
    setConfirmVoid(false);
  }

  // Combined items across every round of the active order — this is what gets billed, no matter how many separate rounds were fired to the kitchen.
  const allItems = activeOrder ? activeOrder.rounds.flatMap(r => r.items) : [];
  const foodTotal = allItems.reduce((s, i) => s + i.price * i.qty, 0);
  const corkageTotal = activeOrder ? activeOrder.bottles * corkageFee : 0;
  const poolRunningHours = (activeOrder && pool.activeOrderId === activeOrder.id) ? Math.max(1, Math.ceil((Date.now() - pool.startedAt) / 3600000)) : 0;
  const poolRunningCharge = poolRunningHours * pool.hourlyRate;
  const poolTotal = (activeOrder?.poolCharge || 0) + poolRunningCharge;
  const subtotal = foodTotal + corkageTotal + poolTotal;
  const discountAmount = !activeOrder ? 0 :
    activeOrder.discountType === "percent" ? Math.round(subtotal * (activeOrder.discountValue / 100)) :
    activeOrder.discountType === "amount" ? Math.min(activeOrder.discountValue, subtotal) : 0;
  const afterDiscount = subtotal - discountAmount;
  const serviceChargeAmount = activeOrder?.applyService ? Math.round(afterDiscount * (serviceChargePct / 100)) : 0;
  const grandTotal = afterDiscount + serviceChargeAmount;
  const cashReceivedNum = Number(activeOrder?.cashReceived) || 0;
  const changeDue = cashReceivedNum > grandTotal ? cashReceivedNum - grandTotal : 0;
  const shortBy = cashReceivedNum > 0 && cashReceivedNum < grandTotal ? grandTotal - cashReceivedNum : 0;

  function settleBill() {
    // If the pool table is still running under this order, close it out and fold the final charge in first.
    let finalPoolHours = activeOrder.poolHours || 0;
    let finalPoolCharge = activeOrder.poolCharge || 0;
    if (pool.activeOrderId === activeOrder.id) {
      finalPoolHours += poolRunningHours;
      finalPoolCharge += poolRunningCharge;
      setPoolTables(poolTables.map(p => p.id === pool.id ? { ...p, status: "available", activeOrderId: null, startedAt: null } : p));
    }
    const now = new Date();
    // Merge same items from different rounds into single lines for a clean receipt.
    const merged = [];
    allItems.forEach(i => {
      const existing = merged.find(m => m.menuItemId === i.menuItemId);
      if (existing) existing.qty += i.qty;
      else merged.push({ ...i });
    });
    const bill = {
      id: uid("b"),
      receiptNo: String(billHistory.length + 1).padStart(4, "0"),
      date: todayStr(),
      time: now.toTimeString().slice(0, 5),
      orderType: activeOrder.orderType,
      label: activeOrder.label,
      customerName: activeOrder.customerName,
      customerPhone: activeOrder.customerPhone,
      items: merged,
      bottles: activeOrder.bottles,
      corkageTotal, foodTotal, subtotal,
      poolHours: finalPoolHours, poolCharge: finalPoolCharge,
      discountType: activeOrder.discountType, discountValue: activeOrder.discountValue, discountAmount,
      serviceChargePct: activeOrder.applyService ? serviceChargePct : 0, serviceChargeAmount,
      grandTotal,
      cashReceived: cashReceivedNum || null, changeDue,
      paymentMethod: activeOrder.paymentMethod || "Cash",
      cashier: cashierName || "Unassigned",
      status: "paid",
    };
    setBillHistory([bill, ...billHistory]);
    setOrders(orders.filter(o => o.id !== activeOrder.id));
    if (activeOrder.tableId) {
      setTables(tables.map(t => t.id === activeOrder.tableId ? { ...t, status: "available" } : t));
      updateTableStatus(activeOrder.tableId, "available").catch(err => console.error("Table status sync failed:", err));
    }
    if (restaurantId) {
      saveBill(restaurantId, bill).catch(err => console.error("Bill save to database failed:", err));
    }
    setActiveOrderId(null);
    setReceipt(bill);
  }

  const roundStatusLabel = { open: ["Not sent yet", "slate"], kitchen: ["In kitchen", "gold"], served: ["Served", "sage"] };
  const filteredMenu = menu.filter(m =>
    m.available &&
    (menuFilter === "All" || m.type === menuFilter) &&
    (!menuSearch || m.name.toLowerCase().includes(menuSearch.toLowerCase()))
  );
  const menuByCategory = {};
  for (const m of filteredMenu) {
    if (!menuByCategory[m.category]) menuByCategory[m.category] = [];
    menuByCategory[m.category].push(m);
  }
  const takeawayOrders = orders.filter(o => o.orderType === "takeaway");
  const openRound = activeOrder?.rounds.find(r => r.status === "open");
  const firedRounds = activeOrder ? activeOrder.rounds.filter(r => r.status !== "open") : [];

  return (
    <div>
      <SectionTitle eyebrow="Table-side & takeaway" title="Orders & Billing" right={
        <Btn variant="gold" onClick={newTakeawayOrder} icon={ShoppingBag}>New takeaway order</Btn>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "220px 1.3fr 1fr", gap: 16 }}>
        {/* Table / takeaway picker */}
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Tables</div>
          {tables.map(t => {
            const hasOrder = orders.find(o => o.tableId === t.id);
            return (
              <button key={t.id} onClick={() => openTableOrder(t.id)} style={{
                width: "100%", textAlign: "left", padding: "9px 10px", marginBottom: 6, borderRadius: 8,
                border: `1px solid ${activeOrderId === hasOrder?.id ? C.wine : C.line}`,
                background: activeOrderId === hasOrder?.id ? "#F0DEE1" : C.cream, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ fontFamily: monoFont, fontWeight: 700, fontSize: 13 }}>T{t.number}</span>
                <span style={{ fontSize: 11.5, color: C.slate }}>{t.seats} seats</span>
                {hasOrder && <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: C.gold }} />}
              </button>
            );
          })}
          {takeawayOrders.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, margin: "14px 0 8px" }}>Takeaway</div>
              {takeawayOrders.map(o => (
                <button key={o.id} onClick={() => { setActiveOrderId(o.id); setConfirmVoid(false); }} style={{
                  width: "100%", textAlign: "left", padding: "9px 10px", marginBottom: 6, borderRadius: 8,
                  border: `1px solid ${activeOrderId === o.id ? C.wine : C.line}`,
                  background: activeOrderId === o.id ? "#F0DEE1" : C.cream, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8
                }}>
                  <ShoppingBag size={13} />
                  <span style={{ fontSize: 12.5 }}>#{o.label}{o.customerName ? ` · ${o.customerName}` : ""}</span>
                </button>
              ))}
            </>
          )}
        </Card>

        {/* Menu grid */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
            {activeOrder ? `Menu — adding to ${activeOrder.orderType === "takeaway" ? `Takeaway #${activeOrder.label}` : `Table ${activeOrder.label}`}` : "Select a table or start a takeaway order"}
          </div>
          {activeOrder && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {["All", "Food", "Drinks"].map(f => (
                  <button key={f} onClick={() => setMenuFilter(f)} style={{
                    padding: "5px 12px", borderRadius: 20, border: `1px solid ${menuFilter === f ? C.wine : C.line}`,
                    background: menuFilter === f ? C.wine : "#fff", color: menuFilter === f ? "#fff" : C.ink,
                    fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                  }}>
                    {f === "Drinks" && <Coffee size={12} />}{f}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <Search size={13} color={C.slate} style={{ position: "absolute", left: 10, top: 9 }} />
                <input value={menuSearch} onChange={e => setMenuSearch(e.target.value)} placeholder="Search menu…"
                  style={{ ...inp, paddingLeft: 30 }} />
              </div>
              <div style={{ maxHeight: 480, overflowY: "auto", marginBottom: 14 }}>
                {Object.keys(menuByCategory).length === 0 && (
                  <div style={{ color: C.slate, fontSize: 13, padding: "12px 0" }}>No items match.</div>
                )}
                {Object.entries(menuByCategory).map(([cat, items]) => (
                  <div key={cat} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 11.5, color: C.gold, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>{cat}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                      {items.map(m => (
                        <button key={m.id} onClick={() => addItem(m)} style={{
                          textAlign: "left", padding: "10px 12px", borderRadius: 9, border: `1px solid ${C.line}`,
                          background: C.cream, cursor: "pointer"
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{m.isSpecial && "⭐ "}{m.name}</div>
                          <div style={{ fontSize: 11.5, color: C.slate, display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
                            <span style={{ fontFamily: monoFont, color: C.gold, fontWeight: 700 }}>{rs(m.price)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#FBF3F0", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Wine size={16} color={C.wine} />
                  <div style={{ fontSize: 13, fontWeight: 700 }}>BYOB corkage</div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => updateOrder({ bottles: Math.max(0, activeOrder.bottles - 1) })} style={iconBtn}><Minus size={12} /></button>
                    <span style={{ fontFamily: monoFont, fontWeight: 700, width: 18, textAlign: "center" }}>{activeOrder.bottles}</span>
                    <button onClick={() => updateOrder({ bottles: activeOrder.bottles + 1 })} style={iconBtn}><Plus size={12} /></button>
                    <span style={{ fontSize: 11.5, color: C.slate }}>× {rs(corkageFee)}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: "#EEF2EC", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Flame size={16} color={C.sage} />
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Pool table</div>
                  <div style={{ marginLeft: "auto" }}>
                    {pool.status === "available" && (
                      <Btn small variant="sage" onClick={startPool}>Start pool (Rs. {pool.hourlyRate}/hr)</Btn>
                    )}
                    {pool.status === "in-use" && pool.activeOrderId === activeOrder.id && (
                      <Btn small variant="gold" onClick={finishPool}>Finish pool</Btn>
                    )}
                    {pool.status === "in-use" && pool.activeOrderId !== activeOrder.id && (
                      <Pill tone="rust">In use — {(() => { const o = orders.find(x => x.id === pool.activeOrderId); return o ? (o.orderType === "takeaway" ? `Takeaway #${o.label}` : `Table ${o.label}`) : "another table"; })()}</Pill>
                    )}
                  </div>
                </div>
                {pool.status === "in-use" && pool.activeOrderId === activeOrder.id && (
                  <div style={{ fontSize: 11.5, color: C.sage, marginTop: 6 }}>
                    Running: {poolRunningHours}h so far · {rs(poolRunningCharge)} — added to the bill live
                  </div>
                )}
                {activeOrder.poolHours > 0 && (
                  <div style={{ fontSize: 11.5, color: C.slate, marginTop: 4 }}>
                    Earlier session{activeOrder.poolHours > 1 ? "s" : ""} this visit: {activeOrder.poolHours}h · {rs(activeOrder.poolCharge)}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Customer name"><input style={inp} value={activeOrder.customerName} onChange={e => updateOrder({ customerName: e.target.value })} placeholder="Optional" /></Field>
                <Field label="Phone"><input style={inp} value={activeOrder.customerPhone} onChange={e => updateOrder({ customerPhone: e.target.value })} placeholder="Optional" /></Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Discount">
                  <select style={inp} value={activeOrder.discountType} onChange={e => updateOrder({ discountType: e.target.value })}>
                    <option value="none">No discount</option>
                    <option value="percent">Percent %</option>
                    <option value="amount">Fixed amount (Rs.)</option>
                  </select>
                </Field>
                <Field label="Value">
                  <input type="number" style={inp} disabled={activeOrder.discountType === "none"} value={activeOrder.discountValue}
                    onChange={e => updateOrder({ discountValue: Number(e.target.value) || 0 })} />
                </Field>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.slate, marginTop: 4 }}>
                <input type="checkbox" checked={activeOrder.applyService} onChange={e => updateOrder({ applyService: e.target.checked })} />
                Apply {serviceChargePct}% service charge
              </label>
            </>
          )}
        </Card>

        {/* Ticket */}
        <Card style={{ background: C.ink, color: "#fff" }}>
          {!activeOrder ? (
            <div style={{ color: "#ffffff88", fontSize: 13 }}>No active order.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontFamily: displayFont, fontSize: 17 }}>{activeOrder.orderType === "takeaway" ? `Takeaway #${activeOrder.label}` : `Table ${activeOrder.label}`}</div>
                <Receipt size={16} color={C.gold} />
              </div>

              {/* Already-fired rounds — read only, already gone to kitchen */}
              {firedRounds.map((r, idx) => (
                <div key={r.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px dashed #ffffff33" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#ffffffaa" }}>Round {idx + 1}{r.firedAt ? ` · sent ${fmtTime(r.firedAt)}` : ""}</span>
                    <Pill tone={roundStatusLabel[r.status][1]}>{roundStatusLabel[r.status][0]}</Pill>
                    {r.status === "kitchen" && (
                      <button onClick={() => markRoundServed(activeOrder.id, r.id)} style={{ marginLeft: "auto", ...iconBtnDark, width: "auto", padding: "2px 8px", fontSize: 10.5 }}>Mark served</button>
                    )}
                  </div>
                  {r.items.map(i => (
                    <div key={i.menuItemId} style={{ padding: "2px 0" }}>
                      <div style={{ display: "flex", fontSize: 12.5, color: "#ffffffcc" }}>
                        <span style={{ width: 22 }}>{i.qty}×</span>
                        <span style={{ flex: 1 }}>{i.name}</span>
                        <span style={{ fontFamily: monoFont }}>{rs(i.price * i.qty)}</span>
                      </div>
                      {i.note && <div style={{ fontSize: 11, color: C.gold, marginLeft: 22, fontStyle: "italic" }}>Note: {i.note}</div>}
                    </div>
                  ))}
                </div>
              ))}

              {/* Current open round — still editable, not yet sent */}
              <div style={{ marginBottom: 10 }}>
                {firedRounds.length > 0 && <div style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, marginBottom: 4 }}>New items — Round {firedRounds.length + 1}</div>}
                {(!openRound || openRound.items.length === 0) && <div style={{ color: "#ffffff70", fontSize: 12.5 }}>No new items yet.</div>}
                {openRound?.items.map(i => (
                  <div key={i.menuItemId} style={{ padding: "5px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                      <button onClick={() => changeQty(openRound.id, i.menuItemId, -1)} style={iconBtnDark}><Minus size={10} /></button>
                      <span style={{ fontFamily: monoFont, width: 16, textAlign: "center" }}>{i.qty}</span>
                      <button onClick={() => changeQty(openRound.id, i.menuItemId, 1)} style={iconBtnDark}><Plus size={10} /></button>
                      <span style={{ flex: 1, marginLeft: 4 }}>{i.name}</span>
                      <span style={{ fontFamily: monoFont, color: "#ffffffcc" }}>{rs(i.price * i.qty)}</span>
                    </div>
                    <input
                      value={i.note || ""}
                      onChange={e => updateItemNote(openRound.id, i.menuItemId, e.target.value)}
                      placeholder="Note for kitchen (e.g. no onions, extra spicy)…"
                      style={{
                        width: "100%", marginTop: 3, marginLeft: 38, background: "#ffffff10", border: "1px solid #ffffff22",
                        borderRadius: 5, color: "#F0DEC0", padding: "3px 7px", fontSize: 11, fontStyle: "italic",
                        boxSizing: "border-box", maxWidth: "calc(100% - 38px)"
                      }}
                    />
                    {!i.isAddon && addons.length > 0 && menu.find(m => m.id === i.menuItemId)?.allowsAddons && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, marginLeft: 38 }}>
                        {addons.map(a => (
                          <button key={a.id} onClick={() => addAddonTo(openRound.id, i, a)} style={{
                            padding: "2px 7px", borderRadius: 10, border: "1px solid #ffffff2a",
                            background: "transparent", color: "#D9C89A", fontSize: 10.5, cursor: "pointer",
                          }} title={`Add ${a.name} — ${rs(a.price)}`}>
                            + {a.name.replace(/^Extra /, "")} {rs(a.price)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {activeOrder.bottles > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12.5, color: C.gold }}>
                    <span>Corkage × {activeOrder.bottles}</span>
                    <span style={{ fontFamily: monoFont }}>{rs(corkageTotal)}</span>
                  </div>
                )}
                {openRound && openRound.items.length > 0 && (
                  <Btn variant="gold" small onClick={() => fireRound(openRound.id)} icon={ClipboardList}>Send {firedRounds.length > 0 ? "this round" : "to kitchen"}</Btn>
                )}
              </div>

              <div style={{ borderTop: "1px dashed #ffffff33", marginTop: 6, paddingTop: 10 }}>
                {corkageTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#ffffffaa" }}><span>Corkage</span><span style={{ fontFamily: monoFont }}>{rs(corkageTotal)}</span></div>}
                {poolTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#ffffffaa" }}><span>Pool table ({(activeOrder.poolHours || 0) + poolRunningHours}h)</span><span style={{ fontFamily: monoFont }}>{rs(poolTotal)}</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#ffffffaa" }}><span>Subtotal (whole table)</span><span style={{ fontFamily: monoFont }}>{rs(subtotal)}</span></div>
                {discountAmount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8FBF7F" }}><span>Discount</span><span style={{ fontFamily: monoFont }}>-{rs(discountAmount)}</span></div>}
                {serviceChargeAmount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#ffffffaa" }}><span>Service ({serviceChargePct}%)</span><span style={{ fontFamily: monoFont }}>{rs(serviceChargeAmount)}</span></div>}
              </div>

              <div style={{ borderTop: "1px dashed #ffffff33", marginTop: 6, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: monoFont, fontWeight: 700, color: C.gold }}>{rs(grandTotal)}</span>
              </div>

              {allItems.length > 0 && (
                <div style={{ marginTop: 14, borderTop: "1px dashed #ffffff33", paddingTop: 12 }}>
                  <label style={{ fontSize: 11, color: "#ffffffaa", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>Payment method</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 6 }}>
                    {["Cash", "Card", "Bank Transfer", "QR"].map(pm => (
                      <button key={pm} onClick={() => updateOrder({ paymentMethod: pm })} style={{
                        padding: "7px 4px", borderRadius: 7, border: `1px solid ${(activeOrder.paymentMethod || "Cash") === pm ? C.gold : "#ffffff33"}`,
                        background: (activeOrder.paymentMethod || "Cash") === pm ? C.gold : "#ffffff14",
                        color: (activeOrder.paymentMethod || "Cash") === pm ? "#221F26" : "#fff",
                        fontSize: 11.5, fontWeight: 700, cursor: "pointer"
                      }}>{pm}</button>
                    ))}
                  </div>

                  {(activeOrder.paymentMethod || "Cash") === "Cash" ? (
                    <>
                      <label style={{ fontSize: 11, color: "#ffffffaa", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginTop: 12, display: "block" }}>Cash received (LKR)</label>
                      <input
                        type="number"
                        value={activeOrder.cashReceived}
                        onChange={e => updateOrder({ cashReceived: e.target.value })}
                        placeholder={String(grandTotal)}
                        style={{ ...inp, marginTop: 6, background: "#ffffff14", color: "#fff", borderColor: "#ffffff33", fontFamily: monoFont, fontSize: 15 }}
                      />
                      {changeDue > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13.5, fontWeight: 700, color: "#8FBF7F" }}>
                          <span>Change due</span><span style={{ fontFamily: monoFont }}>{rs(changeDue)}</span>
                        </div>
                      )}
                      {shortBy > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13.5, fontWeight: 700, color: "#E8A184" }}>
                          <span>Still short by</span><span style={{ fontFamily: monoFont }}>{rs(shortBy)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ marginTop: 10, fontSize: 12, color: "#ffffffaa" }}>
                      {activeOrder.paymentMethod} — full amount {rs(grandTotal)}. No change to calculate.
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                {allItems.length > 0 && (
                  <Btn variant="sage" onClick={settleBill} icon={Printer}>Settle final bill & print</Btn>
                )}
                {confirmVoid ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="danger" onClick={voidOrder} icon={Trash2}>Confirm cancel</Btn>
                    <Btn variant="ghost" onClick={() => setConfirmVoid(false)} icon={X}>Back</Btn>
                  </div>
                ) : (
                  <Btn variant="danger" onClick={voidOrder} icon={Trash2}>Cancel whole order</Btn>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Kitchen Display (for kitchen staff, separate from POS) ---------------- */
function KitchenTab({ orders, markRoundServed, undoRoundServed, setKitchenTicket }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const allFiring = orders.flatMap(o => o.rounds.map((r, idx) => ({ o, r, idx })))
    .filter(x => x.r.status === "kitchen")
    .sort((a, b) => (a.r.firedAt || 0) - (b.r.firedAt || 0));
  const firingTakeaway = allFiring.filter(x => x.o.orderType === "takeaway");
  const firingDineIn = allFiring.filter(x => x.o.orderType !== "takeaway");
  const served = orders.flatMap(o => o.rounds.map((r, idx) => ({ o, r, idx })))
    .filter(x => x.r.status === "served")
    .sort((a, b) => (b.r.firedAt || 0) - (a.r.firedAt || 0));

  function elapsed(ts) {
    if (!ts) return "";
    const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    return mins < 1 ? "just now" : `${mins} min ago`;
  }

  function printTicket(o, r, idx) {
    setKitchenTicket({
      orderType: o.orderType, label: o.label, roundNumber: idx + 1,
      customerName: o.customerName, customerPhone: o.customerPhone,
      items: r.items,
    });
  }

  function TicketCard({ o, r, idx, accent }) {
    return (
      <Card style={{ borderLeft: `6px solid ${accent}`, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: displayFont, fontSize: 19, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              {o.orderType === "takeaway" && <ShoppingBag size={16} color={C.gold} />}
              {o.orderType === "takeaway" ? `Takeaway #${o.label}` : `Table ${o.label}`}
            </div>
            <div style={{ fontSize: 11.5, color: C.slate, marginTop: 2 }}>Round {idx + 1} · {elapsed(r.firedAt)}</div>
          </div>
          <Pill tone="gold">Cooking</Pill>
        </div>
        <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 10, marginBottom: 12 }}>
          {r.items.map(i => (
            <div key={i.menuItemId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <span style={{ fontFamily: monoFont, fontWeight: 700, fontSize: 15, color: C.wine, width: 26 }}>{i.qty}×</span>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>{i.name}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="sage" onClick={() => markRoundServed(o.id, r.id)} icon={Check}>Mark served</Btn>
          <Btn variant="ghost" small onClick={() => printTicket(o, r, idx)} icon={Printer}>Print</Btn>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <SectionTitle eyebrow="For the kitchen crew" title="Kitchen Display" right={
        <Pill tone={allFiring.length > 0 ? "gold" : "sage"}>{allFiring.length} ticket{allFiring.length === 1 ? "" : "s"} firing</Pill>
      } />

      {allFiring.length === 0 && (
        <Card style={{ textAlign: "center", padding: 40, marginBottom: 24 }}>
          <Flame size={26} color={C.slate} style={{ marginBottom: 8 }} />
          <div style={{ color: C.slate, fontSize: 14 }}>No tickets waiting. New orders sent from Orders & Billing will show up here.</div>
        </Card>
      )}

      {firingTakeaway.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <ShoppingBag size={16} color={C.gold} />
            <div style={{ fontFamily: displayFont, fontSize: 17, fontWeight: 600 }}>Takeaway — pack & print</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {firingTakeaway.map(({ o, r, idx }) => <TicketCard key={r.id} o={o} r={r} idx={idx} accent={C.gold} />)}
          </div>
        </div>
      )}

      {firingDineIn.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontFamily: displayFont, fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Dine-in tables</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {firingDineIn.map(({ o, r, idx }) => <TicketCard key={r.id} o={o} r={r} idx={idx} accent={C.wine} />)}
          </div>
        </div>
      )}

      {served.length > 0 && (
        <div>
          <div style={{ fontFamily: displayFont, fontSize: 17, fontWeight: 600, marginBottom: 10, color: C.slate }}>Recently served</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {served.slice(0, 8).map(({ o, r, idx }) => (
              <Card key={r.id} style={{ padding: 12, opacity: 0.65 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{o.orderType === "takeaway" ? `Takeaway #${o.label}` : `Table ${o.label}`} · R{idx + 1}</div>
                  <Check size={13} color={C.sage} />
                </div>
                {r.items.map(i => <div key={i.menuItemId} style={{ fontSize: 11.5, color: C.slate }}>{i.qty}× {i.name}</div>)}
                <button onClick={() => undoRoundServed(o.id, r.id)} style={{ marginTop: 6, background: "none", border: "none", color: C.rust, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                  <Undo2 size={11} /> Undo
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function BillHistoryTab({ billHistory, setBillHistory, setReceipt }) {
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [q, setQ] = useState("");
  const [pendingAction, setPendingAction] = useState(null); // { id, type: 'refund'|'delete' }

  const dates = [...new Set(billHistory.map(b => b.date))].sort().reverse();
  const filtered = billHistory.filter(b =>
    (dateFilter === "all" || b.date === dateFilter) &&
    (!q || b.customerName?.toLowerCase().includes(q.toLowerCase()) || b.receiptNo.includes(q) || b.cashier?.toLowerCase().includes(q.toLowerCase()))
  );

  function askRefund(id) { setPendingAction({ id, type: "refund" }); }
  function askDelete(id) { setPendingAction({ id, type: "delete" }); }
  function cancelPending() { setPendingAction(null); }
  function confirmPending() {
    if (!pendingAction) return;
    if (pendingAction.type === "refund") {
      setBillHistory(billHistory.map(b => b.id === pendingAction.id ? { ...b, status: "refunded" } : b));
    } else {
      setBillHistory(billHistory.filter(b => b.id !== pendingAction.id));
    }
    setPendingAction(null);
  }

  const dayTotal = filtered.filter(b => b.status === "paid").reduce((s, b) => s + b.grandTotal, 0);

  const paidFiltered = filtered.filter(b => b.status === "paid");
  const breakdown = {
    food: paidFiltered.reduce((s, b) => s + (b.foodTotal || 0), 0),
    corkage: paidFiltered.reduce((s, b) => s + (b.corkageTotal || 0), 0),
    pool: paidFiltered.reduce((s, b) => s + (b.poolCharge || 0), 0),
    service: paidFiltered.reduce((s, b) => s + (b.serviceChargeAmount || 0), 0),
    discount: paidFiltered.reduce((s, b) => s + (b.discountAmount || 0), 0),
  };
  const byPaymentMethod = {};
  for (const b of paidFiltered) {
    const pm = b.paymentMethod || "Cash";
    byPaymentMethod[pm] = (byPaymentMethod[pm] || 0) + b.grandTotal;
  }

  const byDay = dates.map(d => {
    const dayBills = billHistory.filter(b => b.date === d && b.status === "paid");
    const refunded = billHistory.filter(b => b.date === d && b.status === "refunded").length;
    return { date: d, bills: dayBills.length, total: dayBills.reduce((s, b) => s + b.grandTotal, 0), refunded };
  });

  return (
    <div>
      <SectionTitle eyebrow="Every day, saved" title="Bill History" right={
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <Search size={14} color={C.slate} style={{ position: "absolute", left: 10, top: 10 }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search customer / receipt#" style={{ ...inp, width: 190, paddingLeft: 30 }} />
          </div>
          <select style={{ ...inp, width: 160 }} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value={todayStr()}>Today ({todayStr()})</option>
            <option value="all">All dates</option>
            {dates.filter(d => d !== todayStr()).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, marginBottom: 14 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: displayFont, fontSize: 16, fontWeight: 600 }}>
              {dateFilter === "all" ? "Sales — all dates" : dateFilter === todayStr() ? "Today's sales" : `Sales — ${dateFilter}`}
            </div>
            <span style={{ fontSize: 12, color: C.slate }}>{paidFiltered.length} bill(s)</span>
          </div>
          <Row label="Food & beverage" value={rs(breakdown.food)} />
          <Row label="Corkage fees" value={rs(breakdown.corkage)} />
          {breakdown.pool > 0 && <Row label="Pool table" value={rs(breakdown.pool)} />}
          <Row label="Service charge" value={rs(breakdown.service)} />
          {breakdown.discount > 0 && <Row label="Discounts given" value={`- ${rs(breakdown.discount)}`} />}
          <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700 }}>Net sales</span>
            <span style={{ fontFamily: monoFont, fontWeight: 700, color: C.wine }}>{rs(dayTotal)}</span>
          </div>
          {Object.keys(byPaymentMethod).length > 0 && (
            <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: C.slate, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginBottom: 6 }}>By payment method</div>
              {Object.entries(byPaymentMethod).map(([pm, amt]) => (
                <Row key={pm} label={pm} value={rs(amt)} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontFamily: displayFont, fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Sales by day</div>
          {byDay.length === 0 && <div style={{ color: C.slate, fontSize: 13 }}>No bills recorded yet.</div>}
          <div style={{ maxHeight: 168, overflowY: "auto" }}>
            {byDay.map(d => (
              <button key={d.date} onClick={() => setDateFilter(d.date)} style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 6px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
                background: dateFilter === d.date ? C.sageBg : "transparent", marginBottom: 2
              }}>
                <span style={{ fontSize: 12.5, fontWeight: d.date === todayStr() ? 700 : 500 }}>
                  {d.date === todayStr() ? `Today (${d.date})` : d.date}
                </span>
                <span style={{ fontSize: 11.5, color: C.slate, marginRight: 8 }}>{d.bills} bill{d.bills !== 1 ? "s" : ""}{d.refunded ? ` · ${d.refunded} refunded` : ""}</span>
                <span style={{ fontFamily: monoFont, fontSize: 12.5, fontWeight: 700 }}>{rs(d.total)}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: C.slate }}>{filtered.length} bill(s) shown</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Total: <span style={{ fontFamily: monoFont, color: C.wine }}>{rs(dayTotal)}</span></span>
      </Card>
      <Card>
        {filtered.length === 0 && <div style={{ color: C.slate, fontSize: 13 }}>No bills saved for this filter yet.</div>}
        {filtered.map(b => {
          const pending = pendingAction?.id === b.id ? pendingAction.type : null;
          return (
            <div key={b.id} style={{ padding: "11px 4px", borderBottom: `1px solid ${C.line}`, opacity: b.status === "refunded" ? 0.55 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Receipt size={15} color={C.slate} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                    #{b.receiptNo} · {b.orderType === "takeaway" ? `Takeaway #${b.label}` : `Table ${b.label}`}
                    {b.customerName && ` · ${b.customerName}`}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.slate }}>
                    {b.date} {b.time}{b.customerPhone ? ` · ${b.customerPhone}` : ""}{b.cashier ? ` · Billed by ${b.cashier}` : ""} · {b.paymentMethod || "Cash"}
                  </div>
                </div>
                <span style={{ marginLeft: "auto", fontFamily: monoFont, fontWeight: 700 }}>{rs(b.grandTotal)}</span>
                {b.status === "refunded" ? <Pill tone="rust">Refunded</Pill> : <Pill tone="sage">Paid</Pill>}
                <button onClick={() => setReceipt(b)} style={iconBtn} title="View / print"><Printer size={12} /></button>
                {b.status === "paid" && <button onClick={() => askRefund(b.id)} style={iconBtn} title="Refund"><RotateCcw size={12} color={C.rust} /></button>}
                <button onClick={() => askDelete(b.id)} style={iconBtn} title="Delete"><Trash2 size={12} color={C.rust} /></button>
              </div>
              {pending && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, marginLeft: 27, background: C.rustBg, borderRadius: 8, padding: "8px 12px" }}>
                  <span style={{ fontSize: 12.5, color: C.rust, fontWeight: 600 }}>
                    {pending === "refund" ? "Mark this bill as refunded? It will drop out of today's revenue." : "Delete this bill permanently? This can't be undone."}
                  </span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <Btn small variant="danger" onClick={confirmPending} icon={Check}>Yes, {pending === "refund" ? "refund" : "delete"}</Btn>
                    <Btn small variant="ghost" onClick={cancelPending} icon={X}>Cancel</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ---------------- Menu management ---------------- */
function MenuTab({ menu, setMenu, restaurantId }) {
  const [form, setForm] = useState({ name: "", type: "Food", category: "Mains", price: "", isSpecial: false, imageUrl: "" });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const catsByType = {
    Food: ["Appetizers & Bites", "Fried Rice Variety", "Traditional Rice & Curry", "Kottu Specialities", "Chef's Special Dishes"],
    Drinks: ["Soft Drinks & Sodas", "BYOB Mixers & Chasers", "Juices & Chillers", "BYOB Essentials"],
  };

  async function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadMenuImage(file);
      setForm(f => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err.message || "Couldn't upload photo.");
    } finally {
      setUploading(false);
    }
  }

  async function addOrUpdate() {
    if (!form.name || !form.price) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        setMenu(menu.map(m => m.id === editingId ? { ...m, ...form, price: Number(form.price) } : m));
        await updateMenuItem(editingId, { name: form.name, category: form.category, type: form.type, price: Number(form.price), isSpecial: form.isSpecial, imageUrl: form.imageUrl || null });
        setEditingId(null);
      } else {
        const created = await createMenuItem(restaurantId, { name: form.name, category: form.category, type: form.type, price: Number(form.price), isSpecial: form.isSpecial, imageUrl: form.imageUrl || null });
        setMenu([...menu, { id: created.id, name: created.name, type: created.type, category: created.category, price: Number(created.price), available: created.is_available, isSpecial: created.is_special, imageUrl: created.image_url }]);
      }
      setForm({ name: "", type: "Food", category: "Mains", price: "", isSpecial: false, imageUrl: "" });
    } catch (err) {
      setError(err.message || "Couldn't save to the database — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }
  function edit(m) { setForm({ name: m.name, type: m.type, category: m.category, price: m.price, isSpecial: m.isSpecial || false, imageUrl: m.imageUrl || "" }); setEditingId(m.id); }
  async function remove(id) {
    setMenu(menu.filter(m => m.id !== id));
    if (editingId === id) { setEditingId(null); setForm({ name: "", type: "Food", category: "Mains", price: "", isSpecial: false, imageUrl: "" }); }
    try { await deleteMenuItem(id); } catch (err) { setError(err.message || "Couldn't delete from the database."); }
  }
  async function toggleAvailable(id) {
    const item = menu.find(m => m.id === id);
    setMenu(menu.map(m => m.id === id ? { ...m, available: !m.available } : m));
    try { await updateMenuItem(id, { available: !item.available }); } catch (err) { setError(err.message || "Couldn't update availability."); }
  }
  async function toggleSpecial(id) {
    const item = menu.find(m => m.id === id);
    setMenu(menu.map(m => m.id === id ? { ...m, isSpecial: !m.isSpecial } : m));
    try { await updateMenuItem(id, { isSpecial: !item.isSpecial }); } catch (err) { setError(err.message || "Couldn't update special status."); }
  }

  return (
    <div>
      <SectionTitle eyebrow="Kitchen & bar offering" title="Menu Management" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
        <div>
          {["Food", "Drinks"].map(type => (
            <Card key={type} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                {type === "Drinks" ? <Coffee size={16} color={C.wine} /> : <UtensilsCrossed size={16} color={C.wine} />}
                <div style={{ fontFamily: displayFont, fontSize: 17, fontWeight: 600 }}>{type}</div>
              </div>
              {catsByType[type].map(cat => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: C.gold, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>{cat}</div>
                  {menu.filter(m => m.type === type && m.category === cat).map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
                      {m.imageUrl && <img src={m.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />}
                      <span style={{ fontSize: 13.5, opacity: m.available ? 1 : 0.4 }}>{m.name}</span>
                      {m.isSpecial && <span title="This week's special">⭐</span>}
                      {!m.available && <Pill tone="rust">86'd</Pill>}
                      <span style={{ marginLeft: "auto", fontFamily: monoFont, fontSize: 12.5, color: C.gold, fontWeight: 700 }}>{rs(m.price)}</span>
                      <button onClick={() => toggleSpecial(m.id)} style={iconBtn} title="Toggle this week's special">
                        <span style={{ fontSize: 12, opacity: m.isSpecial ? 1 : 0.3 }}>⭐</span>
                      </button>
                      <button onClick={() => toggleAvailable(m.id)} style={iconBtn} title="Toggle availability"><Check size={12} color={m.available ? C.sage : C.slate} /></button>
                      <button onClick={() => edit(m)} style={iconBtn}><Pencil size={12} /></button>
                      <button onClick={() => remove(m.id)} style={iconBtn}><Trash2 size={12} color={C.rust} /></button>
                    </div>
                  ))}
                  {menu.filter(m => m.type === type && m.category === cat).length === 0 && <div style={{ fontSize: 11.5, color: C.slate }}>No items yet.</div>}
                </div>
              ))}
            </Card>
          ))}
        </div>

        <Card style={{ alignSelf: "start" }}>
          <div style={{ fontFamily: displayFont, fontSize: 17, marginBottom: 12 }}>{editingId ? "Edit item" : "Add menu item"}</div>
          <Field label="Name"><input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Prawn Curry" /></Field>
          <Field label="Type">
            <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value, category: catsByType[e.target.value][0] })}>
              <option value="Food">Food</option>
              <option value="Drinks">Drinks</option>
            </select>
          </Field>
          <Field label="Category">
            <select style={inp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {catsByType[form.type].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Price (LKR)"><input type="number" style={inp} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="1500" /></Field>

          <Field label="Photo (optional)">
            {form.imageUrl && (
              <img src={form.imageUrl} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, marginBottom: 6 }} />
            )}
            <input type="file" accept="image/*" onChange={handlePhotoSelect} disabled={uploading} style={{ fontSize: 12 }} />
            {uploading && <div style={{ fontSize: 11.5, color: C.slate, marginTop: 4 }}>Uploading…</div>}
          </Field>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={form.isSpecial} onChange={e => setForm({ ...form, isSpecial: e.target.checked })} />
            <span style={{ fontSize: 13 }}>⭐ Feature as this week's special</span>
          </label>

          {error && <div style={{ color: C.rust, fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={addOrUpdate} icon={editingId ? Check : Plus} disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add item"}</Btn>
            {editingId && <Btn variant="ghost" onClick={() => { setEditingId(null); setForm({ name: "", type: "Food", category: "Mains", price: "", isSpecial: false, imageUrl: "" }); }}>Cancel</Btn>}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Inventory ---------------- */
function InventoryTab({ inventory, setInventory }) {
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", unit: "kg", qty: "", threshold: "", category: "" });

  function adjust(id, delta) {
    setInventory(inventory.map(i => i.id === id ? { ...i, qty: Math.max(0, +(i.qty + delta).toFixed(2)) } : i));
  }
  function addItem() {
    if (!form.name || form.qty === "") return;
    setInventory([...inventory, { id: uid("i"), name: form.name, unit: form.unit, qty: Number(form.qty), threshold: Number(form.threshold) || 0, category: form.category || "General" }]);
    setForm({ name: "", unit: "kg", qty: "", threshold: "", category: "" });
  }
  function remove(id) { setInventory(inventory.filter(i => i.id !== id)); }

  const filtered = inventory.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <SectionTitle eyebrow="Back of house" title="Inventory" right={
        <div style={{ position: "relative" }}>
          <Search size={14} color={C.slate} style={{ position: "absolute", left: 10, top: 10 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search stock..." style={{ ...inp, width: 220, paddingLeft: 30 }} />
        </div>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18 }}>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8, padding: "0 4px 10px", fontSize: 11.5, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: 0.4 }}>
            <span>Item</span><span>Category</span><span>Stock</span><span>Threshold</span><span></span>
          </div>
          {filtered.map(i => {
            const low = i.qty <= i.threshold;
            return (
              <div key={i.id} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8, alignItems: "center",
                padding: "9px 4px", borderRadius: 8, background: low ? C.rustBg : "transparent"
              }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  {low && <AlertTriangle size={13} color={C.rust} />}{i.name}
                </span>
                <span style={{ fontSize: 12, color: C.slate }}>{i.category}</span>
                <span style={{ fontFamily: monoFont, fontSize: 13, fontWeight: 700, color: low ? C.rust : C.ink }}>{i.qty} {i.unit}</span>
                <span style={{ fontFamily: monoFont, fontSize: 12, color: C.slate }}>{i.threshold} {i.unit}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => adjust(i.id, -1)} style={iconBtn}><Minus size={11} /></button>
                  <button onClick={() => adjust(i.id, 1)} style={iconBtn}><Plus size={11} /></button>
                  <button onClick={() => remove(i.id)} style={iconBtn}><Trash2 size={11} color={C.rust} /></button>
                </div>
              </div>
            );
          })}
        </Card>

        <Card style={{ alignSelf: "start" }}>
          <div style={{ fontFamily: displayFont, fontSize: 17, marginBottom: 12 }}>Add stock item</div>
          <Field label="Name"><input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tomatoes" /></Field>
          <Field label="Category"><input style={inp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Produce" /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Unit">
              <select style={inp} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                {["kg", "g", "l", "ml", "pcs"].map(u => <option key={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Qty on hand"><input type="number" style={inp} value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} /></Field>
          </div>
          <Field label="Low-stock threshold"><input type="number" style={inp} value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })} /></Field>
          <Btn onClick={addItem} icon={Plus}>Add to inventory</Btn>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Delivery / external platforms ---------------- */
function DeliveryTab({ externalOrders, setExternalOrders, menu }) {
  const [form, setForm] = useState({ platform: "Uber Eats", ref: "", total: "", commission: 25, status: "received" });

  function addOrder() {
    if (!form.ref || !form.total) return;
    setExternalOrders([...externalOrders, { id: uid("e"), platform: form.platform, ref: form.ref, total: Number(form.total), commission: Number(form.commission), status: form.status }]);
    setForm({ platform: form.platform, ref: "", total: "", commission: form.commission, status: "received" });
  }
  function setStatus(id, status) { setExternalOrders(externalOrders.map(o => o.id === id ? { ...o, status } : o)); }
  function remove(id) { setExternalOrders(externalOrders.filter(o => o.id !== id)); }

  const statusTone = { received: "gold", preparing: "wine", "ready for pickup": "sage", completed: "slate" };
  const platforms = ["Uber Eats", "PickMe Food", "Yamu", "WhatsApp"];

  const netTotal = externalOrders.reduce((s, o) => s + o.total * (1 - o.commission / 100), 0);

  return (
    <div>
      <SectionTitle eyebrow="Off-premise" title="Delivery Orders (Uber Eats, PickMe, etc.)" />
      <div style={{ background: "#F3E9D2", border: `1px solid ${C.gold}`, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, marginBottom: 18, color: "#7A5F1E" }}>
        Direct API sync with delivery platforms needs each platform's merchant credentials and a backend integration — log orders here manually for now so they still show up in your daily totals.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Order log</div>
            <div style={{ fontSize: 12.5, color: C.slate }}>Net after commission: <b style={{ color: C.sage, fontFamily: monoFont }}>{rs(netTotal)}</b></div>
          </div>
          {externalOrders.length === 0 && <div style={{ color: C.slate, fontSize: 13 }}>No delivery orders logged yet.</div>}
          {externalOrders.map(o => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
              <Truck size={14} color={C.slate} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{o.platform} · #{o.ref}</div>
                <div style={{ fontSize: 11.5, color: C.slate }}>{rs(o.total)} gross · {o.commission}% commission</div>
              </div>
              <select value={o.status} onChange={e => setStatus(o.id, e.target.value)} style={{ marginLeft: "auto", ...inp, width: 150, padding: "5px 8px", fontSize: 12 }}>
                {["received", "preparing", "ready for pickup", "completed"].map(s => <option key={s}>{s}</option>)}
              </select>
              <Pill tone={statusTone[o.status]}>{o.status}</Pill>
              <button onClick={() => remove(o.id)} style={iconBtn}><Trash2 size={11} color={C.rust} /></button>
            </div>
          ))}
        </Card>

        <Card style={{ alignSelf: "start" }}>
          <div style={{ fontFamily: displayFont, fontSize: 17, marginBottom: 12 }}>Log delivery order</div>
          <Field label="Platform">
            <select style={inp} value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value, commission: e.target.value === "WhatsApp" ? 0 : form.commission })}>
              {platforms.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Order reference"><input style={inp} value={form.ref} onChange={e => setForm({ ...form, ref: e.target.value })} placeholder="e.g. UE-40218" /></Field>
          <Field label="Order total (LKR)"><input type="number" style={inp} value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} placeholder="3200" /></Field>
          <Field label="Platform commission %"><input type="number" style={inp} value={form.commission} onChange={e => setForm({ ...form, commission: e.target.value })} /></Field>
          <Btn onClick={addOrder} icon={Plus}>Add to log</Btn>
        </Card>
      </div>
    </div>
  );
}
