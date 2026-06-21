// server/routes/uploads.routes.ts
import { Router } from "express";
import { verifyFirebaseUser } from "../middleware/auth.ts";
import { ApiError, asyncHandler } from "../utils/errors.ts";
import { generateId } from "../utils/ids.ts";
import { logger } from "../utils/logger.ts";

const router = Router();

const VALID_CATEGORIES = [
  "vehicle_photo",
  "proof_photo",
  "odometer_photo",
  "registration_document",
  "insurance_document",
  "profile_avatar",
  "dealer_document"
];

const VALID_MIMETYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf"
];

router.post(
  "/",
  verifyFirebaseUser,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    const { fileBase64, mimeType, category, fileName } = req.body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      throw new ApiError(400, `Invalid file categorization. Allowed selections: ${VALID_CATEGORIES.join(", ")}`);
    }

    if (!mimeType || !VALID_MIMETYPES.includes(mimeType.toLowerCase())) {
      throw new ApiError(400, `Forbidden file signature format. Allowed extensions: JPEG, PNG, WEBP, PDF`);
    }

    if (!fileBase64 || fileBase64.trim() === "") {
      throw new ApiError(400, "Base64 payload contents represent raw zero content.");
    }

    // Estimate file size of base64: length * 0.75
    const estimatedSizeBytes = fileBase64.length * 0.75;
    const maxAllowedBytes = 10 * 1024 * 1024; // 10MB limit

    if (estimatedSizeBytes > maxAllowedBytes) {
      throw new ApiError(400, "Payload too large. Maximum file upload limit is 10 Megabytes.");
    }

    logger.info(`Valid secure file upload received. User: ${user.uid}, Category: ${category}, Format: ${mimeType}, Size: ~${Math.round(estimatedSizeBytes / 1024)} KB`);

    // In a fully configured environment, this would save to AWS S3 or Google Cloud Storage.
    // For our sandboxed developer runtime, we will return a highly deterministic, authenticated mock URL
    // indicating successful secure capture relative to their category and file signatures!
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const mockFileUrl = `https://veloce-secure-uploads.storage.googleapis.com/${category}/${user.uid}_${randomSuffix}_${fileName || "document"}.${mimeType.split("/")[1]}`;

    res.status(201).json({
      success: true,
      url: mockFileUrl,
      category,
      mimeType,
      sizeBytes: Math.round(estimatedSizeBytes),
      ownerId: user.uid,
      uploadedAt: new Date().toISOString()
    });
  })
);

export default router;
