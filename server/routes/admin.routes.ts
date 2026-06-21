// server/routes/admin.routes.ts
import { Router } from "express";
import { db } from "../../src/db/index.ts";
import { profiles, vehicles, bookings, adminActionLogs, adminReports } from "../../src/db/schema.ts";
import { eq, desc } from "drizzle-orm";
import { verifyFirebaseUser } from "../middleware/auth.ts";
import { requireAdmin } from "../middleware/requireRole.ts";
import { TrustService } from "../services/trust.service.ts";
import { VehiclesService } from "../services/vehicles.service.ts";
import { ApiError, asyncHandler } from "../utils/errors.ts";

const router = Router();

// Apply admin role verification to ALL routes within this router
router.use(verifyFirebaseUser);
router.use(requireAdmin);

router.get(
  "/users",
  asyncHandler(async (req: any, res: any) => {
    const list = await db.select().from(profiles).orderBy(desc(profiles.createdAt));
    res.json(list);
  })
);

router.get(
  "/bookings",
  asyncHandler(async (req: any, res: any) => {
    const list = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    res.json(list);
  })
);

router.get(
  "/vehicles",
  asyncHandler(async (req: any, res: any) => {
    const list = await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
    res.json(list);
  })
);

router.delete(
  "/vehicles/:id",
  asyncHandler(async (req: any, res: any) => {
    const id = req.params.id;
    const deleted = await VehiclesService.delete(id);
    await TrustService.logAdminAction(req.user.uid, "delete_listing", "vehicle", id, { reason: "Admin forced closure" });
    res.json({ success: true, message: "Vehicle metadata scrubbed", deleted });
  })
);

router.put(
  "/vehicles/:id/status",
  asyncHandler(async (req: any, res: any) => {
    const id = req.params.id;
    const { status, notes } = req.body;

    if (!status) {
      throw new ApiError(400, "Target approval status must be selected.");
    }

    const currentRes = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    if (currentRes.length === 0) {
      throw new ApiError(404, "Vehicle not found");
    }

    const updated = await db
      .update(vehicles)
      .set({
        status,
        reviewNotes: notes || null,
        updatedAt: new Date()
      })
      .where(eq(vehicles.id, id))
      .returning();

    await TrustService.logAdminAction(req.user.uid, "change_status", "vehicle", id, { status, notes });
    res.json(updated[0]);
  })
);

router.get(
  "/metrics",
  asyncHandler(async (req: any, res: any) => {
    const usersList = await db.select().from(profiles);
    const carsList = await db.select().from(vehicles);
    const bkgsList = await db.select().from(bookings);

    const totalUsers = usersList.length;
    const totalVehicles = carsList.length;
    const totalBookings = bkgsList.length;

    // Calculate revenue metrics safely
    let totalRevenue = 0;
    const successfulRentalsCount = bkgsList.filter(b => b.paymentStatus === "paid").length;
    
    // Add up income of all paid leases
    bkgsList.forEach(b => {
      if (b.paymentStatus === "paid") {
        totalRevenue += b.totalPrice;
      }
    });

    // Subscriptions count
    const premiumSubscribersCount = usersList.filter(u => u.subscriptionTier !== "free").length;

    res.json({
      usersCount: totalUsers,
      vehiclesCount: totalVehicles,
      bookingsCount: totalBookings,
      totalRevenue,
      successfulRentalsCount,
      premiumSubscribersCount,
      activeAlertsCount: 0 // Mock telemetry placeholder
    });
  })
);

export default router;
