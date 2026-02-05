import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import type { WSContext } from "hono/ws";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const connections = new Map<string, Set<WSContext>>();

function addConnection(alarmId: string, ws: WSContext): void {
  let set = connections.get(alarmId);
  if (!set) {
    set = new Set();
    connections.set(alarmId, set);
  }
  set.add(ws);
}

function removeConnection(alarmId: string, ws: WSContext): void {
  const set = connections.get(alarmId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) {
    connections.delete(alarmId);
  }
}

function broadcast(alarmId: string, data: unknown): void {
  const set = connections.get(alarmId);
  if (!set) return;

  const payload = JSON.stringify(data);
  for (const ws of set) {
    if (ws.readyState === 1) {
      ws.send(payload);
    }
  }
}

const wsRoute = new Hono();

wsRoute.get(
  "/:alarmId",
  upgradeWebSocket((c) => {
    const alarmId = c.req.param("alarmId");
    return {
      onOpen(_event, ws) {
        addConnection(alarmId, ws);
      },
      onClose(_event, ws) {
        removeConnection(alarmId, ws);
      },
    };
  })
);

export { wsRoute, websocket, broadcast };
