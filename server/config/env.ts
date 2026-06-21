// server/config/env.ts
import dotenv from "dotenv";
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000"),
  APP_URL: process.env.APP_URL || "http://localhost:3000",
  API_URL: process.env.API_URL || "http://localhost:3000/api",
  
  // Gemini key
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",

  // Stripe keys
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_PRICE_PREMIUM_MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || "",
  STRIPE_PRICE_DEALER_MONTHLY: process.env.STRIPE_PRICE_DEALER_MONTHLY || "",

  // Storage
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || "local",
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || "veloce-uploads",
  STORAGE_REGION: process.env.STORAGE_REGION || "us-east-1",
  STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID || "",
  STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY || "",

  // Database
  SQL_HOST: process.env.SQL_HOST || "localhost",
  SQL_USER: process.env.SQL_USER || "postgres",
  SQL_PASSWORD: process.env.SQL_PASSWORD || "postgres",
  SQL_DB_NAME: process.env.SQL_DB_NAME || "veloce",
};
