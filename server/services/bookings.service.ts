// server/services/bookings.service.ts
import { db } from "../../src/db/index.ts";
import { bookings, vehicles, profiles } from "../../src/db/schema.ts";
import { eq, and, ne, or } from "drizzle-orm";
import { ApiError } from "../utils/errors.ts";
import { generateId } from "../utils/ids.ts";

export class BookingsService {
  static async listForUser(uid: string, userProfile: any) {
    if (userProfile?.role === "admin") {
      return db.select().from(bookings);
    }
    
    // Normal query lists bookings where the user is either the renter OR the vehicle host (owner)
    const list = await db.select().from(bookings);
    return list.filter(b => b.renterId === uid || b.ownerId === uid);
  }

  static async create(uid: string, body: any) {
    const { vehicleId, startDate, endDate, totalPrice } = body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      throw new ApiError(400, "Lease end date must fall after the check-in date.");
    }

    // Fetch vehicle
    const carRes = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
    if (carRes.length === 0) {
      throw new ApiError(404, "Target rental vehicle listing not found.");
    }
    const car = carRes[0];

    if (car.ownerId === uid) {
      throw new ApiError(400, "Renters cannot lease their own personal listed fleet.");
    }

    if (car.status !== "active") {
      throw new ApiError(400, "This vehicle is currently locked or inactive.");
    }

    // Overlap checks: make sure no overlapping active/pending/confirmed bookings exists
    const existingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.vehicleId, vehicleId),
          ne(bookings.status, "cancelled"),
          ne(bookings.status, "rejected")
        )
      );

    for (const b of existingBookings) {
      // Overlap formula: (StartA <= EndB) and (EndA >= StartB)
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      if (start <= bEnd && end >= bStart) {
        throw new ApiError(400, `Scheduling collision: This vehicle is already leased from ${b.startDate} to ${b.endDate}.`);
      }
    }

    // Financial calculations:
    // Platform fee: 10%
    // Host Payout: 90%
    const platformFee = Math.round(totalPrice * 0.10);
    const hostPayout = totalPrice - platformFee;

    const bookingId = generateId("bkg");

    const created = await db.insert(bookings).values({
      id: bookingId,
      vehicleId,
      renterId: uid,
      ownerId: car.ownerId,
      startDate,
      endDate,
      totalPrice,
      status: "pending",
      paymentStatus: "unpaid",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return {
      booking: created[0],
      financials: {
        totalPrice,
        platformFee,
        hostPayout,
        currency: "USD"
      }
    };
  }

  static async cancel(id: string, uid: string, userProfile: any) {
    const bRes = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (bRes.length === 0) {
      throw new ApiError(404, "Target booking representation not found.");
    }
    const booking = bRes[0];

    const isRenter = booking.renterId === uid;
    const isOwner = booking.ownerId === uid;
    const isAdmin = userProfile?.role === "admin";

    if (!isRenter && !isOwner && !isAdmin) {
      throw new ApiError(403, "Refused credentials: You cannot cancel this booking.");
    }

    // Cancellation policy: Confirmed paid leases can only cancel if more than 24 hours prior to checkout
    const start = new Date(booking.startDate);
    const now = new Date();
    const hrsDifference = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (booking.status === "confirmed" && booking.paymentStatus === "paid" && hrsDifference < 24 && !isAdmin) {
      throw new ApiError(400, "Late cancellation fee applies: Bookings cannot be cancelled within 24 hours of duration start.");
    }

    const updated = await db
      .update(bookings)
      .set({
        status: "cancelled",
        paymentStatus: booking.paymentStatus === "paid" ? "refunded" : booking.paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    return updated[0];
  }

  static async extend(id: string, uid: string, days: number) {
    if (days <= 0) {
      throw new ApiError(400, "Lease expansion must exceed zero days.");
    }

    const bRes = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (bRes.length === 0) {
      throw new ApiError(404, "Target booking is not found.");
    }
    const booking = bRes[0];

    const isRenter = booking.renterId === uid;
    if (!isRenter) {
      throw new ApiError(403, "Only the designated lessee can extend this active lease.");
    }

    // Calulate new date
    const origEnd = new Date(booking.endDate);
    const newEnd = new Date(origEnd.getTime() + days * 24 * 60 * 60 * 1000);
    const newEndDateStr = newEnd.toISOString().split("T")[0];

    // Check collision for extended range
    const existingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.vehicleId, booking.vehicleId),
          ne(bookings.id, id),
          ne(bookings.status, "cancelled"),
          ne(bookings.status, "rejected")
        )
      );

    const checkStart = new Date(origEnd.getTime() + 24 * 60 * 60 * 1000); // extension starts next day
    for (const b of existingBookings) {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      if (checkStart <= bEnd && newEnd >= bStart) {
        throw new ApiError(400, `Cannot extend lease: Vehicle has scheduling collision with another lease from ${b.startDate} to ${b.endDate}.`);
      }
    }

    // Price delta
    const carRes = await db.select().from(vehicles).where(eq(vehicles.id, booking.vehicleId)).limit(1);
    const dailyPrice = carRes.length > 0 ? carRes[0].rentalPriceDaily : 100;
    const additionalFee = dailyPrice * days;

    const updated = await db
      .update(bookings)
      .set({
        endDate: newEndDateStr,
        totalPrice: booking.totalPrice + additionalFee,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    return updated[0];
  }
}
