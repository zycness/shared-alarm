interface CountdownTimerProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export function CountdownTimer({ days, hours, minutes, seconds, expired }: CountdownTimerProps) {
  if (expired) {
    return (
      <div className="text-center py-8">
        <p className="text-4xl font-bold text-red-500">Time's Up!</p>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex justify-center gap-4 py-8">
      {days > 0 && (
        <div className="text-center">
          <div className="text-4xl font-mono font-bold bg-gray-800 text-white rounded-lg px-4 py-3">{pad(days)}</div>
          <div className="text-xs text-gray-500 mt-1 uppercase">Days</div>
        </div>
      )}
      <div className="text-center">
        <div className="text-4xl font-mono font-bold bg-gray-800 text-white rounded-lg px-4 py-3">{pad(hours)}</div>
        <div className="text-xs text-gray-500 mt-1 uppercase">Hours</div>
      </div>
      <div className="text-center">
        <div className="text-4xl font-mono font-bold bg-gray-800 text-white rounded-lg px-4 py-3">{pad(minutes)}</div>
        <div className="text-xs text-gray-500 mt-1 uppercase">Min</div>
      </div>
      <div className="text-center">
        <div className="text-4xl font-mono font-bold bg-gray-800 text-white rounded-lg px-4 py-3">{pad(seconds)}</div>
        <div className="text-xs text-gray-500 mt-1 uppercase">Sec</div>
      </div>
    </div>
  );
}
