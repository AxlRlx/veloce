// server/services/community.service.ts
import { db } from "../../src/db/index.ts";
import { communityEvents } from "../../src/db/schema.ts";
import { eq } from "drizzle-orm";
import { ApiError } from "../utils/errors.ts";
import { generateId } from "../utils/ids.ts";

export class CommunityService {
  static async listEvents(userProfile?: any) {
    const list = await db.select().from(communityEvents);
    
    // Sort or filter if necessary
    return list;
  }

  static async createEvent(uid: string, body: any) {
    const { title, description, location, eventDate, imageUrl } = body;

    if (!title || title.trim() === "") {
      throw new ApiError(400, "Event title is a required field.");
    }

    const generatedId = generateId("evt");

    // Check if description is a JSON string already or structured object
    let descValue = typeof description === "object" ? JSON.stringify(description) : description;

    const created = await db.insert(communityEvents).values({
      id: generatedId,
      creatorId: uid,
      title,
      description: descValue || "",
      location: location || "TBD",
      eventDate: eventDate || "Soon",
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=500",
      createdAt: new Date()
    }).returning();

    return created[0];
  }

  static async registerRsvp(id: string, uid: string, userEmail: string) {
    const eventList = await db.select().from(communityEvents).where(eq(communityEvents.id, id)).limit(1);
    if (eventList.length === 0) {
      throw new ApiError(404, "Community event not found.");
    }

    const event = eventList[0];
    let details: any = {};
    try {
      details = JSON.parse(event.description);
    } catch (e) {
      details = { description: event.description };
    }

    if (!details.joinedUsers) {
      details.joinedUsers = [];
    }

    const userIndex = details.joinedUsers.indexOf(uid);
    if (userIndex !== -1) {
      // RSVP Un-Join (toggle off)
      details.joinedUsers.splice(userIndex, 1);
      if (details.participantsCount && details.participantsCount > 0) {
        details.participantsCount -= 1;
      }
    } else {
      // Join
      details.joinedUsers.push(uid);
      details.participantsCount = (details.participantsCount || 0) + 1;
    }

    const updated = await db
      .update(communityEvents)
      .set({
        description: JSON.stringify(details)
      })
      .where(eq(communityEvents.id, id))
      .returning();

    return updated[0];
  }
}
