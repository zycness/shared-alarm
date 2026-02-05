import { useEffect, useRef, useCallback } from "react";

export function useBrowserNotification(
  alarmLabel: string | null,
  triggered: boolean
) {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        permissionRef.current = p;
      });
    } else {
      permissionRef.current = Notification.permission;
    }
  }, []);

  useEffect(() => {
    if (!triggered || !alarmLabel) return;
    if (permissionRef.current !== "granted") return;

    new Notification("Alarm Triggered!", {
      body: alarmLabel,
    });
  }, [triggered, alarmLabel]);
}

export function usePushSubscription() {
  const subscribe = useCallback(async (token: string) => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID key from API
      const vapidRes = await fetch("/api/push/vapid-key");
      const { key } = await vapidRes.json();
      if (!key) return;

      // Subscribe to push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });

      const subJson = subscription.toJSON();

      // Send subscription to API
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh || "",
            auth: subJson.keys?.auth || "",
          },
          platform: "web",
        }),
      });
    } catch (e) {
      console.error("Push subscription failed:", e);
    }
  }, []);

  return { subscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
