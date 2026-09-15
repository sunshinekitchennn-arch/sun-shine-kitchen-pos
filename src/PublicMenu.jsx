import { useState, useEffect } from "react";
import { fetchPublicMenu, fetchPublicRestaurant, fetchAddons } from "./lib/api";

// Customer-facing menu. No login needed — meant to be opened on a screen in
// the restaurant, or shared as a link / QR code. Specials are pulled to the
// top and highlighted; add-on prices are listed under the dishes that allow them.
export default function PublicMenu({ restaurantId }) {
  const [menu, setMenu] = useState(null);
  const [addons, setAddons] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!restaurantId) return;
    Promise.all([
      fetchPublicMenu(restaurantId),
      fetchPublicRestaurant(restaurantId),
      fetchAddons(restaurantId).catch(() => []),
    ])
      .then(([menuRows, info, addonRows]) => {
        setMenu(menuRows);
        setRestaurant(info);
        setAddons(addonRows);
      })
      .catch(err => setError(err.message || "Couldn't load the menu."));

    // Re-check every 5 minutes so a screen left running picks up menu edits
    // without anyone touching it.
    const t = setInterval(() => {
      fetchPublicMenu(restaurantId).then(setMenu).catch(() => {});
      fetchAddons(restaurantId).then(setAddons).catch(() => {});
    }, 300000);
    return () => clearInterval(t);
  }, [restaurantId]);

  const rs = n => `Rs. ${Number(n).toLocaleString("en-LK")}`;

  if (error) return <div style={wrap}><div style={{ color: "#B4463C" }}>{error}</div></div>;
  if (!menu) return <div style={wrap}><div style={{ color: "#8A8378" }}>Loading menu…</div></div>;

  const specials = menu.filter(m => m.is_special);
  const regular = menu.filter(m => !m.is_special);

  const byCategory = {};
  for (const m of regular) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  }

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 60px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", padding: "36px 0 28px" }}>
          <img src="/logo.jpeg" alt="Sun Shine Kitchen" style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginBottom: 12 }} />
          <h1 style={{ fontFamily: display, fontSize: 38, fontWeight: 700, margin: 0, letterSpacing: 0.5, color: "#F5EFE3" }}>
            {restaurant?.name || "Sun Shine Kitchen"}
          </h1>
          {restaurant?.address && <div style={{ color: "#9A9285", fontSize: 13.5, marginTop: 6 }}>{restaurant.address}</div>}
          {restaurant?.phone && <div style={{ color: "#9A9285", fontSize: 13.5 }}>{restaurant.phone}</div>}
          <div style={{ display: "inline-block", marginTop: 14, padding: "5px 16px", border: "1px solid #B8923D", borderRadius: 20, color: "#B8923D", fontSize: 11.5, letterSpacing: 1.2, textTransform: "uppercase" }}>
            BYOB Friendly — Bring Your Own Bottle
          </div>
        </div>

        {/* This week's specials */}
        {specials.length > 0 && (
          <div style={{ marginBottom: 44 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ height: 1, flex: 1, background: "linear-gradient(to right, transparent, #B8923D)" }} />
              <div style={{ fontFamily: display, fontSize: 24, color: "#B8923D", fontWeight: 700, letterSpacing: 1 }}>
                ★ THIS WEEK'S SPECIALS ★
              </div>
              <div style={{ height: 1, flex: 1, background: "linear-gradient(to left, transparent, #B8923D)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {specials.map(m => (
                <div key={m.id} style={{
                  background: "linear-gradient(145deg, #241F1A, #1A1613)",
                  border: "1px solid #B8923D", borderRadius: 14, overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(184,146,61,0.15)"
                }}>
                  {m.image_url && <img src={m.image_url} alt={m.name} style={{ width: "100%", height: 170, objectFit: "cover" }} />}
                  <div style={{ padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontFamily: display, fontSize: 19, fontWeight: 700, color: "#F5EFE3" }}>{m.name}</span>
                      <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: "#B8923D", whiteSpace: "nowrap" }}>{rs(m.price)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#B8923D", marginTop: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{m.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full menu by category */}
        {Object.entries(byCategory).map(([cat, items]) => {
          const catAllowsAddons = items.some(i => i.allows_addons);
          return (
            <div key={cat} style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: display, fontSize: 21, color: "#B8923D", fontWeight: 700, marginBottom: 4, letterSpacing: 0.6 }}>{cat}</div>
              <div style={{ height: 1, background: "#2E2823", marginBottom: 14 }} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "10px 32px" }}>
                {items.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0" }}>
                    {m.image_url && <img src={m.image_url} alt="" style={{ width: 46, height: 46, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                    <span style={{ fontSize: 15, color: "#E8E1D5" }}>{m.name}</span>
                    <span style={{ flex: 1, borderBottom: "1px dotted #3A322B", margin: "0 4px", minWidth: 12 }} />
                    <span style={{ fontFamily: mono, fontSize: 14.5, color: "#B8923D", fontWeight: 700, whiteSpace: "nowrap" }}>{rs(m.price)}</span>
                  </div>
                ))}
              </div>

              {catAllowsAddons && addons.length > 0 && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#1E1A16", borderRadius: 10, border: "1px solid #2E2823" }}>
                  <span style={{ fontSize: 11.5, color: "#9A9285", textTransform: "uppercase", letterSpacing: 0.8, marginRight: 10 }}>Add extra:</span>
                  {addons.map((a, i) => (
                    <span key={a.id} style={{ fontSize: 13, color: "#C9C1B4" }}>
                      {a.name.replace(/^Extra /, "")} <span style={{ color: "#B8923D", fontFamily: mono }}>+{rs(a.price)}</span>
                      {i < addons.length - 1 && <span style={{ color: "#4A423A", margin: "0 8px" }}>·</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ textAlign: "center", marginTop: 40, paddingTop: 20, borderTop: "1px solid #2E2823", color: "#6E675E", fontSize: 12 }}>
          All prices in LKR, inclusive of taxes. Thank you for dining with us!
        </div>
      </div>
    </div>
  );
}

const display = "Georgia, 'Times New Roman', serif";
const mono = "'SF Mono', Menlo, Consolas, monospace";
const wrap = {
  minHeight: "100vh",
  background: "radial-gradient(circle at 50% 0%, #26211C 0%, #15120F 60%)",
  fontFamily: "system-ui, -apple-system, sans-serif",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
};
