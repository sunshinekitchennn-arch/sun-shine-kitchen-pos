import { useState, useEffect } from "react";
import { fetchPublicMenu, fetchPublicRestaurant, fetchAddons } from "./lib/api";

const display = "Georgia, 'Times New Roman', serif";
const mono = "'SF Mono', Menlo, Consolas, monospace";
const rs = n => `Rs. ${Number(n).toLocaleString("en-LK")}`;

// Shared data loading for both view modes.
function useMenuData(restaurantId) {
  const [menu, setMenu] = useState(null);
  const [addons, setAddons] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!restaurantId) return;
    const load = () => {
      Promise.all([
        fetchPublicMenu(restaurantId),
        fetchPublicRestaurant(restaurantId),
        fetchAddons(restaurantId).catch(() => []),
      ])
        .then(([menuRows, info, addonRows]) => { setMenu(menuRows); setRestaurant(info); setAddons(addonRows); })
        .catch(err => setError(err.message || "Couldn't load the menu."));
    };
    load();
    const t = setInterval(load, 300000);
    return () => clearInterval(t);
  }, [restaurantId]);

  return { menu, addons, restaurant, error };
}

export default function PublicMenu({ restaurantId, tv }) {
  const { menu, addons, restaurant, error } = useMenuData(restaurantId);

  if (error) return <div style={wrap}><div style={{ color: "#B4463C", padding: 40 }}>{error}</div></div>;
  if (!menu) return <div style={wrap}><div style={{ color: "#8A8378", padding: 40 }}>Loading menu…</div></div>;

  return tv
    ? <TVSlideshow menu={menu} addons={addons} restaurant={restaurant} />
    : <ScrollableMenu menu={menu} addons={addons} restaurant={restaurant} />;
}

function TVSlideshow({ menu, addons, restaurant }) {
  const specials = menu.filter(m => m.is_special);
  const regular = menu.filter(m => !m.is_special);
  const byCategory = {};
  for (const m of regular) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  }
  const categoryEntries = Object.entries(byCategory);

  const slides = [
    { type: "intro" },
    ...(specials.length > 0 ? [{ type: "specials", items: specials }] : []),
    ...categoryEntries.map(([cat, items]) => ({ type: "category", category: cat, items, allowsAddons: items.some(i => i.allows_addons) })),
  ];

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const duration = slides[index]?.type === "intro" ? 4000 : 8000;
    const fadeTimer = setTimeout(() => setVisible(false), duration - 600);
    const nextTimer = setTimeout(() => {
      setIndex(i => (i + 1) % slides.length);
      setVisible(true);
    }, duration);
    return () => { clearTimeout(fadeTimer); clearTimeout(nextTimer); };
  }, [index, slides.length]);

  const slide = slides[index];

  return (
    <div style={{ ...wrap, height: "100vh", width: "100vw", overflow: "hidden", position: "relative" }}>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "5vh 6vw",
        opacity: visible ? 1 : 0, transition: "opacity 0.6s ease",
      }}>
        {slide.type === "intro" && <IntroSlide restaurant={restaurant} />}
        {slide.type === "specials" && <SpecialsSlide items={slide.items} />}
        {slide.type === "category" && <CategorySlide category={slide.category} items={slide.items} allowsAddons={slide.allowsAddons} addons={addons} />}
      </div>

      <div style={{ position: "absolute", bottom: "4vh", left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8 }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            width: i === index ? 22 : 8, height: 8, borderRadius: 4,
            background: i === index ? "#B8923D" : "#3A322B", transition: "all 0.4s ease",
          }} />
        ))}
      </div>
    </div>
  );
}

function IntroSlide({ restaurant }) {
  return (
    <div style={{ textAlign: "center" }}>
      <img src="/logo.jpeg" alt="" style={{ width: "18vh", height: "18vh", borderRadius: "50%", objectFit: "cover", marginBottom: "3vh" }} />
      <div style={{ fontFamily: display, fontSize: "6vh", fontWeight: 700, color: "#F5EFE3", letterSpacing: 1 }}>
        {restaurant?.name || "Sun Shine Kitchen"}
      </div>
      {restaurant?.address && <div style={{ color: "#9A9285", fontSize: "2.4vh", marginTop: "1.5vh" }}>{restaurant.address}</div>}
      <div style={{
        display: "inline-block", marginTop: "3vh", padding: "1vh 3vw", border: "1px solid #B8923D",
        borderRadius: 30, color: "#B8923D", fontSize: "2vh", letterSpacing: 2, textTransform: "uppercase"
      }}>
        BYOB Friendly
      </div>
    </div>
  );
}

