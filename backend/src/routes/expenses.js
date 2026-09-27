const express = require('express');
const prisma = require('../prismaClient');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// GET /api/expenses
router.get('/', async (req, res) => {
  const expenses = await prisma.expense.findMany({
    where: { userId: req.userId },
    orderBy: { date: 'desc' },
  });
  res.json(expenses);
});

// POST /api/expenses
router.post('/', async (req, res) => {
  const { category, amount, date, note } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }
  const entry = await prisma.expense.create({
    data: { category, amount: amt, date, note: note || null, userId: req.userId },
  });
  res.status(201).json(entry);
});

// PUT /api/expenses/:id — edit an existing expense
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { category, amount, date, note } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }
  const result = await prisma.expense.updateMany({
    where: { id, userId: req.userId }, // only update if it's YOUR row
    data: { category, amount: amt, date, note: note || null },
  });
  if (result.count === 0) return res.status(404).json({ error: 'Not found.' });
  res.json({ ok: true });
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await prisma.expense.deleteMany({ where: { id, userId: req.userId } });
  if (result.count === 0) return res.status(404).json({ error: 'Not found.' });
  res.json({ ok: true });
});

module.exports = router;
