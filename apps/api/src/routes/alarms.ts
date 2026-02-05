import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc } from "drizzle-orm";
import { CreateAlarmRequest } from "@shared-alarm/shared";
import { db } from "../db";
import { alarms, extensions } from "../db/schema";
import { authMiddleware, getUserId } from "../lib/jwt";
import { generateId, generateShareToken } from "../lib/id";
import { scheduleAlarm, cancelSchedule } from "../services/scheduler";

const app = new Hono();

app.use("*", authMiddleware);

app.post("/", zValidator("json", CreateAlarmRequest), async (c) => {
  const body = c.req.valid("json");
  const userId = getUserId(c);
  const now = new Date().toISOString();

  const alarm = {
    id: generateId(),
    ownerId: userId,
    targetTime: body.targetTime,
    minExtensionMinutes: body.minExtensionMinutes,
    label: body.label,
    shareToken: generateShareToken(),
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(alarms).values(alarm);
  scheduleAlarm(alarm.id, alarm.targetTime);

  return c.json(alarm, 201);
});

app.get("/", async (c) => {
  const userId = getUserId(c);

  const result = await db
    .select()
    .from(alarms)
    .where(eq(alarms.ownerId, userId));

  return c.json(result);
});

app.get("/:id", async (c) => {
  const userId = getUserId(c);
  const alarmId = c.req.param("id");

  const [alarm] = await db
    .select()
    .from(alarms)
    .where(and(eq(alarms.id, alarmId), eq(alarms.ownerId, userId)));

  if (!alarm) {
    return c.json({ error: "not_found", message: "Alarm not found" }, 404);
  }

  const alarmExtensions = await db
    .select()
    .from(extensions)
    .where(eq(extensions.alarmId, alarmId))
    .orderBy(desc(extensions.createdAt));

  return c.json({ ...alarm, extensions: alarmExtensions });
});

app.delete("/:id", async (c) => {
  const userId = getUserId(c);
  const alarmId = c.req.param("id");

  const [alarm] = await db
    .select()
    .from(alarms)
    .where(and(eq(alarms.id, alarmId), eq(alarms.ownerId, userId)));

  if (!alarm) {
    return c.json({ error: "not_found", message: "Alarm not found" }, 404);
  }

  const now = new Date().toISOString();

  const [updated] = await db
    .update(alarms)
    .set({ status: "cancelled", updatedAt: now })
    .where(eq(alarms.id, alarmId))
    .returning();

  cancelSchedule(alarmId);

  return c.json(updated);
});

export default app;
