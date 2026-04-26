import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const months = 12;
    const now = new Date();

    const monthKeys = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
    });

    const incomeVsExpenses = await Promise.all(
      monthKeys.map(async ({ year, month, key }) => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);

        const [income, expenses] = await Promise.all([
          prisma.incomeEntry.aggregate({
            where: { userId: req.userId, date: { gte: start, lt: end } },
            _sum: { amountPhp: true },
          }),
          prisma.transaction.aggregate({
            where: { userId: req.userId, date: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
        ]);

        return {
          month: key,
          income: Number(income._sum.amountPhp ?? 0),
          expenses: Number(expenses._sum.amount ?? 0),
        };
      }),
    );

    const debtHistory = await Promise.all(
      monthKeys.map(async ({ year, month, key }) => {
        const end = new Date(year, month, 1);

        const payments = await prisma.debtPayment.aggregate({
          where: { userId: req.userId, date: { lt: end } },
          _sum: { amount: true },
        });

        const debts = await prisma.debt.findMany({
          where: { userId: req.userId },
        });

        const totalOriginal = debts.reduce((s, d) => s + Number(d.originalBalance), 0);
        const totalPaid = Number(payments._sum.amount ?? 0);
        const totalDebt = Math.max(0, totalOriginal - totalPaid);

        return { month: key, totalDebt };
      }),
    );

    const categories = await prisma.budgetCategory.findMany({
      where: { userId: req.userId },
    });

    const categoryTrend = await Promise.all(
      monthKeys.slice(-6).map(async ({ year, month, key }) => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);

        const txByCategory = await Promise.all(
          categories.map(async cat => {
            const result = await prisma.transaction.aggregate({
              where: {
                userId: req.userId,
                categoryId: cat.id,
                date: { gte: start, lt: end },
              },
              _sum: { amount: true },
            });
            return { category: cat.name, amount: Number(result._sum.amount ?? 0) };
          }),
        );

        return { month: key, breakdown: txByCategory };
      }),
    );

    res.json({ incomeVsExpenses, debtHistory, categoryTrend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
