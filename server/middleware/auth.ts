// server/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../../src/lib/firebase-admin.ts";
import { db } from "../../src/db/index.ts";
import { profiles } from "../../src/db/schema.ts";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  user?: any; // Decoded Firebase ID Token
  userProfile?: any; // DB Profile Row
}

export const verifyFirebaseUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authentication token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    // Fetch and attach user profile from DB
    const profileRes = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, decodedToken.uid))
      .limit(1);

    if (profileRes.length > 0) {
      req.userProfile = profileRes[0];
    } else {
      // If profile does not exist, let routes self-sync or block
      req.userProfile = null;
    }

    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    res.status(401).json({ error: "Invalid authentication credentials" });
  }
};

export const optionalFirebaseUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;

      const profileRes = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, decodedToken.uid))
        .limit(1);

      if (profileRes.length > 0) {
        req.userProfile = profileRes[0];
      }
    } catch (err) {
      // Safe bypass for optional authentication
    }
  }
  next();
};
