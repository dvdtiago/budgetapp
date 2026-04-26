import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.budgetCategory.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, monthlyAllocation, icon, color } = req.body;
    const category = await prisma.budgetCategory.create({
      data: { userId: req.userId, name, monthlyAllocation, icon, color },
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const cat = await prisma.budgetCategory.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!cat) return res.status(404).json({ error: 'Category not found.' });

    const updated = await prisma.budgetCategory.update({
      where: { id: Number(req.params.id) },
      data: {
        name: req.body.name ?? cat.name,
        monthlyAllocation: req.body.monthlyAllocation ?? cat.monthlyAllocation,
        icon: req.body.icon ?? cat.icon,
        color: req.body.color ?? cat.color,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const cat = await prisma.budgetCategory.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!cat) return res.status(404).json({ error: 'Category not found.' });

    await prisma.budgetCategory.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
