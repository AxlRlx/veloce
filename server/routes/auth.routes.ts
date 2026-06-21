// server/routes/auth.routes.ts
import { Router } from "express";
import { AuthService } from "../services/auth.service.ts";
import { verifyFirebaseUser } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validate.ts";
import { profileUpdateSchema } from "../schemas/validation.schemas.ts";
import { asyncHandler } from "../utils/errors.ts";

const router = Router();

router.post(
  "/sync",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const { name, role, avatar } = req.body;
    const result = await AuthService.syncProfile(user.uid, user.email, name, role, avatar);
    res.json(result);
  })
);

router.get(
  "/profile",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const profile = await AuthService.getProfile(user.uid);
    res.json(profile);
  })
);

router.put(
  "/profile",
  verifyFirebaseUser,
  validateBody(profileUpdateSchema),
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const profile = await AuthService.updateProfile(user.uid, req.body);
    res.json(profile);
  })
);

router.put(
  "/profile/role",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const { role } = req.body;
    
    // Check custom sandbox header to verify permission for simulation mode
    const hasSandboxHeader = req.headers["x-veloce-sandbox"] === "true";
    
    const result = await AuthService.updateProfileRole(user.uid, role, hasSandboxHeader);
    res.json(result);
  })
);

export default router;
