import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { PushSubscriptionRequest } from "@shared-alarm/shared";
import { db } from "../db";
import { pushSubscriptions, fcmTokens } from "../db/schema";
import { authMiddleware, getUserId } from "../lib/jwt";
import { generateId } from "../lib/id";
import { getVapidPublicKey } from "../services/push";

const push = new Hono();

// Get VAPID public key (no auth needed for this)
push.get("/vapid-key", (c) => {
  return c.json({ key: getVapidPublicKey() });
});

// Subscribe to push notifications (auth required)
push.post(
  "/subscribe",
  authMiddleware,
  zValidator("json", PushSubscriptionRequest),
  async (c) => {
    const userId = getUserId(c);
    const { endpoint, keys, platform } = c.req.valid("json");

    // Check if subscription already exists for this endpoint
    const existing = db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      )
      .get();

    if (existing) {
      // Update keys
      db.update(pushSubscriptions)
        .set({ keys: JSON.stringify(keys) })
        .where(eq(pushSubscriptions.id, existing.id))
        .run();

      return c.json({ id: existing.id });
    }

    const id = generateId();
    db.insert(pushSubscriptions)
      .values({
        id,
        userId,
        endpoint,
        keys: JSON.stringify(keys),
        platform,
        createdAt: new Date().toISOString(),
      })
      .run();

    return c.json({ id }, 201);
  }
);

// Unsubscribe from push notifications
push.delete("/subscribe", authMiddleware, async (c) => {
  const userId = getUserId(c);

  db.delete(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .run();

  return c.json({ ok: true });
});

// --- FCM Token Management ---

const FcmRegisterSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["android", "ios"]),
});

// Register FCM token (mobile devices)
push.post(
  "/fcm-register",
  authMiddleware,
  zValidator("json", FcmRegisterSchema),
  async (c) => {
    const userId = getUserId(c);
    const { token, platform } = c.req.valid("json");

    const existing = db
      .select()
      .from(fcmTokens)
      .where(eq(fcmTokens.token, token))
      .get();

    if (existing) {
      db.update(fcmTokens)
        .set({ userId, platform })
        .where(eq(fcmTokens.id, existing.id))
        .run();
      return c.json({ id: existing.id });
    }

    const id = generateId();
    db.insert(fcmTokens)
      .values({
        id,
        userId,
        token,
        platform,
        createdAt: new Date().toISOString(),
      })
      .run();

    return c.json({ id }, 201);
  }
);

// Unregister FCM token
push.delete("/fcm-register", authMiddleware, async (c) => {
  const userId = getUserId(c);

  db.delete(fcmTokens)
    .where(eq(fcmTokens.userId, userId))
    .run();

  return c.json({ ok: true });
});

export default push;
