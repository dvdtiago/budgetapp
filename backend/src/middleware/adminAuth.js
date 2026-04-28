import { prisma } from '../lib/prisma.js';

export async function requireAdmin(req, res, next) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  next();
}
