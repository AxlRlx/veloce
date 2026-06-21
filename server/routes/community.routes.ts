// server/routes/community.routes.ts
import { Router } from "express";
import { CommunityService } from "../services/community.service.ts";
import { verifyFirebaseUser, optionalFirebaseUser } from "../middleware/auth.ts";
import { asyncHandler } from "../utils/errors.ts";

const router = Router();

router.get(
  "/events",
  optionalFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const list = await CommunityService.listEvents(req.userProfile);
    res.json(list);
  })
);

router.post(
  "/events",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const result = await CommunityService.createEvent(req.user.uid, req.body);
    res.status(201).json(result);
  })
);

router.post(
  "/events/:id/rsvp",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const result = await CommunityService.registerRsvp(req.params.id, req.user.uid, req.user.email);
    res.json(result);
  })
);

export default router;
