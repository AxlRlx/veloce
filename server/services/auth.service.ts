// server/services/auth.service.ts
import { db } from "../../src/db/index.ts";
import { profiles } from "../../src/db/schema.ts";
import { eq } from "drizzle-orm";
import { ApiError } from "../utils/errors.ts";

export class AuthService {
  static async syncProfile(uid: string, email: string, name?: string, role?: string, avatar?: string) {
    if (!email) {
      throw new ApiError(400, "User email is required");
    }

    const selectedRole = role === "dealer" ? "dealer" : "user";
    const selectedTier = role === "dealer" ? "dealer_paid" : "free";

    const existing = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, uid))
      .limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(profiles)
        .set({
          email,
          fullName: name || existing[0].fullName,
          avatarUrl: avatar || existing[0].avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, uid))
        .returning();
      return updated[0];
    } else {
      const created = await db
        .insert(profiles)
        .values({
          id: uid,
          email,
          fullName: name || "Anonymous driver",
          avatarUrl: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150",
          role: selectedRole,
          subscriptionTier: selectedTier,
          kycStatus: "unverified",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return created[0];
    }
  }

  static async getProfile(uid: string) {
    const res = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, uid))
      .limit(1);
    
    if (res.length === 0) {
      throw new ApiError(404, "User profile not found in registration records");
    }
    return res[0];
  }

  static async updateProfile(uid: string, body: any) {
    // Only accept whitelisted safe profile keys! No role, tier, etc.
    const updated = await db
      .update(profiles)
      .set({
        fullName: body.fullName,
        avatarUrl: body.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, uid))
      .returning();

    if (updated.length === 0) {
      throw new ApiError(404, "Target profile not found");
    }
    return updated[0];
  }

  static async updateProfileRole(uid: string, role: string, isSandboxRequest: boolean) {
    if (!isSandboxRequest) {
      throw new ApiError(403, "Direct user role updates are prohibited. Use official subscription paths or admin overrides.");
    }

    const previousRoleRes = await db.select().from(profiles).where(eq(profiles.id, uid)).limit(1);
    if (previousRoleRes.length === 0) {
      throw new ApiError(404, "Profile not found");
    }

    const previousRole = previousRoleRes[0].role;
    const targetTier = role === "admin" ? "dealer_pro" : (role === "dealer" ? "dealer_paid" : "free");

    const updated = await db
      .update(profiles)
      .set({
        role,
        subscriptionTier: targetTier,
        updatedAt: new Date()
      })
      .where(eq(profiles.id, uid))
      .returning();

    return {
      profile: updated[0],
      previousRole,
      requestedRole: role
    };
  }
}
