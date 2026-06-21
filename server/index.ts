// server/index.ts
import { app } from "./app.ts";
import { db } from "../src/db/index.ts";
import { profiles, vehicles, communityEvents } from "../src/db/schema.ts";
import { eq } from "drizzle-orm";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { logger } from "./utils/logger.ts";
import { env } from "./config/env.ts";

const PORT = env.PORT || 3000;

async function bootstrap() {
  logger.info("Initializing Veloce production-ready modular micro-backend...");

  // Run database self-healing seedings on startup
  try {
    // Seed core dealership profiles to satisfy foreign key constraints
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

    // Seed luxury vehicles if the vehicles table is empty
    const existingVehicles = await db.select().from(vehicles).limit(1);
    if (existingVehicles.length === 0) {
      logger.info("Seeding default luxury listings to database...");

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
          updatedAt: new Date()
        });
      }
      logger.info("Database seeded successfully with default premium listings.");
    }

    // Seed community events if empty
    const existingEvents = await db.select().from(communityEvents).limit(1);
    if (existingEvents.length === 0) {
      logger.info("Seeding default community events to database...");
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
      logger.info("Database seeded successfully with default community events.");
    }
  } catch (seedErr) {
    logger.error("Auto-seeding database failed:", seedErr);
  }

  // Mount Vite middleware in development or serve static files in production
  if (env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    logger.info("Integrated Vite HMR middleware for dynamic routing.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    logger.info("Express serving static production assets.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Veloce Backend Server fully operational on port ${PORT}`);
  });
}

bootstrap();
export default app;
