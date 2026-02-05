import webPush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { pushSubscriptions, alarms } from "../db/schema";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@sharedalarm.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  const subs = db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .all();

  const promises = subs.map(async (sub) => {
    const keys = JSON.parse(sub.keys) as { p256dh: string; auth: string };
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys,
    };

    try {
      await webPush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );
    } catch (error: unknown) {
      if (error && typeof error === "object" && "statusCode" in error) {
        const statusCode = (error as { statusCode: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or invalid, remove it
          db.delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id))
            .run();
        }
      }
    }
  });

  await Promise.allSettled(promises);
}

export async function sendAlarmTriggeredPush(alarmId: string): Promise<void> {
  const alarm = db
    .select()
    .from(alarms)
    .where(eq(alarms.id, alarmId))
    .get();

  if (!alarm) return;

  await sendPushToUser(alarm.ownerId, {
    title: "Alarm Triggered!",
    body: alarm.label,
    data: { alarmId: alarm.id, type: "alarm_triggered" },
  });
}
