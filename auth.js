/* ========================================================================
   FinOS — accounts (talks to the real backend now)
   Every function here calls the Express API at API_BASE. The server sets
   an httpOnly login cookie, so the browser handles "staying signed in"
   automatically — we never touch localStorage for auth anymore.
   ======================================================================== */
const API_BASE = 'https://finos-4uij.onrender.com/api';

// Every backend call goes through this one helper: it always sends the
// login cookie (credentials:'include'), always sends/expects JSON, and
// always returns a consistent { ok, data, error } shape so calling code
// never has to deal with fetch's own quirks directly.
async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch (err) {
    return { ok: false, error: 'Could not reach the server. Is the backend running?' };
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body is fine */ }
  if (!res.ok) {
    return { ok: false, error: (data && data.error) || 'Something went wrong.' };
  }
  return { ok: true, data };
}

async function signup(username, password) {
  username = (username || '').trim();
  password = password || '';
  if (!username || !password) return { ok: false, error: 'Enter a username and password.' };
  const res = await apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (res.ok) sessionStorage.setItem('finos_username', res.data.username);
  return res;
}

async function login(username, password) {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (res.ok) sessionStorage.setItem('finos_username', res.data.username);
  return res;
}

async function logout() {
  await apiFetch('/auth/logout', { method: 'POST' });
  sessionStorage.removeItem('finos_username');
  window.location.href = 'welcome.html';
}

// Asks the server "who is logged in, right now" — the source of truth.
async function currentUser() {
  const res = await apiFetch('/auth/me');
  if (res.ok) {
    sessionStorage.setItem('finos_username', res.data.username);
    return res.data.username;
  }
  sessionStorage.removeItem('finos_username');
  return null;
}

// Fast, non-authoritative username for painting the UI instantly
// (avoids a flash of "no name" while the real check above is in flight).
function cachedUsername() {
  return sessionStorage.getItem('finos_username');
}
