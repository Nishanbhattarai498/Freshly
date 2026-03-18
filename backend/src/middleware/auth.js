import { createClerkClient } from '@clerk/clerk-sdk-node';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

if (!process.env.CLERK_SECRET_KEY) {
  console.error("❌ CLERK_SECRET_KEY is missing in environment variables");
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY || 'missing_key' });

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const client = await clerk.verifyToken(token);
    const userId = client.sub;
    
    req.auth = {
      userId: userId,
      sessionId: client.sid,
    };

    // Sync User to DB if not exists
    try {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!existingUser) {
        console.log(`User ${userId} not found in DB. Syncing from Clerk...`);
        const clerkUser = await clerk.users.getUser(userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'Anonymous';
        
        await db.insert(users).values({
          id: userId,
          email: email,
          displayName: displayName,
          avatarUrl: clerkUser.imageUrl,
        }).onConflictDoUpdate({
          target: users.id,
          set: {
            email: email,
            displayName: displayName,
            avatarUrl: clerkUser.imageUrl,
          },
        });
        console.log(`User ${userId} synced successfully.`);
      }
    } catch (syncError) {
      console.error('User sync warning:', syncError);
      // Continue anyway, maybe the user was created in parallel
    }

    next();
  } catch (error) {
    console.error('Auth Error:', error);
    if (error.errors) {
      console.error('Clerk Errors:', JSON.stringify(error.errors, null, 2));
    }
    return res.status(401).json({ error: 'Invalid Token', details: error.message });
  }
};
