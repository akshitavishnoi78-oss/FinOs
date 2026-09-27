const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Cookie options shared by login + logout
const COOKIE_OPTS = {
  httpOnly: true,        // JS on the page can't read this cookie (helps against XSS)
  sameSite: 'none',
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || username.trim().length < 2) {
    return res.status(400).json({ error: 'Username should be at least 2 characters.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password should be at least 4 characters.' });
  }

  const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (existing) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  // NEVER store the raw password. Hash it first.
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username: username.trim(), passwordHash },
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, COOKIE_OPTS);
  res.json({ ok: true, username: user.username });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username: (username || '').trim() } });

  if (!user) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  const valid = await bcrypt.compare(password || '', user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, COOKIE_OPTS);
  res.json({ ok: true, username: user.username });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTS);
  res.json({ ok: true });
});

// GET /api/auth/me  — "am I logged in, and as who?"
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  res.json({ username: user.username });
});

module.exports = router;
