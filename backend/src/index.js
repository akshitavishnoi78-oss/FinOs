require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const incomeRoutes = require('./routes/income');
const expenseRoutes = require('./routes/expenses');
const budgetRoutes = require('./routes/budgets');
const billRoutes = require('./routes/bills');
const goalRoutes = require('./routes/goals');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// --- Middleware (runs on EVERY request, in this order) ---
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5500',
  credentials: true, // allow the cookie to be sent/received
}));
app.use(express.json());   // parse JSON request bodies into req.body
app.use(cookieParser());   // parse cookies into req.cookies

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- Catch-all error handler (so a crash doesn't kill the server silently) ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`FinOS backend running at http://localhost:${PORT}`);
});
