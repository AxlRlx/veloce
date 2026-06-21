// server/routes/billing.routes.ts
import { Router } from "express";
import express from "express";
import { BillingService } from "../services/billing.service.ts";
import { verifyFirebaseUser } from "../middleware/auth.ts";
import { asyncHandler } from "../utils/errors.ts";
import { logger } from "../utils/logger.ts";

const router = Router();

router.post(
  "/create-checkout-session",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const { tier, bookingId, totalPrice } = req.body;

    if (bookingId && totalPrice) {
      // Its a rental checkout session request
      const sessionResult = await BillingService.createRentalCheckout(user.uid, bookingId, totalPrice, user.email || "");
      res.json(sessionResult);
    } else {
      // Its a subscription checkout session request
      const sessionResult = await BillingService.createSubscriptionCheckout(user.uid, tier, user.email || "");
      res.json(sessionResult);
    }
  })
);

router.post(
  "/verify-checkout-session",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const { sessionId } = req.body;
    const result = await BillingService.verifyCheckout(user.uid, sessionId);
    res.json(result);
  })
);

router.post(
  "/cancel-subscription",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const result = await BillingService.cancelSubscription(user.uid);
    res.json({ success: true, profile: result });
  })
);

// We define express.raw directly on the webhook route so we can access req.body as a pristine Buffer for Stripe signature validation!
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  asyncHandler(async (req: any, res: any) => {
    const signature = req.headers["stripe-signature"] || "";
    const rawBody = req.body; // Buffer instance from express.raw()

    logger.info(`Received Stripe Webhook raw body length: ${rawBody ? rawBody.length : 0} bytes`);

    const result = await BillingService.handleWebhook(rawBody, signature);
    res.json(result);
  })
);

export default router;
