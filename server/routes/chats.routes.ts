// server/routes/chats.routes.ts
import { Router } from "express";
import { ChatsService } from "../services/chats.service.ts";
import { verifyFirebaseUser } from "../middleware/auth.ts";
import { requireConversationParticipant } from "../middleware/requireRole.ts";
import { asyncHandler } from "../utils/errors.ts";

const router = Router();

router.get(
  "/",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const list = await ChatsService.listForUser(req.user.uid);
    res.json(list);
  })
);

router.post(
  "/",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const result = await ChatsService.create(user.uid, req.body);
    res.status(201).json(result);
  })
);

router.get(
  "/:id/messages",
  verifyFirebaseUser,
  requireConversationParticipant,
  asyncHandler(async (req: any, res: any) => {
    const list = await ChatsService.getMessages(req.params.id, req.user.uid);
    res.json(list);
  })
);

router.post(
  "/:id/messages",
  verifyFirebaseUser,
  requireConversationParticipant,
  asyncHandler(async (req: any, res: any) => {
    const result = await ChatsService.postMessage(req.params.id, req.user.uid, req.body.body || req.body.text);
    res.status(201).json(result);
  })
);

router.put(
  "/:id/read",
  verifyFirebaseUser,
  requireConversationParticipant,
  asyncHandler(async (req: any, res: any) => {
    const result = await ChatsService.markAsRead(req.params.id, req.user.uid);
    res.json(result);
  })
);

router.post(
  "/:id/simulate",
  verifyFirebaseUser,
  requireConversationParticipant,
  asyncHandler(async (req: any, res: any) => {
    const result = await ChatsService.simulateDealerResponse(req.params.id, req.user.uid, req.body.text || req.body.body);
    res.status(201).json(result);
  })
);

export default router;
