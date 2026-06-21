import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { profiles, vehicles, bookings, conversations, messages, reviews, communityEvents, subscriptions, adminReports } from "./src/db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { adminAuth } from "./src/lib/firebase-admin.ts";
import { GoogleGenAI } from "@google/genai";

let geminiClientInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClientInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      geminiClientInstance = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
  }
  return geminiClientInstance;
}

const getFilename = () => {
  try {
    if (typeof __filename !== "undefined") return __filename;
  } catch (e) {}
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) return fileURLToPath(import.meta.url);
  } catch (e) {}
  return "";
};

const getDirname = (filenamePath: string) => {
  try {
    if (typeof __dirname !== "undefined") return __dirname;
  } catch (e) {}
  return filenamePath ? path.dirname(filenamePath) : process.cwd();
};

const __filename = getFilename();
const __dirname = getDirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set rich body limit sizes for base64 file parsing support
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Run self-healing database seeding on startup
  try {
    // Seed core dealerships (run unconditionally to ensure they exist for FK constraints)
    const seedDealers = [
      {
        id: "dealer_maranello",
        email: "maranello@veloce.com",
        fullName: "Apex Cavallino Scuderia",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150",
        role: "dealer",
        subscriptionTier: "dealer_paid",
        kycStatus: "verified"
      },
      {
        id: "owner_classic",
        email: "classic@veloce.com",
        fullName: "The Heritage Vault Inc.",
        avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150",
        role: "dealer",
        subscriptionTier: "dealer_paid",
        kycStatus: "verified"
      },
      {
        id: "dealer_stuttgart",
        email: "stuttgart@veloce.com",
        fullName: "Stuttgart Classics & Exotics",
        avatarUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=120",
        role: "dealer",
        subscriptionTier: "dealer_paid",
        kycStatus: "verified"
      }
    ];

    for (const dealer of seedDealers) {
      const existing = await db.select().from(profiles).where(eq(profiles.id, dealer.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(profiles).values({
          id: dealer.id,
          email: dealer.email,
          fullName: dealer.fullName,
          avatarUrl: dealer.avatarUrl,
          role: "dealer",
          subscriptionTier: "dealer_paid",
          kycStatus: "verified",
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    const existingVehicles = await db.select().from(vehicles).limit(1);
    if (existingVehicles.length === 0) {
      console.log("Seeding default luxury listings to Postgres database...");

      // Seed luxury vehicles
      const itemsToSeed = [
        {
          id: 'car_001',
          ownerId: 'dealer_maranello',
          title: 'Ferrari SF90 Stradale Twin-Turbo V8',
          make: 'Ferrari',
          model: 'SF90 Stradale',
          year: 2024,
          rentalPriceDaily: 1850,
          price: 520000,
          location: 'Beverly Hills, CA',
          description: 'The Ferrari SF90 Stradale redefines the hypercar segment with plug-in hybrid architecture. Experience absolute raw power paired with Formula 1 grade torque vectoring and whisper-silent urban cruising capabilities.',
          mileage: 1200,
          transmission: 'Dual-Clutch 8-Speed',
          fuelType: 'Hybrid',
          horsepower: 986,
          category: 'car',
          status: 'active',
          images: [
            'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=1000',
            'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1000'
          ],
        },
        {
          id: 'car_002',
          ownerId: 'dealer_maranello',
          title: 'Porsche 911 GT3 RS PDK',
          make: 'Porsche',
          model: '911 GT3 RS',
          year: 2023,
          rentalPriceDaily: 950,
          price: 285000,
          location: 'Los Angeles, CA',
          description: 'Engineered for pure aerodynamic performance and surgical track response. The Porsche 911 GT3 RS is a street-legal motorsport weapon with active DRS and an intoxicating 9,000 RPM naturally aspirated flat-six scream.',
          mileage: 3800,
          transmission: 'PDK 7-Speed',
          fuelType: 'Petrol',
          horsepower: 518,
          category: 'car',
          status: 'active',
          images: [
            'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=1000',
            'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000'
          ],
        },
        {
          id: 'car_003',
          ownerId: 'owner_classic',
          title: 'Lamborghini Aventador SVJ Coupe V12',
          make: 'Lamborghini',
          model: 'Aventador SVJ',
          year: 2022,
          rentalPriceDaily: 2200,
          price: 780000,
          location: 'Miami, FL',
          description: 'Uncompromisingly aggressive, rare, and visually breathtaking. This Aventador SVJ commands prestige at any boulevard entrance with its active ALA 2.0 aerodynamics and a roaring 6.5L V12 engine.',
          mileage: 4200,
          transmission: 'ISR 7-Speed',
          fuelType: 'Petrol',
          horsepower: 759,
          category: 'car',
          status: 'active',
          images: [
            'https://images.unsplash.com/photo-1632245889029-e406faaa34cd?q=80&w=1000',
            'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=1000'
          ],
        }
      ];

      for (const item of itemsToSeed) {
        await db.insert(vehicles).values({
          ...item,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      console.log("Database seeded successfully with default premium listings.");
    }

    // Seed initial community events if database is empty
    const existingEvents = await db.select().from(communityEvents).limit(1);
    if (existingEvents.length === 0) {
      console.log("Seeding default community events to Postgres database...");
      const eventsToSeed = [
        {
          id: 'evt_1',
          creatorId: 'dealer_maranello',
          title: 'Malibu Canyon Elite Rally',
          description: JSON.stringify({
            description: 'A morning canyon sprint down Mulholland and Latigo Canyon. Open to GT3, SF90, and equivalent-tier supercars only. Standard helmet rules apply.',
            type: 'ride',
            participantsCount: 42,
            hostName: 'Apex Cavallino Club',
            hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120',
            isHostGtrs: true,
            isPremium: false,
            onlyPremiumVisible: false,
            feeType: 'free',
            feeAmount: 0,
            sponsoredBy: 'private_sponsor',
            joinedUsers: []
          }),
          location: 'Malibu Overlook Point, CA',
          eventDate: '2026-06-21 at 07:00 AM',
          imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=500'
        },
        {
          id: 'evt_2',
          creatorId: 'dealer_maranello',
          title: 'Maranello Track Day Elite',
          description: JSON.stringify({
            description: 'Exclusive lap time trials on the legendary Fiorano circuit. Private racing instructors and telemetry analytics are available on site.',
            type: 'track_day',
            participantsCount: 18,
            hostName: 'Scuderia Club Importers',
            hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120',
            isHostGtrs: true,
            isPremium: true,
            onlyPremiumVisible: false,
            feeType: 'paid',
            feeAmount: 180,
            sponsoredBy: 'dealer',
            joinedUsers: []
          }),
          location: 'Fiorano Circuit, Italy',
          eventDate: '2026-07-04 at 09:30 AM',
          imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=500'
        },
        {
          id: 'evt_3',
          creatorId: 'dealer_stuttgart',
          title: 'Tokyo Midnight Highway Loop',
          description: JSON.stringify({
            description: 'A midnight cruise around the iconic metropolitan C1 expressway loop. Experience the neon lights and deep tunnels in disciplined convoy formations.',
            type: 'meetup',
            participantsCount: 89,
            hostName: 'Midnight Shuto Syndicate',
            hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=120',
            isHostGtrs: false,
            isPremium: false,
            onlyPremiumVisible: false,
            feeType: 'free',
            feeAmount: 0,
            sponsoredBy: 'private_sponsor',
            joinedUsers: []
          }),
          location: 'Daikoku Parking Area, Yokohama',
          eventDate: '2026-07-15 at 11:00 PM',
          imageUrl: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=500'
        },
        {
          id: 'evt_4',
          creatorId: 'dealer_maranello',
          title: 'Veloce Monaco Private Grid Rendezvous',
          description: JSON.stringify({
            description: 'Ultra-exclusive private yacht deck social gathering and closed-street hypercar track parade laps in Monaco. VIP pass credentials required.',
            type: 'track_day',
            participantsCount: 12,
            hostName: 'Veloce GT Club President',
            hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120',
            isHostGtrs: true,
            isPremium: true,
            onlyPremiumVisible: true,
            feeType: 'paid',
            feeAmount: 1250,
            sponsoredBy: 'dealer',
            joinedUsers: []
          }),
          location: 'Monaco Harbour Grid',
          eventDate: '2026-08-12 at 06:00 PM',
          imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=500'
        }
      ];

      for (const evt of eventsToSeed) {
        await db.insert(communityEvents).values({
          id: evt.id,
          creatorId: evt.creatorId,
          title: evt.title,
          description: evt.description,
          location: evt.location,
          eventDate: evt.eventDate,
          imageUrl: evt.imageUrl,
          createdAt: new Date()
        });
      }
      console.log("Database seeded successfully with default community events.");
    }
  } catch (seedErr) {
    console.error("Auto-seeding encountered an issue:", seedErr);
  }

  // API base route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Veloce API Backend" });
  });

  // Bearer authentication helper
  const verifyFirebaseUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authentication token" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      (req as any).user = decodedToken;
      next();
    } catch (err) {
      console.error("Token verification failed:", err);
      res.status(401).json({ error: "Invalid authentication credentials" });
    }
  };

  // Optional Authentication Helper (Doesn't throw error if token is missing/invalid)
  const optionalFirebaseUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        (req as any).user = decodedToken;
      } catch (err) {
        // Safe bypass
      }
    }
    next();
  };

  // Auth sync profile
  app.post("/api/auth/sync", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { name, role, avatar } = req.body;

    if (!user.email) {
      return res.status(400).json({ error: "User email is required" });
    }

    try {
      const selectedRole = role === "dealer" ? "dealer" : "user";
      const selectedTier = role === "dealer" ? "dealer_paid" : "free";

      const existingProfile = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, user.uid))
        .limit(1);

      let savedProfile;

      if (existingProfile.length > 0) {
        const updated = await db
          .update(profiles)
          .set({
            email: user.email,
            fullName: name || existingProfile[0].fullName,
            avatarUrl: avatar || existingProfile[0].avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, user.uid))
          .returning();
        savedProfile = updated[0];
      } else {
        const created = await db
          .insert(profiles)
          .values({
            id: user.uid,
            email: user.email,
            fullName: name || "Anonymous driver",
            avatarUrl: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150",
            role: selectedRole,
            subscriptionTier: selectedTier,
            kycStatus: "unverified",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        savedProfile = created[0];
      }

      res.json(savedProfile);
    } catch (err) {
      console.error("API Error synchronizing auth profile:", err);
      res.status(500).json({ error: "Failed to synchronize profile" });
    }
  });

  // Fetch standard profile
  app.get("/api/auth/profile", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;

    try {
      const profileList = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, user.uid))
        .limit(1);

      if (profileList.length === 0) {
        const defaultName = user.name || (user.email ? user.email.split("@")[0] : "Anonymous Driver");
        const defaultAvatar = user.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150";
        const created = await db
          .insert(profiles)
          .values({
            id: user.uid,
            email: user.email || "",
            fullName: defaultName,
            avatarUrl: defaultAvatar,
            role: "user",
            subscriptionTier: "free",
            kycStatus: "unverified",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        return res.json(created[0]);
      }

      res.json(profileList[0]);
    } catch (err) {
      console.error("API Error listing user profile:", err);
      res.status(500).json({ error: "Failed to retrieve user profile" });
    }
  });

  // Update profile attributes (KYC, Subscription, etc)
  app.put("/api/auth/profile", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { name, avatar, role, subscriptionTier, kycStatus } = req.body;

    try {
      const existingProfile = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, user.uid))
        .limit(1);

      if (existingProfile.length === 0) {
        return res.status(404).json({ error: "Profile not found." });
      }

      // Enforce: frontend cannot manually upgrade/change subscription or role via general profile edits
      if (subscriptionTier !== undefined && subscriptionTier !== existingProfile[0].subscriptionTier) {
        return res.status(403).json({ error: "Manual subscription tier upgrades are forbidden. Please use checkout." });
      }
      if (role !== undefined && role !== existingProfile[0].role) {
        return res.status(403).json({ error: "Manual role mutations are forbidden." });
      }

      // Prepare updates
      const updates: any = {
        updatedAt: new Date()
      };
      if (name !== undefined) updates.fullName = name;
      if (avatar !== undefined) updates.avatarUrl = avatar;
      if (kycStatus !== undefined) updates.kycStatus = kycStatus;

      const updated = await db
        .update(profiles)
        .set(updates)
        .where(eq(profiles.id, user.uid))
        .returning();

      res.json(updated[0]);
    } catch (err) {
      console.error("API Error updating user profile:", err);
      res.status(500).json({ error: "Failed to update profile details" });
    }
  });


  // ==========================================
  // PHASE 4 — VEHICLES DRIVER LISTING FLOWS
  // ==========================================

  // 1. GET /api/vehicles (Returns list matching client specs, fallback to seeded data)
  app.get("/api/vehicles", optionalFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const targetOwnerId = req.query.ownerId as string | undefined;

    try {
      const list = await db
        .select({
          vehicle: vehicles,
          owner: profiles
        })
        .from(vehicles)
        .leftJoin(profiles, eq(vehicles.ownerId, profiles.id))
        .orderBy(desc(vehicles.createdAt));

      // Fetch all reviews with reviewer details
      const allReviews = await db
        .select({
          review: reviews,
          reviewer: profiles
        })
        .from(reviews)
        .leftJoin(profiles, eq(reviews.reviewerId, profiles.id));

      const reviewsMap: Record<string, any[]> = {};
      allReviews.forEach(({ review, reviewer }) => {
        if (!review.vehicleId) return;
        if (!reviewsMap[review.vehicleId]) {
          reviewsMap[review.vehicleId] = [];
        }
        reviewsMap[review.vehicleId].push({
          id: review.id,
          carId: review.vehicleId,
          userName: reviewer?.fullName || "Verified Driver",
          userAvatar: reviewer?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120",
          rating: review.rating,
          comment: review.body,
          date: review.createdAt.toISOString().split('T')[0]
        });
      });

      // Filter based on status logic
      const mapped = list
        .filter(({ vehicle }) => {
          // If query ownerId matches, return all records for that owner
          if (targetOwnerId) {
            return vehicle.ownerId === targetOwnerId;
          }
          // Otherwise, general explore tab only shows ACTIVE listings
          // Or if user is logged in, their own draft/pending elements can appear in their custom query or active lists
          return vehicle.status === "active";
        })
        .map(({ vehicle, owner }) => {
          const type = (vehicle.rentalPriceDaily > 0 && vehicle.price > 0) ? 'both' : (vehicle.rentalPriceDaily > 0 ? 'rent' : 'buy');
          const carReviews = reviewsMap[vehicle.id] || [];
          const averageRating = carReviews.length > 0
            ? Number((carReviews.reduce((sum, r) => sum + r.rating, 0) / carReviews.length).toFixed(1))
            : 4.8;

          return {
            id: vehicle.id,
            brand: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            images: vehicle.images || [],
            price: type === 'rent' ? vehicle.rentalPriceDaily : vehicle.price,
            type: type,
            transmission: vehicle.transmission || 'Automatic',
            engine: `${vehicle.horsepower}HP ${vehicle.fuelType || 'Petrol'}`,
            power: vehicle.horsepower,
            acceleration: '2.9s',
            topSpeed: 320,
            location: vehicle.location,
            distance: 1.2,
            rating: averageRating,
            reviews: carReviews,
            description: vehicle.description,
            features: ['Assured Premium Cover', 'Dual Zone Climate Control', 'Signature LED Lighting', 'Satellite Navigation'],
            dealerId: vehicle.ownerId,
            dealerName: owner?.fullName || "Authorized Dealer",
            dealerAvatar: owner?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150",
            insuranceLevel: 'premium',
            category: vehicle.category,
            mileage: vehicle.mileage,
            status: vehicle.status
          };
        });

      res.json(mapped);
    } catch (err) {
      console.error("API failed to list vehicles:", err);
      res.status(500).json({ error: "Failed to load listings from database." });
    }
  });

  // 2. POST /api/vehicles (Create list item)
  app.post("/api/vehicles", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const body = req.body;

    if (!body.make || !body.model || !body.year) {
      return res.status(400).json({ error: "Incomplete listing details (Make, Model, and Year are required)." });
    }

    try {
      const generatedId = "car_" + Math.random().toString(36).substring(2, 11);
      
      const newRecord = {
        id: generatedId,
        ownerId: user.uid,
        title: `${body.brand || body.make} ${body.model}`,
        make: body.brand || body.make,
        model: body.model,
        year: parseInt(body.year) || 2025,
        price: body.type === 'rent' ? 0 : (parseInt(body.price) || 0),
        rentalPriceDaily: body.type === 'buy' ? 0 : (parseInt(body.price) || 150),
        location: body.location || 'Los Angeles, CA',
        description: body.description || 'Stunning luxury carriage offered by elite dealer network partner.',
        mileage: parseInt(body.mileage) || 500,
        transmission: body.transmission || 'Automatic',
        fuelType: body.displacement || 'Petrol',
        horsepower: parseInt(body.power) || 450,
        category: body.category || 'car',
        status: body.status || 'draft', // Flow: draft -> pending_review -> active
        images: body.images && body.images.length > 0 ? body.images : [
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000'
        ]
      };

      const result = await db.insert(vehicles).values({
        ...newRecord,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Retrieve owner profile for output
      const owner = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);

      const type = (result[0].rentalPriceDaily > 0 && result[0].price > 0) ? 'both' : (result[0].rentalPriceDaily > 0 ? 'rent' : 'buy');
      const mapped = {
        id: result[0].id,
        brand: result[0].make,
        model: result[0].model,
        year: result[0].year,
        images: result[0].images,
        price: type === 'rent' ? result[0].rentalPriceDaily : result[0].price,
        type: type,
        transmission: result[0].transmission,
        engine: `${result[0].horsepower}HP ${result[0].fuelType}`,
        power: result[0].horsepower,
        acceleration: '2.9s',
        topSpeed: 320,
        location: result[0].location,
        distance: 1.0,
        rating: 5.0,
        reviews: [],
        description: result[0].description,
        features: ['Assured Premium Cover'],
        dealerId: result[0].ownerId,
        dealerName: owner[0]?.fullName || "Authorized Partner",
        dealerAvatar: owner[0]?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150",
        insuranceLevel: 'premium',
        category: result[0].category,
        mileage: result[0].mileage,
        status: result[0].status
      };

      res.status(201).json(mapped);
    } catch (err) {
      console.error("API failed to create vehicle:", err);
      res.status(500).json({ error: "Failed to persist listing in database." });
    }
  });

  // 3. PUT /api/vehicles/:id (Edit listing and enforce owner-only bounds)
  app.put("/api/vehicles/:id", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const body = req.body;

    try {
      const match = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
      if (match.length === 0) {
        return res.status(404).json({ error: "Listing not found." });
      }

      if (match[0].ownerId !== user.uid) {
        return res.status(403).json({ error: "Unauthorized access: You are not the registrar for this vehicle." });
      }

      const isRent = body.type === 'rent';
      const isBuy = body.type === 'buy';

      const updated = await db
        .update(vehicles)
        .set({
          title: body.brand && body.model ? `${body.brand} ${body.model}` : match[0].title,
          make: body.brand || match[0].make,
          model: body.model || match[0].model,
          year: body.year ? parseInt(body.year) : match[0].year,
          price: isRent ? 0 : (body.price ? parseInt(body.price) : match[0].price),
          rentalPriceDaily: isBuy ? 0 : (body.price ? parseInt(body.price) : match[0].rentalPriceDaily),
          location: body.location || match[0].location,
          description: body.description || match[0].description,
          mileage: body.mileage ? parseInt(body.mileage) : match[0].mileage,
          transmission: body.transmission || match[0].transmission,
          fuelType: body.displacement || match[0].fuelType,
          horsepower: body.power ? parseInt(body.power) : match[0].horsepower,
          category: body.category || match[0].category,
          status: body.status || match[0].status,
          images: body.images && body.images.length > 0 ? body.images : match[0].images,
          updatedAt: new Date()
        })
        .where(eq(vehicles.id, id))
        .returning();

      const owner = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const type = (updated[0].rentalPriceDaily > 0 && updated[0].price > 0) ? 'both' : (updated[0].rentalPriceDaily > 0 ? 'rent' : 'buy');

      const mapped = {
        id: updated[0].id,
        brand: updated[0].make,
        model: updated[0].model,
        year: updated[0].year,
        images: updated[0].images,
        price: type === 'rent' ? updated[0].rentalPriceDaily : updated[0].price,
        type: type,
        transmission: updated[0].transmission,
        engine: `${updated[0].horsepower}HP ${updated[0].fuelType}`,
        power: updated[0].horsepower,
        acceleration: '2.9s',
        topSpeed: 320,
        location: updated[0].location,
        distance: 1.0,
        rating: 5.0,
        reviews: [],
        description: updated[0].description,
        features: ['Assured Premium Cover'],
        dealerId: updated[0].ownerId,
        dealerName: owner[0]?.fullName || "Authorized Partner",
        dealerAvatar: owner[0]?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150",
        insuranceLevel: 'premium',
        category: updated[0].category,
        mileage: updated[0].mileage,
        status: updated[0].status
      };

      res.json(mapped);
    } catch (err) {
      console.error("API failed to update vehicle:", err);
      res.status(500).json({ error: "Failed to persist listing updates in database." });
    }
  });

  // 4. DELETE /api/vehicles/:id (Removes listing)
  app.delete("/api/vehicles/:id", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;

    try {
      const match = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
      if (match.length === 0) {
        return res.status(404).json({ error: "Listing not found." });
      }

      if (match[0].ownerId !== user.uid) {
        return res.status(403).json({ error: "Unauthorized access: You are not the registrar for this vehicle." });
      }

      await db.delete(vehicles).where(eq(vehicles.id, id));
      res.json({ success: true, message: "Vehicle listing deleted successfully from database." });
    } catch (err) {
      console.error("API failed to delete vehicle:", err);
      res.status(500).json({ error: "Failed to delete listing from database." });
    }
  });


  // ==========================================
  // PHASE 5 — BOOKINGS RESERVATIONS
  // ==========================================

  // 1. GET /api/bookings (Fetch bookings for current authenticated renter)
  app.get("/api/bookings", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    try {
      const results = await db
        .select({
          booking: bookings,
          vehicle: vehicles
        })
        .from(bookings)
        .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
        .where(eq(bookings.renterId, user.uid))
        .orderBy(desc(bookings.createdAt));

      const formatted = results.map(({ booking, vehicle }) => ({
        id: booking.id,
        carId: booking.vehicleId,
        userId: booking.renterId,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalPrice: booking.totalPrice,
        insuranceType: 'premium',
        status: booking.status,
        pickupLocation: vehicle.location,
        paymentStatus: booking.paymentStatus
      }));

      res.json(formatted);
    } catch (err) {
      console.error("API failed to list bookings:", err);
      res.status(500).json({ error: "Failed to reload bookings from database." });
    }
  });

  // 2. POST /api/bookings (Create a trip reservation)
  app.post("/api/bookings", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const body = req.body;

    if (!body.carId || !body.startDate || !body.endDate || !body.totalPrice) {
      return res.status(400).json({ error: "Booking missing essential validation parameters." });
    }

    try {
      const matchVehicle = await db.select().from(vehicles).where(eq(vehicles.id, body.carId)).limit(1);
      if (matchVehicle.length === 0) {
        return res.status(404).json({ error: "Specified vehicle was not found in active registry." });
      }

      // Check for duplicate bookings/date conflicts on standard vehicles
      const existingBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.vehicleId, body.carId));

      const hasConflict = existingBookings.some(b => {
        // Skip cancelled bookings for conflicts
        if (b.status === "cancelled") return false;
        return b.startDate <= body.endDate && b.endDate >= body.startDate;
      });

      if (hasConflict) {
        return res.status(400).json({ error: "Booking conflict: This vehicle is already reserved for the selected dates." });
      }

      const generatedId = body.id || `BC-${Math.floor(Math.random() * 90000 + 10000)}`;

      await db.insert(bookings).values({
        id: generatedId,
        vehicleId: body.carId,
        renterId: user.uid,
        ownerId: matchVehicle[0].ownerId,
        startDate: body.startDate,
        endDate: body.endDate,
        totalPrice: parseInt(body.totalPrice) || 300,
        status: 'upcoming',
        paymentStatus: 'pending' // Payment status starts as pending, changes only after webhook simulation
      });

      res.status(201).json({
        id: generatedId,
        carId: body.carId,
        userId: user.uid,
        startDate: body.startDate,
        endDate: body.endDate,
        totalPrice: parseInt(body.totalPrice) || 300,
        insuranceType: body.insuranceType || 'premium',
        status: 'upcoming',
        pickupLocation: matchVehicle[0].location,
        paymentStatus: 'pending'
      });
    } catch (err) {
      console.error("API failed to create booking:", err);
      res.status(500).json({ error: "Failed to write booking to database." });
    }
  });

  // 3. PUT /api/bookings/:id/cancel
  app.put("/api/bookings/:id/cancel", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    try {
      const match = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
      if (match.length === 0) {
        return res.status(404).json({ error: "Booking assignment not found." });
      }
      if (match[0].renterId !== user.uid) {
        return res.status(403).json({ error: "Access denied." });
      }

      await db.delete(bookings).where(eq(bookings.id, id));
      res.json({ success: true });
    } catch (err) {
      console.error("API failed to cancel booking:", err);
      res.status(500).json({ error: "Database transaction failed." });
    }
  });

  // 4. PUT /api/bookings/:id/extend
  app.put("/api/bookings/:id/extend", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    try {
      const match = await db
        .select({
          booking: bookings,
          vehicle: vehicles
        })
        .from(bookings)
        .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
        .where(eq(bookings.id, id))
        .limit(1);

      if (match.length === 0) {
        return res.status(404).json({ error: "Booking assignment not found." });
      }
      const { booking, vehicle } = match[0];
      if (booking.renterId !== user.uid) {
        return res.status(403).json({ error: "Access denied." });
      }

      const currentEnd = new Date(booking.endDate);
      currentEnd.setDate(currentEnd.getDate() + 3);
      const updatedEndDate = currentEnd.toISOString().split('T')[0];
      const dailyRate = vehicle.rentalPriceDaily > 0 ? vehicle.rentalPriceDaily : 150;
      const extraCost = dailyRate * 3;
      const updatedPrice = booking.totalPrice + extraCost;

      const result = await db
        .update(bookings)
        .set({
          endDate: updatedEndDate,
          totalPrice: updatedPrice,
          updatedAt: new Date()
        })
        .where(eq(bookings.id, id))
        .returning();

      res.json({
        id: result[0].id,
        carId: result[0].vehicleId,
        userId: result[0].renterId,
        startDate: result[0].startDate,
        endDate: result[0].endDate,
        totalPrice: result[0].totalPrice,
        insuranceType: 'premium',
        status: result[0].status as any,
        pickupLocation: vehicle.location,
        paymentStatus: result[0].paymentStatus as any
      });
    } catch (err) {
      console.error("API failed to extend booking:", err);
      res.status(500).json({ error: "Database transaction failed." });
    }
  });

  // ==========================================
  // PHASE 6 — CHATS & PEER-TO-PEER MESSAGES
  // ==========================================

  // 1. GET /api/chats (Fetches user conversations, auto-seeds default chats if empty)
  app.get("/api/chats", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    try {
      // Find conversations involving this user
      const convs1 = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userOne, user.uid));

      const convs2 = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userTwo, user.uid));

      // Merge and deduplicate
      const convsMap = new Map<string, any>();
      for (const c of convs1) convsMap.set(c.id, c);
      for (const c of convs2) convsMap.set(c.id, c);
      const allConvs = Array.from(convsMap.values());

      if (allConvs.length === 0) {
        // Let's create default conversations dynamically tied to current logged-in driver
        const id1 = `chat_sf90_${user.uid}`;
        const id2 = `chat_gt3_${user.uid}`;

        // Insert conversation 1
        await db.insert(conversations).values({
          id: id1,
          vehicleId: 'car_001',
          userOne: user.uid,
          userTwo: 'dealer_maranello',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Insert conversation 2
        await db.insert(conversations).values({
          id: id2,
          vehicleId: 'car_002',
          userOne: user.uid,
          userTwo: 'dealer_stuttgart',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Insert initial messages for conversation 1
        await db.insert(messages).values([
          {
            id: `msg_1_${Date.now()}`,
            conversationId: id1,
            senderId: 'dealer_maranello',
            body: 'Congratulations on matching with this Ferrari SF90 Stradale. Would you like to pick it up at our Beverly Hills location, or should we deliver it to you?',
            createdAt: new Date(Date.now() - 12 * 60 * 1000), // 12 mins ago
          },
          {
            id: `msg_2_${Date.now()}`,
            conversationId: id1,
            senderId: user.uid,
            body: 'Beverly Hills works best for me. Do I need to provide extra insurance?',
            createdAt: new Date(Date.now() - 4 * 60 * 1000), // 4 mins ago
          },
          {
            id: `msg_3_${Date.now()}`,
            conversationId: id1,
            senderId: 'dealer_maranello',
            body: 'Every booking includes standard insurance. We recommend choosing our Full Coverage option for complete peace of mind during your drive.',
            createdAt: new Date(),
          }
        ]);

        // Insert initial messages for conversation 2
        await db.insert(messages).values([
          {
            id: `msg_4_${Date.now()}`,
            conversationId: id2,
            senderId: 'dealer_stuttgart',
            body: 'Hello, your car is fully serviced, tire pressures are perfect, and it is ready to go!',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
          }
        ]);

        // Re-get
        const seeded1 = await db.select().from(conversations).where(eq(conversations.userOne, user.uid));
        const seeded2 = await db.select().from(conversations).where(eq(conversations.userTwo, user.uid));
        for (const c of seeded1) convsMap.set(c.id, c);
        for (const c of seeded2) convsMap.set(c.id, c);
      }

      const mappedSessions = [];
      const activeConvs = Array.from(convsMap.values());

      for (const conv of activeConvs) {
        let carObj : any = null;
        if (conv.vehicleId) {
          const carRes = await db.select().from(vehicles).where(eq(vehicles.id, conv.vehicleId)).limit(1);
          if (carRes.length > 0) {
            carObj = carRes[0];
          }
        }

        const otherUserId = conv.userOne === user.uid ? conv.userTwo : conv.userOne;

        const otherProfileRes = await db.select().from(profiles).where(eq(profiles.id, otherUserId)).limit(1);
        const myProfileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);

        const otherProfile = (otherProfileRes[0] || {}) as any;
        const myProfile = (myProfileRes[0] || {}) as any;

        const convMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id));

        // Sort messages in javascript cleanly to keep order perfect
        convMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        const chatMsgs = convMessages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderId === user.uid ? (myProfile.fullName || "Me") : (otherProfile.fullName || "Official Dealer"),
          text: m.body,
          timestamp: m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: m.readAt ? 'seen' : 'sent' as any
        }));

        const lastMsg = chatMsgs[chatMsgs.length - 1];
        const unreadCount = convMessages.filter(m => m.senderId !== user.uid && !m.readAt).length;

        mappedSessions.push({
          id: conv.id,
          carId: conv.vehicleId || "",
          userId: conv.userOne === user.uid ? conv.userOne : conv.userTwo,
          dealerId: otherUserId,
          carName: carObj ? `${carObj.make} ${carObj.model}` : "Premium Supercar",
          carImage: carObj && carObj.images && carObj.images[0] ? carObj.images[0] : "https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=200",
          dealerName: otherProfile.fullName || "Official Veloce Representative",
          dealerAvatar: otherProfile.avatarUrl || "https://images.unsplash.com/photo-1542841791-1926673bf69b?q=80&w=120",
          userName: myProfile.fullName || "Anonymous Driver",
          lastMessage: lastMsg ? lastMsg.text : "Chat started.",
          timestamp: lastMsg ? lastMsg.timestamp : "Just Now",
          unread: unreadCount > 0,
          messages: chatMsgs
        });
      }

      res.json(mappedSessions);
    } catch (err) {
      console.error("API error loading user conversations:", err);
      res.status(500).json({ error: "Failed to retrieve conversation logs." });
    }
  });

  // 2. POST /api/chats (Start conversation)
  app.post("/api/chats", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { vehicleId, dealerId } = req.body;

    if (!vehicleId || !dealerId) {
      return res.status(400).json({ error: "Missing vehicleId or dealerId." });
    }

    try {
      const existing1 = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.vehicleId, vehicleId),
            eq(conversations.userOne, user.uid),
            eq(conversations.userTwo, dealerId)
          )
        );

      const existing2 = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.vehicleId, vehicleId),
            eq(conversations.userOne, dealerId),
            eq(conversations.userTwo, user.uid)
          )
        );

      if (existing1.length > 0 || existing2.length > 0) {
        const match = existing1[0] || existing2[0];
        return res.json({ id: match.id, status: "exists" });
      }

      const newId = `chat_sess_${Date.now()}`;

      await db.insert(conversations).values({
        id: newId,
        vehicleId,
        userOne: user.uid,
        userTwo: dealerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const carRes = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
      const carObj = carRes[0];
      const welcomeText = carObj 
        ? `Welcome! Let us know how we can make your ${carObj.make} ${carObj.model} experience perfect. We are here to help!`
        : `Welcome! Let us know how we can assist you with this premium listing today. Our specialist team is at your disposal.`;

      await db.insert(messages).values({
        id: `msg_w_${Date.now()}`,
        conversationId: newId,
        senderId: dealerId,
        body: welcomeText,
        createdAt: new Date(),
      });

      res.status(201).json({ id: newId, status: "created" });
    } catch (err) {
      console.error("API failed to build conversation channel:", err);
      res.status(500).json({ error: "Database error." });
    }
  });

  // 3. POST /api/chats/:id/messages (Sends a message)
  app.post("/api/chats/:id/messages", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const conversationId = req.params.id;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Message text is required." });
    }

    try {
      const convRes = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
      if (convRes.length === 0) {
        return res.status(404).json({ error: "Conversation not found." });
      }

      const conv = convRes[0];
      if (conv.userOne !== user.uid && conv.userTwo !== user.uid) {
        return res.status(403).json({ error: "Access denied." });
      }

      const newMsgId = `msg_${Date.now()}`;
      await db.insert(messages).values({
        id: newMsgId,
        conversationId,
        senderId: user.uid,
        body: text,
        createdAt: new Date(),
      });

      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));

      res.status(201).json({
        id: newMsgId,
        senderId: user.uid,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent'
      });
    } catch (err) {
      console.error("API failed to dispatch message:", err);
      res.status(500).json({ error: "Database transaction failed." });
    }
  });

  // 4. PUT /api/chats/:id/read (Marks messages in conversation as read)
  app.put("/api/chats/:id/read", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const conversationId = req.params.id;

    try {
      await db
        .update(messages)
        .set({ readAt: new Date() })
        .where(eq(messages.conversationId, conversationId));

      res.json({ status: "success" });
    } catch (err) {
      console.error("API failed to mark read state:", err);
      res.status(500).json({ error: "Database transmission failed." });
    }
  });

  // 5. POST /api/chats/:id/simulate (Simulates auto-responses from dealers in db via Gemini, with graceful fallback to static list)
  app.post("/api/chats/:id/simulate", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const conversationId = req.params.id;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing response text." });
    }

    try {
      const convRes = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
      if (convRes.length === 0) {
        return res.status(404).json({ error: "Conversation not found." });
      }

      const conv = convRes[0];
      if (conv.userOne !== user.uid && conv.userTwo !== user.uid) {
        return res.status(403).json({ error: "Access denied." });
      }

      // Dealer is the participant that is NOT the active logged-in user
      const dealerId = conv.userOne === user.uid ? conv.userTwo : conv.userOne;

      // 1. Fetch vehicle details (if any)
      let vehicleDetails = "";
      if (conv.vehicleId) {
        const carRes = await db.select().from(vehicles).where(eq(vehicles.id, conv.vehicleId)).limit(1);
        if (carRes.length > 0) {
          const car = carRes[0];
          vehicleDetails = `Vehicle: ${car.year} ${car.make} ${car.model} (${car.horsepower} HP, ${car.mileage} miles, Price: $${car.price}, Rental: $${car.rentalPriceDaily}/day). Description: "${car.description}".`;
        }
      }

      // 2. Fetch dealer role details (sender name)
      const dealerProfileRes = await db.select().from(profiles).where(eq(profiles.id, dealerId)).limit(1);
      const dealerName = dealerProfileRes[0]?.fullName || "Official Dealer";

      // 3. Fetch recent message history to provide context
      const recentMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(10);
      
      // Reverse order to make it chronological
      recentMessages.reverse();

      const userProfileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const userName = userProfileRes[0]?.fullName || "Client";

      const historyText = recentMessages
        .map(m => {
          const senderLabel = m.senderId === user.uid ? userName : dealerName;
          return `${senderLabel}: ${m.body}`;
        })
        .join("\n");

      // Check if we can use Gemini
      let replyBody = text;
      const geminiClient = getGeminiClient();
      if (geminiClient) {
        try {
          const prompt = `You are a professional luxury car dealer representative named "${dealerName}" for "Veloce Hypercar Portal".
You are conversing with a customer named "${userName}" about the following luxury vehicle:
${vehicleDetails || "A luxury high-end supercar"}.

Here is the recent conversation history:
${historyText}

Respond as "${dealerName}". Be professional, knowledgeable, exclusive, and exciting.
Guidelines:
- Keep the response short (1 to 3 sentences maximum) suitable for an instant chat app.
- Do NOT prefix your response with your name (e.g., do NOT start with "${dealerName}:").
- Address the client's last message naturally. Do not sound generic.
- Promote active rentals, bespoke custom specifications, or booking confirmation if appropriate.`;

          const response = await geminiClient.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
          });

          if (response.text) {
            replyBody = response.text.trim();
          }
        } catch (geminiErr) {
          console.error("Gemini call failed, falling back to static text:", geminiErr);
          // Keep default replyBody = text
        }
      }

      const newMsgId = `msg_sys_${Date.now()}`;
      await db.insert(messages).values({
        id: newMsgId,
        conversationId,
        senderId: dealerId,
        body: replyBody,
        createdAt: new Date(),
      });

      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));

      res.status(201).json({
        id: newMsgId,
        senderId: dealerId,
        text: replyBody,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent'
      });
    } catch (err) {
      console.error("API failed to simulate auto-reply:", err);
      res.status(500).json({ error: "Database transaction failed." });
    }
  });


  // ==========================================
  // PHASE 7 — COMMUNITY EVENTS, RSVPs & REVIEWS SOCIAL BACKEND
  // ==========================================

  // 1. GET /api/community/events
  app.get("/api/community/events", optionalFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    try {
      const list = await db.select().from(communityEvents).orderBy(desc(communityEvents.createdAt));
      const mapped = list.map(evt => {
        let meta: any = {};
        try {
          meta = JSON.parse(evt.description);
        } catch (e) {
          meta = { description: evt.description };
        }

        const joinedUsers = meta.joinedUsers || [];
        const isJoined = user ? joinedUsers.includes(user.uid) : false;

        return {
          id: evt.id,
          title: evt.title,
          description: meta.description || "",
          type: meta.type || "meetup",
          date: evt.eventDate,
          location: evt.location,
          participantsCount: meta.participantsCount || joinedUsers.length || 0,
          hostName: meta.hostName || "Authorized Representative",
          hostAvatar: meta.hostAvatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=120",
          isHostGtrs: meta.isHostGtrs ?? false,
          isPremium: meta.isPremium ?? false,
          onlyPremiumVisible: meta.onlyPremiumVisible ?? false,
          feeType: meta.feeType || "free",
          feeAmount: meta.feeAmount || 0,
          sponsoredBy: meta.sponsoredBy || "private_sponsor",
          joined: isJoined
        };
      });
      res.json(mapped);
    } catch (err) {
      console.error("API failed to load community events:", err);
      res.status(500).json({ error: "Database error." });
    }
  });

  // 2. POST /api/community/events
  app.post("/api/community/events", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { 
      title, 
      description, 
      type, 
      date, 
      location, 
      isPremium, 
      feeType, 
      feeAmount, 
      sponsoredBy 
    } = req.body;

    if (!title || !description || !date || !location) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    try {
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const hostProfile = (profileRes[0] || {}) as any;

      const eventId = `evt_user_${Date.now()}`;
      const meta = {
        description,
        type: type || "meetup",
        participantsCount: 1,
        hostName: hostProfile.fullName || "Enthusiastic Driver",
        hostAvatar: hostProfile.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120",
        isHostGtrs: hostProfile.subscriptionTier === "dealer_paid" || sponsoredBy === "dealer",
        isPremium: !!isPremium,
        onlyPremiumVisible: !!isPremium,
        feeType: feeType || "free",
        feeAmount: Number(feeAmount) || 0,
        sponsoredBy: sponsoredBy || "private_sponsor",
        joinedUsers: [user.uid] // Creator automatically RSVP'd
      };

      await db.insert(communityEvents).values({
        id: eventId,
        creatorId: user.uid,
        title,
        description: JSON.stringify(meta),
        location,
        eventDate: date,
        imageUrl: "https://images.unsplash.com/photo-1702677945037-336df77d853e?q=80&w=600",
        createdAt: new Date()
      });

      res.status(201).json({ id: eventId, success: true });
    } catch (err) {
      console.error("API failed to create community event:", err);
      res.status(500).json({ error: "Database transaction failed." });
    }
  });

  // 3. POST /api/community/events/:id/rsvp
  app.post("/api/community/events/:id/rsvp", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const eventId = req.params.id;

    try {
      const existing = await db.select().from(communityEvents).where(eq(communityEvents.id, eventId)).limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: "Event not found." });
      }

      const evtObj = existing[0];
      let meta: any = {};
      try {
        meta = JSON.parse(evtObj.description);
      } catch (e) {
        meta = { description: evtObj.description };
      }

      let joinedUsers = meta.joinedUsers || [];
      const hasJoined = joinedUsers.includes(user.uid);

      if (hasJoined) {
        // Leave
        joinedUsers = joinedUsers.filter((uid: string) => uid !== user.uid);
        meta.participantsCount = Math.max(0, (meta.participantsCount || 1) - 1);
      } else {
        // Join
        joinedUsers.push(user.uid);
        meta.participantsCount = (meta.participantsCount || 0) + 1;
      }

      meta.joinedUsers = joinedUsers;

      await db.update(communityEvents)
        .set({ description: JSON.stringify(meta) })
        .where(eq(communityEvents.id, eventId));

      res.json({
        id: eventId,
        joined: !hasJoined,
        participantsCount: meta.participantsCount
      });
    } catch (err) {
      console.error("API failed to toggle RSVP:", err);
      res.status(500).json({ error: "Database transaction failed." });
    }
  });

  // 4. POST /api/vehicles/:id/reviews
  app.post("/api/vehicles/:id/reviews", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const vehicleId = req.params.id;
    const { rating, body } = req.body;

    if (!rating || !body) {
      return res.status(400).json({ error: "Rating and comment body are required." });
    }

    try {
      const reviewId = `rev_${Date.now()}`;
      await db.insert(reviews).values({
        id: reviewId,
        reviewerId: user.uid,
        vehicleId,
        rating: Math.round(Number(rating)),
        body,
        createdAt: new Date()
      });

      // Retrieve poster's profile info to respond immediately to client
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const profile = (profileRes[0] || {}) as any;

      res.status(201).json({
        id: reviewId,
        carId: vehicleId,
        userName: profile.fullName || "Verified Driver",
        userAvatar: profile.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120",
        rating: Number(rating),
        comment: body,
        date: new Date().toISOString().split("T")[0]
      });
    } catch (err) {
      console.error("API failed to log review:", err);
      res.status(500).json({ error: "Failed to post review to Postgres." });
    }
  });


  // ==========================================
  // PHASE 8 — SUBSCRIPTIONS & ROLES MIDDLEWARE (STRIPE CHECKOUT SIMULATION)
  // ==========================================

  // 1. POST /api/billing/create-checkout-session
  app.post("/api/billing/create-checkout-session", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { tier } = req.body;

    if (!tier || (tier !== "veloce_gt" && tier !== "dealer_paid")) {
      return res.status(400).json({ error: "Invalid subscription tier targeted." });
    }

    try {
      // Return a stateless session ID containing the target tier encoded with a timestamp
      const sessionId = `stripe_cs_mock_${tier}_${Date.now()}`;
      res.json({
        success: true,
        sessionId,
        url: `/checkout?session_id=${sessionId}`
      });
    } catch (err) {
      console.error("Failed to initiate billing portal session:", err);
      res.status(500).json({ error: "Billing backend transaction failed." });
    }
  });

  // 2. POST /api/billing/verify-checkout-session
  app.post("/api/billing/verify-checkout-session", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session identification is required." });
    }

    try {
      // Decode the target tier from the mock session ID
      let tier: "veloce_gt" | "dealer_paid" = "veloce_gt";
      if (sessionId.includes("dealer_paid")) {
        tier = "dealer_paid";
      }

      const role = tier === "dealer_paid" ? "dealer" : "user";

      // 1. Update the user profile
      const updatedProfileRes = await db
        .update(profiles)
        .set({
          subscriptionTier: tier,
          role: role,
          updatedAt: new Date()
        })
        .where(eq(profiles.id, user.uid))
        .returning();

      if (updatedProfileRes.length === 0) {
        return res.status(404).json({ error: "Active user profile was not found." });
      }

      // 2. Create the subscription history row
      const subId = `sub_mock_${Date.now()}`;
      await db.insert(subscriptions).values({
        id: subId,
        userId: user.uid,
        stripeCustomerId: `cus_mock_${Date.now()}`,
        stripeSubscriptionId: `sub_mock_id_${Date.now()}`,
        tier: tier,
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.json({
        success: true,
        profile: updatedProfileRes[0],
        subscription: {
          id: subId,
          tier,
          status: "active",
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      });
    } catch (err) {
      console.error("Failed to verify billing session status:", err);
      res.status(500).json({ error: "Checkout session verification failed." });
    }
  });

  // 4. POST /api/billing/webhook (Stripe webhook simulation for custom validations)
  app.post("/api/billing/webhook", async (req, res) => {
    const { type, data } = req.body;

    if (!type || !data || !data.object) {
      return res.status(400).json({ error: "Invalid stripe webhook payload format." });
    }

    try {
      if (type === "checkout.session.completed") {
        const session = data.object;
        const bookingId = session.metadata?.bookingId;

        if (bookingId) {
          // It's a rental payment checkout session webhook simulation
          const updated = await db
            .update(bookings)
            .set({ paymentStatus: "paid", updatedAt: new Date() })
            .where(eq(bookings.id, bookingId))
            .returning();

          if (updated.length === 0) {
            return res.status(404).json({ error: "Booking target from stripe metadata not found." });
          }

          console.log(`Stripe Webhook processed: Booking ${bookingId} paymentStatus set to paid.`);
          return res.json({
            received: true,
            status: "success",
            message: "paymentStatus updated successfully to paid after webhook simulation",
            booking: updated[0]
          });
        }
      }

      res.status(250).json({ received: true, status: "ignored" });
    } catch (err: any) {
      console.error("Webhook execution failed:", err);
      res.status(500).json({ error: "Webhook process exception." });
    }
  });

  // 3. POST /api/billing/cancel-subscription
  app.post("/api/billing/cancel-subscription", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;

    try {
      // Update profile back to free
      const updatedProfileRes = await db
        .update(profiles)
        .set({
          subscriptionTier: "free",
          role: "user", // Reset back as free user role
          updatedAt: new Date()
        })
        .where(eq(profiles.id, user.uid))
        .returning();

      // Set active subscriptions to cancelled
      await db.update(subscriptions)
        .set({
          status: "cancelled",
          updatedAt: new Date()
        })
        .where(and(eq(subscriptions.userId, user.uid), eq(subscriptions.status, "active")));

      res.json({
        success: true,
        profile: updatedProfileRes[0]
      });
    } catch (err) {
      console.error("Failed to cancel active subscription:", err);
      res.status(500).json({ error: "Subscription cancellation service failed." });
    }
  });


  // ==========================================
  // PHASE 9 — UGC SAFETY, COMPLIANCE & ADMIN MODERATION HUB
  // ==========================================

  // 1. POST /api/reports - Create a safety/content report
  app.post("/api/reports", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { targetType, targetId, reason } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: "Missing required report fields." });
    }

    try {
      const reportId = `rep_${Date.now()}`;
      await db.insert(adminReports).values({
        id: reportId,
        reporterId: user.uid,
        targetType,
        targetId,
        reason,
        status: "pending",
        createdAt: new Date()
      });

      res.status(201).json({
        success: true,
        message: "Content successfully reported. Our UGC moderation team will review this asset shortly.",
        reportId
      });
    } catch (err) {
      console.error("Failed to insert safety report:", err);
      res.status(500).json({ error: "Could not record safety report." });
    }
  });

  // 2. GET /api/reports - Fetch all reports (Admins only)
  app.get("/api/reports", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;

    try {
      // Confirm requestor is admin
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const profile = profileRes[0];
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      // Fetch all reports
      const reports = await db
        .select()
        .from(adminReports)
        .orderBy(desc(adminReports.createdAt));

      // Fetch reporter details to join manually
      const reporterIds = [...new Set(reports.map(r => r.reporterId))];
      const reporterProfilesMap: Record<string, any> = {};
      
      if (reporterIds.length > 0) {
        for (const id of reporterIds) {
          const uProfile = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
          if (uProfile[0]) {
            reporterProfilesMap[id] = uProfile[0];
          }
        }
      }

      const enrichedReports = reports.map(r => ({
        ...r,
        reporterName: reporterProfilesMap[r.reporterId]?.fullName || "Veloce Member",
        reporterEmail: reporterProfilesMap[r.reporterId]?.email || "hidden"
      }));

      res.json(enrichedReports);
    } catch (err) {
      console.error("Failed to load moderation reports:", err);
      res.status(500).json({ error: "Could not load safety reports." });
    }
  });

  // 3. PUT /api/reports/:id/resolve - Mark a report as resolved
  app.put("/api/reports/:id/resolve", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;

    try {
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const profile = profileRes[0];
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      const updated = await db
        .update(adminReports)
        .set({ status: "resolved" })
        .where(eq(adminReports.id, id))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "Report was not found." });
      }

      res.json({ success: true, report: updated[0] });
    } catch (err) {
      console.error("Failed to resolve report:", err);
      res.status(500).json({ error: "Could not update report status." });
    }
  });

  // 4. DELETE /api/admin/vehicles/:id - Remove reported vehicle (Admins only)
  app.delete("/api/admin/vehicles/:id", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;

    try {
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const profile = profileRes[0];
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      const deleted = await db
        .delete(vehicles)
        .where(eq(vehicles.id, id))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: "Vehicle was not found." });
      }

      // Automatically resolve associated reports
      await db
        .update(adminReports)
        .set({ status: "resolved" })
        .where(and(eq(adminReports.targetId, id), eq(adminReports.targetType, "vehicle")));

      res.json({ success: true, message: "Vehicle removed successfully by Admin." });
    } catch (err) {
      console.error("Failed to delete vehicle as admin:", err);
      res.status(500).json({ error: "Failed to remove vehicle." });
    }
  });

  // 5. DELETE /api/admin/community/events/:id - Remove reported community event (Admins only)
  app.delete("/api/admin/community/events/:id", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;

    try {
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const profile = profileRes[0];
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      const deleted = await db
        .delete(communityEvents)
        .where(eq(communityEvents.id, id))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: "Event was not found." });
      }

      // Automatically resolve associated reports
      await db
        .update(adminReports)
        .set({ status: "resolved" })
        .where(and(eq(adminReports.targetId, id), eq(adminReports.targetType, "event")));

      res.json({ success: true, message: "Event removed successfully by Admin." });
    } catch (err) {
      console.error("Failed to delete event as admin:", err);
      res.status(500).json({ error: "Failed to remove event." });
    }
  });

  // 6. PUT /api/auth/profile/role - Toggle current user's role on server (Simulation helper)
  app.put("/api/auth/profile/role", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { role } = req.body;

    if (!role || (role !== "user" && role !== "dealer" && role !== "admin")) {
      return res.status(400).json({ error: "Invalid role value." });
    }

    try {
      const updated = await db
        .update(profiles)
        .set({ role, updatedAt: new Date() })
        .where(eq(profiles.id, user.uid))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "Profile was not found." });
      }

      res.json({ success: true, profile: updated[0] });
    } catch (err) {
      console.error("Failed to update user's role:", err);
      res.status(500).json({ error: "Could not alter user role." });
    }
  });


  // ==========================================
  // PHASE 10 — ADMIN DASHBOARD BACKEND SERVICE
  // ==========================================

  // 1. GET /api/admin/users - Fetch all registered profiles (Admins only)
  app.get("/api/admin/users", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;

    try {
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const profile = profileRes[0];
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      const allUsers = await db.select().from(profiles).orderBy(desc(profiles.createdAt));
      res.json(allUsers);
    } catch (err) {
      console.error("Failed to load admin users:", err);
      res.status(500).json({ error: "Could not retrieve user directory." });
    }
  });

  // 2. GET /api/admin/bookings - Fetch all reservations (Admins only)
  app.get("/api/admin/bookings", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;

    try {
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const profile = profileRes[0];
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      const allBookings = await db.select().from(bookings).orderBy(desc(bookings.createdAt));

      // Fetch renter profile and vehicle details manually to avoid complex joins failing if client-side mock schemas have mismatching fields
      const enrichedBookings = [];
      for (const b of allBookings) {
        const rProfile = await db.select().from(profiles).where(eq(profiles.id, b.renterId)).limit(1);
        const car = await db.select().from(vehicles).where(eq(vehicles.id, b.vehicleId)).limit(1);
        enrichedBookings.push({
          ...b,
          renterName: rProfile[0]?.fullName || "Veloce Guest",
          renterEmail: rProfile[0]?.email || "no-email",
          vehicleTitle: car[0] ? `${car[0].year} ${car[0].make} ${car[0].model}` : "Unknown Luxury Vehicle",
          vehicleImage: car[0]?.images?.[0] || ""
        });
      }

      res.json(enrichedBookings);
    } catch (err) {
      console.error("Failed to fetch admin bookings:", err);
      res.status(500).json({ error: "Could not retrieve reservation logs." });
    }
  });

  // 3. GET /api/admin/vehicles - Fetch all vehicle listings (Admins only)
  app.get("/api/admin/vehicles", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;

    try {
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const profile = profileRes[0];
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      const allVehicles = await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
      res.json(allVehicles);
    } catch (err) {
      console.error("Failed to retrieve admin vehicle list:", err);
      res.status(500).json({ error: "Could not retrieve fleet catalog." });
    }
  });

  // 4. PUT /api/admin/vehicles/:id/status - Approve, reject or modify vehicle listing state (Admins only)
  app.put("/api/admin/vehicles/:id/status", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || (status !== "active" && status !== "pending_review" && status !== "rejected" && status !== "draft")) {
      return res.status(400).json({ error: "Invalid listing status transition requested." });
    }

    try {
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const profile = profileRes[0];
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      const updated = await db
        .update(vehicles)
        .set({ status, updatedAt: new Date() })
        .where(eq(vehicles.id, id))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "Vehicle listing not found." });
      }

      res.json({ success: true, vehicle: updated[0] });
    } catch (err) {
      console.error("Failed to alter vehicle status as admin:", err);
      res.status(500).json({ error: "Could not update vehicle registry state." });
    }
  });

  // 5. GET /api/admin/metrics - High level marketplace transaction analytics (Admins only)
  app.get("/api/admin/metrics", verifyFirebaseUser, async (req, res) => {
    const user = (req as any).user;

    try {
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, user.uid)).limit(1);
      const profile = profileRes[0];
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      const usersList = await db.select().from(profiles);
      const vehiclesList = await db.select().from(vehicles);
      const bookingsList = await db.select().from(bookings);
      const reportsList = await db.select().from(adminReports);

      const totalUsers = usersList.length;
      const totalDealers = usersList.filter(u => u.role === "dealer").length;
      const totalAdmins = usersList.filter(u => u.role === "admin").length;

      const activeListings = vehiclesList.filter(v => v.status === "active").length;
      const pendingReviewListings = vehiclesList.filter(v => v.status === "pending_review").length;

      const pendingBookingsCount = bookingsList.filter(b => b.status === "pending").length;
      const activeBookingsCount = bookingsList.filter(b => b.status === "confirmed").length;
      
      const totalPriceVal = bookingsList
        .filter(b => b.status === "completed" || b.status === "confirmed")
        .reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);

      const pendingReportsCount = reportsList.filter(r => r.status === "pending").length;

      res.json({
        totalUsers,
        totalDealers,
        totalAdmins,
        activeListings,
        pendingReviewListings,
        pendingBookingsCount,
        activeBookingsCount,
        totalVolumeUSD: totalPriceVal,
        pendingReportsCount
      });
    } catch (err) {
      console.error("Failed to construct admin metrics summary:", err);
      res.status(500).json({ error: "Could not build transaction metrics." });
    }
  });


  // Support serving front-end bundle as Vite dev server or static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Veloce full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
