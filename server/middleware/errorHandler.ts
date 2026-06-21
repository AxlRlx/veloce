// server/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/errors.ts";
import { logger } from "../utils/logger.ts";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the complete backtrace cleanly
  logger.error(`Exception captured in routing pipeline [${req.method} ${req.url}]:`, err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details
    });
  }

  // Handle express native JSON parsing exceptions
  if (err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Malformed request JSON formatting" });
  }

  res.status(500).json({
    error: "An unexpected transaction fault occurred while processing your request on our secure cloud architecture.",
    trace: process.env.NODE_ENV !== "production" ? err.message : undefined
  });
};
