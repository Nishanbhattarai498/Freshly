import express from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, items, claims, ratings, notifications } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { eq, desc, ilike, or, and, sql } from 'drizzle-orm';

const router = express.Router();

const userSyncSchema = z.object({
  data: z.object({
    id: z.string(),
    email_addresses: z.array(z.object({ email_address: z.string() })),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    image_url: z.string(),
  }),
  type: z.string(),
});

// Webhook for Clerk to sync users
router.post('/webhook', async (req, res) => {
  try {
    const payload = userSyncSchema.safeParse(req.body);
    
    if (!payload.success) {
      return res.status(200).json();
    }

    const { type, data } = payload.data;

    if (type === 'user.created' || type === 'user.updated') {
      const email = data.email_addresses[0]?.email_address;
      const displayName = [data.first_name, data.last_name].filter(Boolean).join(' ');

      await db.insert(users).values({
        id: data.id,
        email: email,
        displayName: displayName || 'Anonymous',
        avatarUrl: data.image_url,
      }).onConflictDoUpdate({
        target: users.id,
        set: {
          email: email,
          displayName: displayName || 'Anonymous',
          avatarUrl: data.image_url,
        },
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search users
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json([]);
    }

    const searchResults = await db.select().from(users).where(
      or(
        ilike(users.displayName, `%${q}%`),
        ilike(users.email, `%${q}%`)
      )
    ).limit(10);

    return res.json(searchResults);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sharedCount = await db.select().from(items).where(eq(items.userId, userId));
    const claimedCount = await db.select().from(claims).where(eq(claims.claimerId, userId));

    const recentItem = await db.query.items.findFirst({
      where: eq(items.userId, userId),
      with: {
        location: true
      },
      orderBy: [desc(items.createdAt)]
    });
    
    const recentLocation = recentItem?.location?.address || null;

    return res.json({
      ...user,
      stats: {
        shared: sharedCount.length,
        claimed: claimedCount.length,
      },
      address: recentLocation
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record daily active
router.post('/active', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayKey = today.toISOString().slice(0, 10);

    const existing = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.userId, userId),
        eq(notifications.type, 'SYSTEM'),
        eq(notifications.message, 'DAILY_LOGIN'),
        eq(notifications.relatedId, dayKey)
      ),
    });

    if (!existing) {
      await db.insert(notifications).values({
        userId,
        type: 'SYSTEM',
        message: 'DAILY_LOGIN',
        relatedId: dayKey,
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Active error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get achievements
router.get('/achievements', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const formatDay = (date) => date.toISOString().slice(0, 10);

    const computeCurrentStreak = (days) => {
      let streak = 0;
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      let cursor = new Date(today);
      while (days.has(formatDay(cursor))) {
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
      return streak;
    };

    const computeBestStreak = (dayList) => {
      if (dayList.length === 0) return 0;

      const sorted = [...dayList].sort();
      let best = 1;
      let current = 1;

      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1] + 'T00:00:00Z');
        const curr = new Date(sorted[i] + 'T00:00:00Z');
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          current += 1;
          best = Math.max(best, current);
        } else {
          current = 1;
        }
      }

      return best;
    };

    const [sharedCountResult, claimedCountResult, itemActivity, claimActivity, loginActivity, sharerAggregate, claimerAggregate, topSharersRaw, topClaimersRaw] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(items).where(eq(items.userId, userId)),
      db.select({ count: sql`count(*)` }).from(claims).where(eq(claims.claimerId, userId)),
      db.select({ createdAt: items.createdAt }).from(items).where(eq(items.userId, userId)),
      db.select({ createdAt: claims.createdAt }).from(claims).where(eq(claims.claimerId, userId)),
      db.select({ createdAt: notifications.createdAt, relatedId: notifications.relatedId })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.type, 'SYSTEM'),
          eq(notifications.message, 'DAILY_LOGIN')
        )),
      db.select({ userId: items.userId, count: sql`count(*)` }).from(items).groupBy(items.userId),
      db.select({ userId: claims.claimerId, count: sql`count(*)` }).from(claims).groupBy(claims.claimerId),
      db.select({
        userId: items.userId,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        count: sql`count(*)`,
      })
        .from(items)
        .leftJoin(users, eq(items.userId, users.id))
        .groupBy(items.userId, users.displayName, users.avatarUrl)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
      db.select({
        userId: claims.claimerId,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        count: sql`count(*)`,
      })
        .from(claims)
        .leftJoin(users, eq(claims.claimerId, users.id))
        .groupBy(claims.claimerId, users.displayName, users.avatarUrl)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
    ]);

    const sharedTotal = Number(sharedCountResult?.[0]?.count ?? 0);
    const claimedTotal = Number(claimedCountResult?.[0]?.count ?? 0);

    const activityDays = new Set();
    for (const row of itemActivity) {
      if (row.createdAt) activityDays.add(formatDay(row.createdAt));
    }
    for (const row of claimActivity) {
      if (row.createdAt) activityDays.add(formatDay(row.createdAt));
    }
    for (const row of loginActivity) {
      if (row.relatedId) {
        activityDays.add(String(row.relatedId));
      } else if (row.createdAt) {
        activityDays.add(formatDay(row.createdAt));
      }
    }

    const allDays = Array.from(activityDays);
    const lastActive = allDays.sort().at(-1) ?? null;

    const streakCurrent = computeCurrentStreak(activityDays);
    const streakBest = computeBestStreak(allDays);

    const sortedSharers = [...sharerAggregate].sort((a, b) => Number(b.count) - Number(a.count));
    const sortedClaimers = [...claimerAggregate].sort((a, b) => Number(b.count) - Number(a.count));

    const sharedRankIndex = sortedSharers.findIndex((row) => row.userId === userId);
    const claimedRankIndex = sortedClaimers.findIndex((row) => row.userId === userId);

    const sharedRank = sharedRankIndex === -1 ? null : sharedRankIndex + 1;
    const claimedRank = claimedRankIndex === -1 ? null : claimedRankIndex + 1;

    const topSharers = topSharersRaw.map((row, idx) => ({
      position: idx + 1,
      userId: row.userId,
      displayName: row.displayName || 'Anonymous',
      avatarUrl: row.avatarUrl,
      count: Number(row.count ?? 0),
    }));

    const topClaimers = topClaimersRaw.map((row, idx) => ({
      position: idx + 1,
      userId: row.userId,
      displayName: row.displayName || 'Anonymous',
      avatarUrl: row.avatarUrl,
      count: Number(row.count ?? 0),
    }));

    return res.json({
      stats: {
        shared: sharedTotal,
        claimed: claimedTotal,
        streak: {
          current: streakCurrent,
          best: streakBest,
          lastActive,
        },
      },
      leaderboard: {
        sharers: topSharers,
        claimers: topClaimers,
      },
      rank: {
        shared: sharedRank,
        claimed: claimedRank,
      },
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get public user profile
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sharedCount = await db.select().from(items).where(eq(items.userId, id));
    const claimedCount = await db.select().from(claims).where(eq(claims.claimerId, id));

    const userRatings = await db.select().from(ratings).where(eq(ratings.ratedUserId, id));
    const recentReviews = await db.select({
      id: ratings.id,
      rating: ratings.rating,
      comment: ratings.comment,
      createdAt: ratings.createdAt,
      raterId: ratings.raterId,
      raterName: users.displayName,
      raterAvatar: users.avatarUrl,
    })
      .from(ratings)
      .leftJoin(users, eq(ratings.raterId, users.id))
      .where(eq(ratings.ratedUserId, id))
      .orderBy(desc(ratings.createdAt))
      .limit(20);

    const avgRating = userRatings.length > 0 
      ? userRatings.reduce((acc, curr) => acc + curr.rating, 0) / userRatings.length 
      : 0;

    return res.json({
      ...user,
      stats: {
        shared: sharedCount.length,
        claimed: claimedCount.length,
      },
      rating: {
        average: avgRating,
        count: userRatings.length,
      },
      reviews: recentReviews,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rate a user
router.post('/:id/rate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const raterId = req.auth.userId;
    const { rating, comment } = req.body;

    if (id === raterId) {
      return res.status(400).json({ error: 'Cannot rate yourself' });
    }

    const rater = await db.query.users.findFirst({
      where: eq(users.id, raterId)
    });

    const ratedUser = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    if (!rater || !ratedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (rater.role !== 'CUSTOMER' || ratedUser.role !== 'SHOPKEEPER') {
      return res.status(403).json({ error: 'Only customers can rate shopkeepers' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const existingRating = await db.query.ratings.findFirst({
      where: and(eq(ratings.raterId, raterId), eq(ratings.ratedUserId, id))
    });

    if (existingRating) {
      await db.update(ratings)
        .set({ rating, comment })
        .where(eq(ratings.id, existingRating.id));
    } else {
      await db.insert(ratings).values({
        raterId,
        ratedUserId: id,
        rating,
        comment
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Rate user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const schema = z.object({
      displayName: z.string().min(1),
      avatarUrl: z.string().optional(),
      avatar: z.string().optional(),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const { displayName, avatarUrl, avatar } = result.data;
    const finalAvatarUrl = avatarUrl || avatar;

    const updateData = { displayName };
    if (finalAvatarUrl) {
      updateData.avatarUrl = finalAvatarUrl;
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return res.json({ success: true, displayName, avatarUrl: finalAvatarUrl });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user role
router.put('/me/role', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const schema = z.object({
      role: z.enum(['SHOPKEEPER', 'CUSTOMER']),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { role } = result.data;

    await db.update(users)
      .set({ role })
      .where(eq(users.id, userId));

    return res.json({ success: true, role });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save Expo push token for device notifications
router.put('/me/push-token', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const schema = z.object({
      expoPushToken: z.string().regex(/^ExponentPushToken\[[^\]]+\]$/),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid Expo push token' });
    }

    await db.update(users)
      .set({ expoPushToken: result.data.expoPushToken })
      .where(eq(users.id, userId));

    return res.json({ success: true });
  } catch (error) {
    console.error('Update push token error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
