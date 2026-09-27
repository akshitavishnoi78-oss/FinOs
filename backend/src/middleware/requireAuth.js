// This function runs BEFORE any protected route handler.
// It checks the "token" cookie set at login, verifies it, and
// attaches req.userId so every route knows WHO is asking.
//
// If there's no valid token, it stops the request here with a 401 —
// the actual route code never runs.
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Not signed in.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next(); // ok, continue to the actual route handler
  } catch (err) {
    return res.status(401).json({ error: 'Session expired, please sign in again.' });
  }
}

module.exports = requireAuth;
