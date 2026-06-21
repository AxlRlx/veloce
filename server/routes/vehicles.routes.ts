// server/routes/vehicles.routes.ts
import { Router } from "express";
import { VehiclesService } from "../services/vehicles.service.ts";
import { verifyFirebaseUser, optionalFirebaseUser } from "../middleware/auth.ts";
import { requireDealerOrAdmin, requireVehicleOwner } from "../middleware/requireRole.ts";
import { validateBody } from "../middleware/validate.ts";
import { vehicleSchema } from "../schemas/validation.schemas.ts";
import { asyncHandler } from "../utils/errors.ts";

const router = Router();

router.get(
  "/",
  optionalFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const list = await VehiclesService.listAll(req.userProfile);
    res.json(list);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: any, res: any) => {
    const car = await VehiclesService.getById(req.params.id);
    res.json(car);
  })
);

router.post(
  "/",
  verifyFirebaseUser,
  requireDealerOrAdmin,
  validateBody(vehicleSchema),
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const result = await VehiclesService.create(user.uid, req.body, req.userProfile);
    res.status(201).json(result);
  })
);

router.put(
  "/:id",
  verifyFirebaseUser,
  requireVehicleOwner,
  validateBody(vehicleSchema),
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const result = await VehiclesService.update(req.params.id, user.uid, req.body, req.userProfile);
    res.json(result);
  })
);

router.delete(
  "/:id",
  verifyFirebaseUser,
  requireVehicleOwner,
  asyncHandler(async (req: any, res: any) => {
    const result = await VehiclesService.delete(req.params.id);
    res.json({ success: true, message: "Vehicle metadata eradicated successfully", id: req.params.id });
  })
);

export default router;
