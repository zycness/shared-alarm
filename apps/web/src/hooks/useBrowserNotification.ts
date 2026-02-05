import { useEffect, useRef } from "react";

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
      icon: "/alarm-icon.png",
    });
  }, [triggered, alarmLabel]);
}
