const express = require('express');
const prisma = require('../prismaClient');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth); // every route below requires a valid login

// GET /api/income — list this user's income entries
router.get('/', async (req, res) => {
  const income = await prisma.income.findMany({
    where: { userId: req.userId },
    orderBy: { date: 'desc' },
  });
  res.json(income);
});

// POST /api/income — add an entry
router.post('/', async (req, res) => {
  const { source, amount, date } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }
  const entry = await prisma.income.create({
    data: { source, amount: amt, date, userId: req.userId },
  });
  res.status(201).json(entry);
});

// DELETE /api/income/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  // deleteMany + userId filter = you can only delete YOUR OWN rows,
  // even if someone guesses another user's id.
  const result = await prisma.income.deleteMany({ where: { id, userId: req.userId } });
  if (result.count === 0) return res.status(404).json({ error: 'Not found.' });
  res.json({ ok: true });
});

module.exports = router;
