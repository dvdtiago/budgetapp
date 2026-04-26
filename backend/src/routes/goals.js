import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, targetAmount, currentAmount, deadline, notes } = req.body;
    const goal = await prisma.goal.create({
      data: {
        userId: req.userId,
        name,
        type,
        targetAmount,
        currentAmount: currentAmount ?? 0,
        deadline: deadline ? new Date(deadline) : null,
        notes,
      },
    });
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });

    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data: {
        name: req.body.name ?? goal.name,
        type: req.body.type ?? goal.type,
        targetAmount: req.body.targetAmount ?? goal.targetAmount,
        currentAmount: req.body.currentAmount ?? goal.currentAmount,
        deadline: req.body.deadline !== undefined
          ? (req.body.deadline ? new Date(req.body.deadline) : null)
          : goal.deadline,
        notes: req.body.notes ?? goal.notes,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });

    await prisma.goal.delete({ where: { id: goal.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
