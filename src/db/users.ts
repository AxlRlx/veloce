// src/db/users.ts
import { db } from './index.ts';
import { profiles } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateProfile(uid: string, email: string, fullName?: string, avatarUrl?: string) {
  try {
    // Upsert profile record based on Firebase Auth user credentials
    const result = await db.insert(profiles)
      .values({
        id: uid,
        email,
        fullName: fullName || null,
        avatarUrl: avatarUrl || null,
        role: 'user',
        subscriptionTier: 'free',
        kycStatus: 'unverified',
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          email,
          fullName: fullName || undefined,
          avatarUrl: avatarUrl || undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database upsert profile failed:", error);
    throw new Error("Unable to synchronize profile with database.", { cause: error });
  }
}
