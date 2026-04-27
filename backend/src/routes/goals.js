import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ── LIST ALL GOALS ────────────────────────────────────────────────────────────
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

// ── ALL CONTRIBUTIONS FOR MONTH (must be before /:id routes) ─────────────────
router.get('/contributions', async (req, res) => {
  try {
    const { month } = req.query;
    const where = { userId: req.userId };
    if (month) {
      const [y, m] = month.split('-').map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }
    const contributions = await prisma.goalContribution.findMany({
      where,
      include: { goal: { select: { id: true, name: true, type: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(contributions);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── CREATE GOAL ───────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, type, targetAmount, currentAmount, deadline, notes } = req.body;
    const goal = await prisma.goal.create({
      data: {
        userId: req.userId,
        name,
        type,
        targetAmount: targetAmount != null && targetAmount !== '' ? Number(targetAmount) : null,
        currentAmount: Number(currentAmount) || 0,
        deadline: deadline ? new Date(deadline) : null,
        notes,
      },
    });
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── UPDATE GOAL ───────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });

    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data: {
        name: req.body.name ?? goal.name,
        type: req.body.type ?? goal.type,
        targetAmount: req.body.targetAmount !== undefined
          ? (req.body.targetAmount != null && req.body.targetAmount !== '' ? Number(req.body.targetAmount) : null)
          : goal.targetAmount,
        currentAmount: req.body.currentAmount !== undefined ? Number(req.body.currentAmount) : goal.currentAmount,
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

// ── DELETE GOAL ───────────────────────────────────────────────────────────────
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

// ── LOG A CONTRIBUTION ────────────────────────────────────────────────────────
router.post('/:id/contribution', async (req, res) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });

    const amount = Number(req.body.amount);
    const contribution = await prisma.goalContribution.create({
      data: {
        goalId: goal.id,
        userId: req.userId,
        amount,
        date: new Date(req.body.date),
        notes: req.body.notes || null,
      },
    });

    // Update running currentAmount (cap at targetAmount if set)
    const newAmount = goal.targetAmount !== null
      ? Math.min(Number(goal.targetAmount), Number(goal.currentAmount) + amount)
      : Number(goal.currentAmount) + amount;

    await prisma.goal.update({
      where: { id: goal.id },
      data: { currentAmount: newAmount },
    });

    res.json(contribution);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── LIST CONTRIBUTIONS FOR ONE GOAL ──────────────────────────────────────────
router.get('/:id/contributions', async (req, res) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });
    const contributions = await prisma.goalContribution.findMany({
      where: { goalId: goal.id },
      orderBy: { date: 'desc' },
    });
    res.json(contributions);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
