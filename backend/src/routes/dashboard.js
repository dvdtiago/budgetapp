import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const monthParam = req.query.month;
    let monthStart, monthEnd;
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      monthStart = new Date(y, m - 1, 1);
      monthEnd = new Date(y, m, 1);
    } else {
      monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    // Look back up to 24 months to accumulate unspent surplus (carryover wallet)
    const historyStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 24, 1);

    const [incomeEntries, transactions, monthDebtPayments,
           histIncome, histExpenses, histDebtPayments,
           debts, settings, recentTransactions, goals, upcomingAmortization] = await Promise.all([
      prisma.incomeEntry.findMany({
        where: { userId: req.userId, date: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.transaction.findMany({
        where: { userId: req.userId, date: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.debtPayment.findMany({
        where: { userId: req.userId, date: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.incomeEntry.findMany({
        where: { userId: req.userId, date: { gte: historyStart, lt: monthStart } },
        select: { amountPhp: true },
      }),
      prisma.transaction.findMany({
        where: { userId: req.userId, date: { gte: historyStart, lt: monthStart } },
        select: { amount: true },
      }),
      prisma.debtPayment.findMany({
        where: { userId: req.userId, date: { gte: historyStart, lt: monthStart } },
        select: { amount: true },
      }),
      prisma.debt.findMany({
        where: { userId: req.userId, status: { not: 'PAID_OFF' } },
        orderBy: { interestRate: 'desc' },
      }),
      prisma.settings.findUnique({ where: { userId: req.userId } }),
      prisma.transaction.findMany({
        where: { userId: req.userId },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 5,
      }),
      prisma.goal.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.amortizationEntry.findMany({
        where: {
          isPaid: false,
          paymentDate: { gte: now, lte: in30Days },
          debt: { userId: req.userId, status: 'ACTIVE' },
        },
        include: { debt: { select: { id: true, name: true, provider: true } } },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const totalIncome = incomeEntries.reduce((s, e) => s + Number(e.amountPhp), 0);
    const totalSpent = transactions.reduce((s, t) => s + Number(t.amount), 0);
    const totalDebtPaid = monthDebtPayments.reduce((s, p) => s + Number(p.amount), 0);
    const thisMonthSurplus = totalIncome - totalSpent - totalDebtPaid;

    // Carryover wallet: accumulated unspent net from all previous months
    const histTotalIncome = histIncome.reduce((s, e) => s + Number(e.amountPhp), 0);
    const histTotalExpenses = histExpenses.reduce((s, t) => s + Number(t.amount), 0);
    const histTotalDebtPaid = histDebtPayments.reduce((s, p) => s + Number(p.amount), 0);
    const carryover = Math.max(0, histTotalIncome - histTotalExpenses - histTotalDebtPaid);

    const surplus = thisMonthSurplus + carryover;

    const activeDebts = debts.filter(d => d.status === 'ACTIVE');
    const totalDebtRemaining = activeDebts.reduce((s, d) => s + Number(d.currentBalance), 0);
    const totalDebtOriginal = activeDebts.reduce((s, d) => s + Number(d.originalBalance), 0);
    const percentPaid = totalDebtOriginal > 0
      ? ((totalDebtOriginal - totalDebtRemaining) / totalDebtOriginal) * 100
      : 0;

    const goalDate = settings?.goalDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentPayments = await prisma.debtPayment.findMany({
      where: { userId: req.userId, date: { gte: threeMonthsAgo } },
    });
    const totalRecentPayments = recentPayments.reduce((s, p) => s + Number(p.amount), 0);
    const monthlyPaymentRate = totalRecentPayments / 3;
    const monthsToPayoff = monthlyPaymentRate > 0 ? totalDebtRemaining / monthlyPaymentRate : null;
    const projectedPayoffDate = monthsToPayoff
      ? new Date(now.getTime() + monthsToPayoff * 30 * 24 * 60 * 60 * 1000)
      : null;
    const onTrack = projectedPayoffDate ? projectedPayoffDate <= goalDate : false;

    const topDebts = activeDebts.slice(0, 5).map(d => ({
      id: d.id,
      name: d.name,
      provider: d.provider,
      type: d.type,
      currentBalance: Number(d.currentBalance),
      originalBalance: Number(d.originalBalance),
      interestRate: Number(d.interestRate),
      minPayment: Number(d.minPayment),
      percentPaid: Number(d.originalBalance) > 0
        ? ((Number(d.originalBalance) - Number(d.currentBalance)) / Number(d.originalBalance)) * 100
        : 0,
    }));

    const upcomingDeadlines = upcomingAmortization.map(e => ({
      debtId: e.debt.id,
      debtName: e.debt.name,
      provider: e.debt.provider,
      paymentDate: e.paymentDate,
      paymentAmount: Number(e.paymentAmount),
      daysUntilDue: Math.ceil((new Date(e.paymentDate) - now) / (1000 * 60 * 60 * 24)),
    }));

    const goalsSummary = goals.map(g => ({
      id: g.id,
      name: g.name,
      type: g.type,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      deadline: g.deadline,
      notes: g.notes,
      percentComplete: Number(g.targetAmount) > 0
        ? Math.min(100, (Number(g.currentAmount) / Number(g.targetAmount)) * 100)
        : 0,
    }));

    res.json({
      thisMonth: {
        income: totalIncome,
        spent: totalSpent,
        debtPaid: totalDebtPaid,
        surplus,
        carryover,
      },
      debts: {
        totalRemaining: totalDebtRemaining,
        totalOriginal: totalDebtOriginal,
        percentPaid,
        onTrack,
        projectedPayoffDate,
        goalDate,
      },
      topDebts,
      recentTransactions,
      goals: goalsSummary,
      upcomingDeadlines,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
