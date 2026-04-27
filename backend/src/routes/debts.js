import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

export function generateAmortization(balance, annualRate, monthlyPayment, startDate) {
  const entries = [];
  const monthlyRate = Number(annualRate) / 12;
  let remaining = Number(balance);
  let date = new Date(startDate);
  let num = 1;

  while (remaining > 0.01 && num <= 600) {
    const interest = remaining * monthlyRate;
    if (monthlyPayment <= interest) break;

    const actualPayment = remaining + interest > Number(monthlyPayment)
      ? Number(monthlyPayment)
      : remaining + interest;
    const principalPaid = actualPayment - interest;
    remaining = Math.max(0, remaining - principalPaid);

    entries.push({
      paymentNumber: num++,
      paymentDate: new Date(date),
      paymentAmount: Math.round(actualPayment * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      remainingBalance: Math.round(remaining * 100) / 100,
    });

    date = new Date(date);
    date.setMonth(date.getMonth() + 1);
  }

  return entries;
}

router.get('/', async (req, res) => {
  try {
    const debts = await prisma.debt.findMany({
      where: { userId: req.userId },
      orderBy: { interestRate: 'desc' },
    });
    res.json(debts);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, provider, type, status, currentBalance, originalBalance, interestRate, minPayment, plannedStartDate, clearDate } = req.body;

    const debt = await prisma.debt.create({
      data: {
        userId: req.userId,
        name,
        provider,
        type,
        status: status || 'ACTIVE',
        currentBalance,
        originalBalance,
        interestRate,
        minPayment,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        clearDate: clearDate ? new Date(clearDate) : null,
      },
    });

    res.json(debt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const debt = await prisma.debt.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!debt) return res.status(404).json({ error: 'Debt not found.' });

    const newRate = req.body.interestRate !== undefined ? req.body.interestRate : debt.interestRate;
    const newMinPayment = req.body.minPayment !== undefined ? req.body.minPayment : debt.minPayment;
    const rateChanged = Number(newRate) !== Number(debt.interestRate);
    const paymentChanged = Number(newMinPayment) !== Number(debt.minPayment);

    const updated = await prisma.debt.update({
      where: { id: Number(req.params.id) },
      data: {
        name: req.body.name ?? debt.name,
        provider: req.body.provider ?? debt.provider,
        type: req.body.type ?? debt.type,
        status: req.body.status ?? debt.status,
        currentBalance: req.body.currentBalance ?? debt.currentBalance,
        originalBalance: req.body.originalBalance ?? debt.originalBalance,
        interestRate: newRate,
        minPayment: newMinPayment,
        plannedStartDate: req.body.plannedStartDate !== undefined
          ? (req.body.plannedStartDate ? new Date(req.body.plannedStartDate) : null)
          : debt.plannedStartDate,
        clearDate: req.body.clearDate !== undefined
          ? (req.body.clearDate ? new Date(req.body.clearDate) : null)
          : debt.clearDate,
      },
    });

    // Regenerate amortization if rate or payment changed
    if (rateChanged || paymentChanged) {
      const startDate = new Date();
      startDate.setDate(1);
      startDate.setMonth(startDate.getMonth() + 1);
      const entries = generateAmortization(updated.currentBalance, newRate, newMinPayment, startDate);
      await prisma.amortizationEntry.deleteMany({ where: { debtId: debt.id, isPaid: false } });
      if (entries.length > 0) {
        await prisma.amortizationEntry.createMany({
          data: entries.map(e => ({ ...e, debtId: debt.id })),
        });
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const debt = await prisma.debt.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!debt) return res.status(404).json({ error: 'Debt not found.' });

    await prisma.debt.delete({ where: { id: debt.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/:id/amortization', async (req, res) => {
  try {
    const debt = await prisma.debt.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!debt) return res.status(404).json({ error: 'Debt not found.' });

    const entries = await prisma.amortizationEntry.findMany({
      where: { debtId: debt.id },
      orderBy: { paymentNumber: 'asc' },
    });

    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/:id/amortization/generate', async (req, res) => {
  try {
    const debt = await prisma.debt.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!debt) return res.status(404).json({ error: 'Debt not found.' });

    const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();

    const entries = generateAmortization(
      debt.currentBalance,
      debt.interestRate,
      debt.minPayment,
      startDate,
    );

    await prisma.amortizationEntry.deleteMany({ where: { debtId: debt.id } });
    await prisma.amortizationEntry.createMany({
      data: entries.map(e => ({ ...e, debtId: debt.id })),
    });

    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/:id/payment', async (req, res) => {
  try {
    const debt = await prisma.debt.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!debt) return res.status(404).json({ error: 'Debt not found.' });

    const { amount, date, notes } = req.body;

    const payment = await prisma.debtPayment.create({
      data: {
        debtId: debt.id,
        userId: req.userId,
        amount,
        date: new Date(date),
        notes,
      },
    });

    const newBalance = Math.max(0, Number(debt.currentBalance) - Number(amount));
    const updatedDebt = await prisma.debt.update({
      where: { id: debt.id },
      data: {
        currentBalance: newBalance,
        status: newBalance <= 0 ? 'PAID_OFF' : debt.status,
      },
    });

    res.json({ payment, debt: updatedDebt });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/:debtId/payment/:paymentId', async (req, res) => {
  try {
    const payment = await prisma.debtPayment.findFirst({
      where: { id: Number(req.params.paymentId), userId: req.userId },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });

    const oldAmount = Number(payment.amount);
    const newAmount = req.body.amount !== undefined ? Number(req.body.amount) : oldAmount;
    const diff = newAmount - oldAmount;

    const updated = await prisma.debtPayment.update({
      where: { id: payment.id },
      data: {
        amount: newAmount,
        date: req.body.date ? new Date(req.body.date) : payment.date,
        notes: req.body.notes ?? payment.notes,
      },
    });

    const debt = await prisma.debt.findUnique({ where: { id: payment.debtId } });
    const newBalance = Math.max(0, Number(debt.currentBalance) - diff);
    await prisma.debt.update({
      where: { id: payment.debtId },
      data: { currentBalance: newBalance, status: newBalance <= 0 ? 'PAID_OFF' : debt.status },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/:id/payments', async (req, res) => {
  try {
    const debt = await prisma.debt.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!debt) return res.status(404).json({ error: 'Debt not found.' });

    const payments = await prisma.debtPayment.findMany({
      where: { debtId: debt.id },
      orderBy: { date: 'desc' },
    });

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── BALANCE ADJUSTMENT (credit cards) ────────────────────────────────────────
router.post('/:id/balance-adjustment', async (req, res) => {
  try {
    const debt = await prisma.debt.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!debt) return res.status(404).json({ error: 'Debt not found.' });
    if (debt.type !== 'CREDIT_CARD') return res.status(400).json({ error: 'Balance adjustments are only supported for credit cards.' });

    const { newBalance, date, notes } = req.body;
    const nb = Number(newBalance);
    const previousBalance = Number(debt.currentBalance);

    const adjustment = await prisma.balanceAdjustment.create({
      data: {
        debtId: debt.id,
        userId: req.userId,
        previousBalance,
        newBalance: nb,
        date: new Date(date),
        notes: notes || null,
      },
    });

    await prisma.debt.update({
      where: { id: debt.id },
      data: { currentBalance: nb },
    });

    // Regenerate unpaid amortization entries from new balance
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() + 1);
    const entries = generateAmortization(nb, debt.interestRate, debt.minPayment, startDate);
    await prisma.amortizationEntry.deleteMany({ where: { debtId: debt.id, isPaid: false } });
    if (entries.length > 0) {
      await prisma.amortizationEntry.createMany({
        data: entries.map(e => ({ ...e, debtId: debt.id })),
      });
    }

    res.json(adjustment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/:id/balance-adjustments', async (req, res) => {
  try {
    const debt = await prisma.debt.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!debt) return res.status(404).json({ error: 'Debt not found.' });

    const adjustments = await prisma.balanceAdjustment.findMany({
      where: { debtId: debt.id },
      orderBy: { date: 'desc' },
    });

    res.json(adjustments);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
