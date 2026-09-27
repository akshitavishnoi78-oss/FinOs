const express = require('express');
const prisma = require('../prismaClient');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// GET /api/goals
router.get('/', async (req, res) => {
  const goals = await prisma.goal.findMany({ where: { userId: req.userId } });
  res.json(goals);
});

// POST /api/goals
router.post('/', async (req, res) => {
  const { name, target, saved } = req.body;
  const tgt = Number(target);
  if (!name || !tgt || tgt <= 0) {
    return res.status(400).json({ error: 'Name and a positive target are required.' });
  }
  const goal = await prisma.goal.create({
    data: { name, target: tgt, saved: Number(saved) || 0, userId: req.userId },
  });
  res.status(201).json(goal);
});

// PUT /api/goals/:id/add-saved — the "+ ₹1,000 saved" button
router.put('/:id/add-saved', async (req, res) => {
  const id = Number(req.params.id);
  const amount = Number(req.body.amount) || 1000;

  const goal = await prisma.goal.findFirst({ where: { id, userId: req.userId } });
  if (!goal) return res.status(404).json({ error: 'Not found.' });

  const newSaved = Math.min(goal.target, goal.saved + amount); // cap at target, same rule as before
  const updated = await prisma.goal.update({ where: { id }, data: { saved: newSaved } });
  res.json(updated);
});

// DELETE /api/goals/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await prisma.goal.deleteMany({ where: { id, userId: req.userId } });
  if (result.count === 0) return res.status(404).json({ error: 'Not found.' });
  res.json({ ok: true });
});

module.exports = router;
