import { useState } from "react";
import { t } from "../i18n";

interface ExtensionFormProps {
  minMinutes: number;
  targetTime: string;
  onExtend: (name: string, minutes: number) => Promise<void>;
  disabled: boolean;
}

export function ExtensionForm({ minMinutes, targetTime, onExtend, disabled }: ExtensionFormProps) {
  const [name, setName] = useState("");
  const [minutesText, setMinutesText] = useState(String(minMinutes));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minutes = parseInt(minutesText, 10) || 0;

  const canExtend = minutes >= minMinutes;

  const canReduce = () => {
    if (minutes < 1) return false;
    const target = new Date(targetTime).getTime();
    const reduced = target - minutes * 60 * 1000;
    return reduced > Date.now();
  };

  const handleSubmit = async (direction: 1 | -1) => {
    if (!name.trim() || minutes < 1) return;
    if (direction === 1 && !canExtend) return;
    if (direction === -1 && !canReduce()) return;

    setSubmitting(true);
    setError(null);
    try {
      await onExtend(name.trim(), minutes * direction);
      setName("");
      setMinutesText(String(minMinutes));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToModify"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-xs font-semibold text-indigo-300/60 uppercase tracking-wider mb-2">
          {t("yourName")}
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("enterYourName")}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          required
          disabled={disabled || submitting}
        />
      </div>
      <div>
        <label htmlFor="minutes" className="block text-xs font-semibold text-indigo-300/60 uppercase tracking-wider mb-2">
          {t("minutesLabel")}
        </label>
        <input
          id="minutes"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={minutesText}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d+$/.test(v)) {
              setMinutesText(v);
            }
          }}
          onFocus={(e) => e.target.select()}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          required
          disabled={disabled || submitting}
        />
      </div>
      {error && (
        <p className="text-rose-400 text-sm bg-rose-400/10 rounded-lg px-3 py-2 border border-rose-400/20">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleSubmit(1)}
          disabled={disabled || submitting || !name.trim() || !canExtend}
          className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-indigo-400 hover:to-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20"
        >
          {submitting ? "..." : `+${minutes || 0} ${t("minUnit")}`}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(-1)}
          disabled={disabled || submitting || !name.trim() || !canReduce()}
          className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-rose-400 hover:to-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-rose-500/20"
        >
          {submitting ? "..." : `-${minutes || 0} ${t("minUnit")}`}
        </button>
      </div>
    </div>
  );
}
