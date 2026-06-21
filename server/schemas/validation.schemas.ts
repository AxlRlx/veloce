// server/schemas/validation.schemas.ts
import { z } from "zod";

const isStockPhoto = (url: string) => {
  const stockMarkers = [
    "images.unsplash.com",
    "pexels.com",
    "pixabay.com",
    "shutterstock.com",
    "gettyimages",
    "adobe.com/products/stock",
    "placeholder",
    "demo",
    "sample",
    "lorem"
  ];
  const normalized = url.toLowerCase();
  return stockMarkers.some(marker => normalized.includes(marker));
};

export const profileUpdateSchema = z.object({
  fullName: z.string().min(1, "Full name cannot be blank").max(100).optional(),
  avatarUrl: z.string().url("Avatar must be a valid URL").or(z.string().length(0)).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  // Strict: role and tier CANNOT be modified via normal update profile route!
  role: z.any().refine(() => false, { message: "Role updates are restricted" }).optional(),
  subscriptionTier: z.any().refine(() => false, { message: "Subscription tier updates are restricted" }).optional(),
});

export const vehicleSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150),
  make: z.string().min(1, "Make/brand is required").max(60),
  model: z.string().min(1, "Model is required").max(60),
  year: z.number().int().min(1900, "Invalid year").max(new Date().getFullYear() + 2, "Year is too far in future"),
  price: z.number().nonnegative("Purchase price cannot be negative"),
  rentalPriceDaily: z.number().nonnegative("Daily rental price cannot be negative"),
  location: z.string().min(3, "Location is required").max(100),
  description: z.string().min(10, "Provide a descriptive summary of at least 10 characters").max(2000),
  mileage: z.number().int().nonnegative("Mileage cannot be negative"),
  transmission: z.string().default("Automatic"),
  fuelType: z.string().default("Petrol"),
  horsepower: z.number().int().positive("Horsepower must be a positive integer"),
  category: z.enum(["car", "motorcycle"]),
  vehicleType: z.enum(["car", "motorcycle"]).default("car"),
  status: z.enum(["draft", "pending_review", "active", "rejected", "sold", "rented"]).default("draft"),
  images: z.array(z.string().url("Each photo must be a valid URL")),
  
  // Custom proof fields
  vinLast6: z.string().length(6, "Please provide the last 6 digits of your VIN").optional(),
  registrationDocumentUploaded: z.string().url().or(z.string().length(0)).optional(),
  insuranceDocumentUploaded: z.string().url().or(z.string().length(0)).optional(),
  proofPhotoUploaded: z.string().url().or(z.string().length(0)).optional(),
  odometerPhotoUploaded: z.string().url().or(z.string().length(0)).optional(),

  isDemoListing: z.boolean().default(false),
}).refine((data) => {
  // Check photo quantity
  const minRequired = data.vehicleType === "motorcycle" ? 5 : 6;
  return data.images.length >= minRequired;
}, {
  message: "Vehicle photo rule violated: Cars require at least 6 photos, and motorcycles require at least 5 photos.",
  path: ["images"]
}).refine((data) => {
  // Check stock photo rule for real listings
  if (data.isDemoListing) return true; // Allowed in demo listing
  
  const hasStockImg = data.images.some(url => isStockPhoto(url));
  return !hasStockImg;
}, {
  message: "Policy Enforcement: Real user vehicle listings are prohibited from using stock images, placeholders, or external demo gallery URLs. Please upload authentic, custom files representing the physical vehicle.",
  path: ["images"]
});

export const bookingSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format (YYYY-MM-DD)"),
  totalPrice: z.number().positive("Total rental fee must be positive"),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const today = new Date();
  today.setHours(0,0,0,0);
  
  if (start < today) return false;
  if (end <= start) return false;
  return true;
}, {
  message: "Invalid duration bounds: Start date cannot be in the past, and rent termination date must follow check-in.",
  path: ["endDate"]
});

export const reportSchema = z.object({
  targetType: z.enum(["vehicle", "profile", "message", "event"]),
  targetId: z.string().min(1, "Target ID is required"),
  reason: z.enum([
    "fake_listing",
    "stock_photos",
    "scam",
    "harassment",
    "stolen_vehicle",
    "payment_issue",
    "inappropriate_content",
    "other"
  ]),
  notes: z.string().max(1000).optional(),
});

export const adminActionSchema = z.object({
  action: z.enum([
    "approve_listing",
    "reject_listing",
    "suspend_user",
    "restore_user",
    "approve_dealer",
    "reject_dealer",
    "resolve_report",
    "change_subscription",
    "refund_booking",
    "cancel_booking"
  ]),
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string().min(1, "Reason must be supplied for audit traceability"),
});
