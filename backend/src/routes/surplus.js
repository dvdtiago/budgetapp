import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const [year, m] = month.split('-').map(Number);
    const monthStart = new Date(year, m - 1, 1);
    const monthEnd = new Date(year, m, 1);

    // Look back up to 24 months to accumulate unspent surplus
    const historyStart = new Date(year, m - 25, 1);

    const [incomeEntries, transactions, debtPayments,
           histIncome, histExpenses, histDebtPayments,
           debts, existing, budgetAgg] = await Promise.all([
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
        where: { userId: req.userId, status: 'ACTIVE' },
        orderBy: { interestRate: 'desc' },
      }),
      prisma.surplusAllocation.findUnique({
        where: { userId_month: { userId: req.userId, month } },
      }),
      prisma.budgetCategory.aggregate({
        where: { userId: req.userId },
        _sum: { monthlyAllocation: true },
      }),
    ]);

    const totalIncome = incomeEntries.reduce((s, e) => s + Number(e.amountPhp), 0);
    const totalExpenses = transactions.reduce((s, t) => s + Number(t.amount), 0);
    const totalDebtPaid = debtPayments.reduce((s, p) => s + Number(p.amount), 0);
    const totalAllocated = Number(budgetAgg._sum.monthlyAllocation ?? 0);
    const effectiveExpenses = Math.max(totalExpenses, totalAllocated);
    const computedSurplus = totalIncome - effectiveExpenses - totalDebtPaid;

    // Carryover = accumulated net surplus from all previous months (dynamic, no Save Plan needed)
    const histTotalIncome = histIncome.reduce((s, e) => s + Number(e.amountPhp), 0);
    const histTotalExpenses = histExpenses.reduce((s, t) => s + Number(t.amount), 0);
    const histTotalDebtPaid = histDebtPayments.reduce((s, p) => s + Number(p.amount), 0);
    const carryover = Math.max(0, histTotalIncome - histTotalExpenses - histTotalDebtPaid);

    const surplus = computedSurplus + carryover;

    const suggestion = autoSplit(surplus, debts);

    res.json({
      month,
      totalIncome,
      totalExpenses,
      totalAllocated,
      effectiveExpenses,
      totalDebtPaid,
      surplus,
      carryover,
      debts: debts.map(d => ({
        id: d.id,
        name: d.name,
        provider: d.provider,
        interestRate: Number(d.interestRate),
        minPayment: Number(d.minPayment),
        currentBalance: Number(d.currentBalance),
      })),
      suggestion,
      saved: existing,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/:month/confirm', async (req, res) => {
  try {
    const { month } = req.params;
    const { allocations, totalSurplus, totalGoalAllocated } = req.body;

    const totalDebtAllocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const goalAllocated = Number(totalGoalAllocated) || 0;
    const leftover = Math.max(0, totalSurplus - totalDebtAllocated - goalAllocated);

    const saved = await prisma.surplusAllocation.upsert({
      where: { userId_month: { userId: req.userId, month } },
      update: { allocations, totalSurplus, confirmedAt: new Date(), carryover: leftover },
      create: { userId: req.userId, month, allocations, totalSurplus, confirmedAt: new Date(), carryover: leftover },
    });

    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

function autoSplit(surplus, debts) {
  if (surplus <= 0 || debts.length === 0) return [];

  const allocations = debts.map(d => {
    const balance = Number(d.currentBalance);
    const min = Math.min(Number(d.minPayment), balance);
    return { debtId: d.id, name: d.name, amount: min, maxAmount: balance };
  });

  let remaining = surplus - allocations.reduce((s, a) => s + a.amount, 0);

  // Extra surplus goes to highest-interest debt first, capped at its balance
  for (const allocation of allocations) {
    if (remaining <= 0) break;
    const canAdd = allocation.maxAmount - allocation.amount;
    if (canAdd <= 0) continue;
    const adding = Math.min(remaining, canAdd);
    allocation.amount += adding;
    remaining -= adding;
  }

  return allocations.map(({ debtId, name, amount }) => ({ debtId, name, amount }));
}

export default router;
