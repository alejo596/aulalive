import React from 'react';

interface LiveStatsChartProps {
  options: {
    id: string;
    text: string;
    orderNum: number;
    isCorrect?: boolean;
  }[];
  distribution: { [optionId: string]: number };
  totalResponses: number;
  showCorrect?: boolean;
}

export const LiveStatsChart: React.FC<LiveStatsChartProps> = ({
  options,
  distribution,
  totalResponses,
  showCorrect = false
}) => {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const colors = [
    'from-blue-600 to-cyan-500 border-cyan-500/40',
    'from-emerald-600 to-teal-500 border-teal-500/40',
    'from-amber-600 to-yellow-500 border-yellow-500/40',
    'from-purple-600 to-indigo-500 border-indigo-500/40',
    'from-rose-600 to-pink-500 border-pink-500/40',
    'from-orange-600 to-amber-500 border-amber-500/40'
  ];

  return (
    <div className="w-full space-y-3.5">
      {options.map((opt, idx) => {
        const count = distribution[opt.id] || 0;
        const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
        const isRightAnswer = showCorrect && opt.isCorrect;

        return (
          <div
            key={opt.id}
            className={`p-3.5 rounded-2xl border transition-all duration-500 ${
              isRightAnswer
                ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 font-mono font-bold text-xs flex items-center justify-center text-cyan-400">
                  {letters[idx] || (idx + 1)}
                </span>
                <span className={`text-sm font-medium ${isRightAnswer ? 'text-emerald-300 font-semibold' : 'text-slate-200'}`}>
                  {opt.text}
                </span>
                {isRightAnswer && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-icons text-xs">check_circle</span> Correcta
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs text-slate-400">{count} votos</span>
                <span className="text-sm font-bold text-white">{percentage}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${
                  isRightAnswer ? 'from-emerald-500 to-teal-400' : colors[idx % colors.length]
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

