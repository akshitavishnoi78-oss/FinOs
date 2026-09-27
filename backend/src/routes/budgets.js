const express = require('express');
const prisma = require('../prismaClient');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// GET /api/budgets
router.get('/', async (req, res) => {
  const budgets = await prisma.budget.findMany({ where: { userId: req.userId } });
  res.json(budgets);
});

// POST /api/budgets — set (or replace) the limit for a category
router.post('/', async (req, res) => {
  const { category, limit } = req.body;
  const lim = Number(limit);
  if (!lim || lim <= 0) {
    return res.status(400).json({ error: 'Limit must be a positive number.' });
  }
  // upsert = "update if it exists, otherwise create" — matches the
  // @@unique([userId, category]) constraint in schema.prisma
  const budget = await prisma.budget.upsert({
    where: { userId_category: { userId: req.userId, category } },
    update: { limit: lim },
    create: { category, limit: lim, userId: req.userId },
  });
  res.status(201).json(budget);
});

module.exports = router;
