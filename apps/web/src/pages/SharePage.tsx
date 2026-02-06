import { useCallback } from "react";
import type { AlarmPublic, Extension, WsMessage } from "@shared-alarm/shared";
import { useAlarm } from "../hooks/useAlarm";
import { useWebSocket } from "../hooks/useWebSocket";
import { useCountdown } from "../hooks/useCountdown";
import { useBrowserNotification } from "../hooks/useBrowserNotification";
import { CountdownTimer } from "../components/CountdownTimer";
import { ExtensionForm } from "../components/ExtensionForm";
import { ExtensionHistory } from "../components/ExtensionHistory";
import { t } from "../i18n";

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
        throw new Error(err.message || t("failedToExtend"));
      }

      const data = await res.json();
      updateAlarm(data.alarm, data.extension);
    },
    [token, updateAlarm]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !alarm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">&#x1F50D;</div>
          <p className="text-xl text-rose-400 font-semibold">
            {error || t("alarmNotFound")}
          </p>
        </div>
      </div>
    );
  }

  const isActive = alarm.status === "active" && !countdown.expired;
  const isTriggered = alarm.status === "triggered" || countdown.expired;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="glass rounded-3xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">{alarm.label}</h1>
            <p className="text-sm text-indigo-300/50 mt-1">
              {isTriggered
                ? t("alarmHasBeenTriggered")
                : `${t("target")}: ${new Date(alarm.targetTime).toLocaleString()}`}
            </p>
          </div>

          {/* Content */}
          {isTriggered ? (
            <div className="text-center py-8">
              <div className="text-7xl mb-4 animate-shake">&#x23F0;</div>
              <p className="text-3xl font-bold bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
                {t("alarmTriggered")}
              </p>
              <p className="text-white/40 mt-2">{t("alarmTriggeredDesc")}</p>
            </div>
          ) : alarm.status === "cancelled" ? (
            <div className="text-center py-8">
              <p className="text-xl text-white/30">{t("alarmCancelled")}</p>
            </div>
          ) : (
            <>
              <CountdownTimer {...countdown} />
              <div className="border-t border-white/5 pt-6">
                <ExtensionForm
                  minMinutes={alarm.minExtensionMinutes}
                  targetTime={alarm.targetTime}
                  onExtend={handleExtend}
                  disabled={!isActive}
                />
              </div>
            </>
          )}

          {/* History */}
          <div className="border-t border-white/5 pt-6">
            <ExtensionHistory extensions={extensions} />
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/10 text-xs mt-6 tracking-wide">
          {t("sharedAlarm")}
        </p>
      </div>
    </div>
  );
}
