import express from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { conversations, messages, users, items, notifications } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { eq, or, and, desc } from 'drizzle-orm';

const router = express.Router();

// Start a conversation (or get existing)
router.post('/start', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const schema = z.object({
      itemId: z.number().optional(),
      receiverId: z.string(),
    });

    const { itemId, receiverId } = schema.parse(req.body);

    if (userId === receiverId) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    const existing = await db.query.conversations.findFirst({
      where: or(
        and(eq(conversations.participant1Id, userId), eq(conversations.participant2Id, receiverId)),
        and(eq(conversations.participant1Id, receiverId), eq(conversations.participant2Id, userId))
      ),
    });

    if (existing) {
      return res.json(existing);
    }

    const newConvs = await db.insert(conversations).values({
      participant1Id: userId,
      participant2Id: receiverId,
      itemId: itemId,
      status: 'PENDING',
    }).returning();

    const newConv = newConvs[0];

    try {
      if (global.io) {
        const payload = { conversation: newConv };
        global.io.to(`user_${receiverId}`).emit('conversation_started', payload);
        global.io.to(`user_${userId}`).emit('conversation_started', payload);
      }
    } catch (e) {
      console.error('Error emitting conversation_started', e);
    }

    return res.json(newConv);
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const convs = await db.query.conversations.findMany({
      where: or(
        eq(conversations.participant1Id, userId),
        eq(conversations.participant2Id, userId)
      ),
      with: {
        participant1: true,
        participant2: true,
        item: true,
        messages: {
          orderBy: [desc(messages.createdAt)],
          limit: 1,
        },
      },
      orderBy: [desc(conversations.updatedAt)],
    });

    return res.json(convs);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a conversation
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, parseInt(id)),
      with: {
        participant1: true,
        participant2: true,
        item: true,
      }
    });

    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const msgs = await db.query.messages.findMany({
      where: eq(messages.conversationId, parseInt(id)),
      orderBy: [desc(messages.createdAt)],
    });

    return res.json({ conversation: conv, messages: msgs });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send a message
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;
    const bodySchema = z.object({
      content: z.string().optional(),
      type: z.enum(['TEXT', 'AUDIO', 'IMAGE']).default('TEXT'),
      mediaBase64: z.string().optional(),
      mediaUrl: z.string().url().optional(),
    });

    const parsedBody = bodySchema.parse(req.body);
    const type = parsedBody.type || 'TEXT';
    let content = parsedBody.content?.trim() || '';
    let mediaUrlToStore = parsedBody.mediaUrl;

    if (type === 'TEXT') {
      if (!content) {
        return res.status(400).json({ error: 'Message content is required' });
      }
    } else if (type === 'AUDIO') {
      const base64 = parsedBody.mediaBase64;
      if (!base64 && !parsedBody.mediaUrl) {
        return res.status(400).json({ error: 'Audio payload missing' });
      }

      if (base64) {
        if (base64.length > 1_200_000) {
          return res.status(400).json({ error: 'Audio too large; limit ~1MB' });
        }
        mediaUrlToStore = base64.startsWith('data:') ? base64 : `data:audio/aac;base64,${base64}`;
      }

      if (!content) content = 'Voice message';
    } else {
      return res.status(400).json({ error: 'Unsupported message type' });
    }

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, parseInt(id)),
    });

    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (conv.status === 'PENDING') {
        if (conv.participant2Id === userId) {
            await db.update(conversations).set({ status: 'ACCEPTED' }).where(eq(conversations.id, conv.id));
        }
    }

    const msgResults = await db.insert(messages).values({
      conversationId: conv.id,
      senderId: userId,
      content,
      type,
      mediaUrl: mediaUrlToStore,
    }).returning();

    const msg = msgResults[0];

    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conv.id));

    const receiverId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
    const sender = await db.query.users.findFirst({ where: eq(users.id, userId) });

    await db.insert(notifications).values({
      userId: receiverId,
      type: 'MESSAGE',
      message: `New message from ${sender?.displayName || 'Someone'}`,
      relatedId: conv.id.toString(),
    });

    try {
      if (global.io) {
        const payloadForUser = {
          conversation: {
            id: conv.id,
            lastMessage: msg,
            participants: [conv.participant1Id, conv.participant2Id],
          },
          message: msg,
          sender,
        };

        global.io.to(`user_${receiverId}`).emit('new_message', payloadForUser);
        global.io.to(`conversation_${conv.id}`).emit('new_message', payloadForUser);
        global.io.to(`user_${userId}`).emit('new_message', payloadForUser);
      }
    } catch (emitErr) {
      console.error('Error emitting new_message event', emitErr);
    }

    return res.json(msg);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Accept conversation
router.put('/:id/accept', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, parseInt(id)),
    });

    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.participant2Id !== userId) return res.status(403).json({ error: 'Only receiver can accept' });

    await db.update(conversations).set({ status: 'ACCEPTED' }).where(eq(conversations.id, conv.id));

    return res.json({ success: true });
  } catch (error) {
    console.error('Accept conversation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete conversation
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, parseInt(id)),
    });

    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.delete(messages).where(eq(messages.conversationId, conv.id));
    await db.delete(conversations).where(eq(conversations.id, conv.id));

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
