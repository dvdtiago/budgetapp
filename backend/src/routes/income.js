import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    const where = { userId: req.userId };

    if (month) {
      const [year, m] = month.split('-').map(Number);
      where.date = {
        gte: new Date(Date.UTC(year, m - 1, 1)),
        lt: new Date(Date.UTC(year, m, 1)),
      };
    }

    const entries = await prisma.incomeEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { originalAmount, originalCurrency, exchangeRate, type, description, date } = req.body;

    const amountPhp = originalCurrency === 'PHP'
      ? Number(originalAmount)
      : Number(originalAmount) * Number(exchangeRate);

    const entry = await prisma.incomeEntry.create({
      data: {
        userId: req.userId,
        amountPhp,
        originalAmount,
        originalCurrency,
        exchangeRate: originalCurrency === 'PHP' ? 1 : exchangeRate,
        type,
        description,
        date: new Date(date),
      },
    });

    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const entry = await prisma.incomeEntry.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });

    const { originalAmount, originalCurrency, exchangeRate, type, description, date } = req.body;

    const amountPhp = originalCurrency === 'PHP'
      ? Number(originalAmount)
      : Number(originalAmount) * Number(exchangeRate);

    const updated = await prisma.incomeEntry.update({
      where: { id: entry.id },
      data: {
        amountPhp,
        originalAmount: Number(originalAmount),
        originalCurrency,
        exchangeRate: originalCurrency === 'PHP' ? 1 : Number(exchangeRate),
        type,
        description,
        date: new Date(date),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const entry = await prisma.incomeEntry.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });

    await prisma.incomeEntry.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
