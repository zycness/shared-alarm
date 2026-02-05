import { sign, verify } from "hono/jwt";
import type { JWTPayload } from "hono/utils/jwt/types";
import type { Context, MiddlewareHandler } from "hono";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export interface JwtPayload extends JWTPayload {
  sub: string;
  email: string;
  exp: number;
}

export async function createToken(
  userId: string,
  email: string
): Promise<string> {
  const payload: JwtPayload = {
    sub: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  return sign(payload, JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const payload = await verify(token, JWT_SECRET, "HS256");
  return payload as JwtPayload;
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "unauthorized", message: "Missing token" }, 401);
  }

  const token = header.slice(7);
  try {
    const payload = await verifyToken(token);
    c.set("jwtPayload" as never, payload);
    await next();
  } catch {
    return c.json({ error: "unauthorized", message: "Invalid token" }, 401);
  }
};

export function getUserId(c: Context): string {
  const payload = c.get("jwtPayload" as never) as JwtPayload;
  return payload.sub;
}
