// server/utils/logger.ts
import { env } from "../config/env.ts";

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${redact(message)}`, ...args.map(redactObj));
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${redact(message)}`, ...args.map(redactObj));
  },
  error: (message: string, error?: any, ...args: any[]) => {
    console.error(`[ERROR] ${redact(message)}`, error, ...args.map(redactObj));
  }
};

function redact(str: string): string {
  if (!str) return str;
  let result = str;
  if (env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.length > 5) {
    result = result.replace(env.STRIPE_SECRET_KEY, "sk_live_hidden_********");
  }
  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 5) {
    result = result.replace(env.GEMINI_API_KEY, "gemini_api_key_********");
  }
  return result;
}

function redactObj(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return redact(obj);
  if (typeof obj !== "object") return obj;

  try {
    const stringified = JSON.stringify(obj);
    return JSON.parse(redact(stringified));
  } catch (e) {
    return "[Unserializable Redacted Object]";
  }
}
