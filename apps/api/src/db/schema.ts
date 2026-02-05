import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const alarms = sqliteTable("alarms", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  targetTime: text("target_time").notNull(),
  minExtensionMinutes: integer("min_extension_minutes").notNull(),
  label: text("label").notNull(),
  shareToken: text("share_token").notNull().unique(),
  status: text("status", { enum: ["active", "triggered", "cancelled"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const extensions = sqliteTable("extensions", {
  id: text("id").primaryKey(),
  alarmId: text("alarm_id")
    .notNull()
    .references(() => alarms.id),
  extendedByName: text("extended_by_name").notNull(),
  extensionMinutes: integer("extension_minutes").notNull(),
  previousTime: text("previous_time").notNull(),
  newTime: text("new_time").notNull(),
  createdAt: text("created_at").notNull(),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  endpoint: text("endpoint").notNull(),
  keys: text("keys").notNull(),
  platform: text("platform", { enum: ["web", "mobile"] }).notNull(),
  createdAt: text("created_at").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  alarms: many(alarms),
  pushSubscriptions: many(pushSubscriptions),
}));

export const alarmsRelations = relations(alarms, ({ one, many }) => ({
  owner: one(users, { fields: [alarms.ownerId], references: [users.id] }),
  extensions: many(extensions),
}));

export const extensionsRelations = relations(extensions, ({ one }) => ({
  alarm: one(alarms, {
    fields: [extensions.alarmId],
    references: [alarms.id],
  }),
}));

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [pushSubscriptions.userId],
      references: [users.id],
    }),
  })
);
