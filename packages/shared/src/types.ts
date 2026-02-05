import type { AlarmStatus, Platform } from "./schemas";

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Alarm {
  id: string;
  ownerId: string;
  targetTime: string;
  minExtensionMinutes: number;
  label: string;
  shareToken: string;
  status: AlarmStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AlarmPublic {
  id: string;
  targetTime: string;
  minExtensionMinutes: number;
  label: string;
  status: AlarmStatus;
}

export interface Extension {
  id: string;
  alarmId: string;
  extendedByName: string;
  extensionMinutes: number;
  previousTime: string;
  newTime: string;
  createdAt: string;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  platform: Platform;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface WsMessage {
  type: "alarm_extended" | "alarm_triggered" | "alarm_cancelled";
  data: AlarmPublic & { extensions?: Extension[] };
}
