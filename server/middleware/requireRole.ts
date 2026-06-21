// server/middleware/requireRole.ts
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.ts";
import { db } from "../../src/db/index.ts";
import { vehicles, bookings, conversations } from "../../src/db/schema.ts";
import { eq, or } from "drizzle-orm";

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!req.userProfile || req.userProfile.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }
  next();
};

export const requireDealerOrAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const role = req.userProfile?.role;
  if (role !== "dealer" && role !== "admin") {
    return res.status(403).json({ error: "Access denied. Approved dealer or admin privileges required." });
  }
  next();
};

export const requireVehicleOwner = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const vehicleId = req.params.id || req.body.vehicleId || req.body.carId;
  if (!vehicleId) {
    return res.status(400).json({ error: "Vehicle identity could not be resolved." });
  }

  try {
    const carRes = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (carRes.length === 0) {
      return res.status(404).json({ error: "Vehicle listing not found." });
    }

    const car = carRes[0];
    const isOwner = car.ownerId === req.user.uid;
    const isAdmin = req.userProfile?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Access denied: You do not own this vehicle listing." });
    }

    (req as any).vehicle = car; // Attach vehicle to avoid re-querying in the router
    next();
  } catch (err) {
    console.error("requireVehicleOwner middleware error:", err);
    res.status(500).json({ error: "Internal validation exception." });
  }
};

export const requireBookingParticipant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const bookingId = req.params.id || req.body.bookingId;
  if (!bookingId) {
    return res.status(400).json({ error: "Booking ID is required." });
  }

  try {
    const bookingRes = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (bookingRes.length === 0) {
      return res.status(404).json({ error: "Booking not found." });
    }

    const booking = bookingRes[0];
    const userRole = req.userProfile?.role;
    const isRenter = booking.renterId === req.user.uid;
    
    // We also need to check if the user matches the vehicle owner (host)
    const carRes = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, booking.vehicleId))
      .limit(1);

    const isHost = carRes.length > 0 && carRes[0].ownerId === req.user.uid;
    const isAdmin = userRole === "admin";

    if (!isRenter && !isHost && !isAdmin) {
      return res.status(403).json({ error: "Access denied. You do not have permission to view or modify this booking." });
    }

    (req as any).booking = booking;
    next();
  } catch (err) {
    console.error("requireBookingParticipant middleware error:", err);
    res.status(500).json({ error: "Internal booking validation exception." });
  }
};

export const requireConversationParticipant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const chatId = req.params.id || req.body.chatId;
  if (!chatId) {
    return res.status(400).json({ error: "Chat dialogue context is required." });
  }

  try {
    const discussionRes = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, chatId))
      .limit(1);

    if (discussionRes.length === 0) {
      return res.status(404).json({ error: "Chat thread session not found." });
    }

    const discussion = discussionRes[0];
    const isParticipant =
      discussion.userOne === req.user.uid || discussion.userTwo === req.user.uid;
    const isAdmin = req.userProfile?.role === "admin";

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ error: "Access denied. You are not a participant in this conversation." });
    }

    (req as any).conversation = discussion;
    next();
  } catch (err) {
    console.error("requireConversationParticipant middleware error:", err);
    res.status(500).json({ error: "Internal conversation validation exception." });
  }
};
