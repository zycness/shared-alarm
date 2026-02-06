import { t } from "../i18n";

interface CountdownTimerProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function TimeUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="bg-gradient-to-b from-white/15 to-white/5 rounded-2xl px-5 py-4 min-w-[72px] border border-white/10 shadow-lg shadow-black/20">
          <span className="text-5xl font-extrabold text-white tabular-nums tracking-tight">
            {value}
          </span>
        </div>
      </div>
      <span className="text-xs font-semibold text-indigo-300/60 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 pt-1 pb-6">
      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/50" />
      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/50" />
    </div>
  );
}

export function CountdownTimer({ days, hours, minutes, seconds, expired }: CountdownTimerProps) {
  if (expired) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-3 animate-shake">&#x23F0;</div>
        <p className="text-3xl font-bold bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
          {t("timesUp")}
        </p>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-start justify-center gap-3 py-6">
      {days > 0 && (
        <>
          <TimeUnit value={pad(days)} label={t("days")} />
          <Separator />
        </>
      )}
      <TimeUnit value={pad(hours)} label={t("hours")} />
      <Separator />
      <TimeUnit value={pad(minutes)} label={t("min")} />
      <Separator />
      <TimeUnit value={pad(seconds)} label={t("sec")} />
    </div>
  );
}