function SpecialsSlide({ items }) {
  return (
    <div style={{ width: "100%", maxWidth: "90vw" }}>
      <div style={{ textAlign: "center", fontFamily: display, fontSize: "5vh", color: "#B8923D", fontWeight: 700, marginBottom: "4vh", letterSpacing: 1 }}>
        ★ THIS WEEK'S SPECIALS ★
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`, gap: "3vw" }}>
        {items.slice(0, 3).map(m => (
          <div key={m.id} style={{
            background: "linear-gradient(145deg, #241F1A, #1A1613)", border: "2px solid #B8923D",
            borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 40px rgba(184,146,61,0.25)"
          }}>
            {m.image_url && <img src={m.image_url} alt="" style={{ width: "100%", height: "26vh", objectFit: "cover" }} />}
            <div style={{ padding: "2.5vh 2vw" }}>
              <div style={{ fontFamily: display, fontSize: "2.8vh", fontWeight: 700, color: "#F5EFE3" }}>{m.name}</div>
              <div style={{ fontFamily: mono, fontSize: "2.6vh", fontWeight: 700, color: "#B8923D", marginTop: "1vh" }}>{rs(m.price)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategorySlide({ category, items, allowsAddons, addons }) {
  return (
    <div style={{ width: "100%", maxWidth: "80vw" }}>
      <div style={{ textAlign: "center", fontFamily: display, fontSize: "4.5vh", color: "#B8923D", fontWeight: 700, marginBottom: "1vh", letterSpacing: 1 }}>
        {category}
      </div>
      <div style={{ height: 2, background: "linear-gradient(to right, transparent, #B8923D, transparent)", marginBottom: "3vh" }} />
      <div style={{ display: "grid", gridTemplateColumns: items.length > 6 ? "1fr 1fr" : "1fr", gap: "0.5vh 4vw" }}>
        {items.map(m => (
          <div key={m.id} style={{ display: "flex", alignItems: "baseline", gap: "1vw", padding: "1vh 0" }}>
            <span style={{ fontSize: "2.6vh", color: "#E8E1D5" }}>{m.name}</span>
            <span style={{ flex: 1, borderBottom: "2px dotted #3A322B" }} />
            <span style={{ fontFamily: mono, fontSize: "2.4vh", color: "#B8923D", fontWeight: 700, whiteSpace: "nowrap" }}>{rs(m.price)}</span>
          </div>
        ))}
      </div>
      {allowsAddons && addons.length > 0 && (
        <div style={{ marginTop: "3vh", textAlign: "center", fontSize: "2vh", color: "#9A9285" }}>
          Add extra: {addons.map((a, i) => (
            <span key={a.id}>
              {a.name.replace(/^Extra /, "")} <span style={{ color: "#B8923D" }}>+{rs(a.price)}</span>
              {i < addons.length - 1 && <span style={{ margin: "0 12px" }}>·</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ScrollableMenu({ menu, addons, restaurant }) {
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
        <div style={{ textAlign: "center", padding: "36px 0 28px" }}>
          <img src="/logo.jpeg" alt="" style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginBottom: 12 }} />
          <h1 style={{ fontFamily: display, fontSize: 38, fontWeight: 700, margin: 0, letterSpacing: 0.5, color: "#F5EFE3" }}>
            {restaurant?.name || "Sun Shine Kitchen"}
          </h1>
          {restaurant?.address && <div style={{ color: "#9A9285", fontSize: 13.5, marginTop: 6 }}>{restaurant.address}</div>}
          {restaurant?.phone && <div style={{ color: "#9A9285", fontSize: 13.5 }}>{restaurant.phone}</div>}
          <div style={{ display: "inline-block", marginTop: 14, padding: "5px 16px", border: "1px solid #B8923D", borderRadius: 20, color: "#B8923D", fontSize: 11.5, letterSpacing: 1.2, textTransform: "uppercase" }}>
            BYOB Friendly — Bring Your Own Bottle
          </div>
        </div>

        {specials.length > 0 && (
          <div style={{ marginBottom: 44 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ height: 1, flex: 1, background: "linear-gradient(to right, transparent, #B8923D)" }} />
              <div style={{ fontFamily: display, fontSize: 24, color: "#B8923D", fontWeight: 700, letterSpacing: 1 }}>★ THIS WEEK'S SPECIALS ★</div>
              <div style={{ height: 1, flex: 1, background: "linear-gradient(to left, transparent, #B8923D)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {specials.map(m => (
                <div key={m.id} style={{ background: "linear-gradient(145deg, #241F1A, #1A1613)", border: "1px solid #B8923D", borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 24px rgba(184,146,61,0.15)" }}>
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

const wrap = {
  minHeight: "100vh",
  background: "radial-gradient(circle at 50% 0%, #26211C 0%, #15120F 60%)",
  fontFamily: "system-ui, -apple-system, sans-serif",
};
