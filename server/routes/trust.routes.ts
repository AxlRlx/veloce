// server/routes/trust.routes.ts
import { Router } from "express";
import { TrustService } from "../services/trust.service.ts";
import { verifyFirebaseUser } from "../middleware/auth.ts";
import { requireAdmin } from "../middleware/requireRole.ts";
import { validateBody } from "../middleware/validate.ts";
import { reportSchema } from "../schemas/validation.schemas.ts";
import { asyncHandler } from "../utils/errors.ts";

const router = Router();

// 1. Submit a report (for any registered user)
router.post(
  "/reports",
  verifyFirebaseUser,
  validateBody(reportSchema),
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const result = await TrustService.createReport(user.uid, req.body);
    res.status(201).json(result);
  })
);

// 2. Fetch all reports list (Admins only)
router.get(
  "/reports",
  verifyFirebaseUser,
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const list = await TrustService.listReports();
    res.json(list);
  })
);

// 3. Resolve report status (Admins only)
router.put(
  "/reports/:id/resolve",
  verifyFirebaseUser,
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const adminId = req.user.uid;
    const { reason } = req.body;
    const result = await TrustService.resolveReport(adminId, req.params.id, reason || "Resolved by admin audit flow.");
    res.json(result);
  })
);

// 4. Evaluate trust score & metrics of vehicle
router.get(
  "/vehicles/:id/trust",
  asyncHandler(async (req: any, res: any) => {
    const auditObj = await TrustService.getTrustAudit(req.params.id);
    res.json(auditObj);
  })
);

export default router;
