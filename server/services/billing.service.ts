// server/services/billing.service.ts
import Stripe from "stripe";
import { db } from "../../src/db/index.ts";
import { subscriptions, profiles, bookings } from "../../src/db/schema.ts";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/errors.ts";
import { env } from "../config/env.ts";
import { logger } from "../utils/logger.ts";
import { generateId } from "../utils/ids.ts";

let stripeInstance: Stripe | null = null;
function getStripeClient(): Stripe | null {
  if (!stripeInstance) {
    const key = env.STRIPE_SECRET_KEY;
    if (key && key.trim() !== "" && key !== "MY_STRIPE_SECRET_KEY") {
      stripeInstance = new Stripe(key, {
        apiVersion: "2025-01-27.acacia" as any,
      });
      logger.info("Lazily initialized Stripe core client in production mode.");
    }
  }
  return stripeInstance;
}

export class BillingService {
  static isStripeConfigured(): boolean {
    return getStripeClient() !== null;
  }

  static async createSubscriptionCheckout(userId: string, tier: string, userEmail: string) {
    if (tier !== "veloce_gt" && tier !== "dealer_paid") {
      throw new ApiError(400, "Unsupported subscription tier requested.");
    }

    const stripe = getStripeClient();
    if (stripe) {
      try {
        // Find or create customer
        let stripeCustomerId: string | null = null;
        const profile = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
        if (profile.length > 0 && profile[0].kycStatus === "verified") {
          // Can reuse if they have custom field or metadata
        }

        // Search for existing price ID
        let priceId = tier === "dealer_paid" ? env.STRIPE_PRICE_DEALER_MONTHLY : env.STRIPE_PRICE_PREMIUM_MONTHLY;
        if (!priceId) {
          // Strict production verification, but fall back to fallback mock prices during dev
          priceId = tier === "dealer_paid" ? "price_mock_dealer_99" : "price_mock_gt_49";
        }

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [{ price: priceId, quantity: 1 }],
          mode: "subscription",
          customer_email: userEmail,
          client_reference_id: userId,
          metadata: { userId, tier },
          success_url: `${env.APP_URL}/dashboard?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${env.APP_URL}/pricing?checkout_failed=true`,
        });

        return {
          success: true,
          sessionId: session.id,
          url: session.url
        };
      } catch (err: any) {
        logger.error("Failed to initiate authentic Stripe session:", err);
        throw new ApiError(500, `Stripe portal initialization failure: ${err.message}`);
      }
    } else {
      // Local development simulation fallback mode
      logger.warn(`Stripe variables unconfigured. Booting Billing Simulation Sandbox.`);
      const mockSessionId = `mock_stripe_cs_${tier}_${userId}_${Date.now()}`;
      return {
        success: true,
        sessionId: mockSessionId,
        url: `/checkout?session_id=${mockSessionId}`
      };
    }
  }

  static async createRentalCheckout(userId: string, bookingId: string, totalPrice: number, userEmail: string) {
    const stripe = getStripeClient();
    
    // Convert to cents for Stripe
    const amountInCents = Math.round(totalPrice * 100);

    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: {
                name: "Veloce Fleet Vehicle Lease",
                description: `Booking reservation ID: ${bookingId}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          }],
          mode: "payment",
          customer_email: userEmail,
          client_reference_id: userId,
          metadata: { bookingId },
          success_url: `${env.APP_URL}/dashboard?checkout_success=true&booking_id=${bookingId}`,
          cancel_url: `${env.APP_URL}/dashboard?checkout_failed=true`,
        });

        // Update paymentStatus to pending
        await db.update(bookings).set({ paymentStatus: "pending" }).where(eq(bookings.id, bookingId));

        return {
          success: true,
          sessionId: session.id,
          url: session.url
        };
      } catch (err: any) {
        logger.error("Failed to create Stripe rental payment session:", err);
        throw new ApiError(500, `Stripe portal initialization failure: ${err.message}`);
      }
    } else {
      logger.warn(`Stripe not configured. Simulating manual rental checkout.`);
      const mockSessionId = `mock_stripe_bkg_${bookingId}_${amountInCents}`;
      return {
        success: true,
        sessionId: mockSessionId,
        url: `/checkout?session_id=${mockSessionId}`
      };
    }
  }

  static async verifyCheckout(userId: string, sessionId: string) {
    const stripe = getStripeClient();

    if (stripe && !sessionId.startsWith("mock_")) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== "paid") {
          throw new ApiError(400, "Checkout transaction has not been marked finalized by Stripe.");
        }

        const tier = session.metadata?.tier || "veloce_gt";
        const targetUserId = session.metadata?.userId || userId;
        const stripeSubId = (session.subscription as string) || `sub_gen_${Date.now()}`;
        const stripeCustId = (session.customer as string) || `cus_gen_${Date.now()}`;

        // Fetch subscription periods
        let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default 30 days
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            currentPeriodEnd = new Date((sub as any).current_period_end * 1000);
          } catch (subErr) {
            logger.warn("Sub lookup failed, falling back to 30d expiry date.", subErr);
          }
        }

        const userRole = tier === "dealer_paid" ? "dealer" : "user";

        // Update Local DB Profile and Sub details
        const updatedProfile = await db
          .update(profiles)
          .set({
            subscriptionTier: tier,
            role: userRole,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, targetUserId))
          .returning();

        // Save subscription row
        const generatedSubId = generateId("sub");
        await db.insert(subscriptions).values({
          id: generatedSubId,
          userId: targetUserId,
          stripeCustomerId: stripeCustId,
          stripeSubscriptionId: stripeSubId,
          tier,
          status: "active",
          currentPeriodEnd,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return {
          success: true,
          profile: updatedProfile[0],
          subscription: {
            id: stripeSubId,
            tier,
            status: "active",
            currentPeriodEnd
          }
        };
      } catch (err: any) {
        logger.error("Stripe Checkout verification failed:", err);
        throw new ApiError(500, `Stripe Validation Error: ${err.message}`);
      }
    } else {
      // Local developer fallback validation
      logger.info(`Simulated Checkout Validation running for session: ${sessionId}`);
      
      let tier = "veloce_gt";
      let bookingId: string | null = null;

      if (sessionId.includes("dealer_paid")) {
        tier = "dealer_paid";
      } else if (sessionId.includes("mock_stripe_bkg_")) {
        // Its a rental checkout
        const parts = sessionId.split("_");
        bookingId = parts[3];
      }

      if (bookingId) {
        const updatedBkg = await db
          .update(bookings)
          .set({ paymentStatus: "paid", status: "confirmed", updatedAt: new Date() })
          .where(eq(bookings.id, bookingId))
          .returning();

        if (updatedBkg.length === 0) {
          throw new ApiError(404, "Target lease booking not found.");
        }

        return {
          success: true,
          booking: updatedBkg[0]
        };
      } else {
        const userRole = tier === "dealer_paid" ? "dealer" : "user";
        const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const updatedProfile = await db
          .update(profiles)
          .set({
            subscriptionTier: tier,
            role: userRole,
            updatedAt: new Date()
          })
          .where(eq(profiles.id, userId))
          .returning();

        const generatedSubId = generateId("sub");
        await db.insert(subscriptions).values({
          id: generatedSubId,
          userId,
          stripeCustomerId: `cus_mock_${Date.now()}`,
          stripeSubscriptionId: `sub_mock_${Date.now()}`,
          tier,
          status: "active",
          currentPeriodEnd,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        return {
          success: true,
          profile: updatedProfile[0],
          subscription: {
            id: `sub_mock_${Date.now()}`,
            tier,
            status: "active",
            currentPeriodEnd
          }
        };
      }
    }
  }

  static async handleWebhook(rawBody: Buffer, signature: string) {
    const stripe = getStripeClient();
    const secret = env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !secret) {
      // Standalone simulation mode for stripe webhook testing when configured
      logger.warn("Webhook signature checking bypassed because secret is not configured.");
      
      // Let's decode fake webhook payload directly
      try {
        const payload = JSON.parse(rawBody.toString());
        return await this.processValidatedWebhookEvent(payload);
      } catch (err) {
        throw new ApiError(400, "Invalid JSON payload structure inside raw body.");
      }
    }

    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      return await this.processValidatedWebhookEvent(event);
    } catch (err: any) {
      logger.error("Webhooks signature verification failed entirely:", err);
      throw new ApiError(400, `Signature mismatch: ${err.message}`);
    }
  }

  private static async processValidatedWebhookEvent(event: any) {
    logger.info(`Received verified Stripe Webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;
        const userId = session.metadata?.userId || session.client_reference_id;
        const tier = session.metadata?.tier;

        if (bookingId) {
          // Rental lease payout webhook
          await db
            .update(bookings)
            .set({ paymentStatus: "paid", status: "confirmed", updatedAt: new Date() })
            .where(eq(bookings.id, bookingId));
          logger.info(`Booking updated to paid after Stripe Checkout completeness.`);
        } else if (userId && tier) {
          // Subscription completion webhook
          const userRole = tier === "dealer_paid" ? "dealer" : "user";
          await db
            .update(profiles)
            .set({ subscriptionTier: tier, role: userRole, updatedAt: new Date() })
            .where(eq(profiles.id, userId));

          const stripeSubId = session.subscription || `sub_stripe_${Date.now()}`;
          const stripeCustId = session.customer || `cus_stripe_${Date.now()}`;

          await db.insert(subscriptions).values({
            id: generateId("sub"),
            userId,
            stripeCustomerId: stripeCustId,
            stripeSubscriptionId: stripeSubId,
            tier,
            status: "active",
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscriptionObj = event.data.object;
        const stripeSubId = subscriptionObj.id;
        const stripeCustId = subscriptionObj.customer;
        const status = subscriptionObj.status; 
        const currentPeriodEnd = new Date(subscriptionObj.current_period_end * 1000);

        // Find sub in DB
        const existingSubList = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, stripeSubId))
          .limit(1);

        if (existingSubList.length > 0) {
          const sub = existingSubList[0];
          await db
            .update(subscriptions)
            .set({
              status,
              currentPeriodEnd,
              updatedAt: new Date()
            })
            .where(eq(subscriptions.stripeSubscriptionId, stripeSubId));

          if (status === "active") {
            const userRole = sub.tier === "dealer_paid" ? "dealer" : "user";
            await db
              .update(profiles)
              .set({ subscriptionTier: sub.tier, role: userRole, updatedAt: new Date() })
              .where(eq(profiles.id, sub.userId));
          } else {
            // Subscription is on hold/past due/etc. Downgrade to free representation
            await db
              .update(profiles)
              .set({ subscriptionTier: "free", role: "user", updatedAt: new Date() })
              .where(eq(profiles.id, sub.userId));
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscriptionObj = event.data.object;
        const stripeSubId = subscriptionObj.id;

        const existingSubList = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, stripeSubId))
          .limit(1);

        if (existingSubList.length > 0) {
          const sub = existingSubList[0];
          await db
            .update(subscriptions)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(subscriptions.stripeSubscriptionId, stripeSubId));

          await db
            .update(profiles)
            .set({ subscriptionTier: "free", role: "user", updatedAt: new Date() })
            .where(eq(profiles.id, sub.userId));
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoiceObj = event.data.object;
        const stripeSubId = invoiceObj.subscription;
        if (stripeSubId) {
          const existingSubList = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubscriptionId, stripeSubId))
            .limit(1);

          if (existingSubList.length > 0) {
            const sub = existingSubList[0];
            await db.update(subscriptions).set({ status: "past_due" }).where(eq(subscriptions.stripeSubscriptionId, stripeSubId));
            await db.update(profiles).set({ subscriptionTier: "free", role: "user" }).where(eq(profiles.id, sub.userId));
          }
        }
        break;
      }

      default:
        logger.info(`Ignored stripe event category: ${event.type}`);
    }

    return { received: true, event: event.type };
  }

  static async cancelSubscription(userId: string) {
    const stripe = getStripeClient();

    // Query active sub from DB
    const subList = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
      .limit(1);

    if (subList.length > 0) {
      const sub = subList[0];
      if (stripe && !sub.stripeSubscriptionId.startsWith("sub_mock_")) {
        try {
          await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
        } catch (err: any) {
          logger.error("Failed to cancel subscription via Stripe API directly:", err);
        }
      }

      await db
        .update(subscriptions)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
    }

    // Always reset local profile role to free user
    const updatedProfile = await db
      .update(profiles)
      .set({ subscriptionTier: "free", role: "user", updatedAt: new Date() })
      .where(eq(profiles.id, userId))
      .returning();

    return updatedProfile[0];
  }
}
