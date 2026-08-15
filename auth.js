/* ========================================================================
   FinOS — accounts (frontend-only)
   Usernames & passwords live in this browser's localStorage so more than
   one person can use the same device and each picks up their own saved
   income/expenses/budgets/goals next time they sign in.

   IMPORTANT: there is no server here — this is NOT secure storage. Treat
   it like a "profile switcher," not a real login system, and don't reuse
   a password you use anywhere else.
   ======================================================================== */
const USERS_KEY   = 'finos_users_v1';
const SESSION_KEY = 'finos_current_user';
const LEGACY_STATE_KEY = 'finos_state_v2'; // used before accounts existed

function getUsers(){
  try{ return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
  catch(e){ return {}; }
}
function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function currentUser(){
  return localStorage.getItem(SESSION_KEY);
}
function userStateKey(username){
  return LEGACY_STATE_KEY + '::' + username.toLowerCase();
}

function signup(username, password){
  username = (username || '').trim();
  password = password || '';
  if(!username || !password) return { ok:false, error:'Enter a username and password.' };
  if(username.length < 2) return { ok:false, error:'Username should be at least 2 characters.' };
  if(password.length < 4) return { ok:false, error:'Password should be at least 4 characters.' };

  const users = getUsers();
  const key = username.toLowerCase();
  if(users[key]) return { ok:false, error:'That username is already taken.' };

  users[key] = { username, password };
  saveUsers(users);

  // First account ever created on this browser? Carry over any data that
  // was saved before sign-in existed, so nothing gets "lost".
  const legacy = localStorage.getItem(LEGACY_STATE_KEY);
  if(legacy && !localStorage.getItem(userStateKey(username))){
    localStorage.setItem(userStateKey(username), legacy);
    localStorage.removeItem(LEGACY_STATE_KEY);
  }

  localStorage.setItem(SESSION_KEY, username);
  return { ok:true };
}

function login(username, password){
  username = (username || '').trim();
  const users = getUsers();
  const rec = users[username.toLowerCase()];
  if(!rec || rec.password !== password){
    return { ok:false, error:'Incorrect username or password.' };
  }
  localStorage.setItem(SESSION_KEY, rec.username);
  return { ok:true };
}

function logout(){
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'welcome.html';
}
