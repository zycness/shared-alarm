import { eq } from "drizzle-orm";
import { db } from "../db";
import { fcmTokens, alarms } from "../db/schema";

let initialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebaseAdmin: any = null;

async function ensureInitialized(): Promise<boolean> {
  if (initialized) return true;

  // Dynamic import to avoid crashing the server if firebase-admin has issues
  try {
    const mod = await import("firebase-admin");
    firebaseAdmin = mod.default;
  } catch (error) {
    console.warn("FCM: firebase-admin not available, FCM disabled:", error);
    return false;
  }

  // Option B: JSON content directly in env var (ideal for Dokploy/Docker)
  const jsonContent = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (jsonContent) {
    try {
      const serviceAccount = JSON.parse(jsonContent);
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
      });
      initialized = true;
      console.log("FCM: Firebase Admin initialized (from env var)");
      return true;
    } catch (error) {
      console.error("FCM: Failed to init from FIREBASE_SERVICE_ACCOUNT:", error);
      return false;
    }
  }

  // Option A: File path
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    try {
      const fullPath = credPath.startsWith("/") ? credPath : `${process.cwd()}/${credPath}`;
      const file = Bun.file(fullPath);
      const serviceAccount = await file.json();
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
      });
      initialized = true;
      console.log("FCM: Firebase Admin initialized (from file)");
      return true;
    } catch (error) {
      console.error("FCM: Failed to init from credentials file:", error);
      return false;
    }
  }

  console.warn("FCM: No credentials found (set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS)");
  return false;
}

export async function sendFcmToUser(
  userId: string,
  payload: Record<string, string>
): Promise<void> {
  if (!(await ensureInitialized()) || !firebaseAdmin) return;

  const tokens = db
    .select()
    .from(fcmTokens)
    .where(eq(fcmTokens.userId, userId))
    .all();

  if (tokens.length === 0) return;

  const promises = tokens.map(async (tokenRow) => {
    try {
      await firebaseAdmin!.messaging().send({
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
