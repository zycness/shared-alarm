import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { ExtendAlarmRequest } from "@shared-alarm/shared";
import type { AlarmPublic, Extension } from "@shared-alarm/shared";
import { db } from "../db";
import { alarms, extensions } from "../db/schema";
import { generateId } from "../lib/id";
import { scheduleAlarm } from "../services/scheduler";

let wsBroadcast: ((alarmId: string, data: unknown) => void) | null = null;

export function setWsBroadcast(
  fn: (alarmId: string, data: unknown) => void,
): void {
  wsBroadcast = fn;
}

function toAlarmPublic(alarm: {
  id: string;
  targetTime: string;
  minExtensionMinutes: number;
  label: string;
  status: string;
}): AlarmPublic {
  return {
    id: alarm.id,
    targetTime: alarm.targetTime,
    minExtensionMinutes: alarm.minExtensionMinutes,
    label: alarm.label,
    status: alarm.status as AlarmPublic["status"],
  };
}

const share = new Hono();

share.get("/:token", async (c) => {
  const token = c.req.param("token");

  const alarm = await db
    .select()
    .from(alarms)
    .where(eq(alarms.shareToken, token))
    .get();

  if (!alarm) {
    return c.json(
      { error: "not_found", message: "Alarm not found" },
      404,
    );
  }

  const extensionsList = await db
    .select()
    .from(extensions)
    .where(eq(extensions.alarmId, alarm.id))
    .orderBy(desc(extensions.createdAt))
    .all();

  return c.json({
    alarm: toAlarmPublic(alarm),
    extensions: extensionsList,
  });
});

share.post(
  "/:token/extend",
  zValidator("json", ExtendAlarmRequest),
  async (c) => {
    const token = c.req.param("token");
    const { extendedByName, extensionMinutes } = c.req.valid("json");

    const alarm = await db
      .select()
      .from(alarms)
      .where(eq(alarms.shareToken, token))
      .get();

    if (!alarm) {
      return c.json(
        { error: "not_found", message: "Alarm not found" },
        404,
      );
    }

    if (alarm.status !== "active") {
      return c.json(
        { error: "bad_request", message: "Alarm is not active" },
        400,
      );
    }

    if (new Date(alarm.targetTime) <= new Date()) {
      return c.json(
        { error: "bad_request", message: "Alarm has already expired" },
        400,
      );
    }

    if (extensionMinutes > 0 && extensionMinutes < alarm.minExtensionMinutes) {
      return c.json(
        {
          error: "bad_request",
          message: `Extension must be at least ${alarm.minExtensionMinutes} minutes`,
        },
        400,
      );
    }

    const previousTime = alarm.targetTime;
    const newTime = new Date(
      new Date(alarm.targetTime).getTime() + extensionMinutes * 60 * 1000,
    ).toISOString();

    if (extensionMinutes < 0 && new Date(newTime) <= new Date()) {
      return c.json(
        {
          error: "bad_request",
          message:
            "Cannot reduce: the resulting time would be in the past",
        },
        400,
      );
    }

    const now = new Date().toISOString();

    await db
      .update(alarms)
      .set({ targetTime: newTime, updatedAt: now })
      .where(eq(alarms.id, alarm.id));

    const extensionId = generateId();

    await db.insert(extensions).values({
      id: extensionId,
      alarmId: alarm.id,
      extendedByName,
      extensionMinutes,
      previousTime,
      newTime,
      createdAt: now,
    });

    const extension: Extension = {
      id: extensionId,
      alarmId: alarm.id,
      extendedByName,
      extensionMinutes,
      previousTime,
      newTime,
      createdAt: now,
    };

    const updatedAlarm: AlarmPublic = {
      ...toAlarmPublic(alarm),
      targetTime: newTime,
    };

    // Reschedule the alarm timer with the new target time
    scheduleAlarm(alarm.id, newTime);

    if (wsBroadcast) {
      wsBroadcast(alarm.id, {
        type: "alarm_extended",
        data: { ...updatedAlarm, extension },
      });
    }

    return c.json({ alarm: updatedAlarm, extension }, 201);
  },
);

export default share;
