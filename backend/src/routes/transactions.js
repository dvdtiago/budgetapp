import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Helper: adjust a CC debt's balance when a transaction is created/edited/deleted
async function adjustCCBalance(paymentMethodId, delta) {
  if (!paymentMethodId) return;
  const pm = await prisma.paymentMethod.findUnique({
    where: { id: paymentMethodId },
    select: { debtId: true },
  });
  if (!pm?.debtId) return;
  const debt = await prisma.debt.findUnique({ where: { id: pm.debtId } });
  if (!debt) return;
  await prisma.debt.update({
    where: { id: debt.id },
    data: { currentBalance: Math.max(0, Number(debt.currentBalance) + delta) },
  });
}

router.get('/', async (req, res) => {
  try {
    const { month, categoryId } = req.query;
    const where = { userId: req.userId };

    if (month) {
      const [year, m] = month.split('-').map(Number);
      where.date = {
        gte: new Date(Date.UTC(year, m - 1, 1)),
        lt: new Date(Date.UTC(year, m, 1)),
      };
    }

    if (categoryId) where.categoryId = Number(categoryId);

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true, paymentMethod: true },
      orderBy: { date: 'desc' },
    });

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { categoryId, amount, description, date, paymentMethodId } = req.body;
    const pmId = paymentMethodId ? Number(paymentMethodId) : null;

    const transaction = await prisma.transaction.create({
      data: {
        userId: req.userId,
        categoryId: categoryId ? Number(categoryId) : null,
        amount: Number(amount),
        description,
        date: new Date(date),
        paymentMethodId: pmId,
      },
      include: { category: true, paymentMethod: true },
    });

    // Auto-increase CC balance
    await adjustCCBalance(pmId, Number(amount));

    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const tx = await prisma.transaction.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!tx) return res.status(404).json({ error: 'Transaction not found.' });

    const oldAmount = Number(tx.amount);
    const newAmount = req.body.amount !== undefined ? Number(req.body.amount) : oldAmount;
    const oldPmId = tx.paymentMethodId;
    const newPmId = req.body.paymentMethodId !== undefined
      ? (req.body.paymentMethodId ? Number(req.body.paymentMethodId) : null)
      : oldPmId;

    const updated = await prisma.transaction.update({
      where: { id: Number(req.params.id) },
      data: {
        categoryId: req.body.categoryId !== undefined ? (req.body.categoryId ? Number(req.body.categoryId) : null) : tx.categoryId,
        amount: newAmount,
        description: req.body.description ?? tx.description,
        date: req.body.date ? new Date(req.body.date) : tx.date,
        paymentMethodId: newPmId,
      },
      include: { category: true, paymentMethod: true },
    });

    // Reverse old CC charge, apply new
    await adjustCCBalance(oldPmId, -oldAmount);
    await adjustCCBalance(newPmId, newAmount);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tx = await prisma.transaction.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!tx) return res.status(404).json({ error: 'Transaction not found.' });

    await prisma.transaction.delete({ where: { id: Number(req.params.id) } });

    // Reverse CC balance
    await adjustCCBalance(tx.paymentMethodId, -Number(tx.amount));

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
