import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { sendReminderEmail } from '../services/email.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.userId } });
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true },
    });
    res.json({ ...settings, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/', async (req, res) => {
  try {
    const { reminderEnabled, reminderFrequency, reminderEmail, reminderDay, goalDate, name } = req.body;

    const settings = await prisma.settings.update({
      where: { userId: req.userId },
      data: {
        reminderEnabled: reminderEnabled ?? undefined,
        reminderFrequency: reminderFrequency ?? undefined,
        reminderEmail: reminderEmail ?? undefined,
        reminderDay: reminderDay ?? undefined,
        goalDate: goalDate ? new Date(goalDate) : undefined,
      },
    });

    if (name) {
      await prisma.user.update({ where: { id: req.userId }, data: { name } });
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/test-email', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.userId } });
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, email: true } });
    const to = settings?.reminderEmail || user.email;
    await sendReminderEmail({ to, name: user.name, totalDebt: 0, surplus: 0, goalDate: settings?.goalDate });
    res.json({ ok: true, to });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
