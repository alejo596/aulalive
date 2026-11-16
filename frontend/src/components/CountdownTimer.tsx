import React, { useEffect, useState } from 'react';

interface CountdownTimerProps {
  initialSeconds: number;
  onTimeUp?: () => void;
  isRunning?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  initialSeconds,
  onTimeUp,
  isRunning = true
}) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    setTimeLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      if (timeLeft === 0 && onTimeUp) {
        onTimeUp();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft, onTimeUp]);

  const percentage = Math.max(0, Math.min(100, (timeLeft / (initialSeconds || 1)) * 100));
  const isUrgent = timeLeft <= 5;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono font-bold text-sm transition-all border ${
          isUrgent
            ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
            : 'bg-slate-800 text-cyan-400 border-slate-700'
        }`}
      >
        <span className="material-icons text-base">timer</span>
        <span>{timeLeft}s</span>
      </div>

      <div className="w-24 sm:w-32 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
        <div
          className={`h-full transition-all duration-1000 rounded-full ${
            isUrgent ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

