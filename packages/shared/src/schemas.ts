import { z } from "zod";

export const AlarmStatus = z.enum(["active", "triggered", "cancelled"]);
export type AlarmStatus = z.infer<typeof AlarmStatus>;

export const Platform = z.enum(["web", "mobile"]);
export type Platform = z.infer<typeof Platform>;

export const RegisterRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const CreateAlarmRequest = z.object({
  targetTime: z.string().datetime({ offset: true }),
  minExtensionMinutes: z.number().int().min(1).max(1440),
  label: z.string().min(1).max(200),
});
export type CreateAlarmRequest = z.infer<typeof CreateAlarmRequest>;

export const ExtendAlarmRequest = z.object({
  extendedByName: z.string().min(1).max(100),
  extensionMinutes: z.number().int().refine((v) => v !== 0, "Must not be zero"),
});
export type ExtendAlarmRequest = z.infer<typeof ExtendAlarmRequest>;

export const PushSubscriptionRequest = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  platform: Platform,
});
export type PushSubscriptionRequest = z.infer<typeof PushSubscriptionRequest>;
