import { supabase } from "./supabaseClient";

// Sign in an existing staff member (owner creates accounts in Supabase
// Dashboard → Authentication → Users, or via signUp() below during setup).
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// One-time setup helper — creates a login for a new staff member.
// After this runs, insert a matching row into `staff` (see schema.sql)
// linking their auth user id to your restaurant_id and a role.
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

// Call once when the app loads, and keep listening so the UI updates
// automatically if someone logs out in another tab.
export function onAuthChange(callback) {
  supabase.auth.getSession().then(({ data }) => callback(data.session));
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => listener.subscription.unsubscribe();
}

// ---------- MFA (TOTP via Authenticator app — Google Authenticator, etc.) ----------

// Checks whether this session still needs a 2FA code before it's fully
// trusted. Call right after sign-in: if currentLevel !== nextLevel, the
// person has MFA enrolled and must enter a code before proceeding.
export async function getAuthLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data; // { currentLevel, nextLevel }
}

export async function listMfaFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp || [];
}

// Starts enrollment — returns a QR code (as a ready-to-use image data URI)
// and the factor id needed to verify it below.
export async function enrollMfa() {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw error;
  return data; // { id, totp: { qr_code, secret, uri } }
}

// Confirms enrollment with the 6-digit code from the authenticator app.
export async function verifyMfaEnrollment(factorId, code) {
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) throw challengeErr;
  const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  if (verifyErr) throw verifyErr;
}

// Used at login time, once a factor is already enrolled.
export async function verifyMfaLogin(factorId, code) {
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) throw challengeErr;
  const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  if (verifyErr) throw verifyErr;
}

export async function removeMfaFactor(factorId) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

// Fetches the logged-in staff member's restaurant_id + role + name.
// Call this right after login to know which restaurant's data to load.
export async function getStaffProfile(userId) {
  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, role, restaurant_id")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}
