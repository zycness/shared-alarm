import { randomBytes } from "crypto";

export function generateId(): string {
  return randomBytes(16).toString("hex");
}

export function generateShareToken(): string {
  return randomBytes(12).toString("base64url");
}
