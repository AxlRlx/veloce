// server/services/trust.service.ts
import { db } from "../../src/db/index.ts";
import { adminReports, adminActionLogs, profiles, vehicles } from "../../src/db/schema.ts";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/errors.ts";
import { generateId } from "../utils/ids.ts";

export class TrustService {
  static async createReport(reporterId: string, body: any) {
    const reportId = generateId("rpt");

    const created = await db.insert(adminReports).values({
      id: reportId,
      reporterId,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      status: "pending",
      createdAt: new Date(),
    }).returning();

    return created[0];
  }

  static async listReports() {
    return db.select().from(adminReports);
  }

  static async resolveReport(adminId: string, reportId: string, actionReason: string) {
    const existing = await db.select().from(adminReports).where(eq(adminReports.id, reportId)).limit(1);
    if (existing.length === 0) {
      throw new ApiError(404, "Target report registration not found.");
    }

    const report = existing[0];

    const updated = await db
      .update(adminReports)
      .set({ status: "resolved" })
      .where(eq(adminReports.id, reportId))
      .returning();

    // Log admin audit trail trace
    await this.logAdminAction(
      adminId,
      "resolve_report",
      report.targetType,
      report.targetId,
      { reason: actionReason, reportId }
    );

    return updated[0];
  }

  static async logAdminAction(adminId: string, action: string, targetType: string, targetId: string, metadata?: any) {
    const actionId = generateId("AL");
    await db.insert(adminActionLogs).values({
      id: actionId,
      adminId,
      action,
      targetType,
      targetId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date()
    });
  }

  static async listAdminLogs() {
    return db.select().from(adminActionLogs);
  }

  static async getTrustAudit(id: string) {
    const carRes = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    if (carRes.length === 0) {
      throw new ApiError(404, "Vehicle not found");
    }

    const car = carRes[0];
    
    // Compute trust ratings
    let score = 100;
    const checks = {
      vinVerified: false,
      registrationUploaded: false,
      insuranceUploaded: false,
      physicalKeysUploaded: false,
      cleanImages: false
    };

    if (car.vinLast6 && car.vinLast6.length === 6) {
      checks.vinVerified = true;
    } else {
      score -= 30;
    }

    if (car.registrationDocumentUploaded && car.registrationDocumentUploaded.length > 0) {
      checks.registrationUploaded = true;
    } else {
      score -= 15;
    }

    if (car.insuranceDocumentUploaded && car.insuranceDocumentUploaded.length > 0) {
      checks.insuranceUploaded = true;
    } else {
      score -= 15;
    }

    if (car.proofPhotoUploaded && car.proofPhotoUploaded.length > 0) {
      checks.physicalKeysUploaded = true;
    } else {
      score -= 15;
    }

    if (car.imagePolicyStatus === "approved") {
      checks.cleanImages = true;
    } else {
      score -= 25;
    }

    const finalScore = Math.max(10, score);
    
    let trustLevel: "low" | "medium" | "high" | "verified_veloce" = "medium";
    if (finalScore >= 95) {
      trustLevel = "verified_veloce";
    } else if (finalScore >= 80) {
      trustLevel = "high";
    } else if (finalScore < 50) {
      trustLevel = "low";
    }

    return {
      vehicleId: id,
      trustScore: finalScore,
      trustLevel,
      checks,
      status: car.status,
      authenticityStatus: car.authenticityStatus
    };
  }
}
