import { useState, useEffect } from "react";
import { onAuthChange, signIn, signOut, getStaffProfile, getAuthLevel, listMfaFactors, enrollMfa, verifyMfaEnrollment, verifyMfaLogin, removeMfaFactor } from "./lib/auth";
import BYOBRestaurantSystem from "./byob-restaurant-system.jsx";

const boxStyle = { display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#F4F1EC" };
const cardStyle = { background: "#fff", padding: 32, borderRadius: 14, width: 340, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" };
const inputStyle = { width: "100%", padding: "8px 10px", marginTop: 4, marginBottom: 14, borderRadius: 8, border: "1px solid #ddd", boxSizing: "border-box" };
const btnStyle = { width: "100%", padding: "10px 0", borderRadius: 8, border: "none", background: "#5B7553", color: "#fff", fontWeight: 700, cursor: "pointer" };

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [needsMfaChallenge, setNeedsMfaChallenge] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [showSecurityScreen, setShowSecurityScreen] = useState(false);

  useEffect(() => onAuthChange(setSession), []);

  useEffect(() => {
    if (session?.user) {
      getStaffProfile(session.user.id)
        .then(setProfile)
        .catch(() => setError("Logged in, but no staff record found for this account. Ask your admin to add you in the 'staff' table."));
      checkMfaStatus();
    } else {
      setProfile(null);
      setNeedsMfaChallenge(false);
    }
  }, [session]);

  async function checkMfaStatus() {
    try {
      const level = await getAuthLevel();
      if (level.nextLevel === "aal2" && level.currentLevel !== level.nextLevel) {
        const factors = await listMfaFactors();
        const verified = factors.find(f => f.status === "verified");
        if (verified) {
          setMfaFactorId(verified.id);
          setNeedsMfaChallenge(true);
        }
      }
    } catch (err) {
      console.error("MFA status check failed:", err);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(e) {
    e.preventDefault();
    setMfaError("");
    setLoading(true);
    try {
      await verifyMfaLogin(mfaFactorId, mfaCode);
      setNeedsMfaChallenge(false);
      setMfaCode("");
    } catch (err) {
      setMfaError(err.message || "Incorrect code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (session === undefined) {
    return <div style={boxStyle}>Loading…</div>;
  }

  if (session && needsMfaChallenge) {
    return (
      <div style={boxStyle}>
        <form onSubmit={handleMfaSubmit} style={cardStyle}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Enter your code</div>
          <div style={{ fontSize: 13, color: "#7A756B", marginBottom: 20 }}>Open your authenticator app and enter the 6-digit code.</div>
          <input type="text" inputMode="numeric" maxLength={6} value={mfaCode}
            onChange={e => setMfaCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" autoFocus
            style={{ ...inputStyle, fontSize: 22, textAlign: "center", letterSpacing: 6, fontFamily: "monospace" }} />
          {mfaError && <div style={{ color: "#B4463C", fontSize: 12.5, marginBottom: 12 }}>{mfaError}</div>}
          <button type="submit" disabled={loading || mfaCode.length !== 6} style={btnStyle}>{loading ? "Verifying…" : "Verify"}</button>
          <button type="button" onClick={signOut} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "#7A756B", fontSize: 12.5, cursor: "pointer" }}>
            Not you? Log out
          </button>
        </form>
      </div>
    );
  }

  if (session && profile) {
    if (showSecurityScreen) {
      return <SecurityScreen onClose={() => setShowSecurityScreen(false)} />;
    }
    return (
      <BYOBRestaurantSystem
        restaurantId={profile.restaurant_id}
        cashierName={profile.full_name}
        onLogout={signOut}
        onOpenSecurity={() => setShowSecurityScreen(true)}
      />
    );
  }

  if (session && !profile) {
    return (
      <div style={{ ...boxStyle, flexDirection: "column", gap: 12 }}>
        <div>{error || "Loading your profile…"}</div>
        {error && <button onClick={signOut}>Log out</button>}
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <form onSubmit={handleLogin} style={cardStyle}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Sun Shine Kitchen</div>
        <div style={{ fontSize: 13, color: "#7A756B", marginBottom: 20 }}>Staff sign in</div>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
        <label style={{ fontSize: 12, fontWeight: 600 }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
        {error && <div style={{ color: "#B4463C", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={loading} style={btnStyle}>{loading ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

function EnrollForm({ enrollData, code, setCode, onSubmit, onCancel, busy }) {
  return (
    <form onSubmit={onSubmit}>
      <div style={{ fontSize: 13, marginBottom: 10 }}>1. Scan this QR code with your authenticator app:</div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <img src={enrollData.totp.qr_code} alt="QR code" style={{ width: 180, height: 180, border: "1px solid #eee", borderRadius: 8 }} />
      </div>
      <div style={{ fontSize: 11.5, color: "#7A756B", marginBottom: 14, wordBreak: "break-all" }}>
        Can't scan? Enter this key manually: <code>{enrollData.totp.secret}</code>
      </div>
      <div style={{ fontSize: 13, marginBottom: 8 }}>2. Enter the 6-digit code it shows:</div>
      <input type="text" inputMode="numeric" maxLength={6} value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" autoFocus
        style={{ ...inputStyle, fontSize: 20, textAlign: "center", letterSpacing: 6, fontFamily: "monospace" }} />
      <button type="submit" disabled={busy || code.length !== 6} style={btnStyle}>{busy ? "Verifying…" : "Confirm & enable"}</button>
      <button type="button" onClick={onCancel} style={{ width: "100%", marginTop: 8, background: "none", border: "none", color: "#7A756B", fontSize: 12.5, cursor: "pointer" }}>Cancel</button>
    </form>
  );
}

function SecurityScreen({ onClose }) {
  const [factors, setFactors] = useState(null);
  const [enrollData, setEnrollData] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    try {
      const list = await listMfaFactors();
      setFactors(list);
    } catch (err) {
      setError(err.message);
    }
  }

  async function startEnroll() {
    setError("");
    setBusy(true);
    try {
      const data = await enrollMfa();
      setEnrollData(data);
    } catch (err) {
      setError(err.message || "Couldn't start setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifyMfaEnrollment(enrollData.id, code);
      setEnrollData(null);
      setCode("");
      await refresh();
    } catch (err) {
      setError(err.message || "Incorrect code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(factorId) {
    setBusy(true);
    try {
      await removeMfaFactor(factorId);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F1EC", fontFamily: "sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 440, margin: "0 auto", background: "#fff", borderRadius: 14, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#7A756B", fontSize: 13, cursor: "pointer", marginBottom: 16 }}>← Back</button>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>2-step verification</div>
        <div style={{ fontSize: 13, color: "#7A756B", marginBottom: 20 }}>
          Use an authenticator app (Google Authenticator, Microsoft Authenticator, Authy) to add a second step to sign-in. Free, no phone/SMS needed.
        </div>

        {error && <div style={{ color: "#B4463C", fontSize: 12.5, marginBottom: 14, background: "#FBEAE7", padding: "8px 10px", borderRadius: 8 }}>{error}</div>}

        {factors === null ? (
          <div style={{ fontSize: 13, color: "#7A756B" }}>Loading…</div>
        ) : enrollData ? (
          <EnrollForm enrollData={enrollData} code={code} setCode={setCode} onSubmit={confirmEnroll} onCancel={() => { setEnrollData(null); setCode(""); }} busy={busy} />
        ) : (
          <div>
            {factors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  {factors.some(f => f.status === "verified") ? "Enabled" : "Incomplete setup attempts"}
                </div>
                {factors.map(f => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F4F1EC", borderRadius: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>
                      Authenticator app {f.status !== "verified" && <span style={{ color: "#B8923D" }}>(not finished)</span>}
                    </span>
                    <button onClick={() => remove(f.id)} disabled={busy} style={{ background: "none", border: "none", color: "#B4463C", fontSize: 12.5, cursor: "pointer" }}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            {!factors.some(f => f.status === "verified") && (
              <button onClick={startEnroll} disabled={busy} style={btnStyle}>{busy ? "Starting…" : "Set up 2-step verification"}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
