// This route is different from the others: instead of just returning raw
// rows, it asks the DATABASE to add things up (SUM ... WHERE ... GROUP BY),
// and returns the totals directly. This is closer to what real backend
// work looks like day-to-day than plain CRUD.
const express = require('express');
const prisma = require('../prismaClient');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

function monthKey(dateStr) { return dateStr.slice(0, 7); } // "YYYY-MM"

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  const userId = req.userId;
  const now = new Date();
  const mKey = now.toISOString().slice(0, 7);

  const [allIncome, allExpenses] = await Promise.all([
    prisma.income.findMany({ where: { userId } }),
    prisma.expense.findMany({ where: { userId } }),
  ]);

  const monthlyIncome = allIncome
    .filter(i => monthKey(i.date) === mKey)
    .reduce((s, i) => s + i.amount, 0);

  const monthlyExpenses = allExpenses
    .filter(e => monthKey(e.date) === mKey)
    .reduce((s, e) => s + e.amount, 0);

  const allTimeIncome = allIncome.reduce((s, i) => s + i.amount, 0);
  const allTimeExpenses = allExpenses.reduce((s, e) => s + e.amount, 0);

  res.json({
    monthlyIncome,
    monthlyExpenses,
    monthlySavings: monthlyIncome - monthlyExpenses,
    currentBalance: allTimeIncome - allTimeExpenses,
  });
});

module.exports = router;
