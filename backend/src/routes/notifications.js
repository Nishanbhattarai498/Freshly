import express from 'express';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { eq, desc, and } from 'drizzle-orm';

const router = express.Router();

// Get notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const userNotifications = await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    return res.json(userNotifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, parseInt(id)), eq(notifications.userId, userId)));

    return res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));

    return res.json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
