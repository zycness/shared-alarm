import admin from "firebase-admin";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { fcmTokens, alarms } from "../db/schema";

let initialized = false;

function getServiceAccount(): admin.ServiceAccount | null {
  // Option B: JSON content directly in env var (ideal for Dokploy/Docker)
  const jsonContent = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (jsonContent) {
    try {
      return JSON.parse(jsonContent) as admin.ServiceAccount;
    } catch (error) {
      console.error("FCM: Failed to parse FIREBASE_SERVICE_ACCOUNT:", error);
      return null;
    }
  }

  // Option A: File path
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    try {
      return require(
        credPath.startsWith("/") ? credPath : `${process.cwd()}/${credPath}`
      );
    } catch (error) {
      console.error("FCM: Failed to load credentials file:", error);
      return null;
    }
  }

  return null;
}

function ensureInitialized(): boolean {
  if (initialized) return true;

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    console.warn("FCM: No credentials found (set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS)");
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    console.log("FCM: Firebase Admin initialized");
    return true;
  } catch (error) {
    console.error("FCM: Failed to initialize Firebase Admin:", error);
    return false;
  }
}

export async function sendFcmToUser(
  userId: string,
  payload: Record<string, string>
): Promise<void> {
  if (!ensureInitialized()) return;

  const tokens = db
    .select()
    .from(fcmTokens)
    .where(eq(fcmTokens.userId, userId))
    .all();

  if (tokens.length === 0) return;

  const promises = tokens.map(async (tokenRow) => {
    try {
      await admin.messaging().send({
        token: tokenRow.token,
        data: payload,
        android: {
          priority: "high",
        },
        apns: {
          headers: {
            "apns-priority": "10",
          },
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code: string }).code
          : "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        db.delete(fcmTokens)
          .where(eq(fcmTokens.id, tokenRow.id))
          .run();
        console.log(`FCM: Removed invalid token ${tokenRow.id}`);
      } else {
        console.error(`FCM: Failed to send to ${tokenRow.id}:`, error);
      }
    }
  });

  await Promise.allSettled(promises);
}

export async function sendAlarmTriggeredFcm(alarmId: string): Promise<void> {
  const alarm = db
    .select()
    .from(alarms)
    .where(eq(alarms.id, alarmId))
    .get();

  if (!alarm) return;

  await sendFcmToUser(alarm.ownerId, {
    type: "alarm_triggered",
    alarmId: alarm.id,
    label: alarm.label,
    targetTime: alarm.targetTime,
  });
}
