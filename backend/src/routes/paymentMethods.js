import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET — list all payment methods; lazily create PaymentMethod records for CC debts
router.get('/', async (req, res) => {
  try {
    // Ensure every active CC debt has a linked PaymentMethod
    const ccDebts = await prisma.debt.findMany({
      where: { userId: req.userId, type: 'CREDIT_CARD', status: { not: 'PAID_OFF' } },
      include: { paymentMethod: true },
    });

    for (const debt of ccDebts) {
      if (!debt.paymentMethod) {
        await prisma.paymentMethod.create({
          data: {
            userId: req.userId,
            name: debt.name,
            type: 'CREDIT_CARD',
            debtId: debt.id,
          },
        });
      }
    }

    const methods = await prisma.paymentMethod.findMany({
      where: { userId: req.userId },
      include: { debt: { select: { id: true, name: true, currentBalance: true } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    res.json(methods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST — create a manual method (Cash, Bank, E-Wallet); not for CC (auto-created)
router.post('/', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Name and type are required.' });
    if (type === 'CREDIT_CARD') return res.status(400).json({ error: 'Credit card methods are auto-created from your debts.' });

    const method = await prisma.paymentMethod.create({
      data: { userId: req.userId, name, type },
    });
    res.json(method);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE — only allowed for non-CC methods
router.delete('/:id', async (req, res) => {
  try {
    const method = await prisma.paymentMethod.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!method) return res.status(404).json({ error: 'Payment method not found.' });
    if (method.debtId) return res.status(400).json({ error: 'This method is linked to a debt. Delete the debt to remove it.' });

    await prisma.paymentMethod.delete({ where: { id: method.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
