// server/app.ts
import express from "express";
import cors from "cors";

// Routes imports
import authRouter from "./routes/auth.routes.ts";
import vehiclesRouter from "./routes/vehicles.routes.ts";
import bookingsRouter from "./routes/bookings.routes.ts";
import chatsRouter from "./routes/chats.routes.ts";
import communityRouter from "./routes/community.routes.ts";
import billingRouter from "./routes/billing.routes.ts";
import adminRouter from "./routes/admin.routes.ts";
import trustRouter from "./routes/trust.routes.ts";
import uploadsRouter from "./routes/uploads.routes.ts";

import { errorHandler } from "./middleware/errorHandler.ts";

const app = express();

// Set secure headers manually to shield against common web vulnerabilities
app.use((req, res, next) => {
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Configure CORS policy limits
app.use(cors({
  origin: true, // Allow dev iframe and local tabs
  credentials: true
}));

// Route-level raw parser for billing webhook is defined natively inside billing.routes.ts,
// so here we mount the standard parsers safely.
app.use((req, res, next) => {
  // If request is Stripe Webhook, do NOT parse with JSON parser in order to preserve req.body
  if (req.originalUrl === "/api/billing/webhook") {
    next();
  } else {
    express.json({ limit: "50mb" })(req, res, next);
  }
});

app.use((req, res, next) => {
  if (req.originalUrl === "/api/billing/webhook") {
    next();
  } else {
    express.urlencoded({ limit: "50mb", extended: true })(req, res, next);
  }
});

// Mount modular sub-routers
app.use("/api/auth", authRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/chats", chatsRouter);
app.use("/api/community", communityRouter);
app.use("/api/billing", billingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/trust", trustRouter);
app.use("/api/upload", uploadsRouter); // Singular
app.use("/api/uploads", uploadsRouter); // Plural alias support

// Health base API route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Veloce Hypercar Portal",
    environment: process.env.NODE_ENV || "development"
  });
});

// Inject general centralized error handler middleware
app.use(errorHandler);

export { app };
