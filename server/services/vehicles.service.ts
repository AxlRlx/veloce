// server/services/vehicles.service.ts
import { db } from "../../src/db/index.ts";
import { vehicles, vehicleImages } from "../../src/db/schema.ts";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/errors.ts";
import { generateId } from "../utils/ids.ts";

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

export class VehiclesService {
  static async listAll(userProfile?: any) {
    // Normal query lists active vehicles and user's drafts
    const all = await db.select().from(vehicles);
    
    // Filter private/non-public/drafts if user is not the owner or admin
    return all.filter(c => {
      if (c.status === "active") return true;
      if (!userProfile) return false;
      if (userProfile.role === "admin") return true;
      return c.ownerId === userProfile.id;
    });
  }

  static async getById(id: string) {
    const list = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    if (list.length === 0) {
      throw new ApiError(404, "Vehicle not found");
    }
    return list[0];
  }

  static async create(uid: string, body: any, userProfile: any) {
    const isDemoListing = body.isDemoListing === true;
    const vehicleType = body.vehicleType === "motorcycle" ? "motorcycle" : "car";
    const minPhotos = vehicleType === "motorcycle" ? 5 : 6;
    
    const imagesArray = Array.isArray(body.images) ? body.images : [];

    if (imagesArray.length < minPhotos) {
      throw new ApiError(400, `Minimum photo policy violation. ${
        vehicleType === "motorcycle" ? "Motorcycles" : "Cars"
      } require at least ${minPhotos} authentic photos. You provided ${imagesArray.length}.`);
    }

    // Inspect if any images contain stock photo markers and evaluate policies
    let hasStockImages = false;
    for (const url of imagesArray) {
      if (isStockPhoto(url)) {
        hasStockImages = true;
        break;
      }
    }

    // Reject stock photos for non-demo listings during API creation
    if (!isDemoListing && hasStockImages) {
      throw new ApiError(400, "Policy Enforcement: Real user vehicle listings are prohibited from using stock images or placeholders.");
    }

    const authenticityStatus = hasStockImages ? "unverified" : "verified";
    const imagePolicyStatus = hasStockImages ? "pending_review" : "approved";

    // Set listing state based on status, role, and stock photo flag
    let status = "active";
    let reviewNotes = "Automated policy pass.";

    if (hasStockImages) {
      status = "pending_review";
      reviewNotes = "Stock photos detected. Awaiting admin approval.";
    } else if (body.vinLast6 && body.vinLast6.length > 0) {
      // VIN is present - lets push with Verified badge
      status = "active";
    } else if (userProfile && userProfile.role === "user" && !isDemoListing) {
      // Regular user without proof goes to pending_review
      status = "pending_review";
      reviewNotes = "Awaiting manual review. Provide ownership proof to speed up.";
    }

    // Listing Trust Score evaluation (starts at 100, drops of violations)
    let trustScore = 100;
    if (!body.vinLast6) {
      trustScore -= 30; // No VIN documentation
    }
    if (!body.proofPhotoUploaded) {
      trustScore -= 20; // No physical keys or document photo
    }
    if (body.price < 5000 || (body.rentalPriceDaily > 0 && body.rentalPriceDaily < 50)) {
      trustScore -= 10; // Suspiciously cheap luxury car price (potential scam)
    }

    const generatedId = generateId(vehicleType === "motorcycle" ? "moto" : "car");

    const result = await db.insert(vehicles).values({
      id: generatedId,
      ownerId: uid,
      title: body.title,
      make: body.make,
      model: body.model,
      year: body.year,
      price: body.price,
      rentalPriceDaily: body.rentalPriceDaily,
      location: body.location,
      description: body.description,
      mileage: body.mileage,
      transmission: body.transmission || "Automatic",
      fuelType: body.fuelType || "Petrol",
      horsepower: body.horsepower,
      category: vehicleType,
      status: status,
      images: imagesArray,
      vehicleType,
      listingSource: isDemoListing ? "demo" : (userProfile?.role === "dealer" ? "dealer_submitted" : "user_submitted"),
      authenticityStatus,
      imagePolicyStatus,
      isDemoListing,
      isPublic: true,
      reviewNotes,
      // Store ownership values
      vinLast6: body.vinLast6 || null,
      registrationDocumentUploaded: body.registrationDocumentUploaded || null,
      insuranceDocumentUploaded: body.insuranceDocumentUploaded || null,
      proofPhotoUploaded: body.proofPhotoUploaded || null,
      odometerPhotoUploaded: body.odometerPhotoUploaded || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Persist individual photos in modern vehicleImages table
    for (const imgUrl of imagesArray) {
      const imageId = generateId("img");
      const isStock = isStockPhoto(imgUrl);
      
      await db.insert(vehicleImages).values({
        id: imageId,
        vehicleId: generatedId,
        ownerId: uid,
        storagePath: imgUrl,
        publicUrl: imgUrl,
        source: isStock ? "demo_placeholder" : "user_upload",
        status: isStock ? "pending_review" : "approved",
        fileSize: 1024 * 120, // simulated
        mimeType: "image/jpeg",
        width: 1280,
        height: 720,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return result[0];
  }

  static async update(id: string, uid: string, body: any, userProfile: any) {
    const list = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    if (list.length === 0) {
      throw new ApiError(404, "Vehicle listing not found");
    }

    const currentCar = list[0];
    const isDemoListing = currentCar.isDemoListing;
    const vehicleType = body.vehicleType || currentCar.vehicleType;
    const minPhotos = vehicleType === "motorcycle" ? 5 : 6;
    const imagesArray = Array.isArray(body.images) ? body.images : currentCar.images;

    if (imagesArray.length < minPhotos) {
      throw new ApiError(400, `Minimum photo policy violation. Required ${minPhotos} photos, got ${imagesArray.length}.`);
    }

    let hasStockImages = false;
    for (const url of imagesArray) {
      if (isStockPhoto(url)) {
        hasStockImages = true;
        break;
      }
    }

    if (!isDemoListing && hasStockImages) {
      throw new ApiError(400, "Policy Enforcement: Real user vehicle listings are prohibited from using stock images or placeholders.");
    }

    const authenticityStatus = hasStockImages ? "unverified" : "verified";
    const imagePolicyStatus = hasStockImages ? "pending_review" : "approved";

    let status = body.status || currentCar.status;
    if (hasStockImages) {
      status = "pending_review";
    }

    const updated = await db
      .update(vehicles)
      .set({
        title: body.title !== undefined ? body.title : currentCar.title,
        make: body.make !== undefined ? body.make : currentCar.make,
        model: body.model !== undefined ? body.model : currentCar.model,
        year: body.year !== undefined ? body.year : currentCar.year,
        price: body.price !== undefined ? body.price : currentCar.price,
        rentalPriceDaily: body.rentalPriceDaily !== undefined ? body.rentalPriceDaily : currentCar.rentalPriceDaily,
        location: body.location !== undefined ? body.location : currentCar.location,
        description: body.description !== undefined ? body.description : currentCar.description,
        mileage: body.mileage !== undefined ? body.mileage : currentCar.mileage,
        transmission: body.transmission !== undefined ? body.transmission : currentCar.transmission,
        fuelType: body.fuelType !== undefined ? body.fuelType : currentCar.fuelType,
        horsepower: body.horsepower !== undefined ? body.horsepower : currentCar.horsepower,
        category: vehicleType,
        vehicleType,
        status,
        images: imagesArray,
        authenticityStatus,
        imagePolicyStatus,
        // Update ownership values
        vinLast6: body.vinLast6 !== undefined ? body.vinLast6 : currentCar.vinLast6,
        registrationDocumentUploaded: body.registrationDocumentUploaded !== undefined ? body.registrationDocumentUploaded : currentCar.registrationDocumentUploaded,
        insuranceDocumentUploaded: body.insuranceDocumentUploaded !== undefined ? body.insuranceDocumentUploaded : currentCar.insuranceDocumentUploaded,
        proofPhotoUploaded: body.proofPhotoUploaded !== undefined ? body.proofPhotoUploaded : currentCar.proofPhotoUploaded,
        odometerPhotoUploaded: body.odometerPhotoUploaded !== undefined ? body.odometerPhotoUploaded : currentCar.odometerPhotoUploaded,
        updatedAt: new Date()
      })
      .where(eq(vehicles.id, id))
      .returning();

    // Re-verify and sync images inside vehicleImages if images are updated
    if (body.images) {
      await db.delete(vehicleImages).where(eq(vehicleImages.vehicleId, id));

      for (const imgUrl of imagesArray) {
        const imageId = generateId("img");
        const isStock = isStockPhoto(imgUrl);
        
        await db.insert(vehicleImages).values({
          id: imageId,
          vehicleId: id,
          ownerId: currentCar.ownerId,
          storagePath: imgUrl,
          publicUrl: imgUrl,
          source: isStock ? "demo_placeholder" : "user_upload",
          status: isStock ? "pending_review" : "approved",
          fileSize: 1024 * 120, // simulated
          mimeType: "image/jpeg",
          width: 1280,
          height: 720,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return updated[0];
  }

  static async delete(id: string) {
    // Delete corresponding sub-tables (images and bookings/likes)
    await db.delete(vehicleImages).where(eq(vehicleImages.vehicleId, id));
    const deleted = await db.delete(vehicles).where(eq(vehicles.id, id)).returning();
    if (deleted.length === 0) {
      throw new ApiError(404, "Vehicle listing not found.");
    }
    return deleted[0];
  }
}
