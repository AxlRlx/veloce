// server/services/chats.service.ts
import { GoogleGenAI } from "@google/genai";
import { db } from "../../src/db/index.ts";
import { conversations, messages, vehicles, profiles } from "../../src/db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { ApiError } from "../utils/errors.ts";
import { generateId } from "../utils/ids.ts";
import { env } from "../config/env.ts";
import { logger } from "../utils/logger.ts";

let geminiClientInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClientInstance) {
    const key = env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "") {
      geminiClientInstance = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      logger.info("Initialized Gemini AI client successfully for dealer simulation.");
    }
  }
  return geminiClientInstance;
}

export class ChatsService {
  static async listForUser(uid: string) {
    const all = await db.select().from(conversations);
    return all.filter(c => c.userOne === uid || c.userTwo === uid);
  }

  static async create(uid: string, body: any) {
    const { vehicleId, dealerId, rawFirstMessage } = body;

    if (!dealerId) {
      throw new ApiError(400, "Dealer or recipient ID is required.");
    }

    // Check if conversation already exists for this vehicle
    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.vehicleId, vehicleId || ""),
          eq(conversations.userOne, uid),
          eq(conversations.userTwo, dealerId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const chatId = generateId("conv");

    const created = await db.insert(conversations).values({
      id: chatId,
      userOne: uid,
      userTwo: dealerId,
      vehicleId: vehicleId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Insert first message if provided
    if (rawFirstMessage && rawFirstMessage.trim() !== "") {
      const msgId = generateId("msg");
      await db.insert(messages).values({
        id: msgId,
        conversationId: chatId,
        senderId: uid,
        body: rawFirstMessage,
        createdAt: new Date()
      });
    }

    return created[0];
  }

  static async getMessages(chatId: string, uid: string) {
    // Return messages chronologically
    const msgsList = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, chatId))
      .orderBy(desc(messages.createdAt));
    
    const messagesReversed = [...msgsList];
    messagesReversed.reverse();
    return messagesReversed;
  }

  static async postMessage(chatId: string, uid: string, bodyText: string) {
    if (!bodyText || bodyText.trim() === "") {
      throw new ApiError(400, "Message content cannot be blank.");
    }

    const msgId = generateId("msg");
    const created = await db.insert(messages).values({
      id: msgId,
      conversationId: chatId,
      senderId: uid,
      body: bodyText,
      createdAt: new Date()
    }).returning();

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, chatId));

    return created[0];
  }

  static async markAsRead(chatId: string, uid: string) {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.conversationId, chatId), eq(messages.readAt, null as any))); // simple set reads
    
    return { success: true };
  }

  static async simulateDealerResponse(chatId: string, uid: string, clientText: string) {
    const convRes = await db.select().from(conversations).where(eq(conversations.id, chatId)).limit(1);
    if (convRes.length === 0) {
      throw new ApiError(404, "Conversation thread not found.");
    }

    const conv = convRes[0];
    const dealerId = conv.userOne === uid ? conv.userTwo : conv.userOne;

    // Fetch vehicle details if any
    let vehicleDetails = "";
    if (conv.vehicleId) {
      const carRes = await db.select().from(vehicles).where(eq(vehicles.id, conv.vehicleId)).limit(1);
      if (carRes.length > 0) {
        const car = carRes[0];
        vehicleDetails = `Vehicle: ${car.year} ${car.make} ${car.model} (${car.horsepower} HP, ${car.mileage} miles, Price: $${car.price}, Rental: $${car.rentalPriceDaily}/day). Description: "${car.description}".`;
      }
    }

    const dealerProfileRes = await db.select().from(profiles).where(eq(profiles.id, dealerId)).limit(1);
    const dealerName = dealerProfileRes[0]?.fullName || "Official Dealer Rep";

    const userProfileRes = await db.select().from(profiles).where(eq(profiles.id, uid)).limit(1);
    const userName = userProfileRes[0]?.fullName || "Client";

    // Grab recent message history for conversational memory
    const recentMsgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, chatId))
      .orderBy(desc(messages.createdAt))
      .limit(6);

    const msgsChronological = [...recentMsgs];
    msgsChronological.reverse();

    const historyText = msgsChronological
      .map(m => {
        const senderLabel = m.senderId === uid ? userName : dealerName;
        return `${senderLabel}: ${m.body}`;
      })
      .join("\n");

    let replyBody = `Thank you for contacting Veloce. I would be glad to help you get behind the wheel of this premium ${conv.vehicleId ? "listing" : "hypercar"}. Let me check availability and get back to you!`;

    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const prompt = `You are a professional elite luxury car dealer representative named "${dealerName}" for "Veloce Hypercar Portal".
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

        const response = await gemini.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt
        });

        if (response.text) {
          replyBody = response.text.trim();
        }
      } catch (gemErr) {
        logger.error("Failed to generate response using Gemini AI, falling back to scripted prompt.", gemErr);
      }
    } else {
      logger.warn("Gemini Client unconfigured for real-time chat. Scripted response applied.");
    }

    const msgId = generateId("msg_sys");
    const simulatedMessage = await db.insert(messages).values({
      id: msgId,
      conversationId: chatId,
      senderId: dealerId,
      body: replyBody,
      createdAt: new Date()
    }).returning();

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, chatId));

    return {
      id: msgId,
      senderId: dealerId,
      text: replyBody,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };
  }
}
