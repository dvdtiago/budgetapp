import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { month, categoryId } = req.query;
    const where = { userId: req.userId };

    if (month) {
      const [year, m] = month.split('-').map(Number);
      where.date = {
        gte: new Date(year, m - 1, 1),
        lt: new Date(year, m, 1),
      };
    }

    if (categoryId) where.categoryId = Number(categoryId);

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { categoryId, amount, description, date } = req.body;
    const transaction = await prisma.transaction.create({
      data: {
        userId: req.userId,
        categoryId: categoryId ? Number(categoryId) : null,
        amount: Number(amount),
        description,
        date: new Date(date),
      },
      include: { category: true },
    });
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

    const updated = await prisma.transaction.update({
      where: { id: Number(req.params.id) },
      data: {
        categoryId: req.body.categoryId !== undefined ? (req.body.categoryId ? Number(req.body.categoryId) : null) : tx.categoryId,
        amount: req.body.amount !== undefined ? Number(req.body.amount) : tx.amount,
        description: req.body.description ?? tx.description,
        date: req.body.date ? new Date(req.body.date) : tx.date,
      },
      include: { category: true },
    });
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
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
