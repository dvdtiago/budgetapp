import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { sendReminderEmail } from '../services/email.js';

export function startReminderJob() {
  // Runs every day at 8am — filters by user settings internally
  cron.schedule('0 8 * * *', async () => {
    try {
      const allSettings = await prisma.settings.findMany({
        where: { reminderEnabled: true, reminderEmail: { not: null } },
        include: { user: true },
      });

      const today = new Date();
      const dayOfWeek = today.getDay();

      for (const settings of allSettings) {
        const shouldSend = settings.reminderFrequency === 'WEEKLY'
          ? dayOfWeek === settings.reminderDay
          : dayOfWeek === settings.reminderDay && isEvenWeek(today);

        if (!shouldSend) continue;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const [incomeEntries, transactions, debts] = await Promise.all([
          prisma.incomeEntry.findMany({
            where: { userId: settings.userId, date: { gte: monthStart, lt: monthEnd } },
          }),
          prisma.transaction.findMany({
            where: { userId: settings.userId, date: { gte: monthStart, lt: monthEnd } },
          }),
          prisma.debt.findMany({
            where: { userId: settings.userId, status: 'ACTIVE' },
          }),
        ]);

        const totalIncome = incomeEntries.reduce((s, e) => s + Number(e.amountPhp), 0);
        const totalSpent = transactions.reduce((s, t) => s + Number(t.amount), 0);
        const surplus = totalIncome - totalSpent;
        const totalDebt = debts.reduce((s, d) => s + Number(d.currentBalance), 0);

        await sendReminderEmail({
          to: settings.reminderEmail,
          name: settings.user.name,
          totalDebt,
          surplus,
          goalDate: settings.goalDate,
        });

        console.log(`Reminder sent to ${settings.reminderEmail}`);
      }
    } catch (err) {
      console.error('Reminder job error:', err);
    }
  });

  console.log('Reminder job scheduled.');
}

function isEvenWeek(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((date - start) / 86400000 + start.getDay() + 1) / 7);
  return weekNum % 2 === 0;
}
