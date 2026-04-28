import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    const [user, debts, income, categories, transactions, debtPayments, goals, goalContributions, surplusAllocations, settings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.debt.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.incomeEntry.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
      prisma.budgetCategory.findMany({ where: { userId }, orderBy: { sortOrder: 'asc' } }),
      prisma.transaction.findMany({
        where: { userId },
        include: { category: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.debtPayment.findMany({
        where: { userId },
        include: { debt: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.goalContribution.findMany({
        where: { userId },
        include: { goal: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.surplusAllocation.findMany({ where: { userId }, orderBy: { month: 'asc' } }),
      prisma.settings.findUnique({ where: { userId } }),
    ]);

    const filename = `budgetarian-export-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      exportedAt: new Date().toISOString(),
      user,
      debts,
      income,
      budgetCategories: categories,
      transactions,
      debtPayments,
      goals,
      goalContributions,
      surplusAllocations,
      settings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
