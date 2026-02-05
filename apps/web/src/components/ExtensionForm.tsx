import { useState } from "react";

interface ExtensionFormProps {
  minMinutes: number;
  onExtend: (name: string, minutes: number) => Promise<void>;
  disabled: boolean;
}

export function ExtensionForm({ minMinutes, onExtend, disabled }: ExtensionFormProps) {
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(minMinutes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || minutes < minMinutes) return;

    setSubmitting(true);
    setError(null);
    try {
      await onExtend(name.trim(), minutes);
      setName("");
      setMinutes(minMinutes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extend");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={disabled || submitting}
        />
      </div>
      <div>
        <label htmlFor="minutes" className="block text-sm font-medium text-gray-700 mb-1">
          Minutes to extend (min: {minMinutes})
        </label>
        <input
          id="minutes"
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          min={minMinutes}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={disabled || submitting}
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={disabled || submitting || !name.trim() || minutes < minMinutes}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Extending..." : "Extend Alarm"}
      </button>
    </form>
  );
}
