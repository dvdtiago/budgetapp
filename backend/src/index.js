import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import debtRoutes from './routes/debts.js';
import incomeRoutes from './routes/income.js';
import budgetRoutes from './routes/budget.js';
import transactionRoutes from './routes/transactions.js';
import dashboardRoutes from './routes/dashboard.js';
import surplusRoutes from './routes/surplus.js';
import settingsRoutes from './routes/settings.js';
import trendsRoutes from './routes/trends.js';
import goalsRoutes from './routes/goals.js';
import { startReminderJob } from './jobs/reminder.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/surplus', surplusRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/goals', goalsRoutes);

startReminderJob();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
