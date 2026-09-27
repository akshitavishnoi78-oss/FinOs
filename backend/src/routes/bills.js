const express = require('express');
const prisma = require('../prismaClient');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// GET /api/bills
router.get('/', async (req, res) => {
  const bills = await prisma.bill.findMany({ where: { userId: req.userId } });
  res.json(bills);
});

// POST /api/bills
router.post('/', async (req, res) => {
  const { name, amount, day } = req.body;
  const amt = Number(amount);
  const d = Number(day);
  if (!name || !amt || amt <= 0 || !d || d < 1 || d > 31) {
    return res.status(400).json({ error: 'Check the bill name, amount, and day (1-31).' });
  }
  const bill = await prisma.bill.create({ data: { name, amount: amt, day: d, userId: req.userId } });
  res.status(201).json(bill);
});

// DELETE /api/bills/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await prisma.bill.deleteMany({ where: { id, userId: req.userId } });
  if (result.count === 0) return res.status(404).json({ error: 'Not found.' });
  res.json({ ok: true });
});

module.exports = router;
