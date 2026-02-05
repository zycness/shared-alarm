import { eq } from "drizzle-orm";
import { db } from "../db";
import { alarms } from "../db/schema";

type BroadcastFn = (alarmId: string, data: unknown) => void;
type PushFn = (alarmId: string) => Promise<void>;

const timers = new Map<string, Timer>();
let broadcastFn: BroadcastFn | null = null;
let pushFn: PushFn | null = null;

export function setBroadcast(fn: BroadcastFn): void {
  broadcastFn = fn;
}

export function setPushFn(fn: PushFn): void {
  pushFn = fn;
}

export function scheduleAlarm(alarmId: string, targetTime: string): void {
  // Clear existing timer if any
  cancelSchedule(alarmId);

  const delay = new Date(targetTime).getTime() - Date.now();
  if (delay <= 0) {
    // Already past, trigger immediately
    triggerAlarm(alarmId);
    return;
  }

  const timer = setTimeout(() => {
    triggerAlarm(alarmId);
  }, delay);

  timers.set(alarmId, timer);
}

export function cancelSchedule(alarmId: string): void {
  const timer = timers.get(alarmId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(alarmId);
  }
}

async function triggerAlarm(alarmId: string): Promise<void> {
  timers.delete(alarmId);

  const [alarm] = await db
    .update(alarms)
    .set({ status: "triggered", updatedAt: new Date().toISOString() })
    .where(eq(alarms.id, alarmId))
    .returning();

  if (alarm) {
    if (broadcastFn) {
      broadcastFn(alarmId, {
        type: "alarm_triggered",
        data: {
          id: alarm.id,
          targetTime: alarm.targetTime,
          minExtensionMinutes: alarm.minExtensionMinutes,
          label: alarm.label,
          status: alarm.status,
        },
      });
    }

    if (pushFn) {
      pushFn(alarmId).catch((e) =>
        console.error("Push notification failed:", e)
      );
    }
  }
}

export async function loadActiveAlarms(): Promise<void> {
  const activeAlarms = await db.query.alarms.findMany({
    where: eq(alarms.status, "active"),
  });

  for (const alarm of activeAlarms) {
    scheduleAlarm(alarm.id, alarm.targetTime);
  }
}
