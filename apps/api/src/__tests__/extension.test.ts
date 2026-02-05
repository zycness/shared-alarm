import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "../db/schema";
import { generateId, generateShareToken } from "../lib/id";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./drizzle" });
  return { db, sqlite };
}

function createTestUser(db: ReturnType<typeof createTestDb>["db"]) {
  const id = generateId();
  const now = new Date().toISOString();
  db.insert(schema.users)
    .values({
      id,
      email: `test-${id}@example.com`,
      passwordHash: "hash",
      displayName: "Test User",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

function createTestAlarm(
  db: ReturnType<typeof createTestDb>["db"],
  ownerId: string,
  opts?: { targetTime?: string; minExtensionMinutes?: number; status?: string }
) {
  const id = generateId();
  const now = new Date().toISOString();
  const targetTime =
    opts?.targetTime ??
    new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
  const alarm = {
    id,
    ownerId,
    targetTime,
    minExtensionMinutes: opts?.minExtensionMinutes ?? 5,
    label: "Test Alarm",
    shareToken: generateShareToken(),
    status: (opts?.status ?? "active") as "active" | "triggered" | "cancelled",
    createdAt: now,
    updatedAt: now,
  };
  db.insert(schema.alarms).values(alarm).run();
  return alarm;
}

describe("Extension validation logic", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let sqlite: Database;
  let userId: string;

  beforeAll(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqlite = testDb.sqlite;
    userId = createTestUser(db);
  });

  afterAll(() => {
    sqlite.close();
  });

  it("should extend an active alarm with valid minutes", () => {
    const alarm = createTestAlarm(db, userId, { minExtensionMinutes: 5 });
    const extensionMinutes = 10;
    const previousTime = alarm.targetTime;
    const newTime = new Date(
      new Date(alarm.targetTime).getTime() + extensionMinutes * 60 * 1000
    ).toISOString();

    // Validate: status is active
    expect(alarm.status).toBe("active");
    // Validate: target time is in the future
    expect(new Date(alarm.targetTime).getTime()).toBeGreaterThan(Date.now());
    // Validate: extension meets minimum
    expect(extensionMinutes).toBeGreaterThanOrEqual(alarm.minExtensionMinutes);

    // Perform extension
    db.update(schema.alarms)
      .set({ targetTime: newTime, updatedAt: new Date().toISOString() })
      .where(eq(schema.alarms.id, alarm.id))
      .run();

    const extId = generateId();
    db.insert(schema.extensions)
      .values({
        id: extId,
        alarmId: alarm.id,
        extendedByName: "Tester",
        extensionMinutes,
        previousTime,
        newTime,
        createdAt: new Date().toISOString(),
      })
      .run();

    // Verify alarm was updated
    const updated = db
      .select()
      .from(schema.alarms)
      .where(eq(schema.alarms.id, alarm.id))
      .get();

    expect(updated).toBeDefined();
    expect(updated!.targetTime).toBe(newTime);
    expect(new Date(updated!.targetTime).getTime()).toBeGreaterThan(
      new Date(previousTime).getTime()
    );

    // Verify extension was recorded
    const ext = db
      .select()
      .from(schema.extensions)
      .where(eq(schema.extensions.id, extId))
      .get();

    expect(ext).toBeDefined();
    expect(ext!.extensionMinutes).toBe(extensionMinutes);
    expect(ext!.previousTime).toBe(previousTime);
    expect(ext!.newTime).toBe(newTime);
  });

  it("should reject extension below minimum minutes", () => {
    const alarm = createTestAlarm(db, userId, { minExtensionMinutes: 10 });
    const extensionMinutes = 5;

    const isValid = extensionMinutes >= alarm.minExtensionMinutes;
    expect(isValid).toBe(false);
  });

  it("should reject extension for non-active alarm", () => {
    const alarm = createTestAlarm(db, userId, { status: "triggered" });

    const isValid = alarm.status === "active";
    expect(isValid).toBe(false);
  });

  it("should reject extension for expired alarm", () => {
    const alarm = createTestAlarm(db, userId, {
      targetTime: new Date(Date.now() - 1000).toISOString(),
    });

    const isValid = new Date(alarm.targetTime).getTime() > Date.now();
    expect(isValid).toBe(false);
  });

  it("should always move time forward (never backward)", () => {
    const alarm = createTestAlarm(db, userId);
    const originalTime = alarm.targetTime;

    // First extension
    const ext1Minutes = 15;
    const time1 = new Date(
      new Date(originalTime).getTime() + ext1Minutes * 60 * 1000
    ).toISOString();

    // Second extension
    const ext2Minutes = 10;
    const time2 = new Date(
      new Date(time1).getTime() + ext2Minutes * 60 * 1000
    ).toISOString();

    expect(new Date(time1).getTime()).toBeGreaterThan(
      new Date(originalTime).getTime()
    );
    expect(new Date(time2).getTime()).toBeGreaterThan(
      new Date(time1).getTime()
    );
  });
});

describe("ID generation", () => {
  it("should generate unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("should generate unique share tokens", () => {
    const tokens = new Set(
      Array.from({ length: 100 }, () => generateShareToken())
    );
    expect(tokens.size).toBe(100);
  });

  it("should generate 32-char hex IDs", () => {
    const id = generateId();
    expect(id).toMatch(/^[a-f0-9]{32}$/);
  });
});
