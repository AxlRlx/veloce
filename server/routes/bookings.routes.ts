// server/routes/bookings.routes.ts
import { Router } from "express";
import { BookingsService } from "../services/bookings.service.ts";
import { verifyFirebaseUser } from "../middleware/auth.ts";
import { requireBookingParticipant } from "../middleware/requireRole.ts";
import { validateBody } from "../middleware/validate.ts";
import { bookingSchema } from "../schemas/validation.schemas.ts";
import { asyncHandler } from "../utils/errors.ts";

const router = Router();

router.get(
  "/",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const list = await BookingsService.listForUser(req.user.uid, req.userProfile);
    res.json(list);
  })
);

router.post(
  "/",
  verifyFirebaseUser,
  validateBody(bookingSchema),
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const result = await BookingsService.create(user.uid, req.body);
    res.status(201).json(result);
  })
);

router.put(
  "/:id/cancel",
  verifyFirebaseUser,
  requireBookingParticipant,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const result = await BookingsService.cancel(req.params.id, user.uid, req.userProfile);
    res.json(result);
  })
);

router.put(
  "/:id/extend",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const { days } = req.body;
    const result = await BookingsService.extend(req.params.id, user.uid, parseInt(days || "0"));
    res.json(result);
  })
);

export default router;
