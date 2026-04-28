import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            transactions: true,
            debts: true,
            income: true,
            goals: true,
            debtPayments: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/users/:id/admin', async (req, res) => {
  try {
    const { isAdmin } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { isAdmin: Boolean(isAdmin) },
      select: { id: true, isAdmin: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
