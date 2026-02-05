import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import auth from "./routes/auth";
import alarmsRoute from "./routes/alarms";
import share, { setWsBroadcast } from "./routes/share";
import push from "./routes/push";
import { wsRoute, websocket, broadcast } from "./services/ws";
import { setBroadcast, setPushFn, loadActiveAlarms } from "./services/scheduler";
import { sendAlarmTriggeredPush } from "./services/push";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./db";

const app = new Hono();
const isProd = process.env.NODE_ENV === "production";

const corsOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:3001,http://localhost:8080"
).split(",");

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: corsOrigins,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Mount API routes at root (Flutter/direct) and /api (web app in production)
const api = new Hono();
api.route("/auth", auth);
api.route("/alarms", alarmsRoute);
api.route("/share", share);
api.route("/push", push);
api.route("/ws", wsRoute);
api.get("/health", (c) => c.json({ status: "ok" }));

app.route("/", api);
app.route("/api", api);

// In production, serve the web app static files
if (isProd) {
  app.use("/*", serveStatic({ root: "./public" }));
  app.get("/*", serveStatic({ path: "./public/index.html" }));
}

// Wire up WebSocket broadcasting and push notifications
setWsBroadcast(broadcast);
setBroadcast(broadcast);
setPushFn(sendAlarmTriggeredPush);

// Run migrations and load active alarms on startup
try {
  migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied");
} catch (e) {
  console.error("Migration error:", e);
}

loadActiveAlarms()
  .then(() => console.log("Active alarms loaded into scheduler"))
  .catch((e) => console.error("Failed to load active alarms:", e));

const port = Number(process.env.PORT) || 3001;

console.log(`Shared Alarm API running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
  websocket,
};
