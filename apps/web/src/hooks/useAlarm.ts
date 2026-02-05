import { useState, useEffect, useCallback, useRef } from "react";
import type { AlarmPublic, Extension } from "@shared-alarm/shared";

interface AlarmState {
  alarm: AlarmPublic | null;
  extensions: Extension[];
  loading: boolean;
  error: string | null;
}

export function useAlarm(token: string) {
  const [state, setState] = useState<AlarmState>({
    alarm: null,
    extensions: [],
    loading: true,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const fetchAlarm = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/share/${token}`, { signal: controller.signal });
      if (!res.ok) {
        const err = await res.json();
        setState((s) => ({ ...s, loading: false, error: err.message || "Failed to load alarm" }));
        return;
      }
      const data = await res.json();
      setState({ alarm: data.alarm, extensions: data.extensions, loading: false, error: null });
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setState((s) => ({ ...s, loading: false, error: "Network error" }));
      }
    }
  }, [token]);

  useEffect(() => {
    fetchAlarm();
    return () => abortRef.current?.abort();
  }, [fetchAlarm]);

  const updateAlarm = useCallback((alarm: AlarmPublic, newExtension?: Extension) => {
    setState((s) => ({
      ...s,
      alarm,
      extensions: newExtension ? [newExtension, ...s.extensions] : s.extensions,
    }));
  }, []);

  return { ...state, refetch: fetchAlarm, updateAlarm };
}
