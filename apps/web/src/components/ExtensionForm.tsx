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
  const [minutes, setMinutes] = useState(minMinutes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReduce = () => {
    const target = new Date(targetTime).getTime();
    const reduced = target - minutes * 60 * 1000;
    return reduced > Date.now();
  };

  const handleSubmit = async (direction: 1 | -1) => {
    if (!name.trim() || minutes < minMinutes) return;

    setSubmitting(true);
    setError(null);
    try {
      await onExtend(name.trim(), minutes * direction);
      setName("");
      setMinutes(minMinutes);
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
          {t("minutesLabel")} (min: {minMinutes})
        </label>
        <input
          id="minutes"
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          min={minMinutes}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all [&::-webkit-inner-spin-button]:opacity-50"
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
          disabled={disabled || submitting || !name.trim() || minutes < minMinutes}
          className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-indigo-400 hover:to-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20"
        >
          {submitting ? "..." : `+${minutes} ${t("minUnit")}`}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(-1)}
          disabled={disabled || submitting || !name.trim() || minutes < minMinutes || !canReduce()}
          className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-rose-400 hover:to-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-rose-500/20"
        >
          {submitting ? "..." : `-${minutes} ${t("minUnit")}`}
        </button>
      </div>
    </div>
  );
}
