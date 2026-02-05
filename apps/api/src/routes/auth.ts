import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { RegisterRequest, LoginRequest } from "@shared-alarm/shared";
import { db } from "../db";
import { users } from "../db/schema";
import { createToken, authMiddleware, getUserId } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import { generateId } from "../lib/id";

const auth = new Hono();

auth.post("/register", zValidator("json", RegisterRequest), async (c) => {
  const { email, password, displayName } = c.req.valid("json");

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existing) {
    return c.json({ error: "conflict", message: "Email already registered" }, 409);
  }

  const id = generateId();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    displayName,
    createdAt: now,
    updatedAt: now,
  });

  const token = await createToken(id, email);

  return c.json({
    token,
    user: { id, email, displayName, createdAt: now, updatedAt: now },
  }, 201);
});

auth.post("/login", zValidator("json", LoginRequest), async (c) => {
  const { email, password } = c.req.valid("json");

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (!user) {
    return c.json({ error: "unauthorized", message: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "unauthorized", message: "Invalid credentials" }, 401);
  }

  const token = await createToken(user.id, user.email);

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

auth.get("/me", authMiddleware, async (c) => {
  const userId = getUserId(c);

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) {
    return c.json({ error: "not_found", message: "User not found" }, 404);
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

export default auth;
