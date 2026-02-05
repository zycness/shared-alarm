import { useCallback } from "react";
import type { AlarmPublic, Extension, WsMessage } from "@shared-alarm/shared";
import { useAlarm } from "../hooks/useAlarm";
import { useWebSocket } from "../hooks/useWebSocket";
import { useCountdown } from "../hooks/useCountdown";
import { useBrowserNotification } from "../hooks/useBrowserNotification";
import { CountdownTimer } from "../components/CountdownTimer";
import { ExtensionForm } from "../components/ExtensionForm";
import { ExtensionHistory } from "../components/ExtensionHistory";

interface SharePageProps {
  token: string;
}

export function SharePage({ token }: SharePageProps) {
  const { alarm, extensions, loading, error, updateAlarm } = useAlarm(token);
  const countdown = useCountdown(alarm?.targetTime ?? null);

  const handleWsMessage = useCallback(
    (msg: WsMessage) => {
      if (msg.type === "alarm_extended") {
        const data = msg.data as AlarmPublic & { extension?: Extension };
        updateAlarm(
          { id: data.id, targetTime: data.targetTime, minExtensionMinutes: data.minExtensionMinutes, label: data.label, status: data.status },
          data.extension
        );
      } else if (msg.type === "alarm_triggered") {
        const data = msg.data as AlarmPublic;
        updateAlarm({ ...data, status: "triggered" });
      }
    },
    [updateAlarm]
  );

  useWebSocket(alarm?.id ?? null, handleWsMessage);
  useBrowserNotification(alarm?.label ?? null, alarm?.status === "triggered");

  const handleExtend = useCallback(
    async (name: string, minutes: number) => {
      const res = await fetch(`/api/share/${token}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendedByName: name, extensionMinutes: minutes }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to extend alarm");
      }

      const data = await res.json();
      updateAlarm(data.alarm, data.extension);
    },
    [token, updateAlarm]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !alarm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-500 font-semibold">
            {error || "Alarm not found"}
          </p>
        </div>
      </div>
    );
  }

  const isActive = alarm.status === "active" && !countdown.expired;
  const isTriggered = alarm.status === "triggered" || countdown.expired;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800">{alarm.label}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isTriggered ? "Alarm has been triggered" : `Target: ${new Date(alarm.targetTime).toLocaleString()}`}
            </p>
          </div>

          {isTriggered ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">&#x23F0;</div>
              <p className="text-2xl font-bold text-red-500">Alarm Triggered!</p>
              <p className="text-gray-500 mt-2">This alarm has gone off.</p>
            </div>
          ) : alarm.status === "cancelled" ? (
            <div className="text-center py-8">
              <p className="text-xl text-gray-400">Alarm Cancelled</p>
            </div>
          ) : (
            <>
              <CountdownTimer {...countdown} />
              <ExtensionForm
                minMinutes={alarm.minExtensionMinutes}
                onExtend={handleExtend}
                disabled={!isActive}
              />
            </>
          )}

          <ExtensionHistory extensions={extensions} />
        </div>
      </div>
    </div>
  );
}
