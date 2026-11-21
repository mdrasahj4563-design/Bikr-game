import React, { useEffect, useState } from 'react';
import { CheckCircle2, Volume2, VolumeX, X } from 'lucide-react';
import { REVIVE_BONUS_COINS, REVIVE_SHIELD_SECONDS } from '../data/gameData';

interface AdPlayerModalProps {
  blockId: string;
  onRewardCompleted: () => void;
  onAbandon: () => void;
}

const AD_DURATION_SECONDS = 5;

export const AdPlayerModal: React.FC<AdPlayerModalProps> = ({
  blockId,
  onRewardCompleted,
  onAbandon,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(AD_DURATION_SECONDS);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  const isCompleted = secondsRemaining === 0;
  const progressPercent =
    ((AD_DURATION_SECONDS - secondsRemaining) / AD_DURATION_SECONDS) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-player-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0F1623] overflow-hidden shadow-2xl">
        {/* Top Ad Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">Adsgram Rewarded Preview</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">Block {blockId}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
              aria-label={muted ? 'Unmute ad audio' : 'Mute ad audio'}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onAbandon}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
              aria-label="Close ad early"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Simulated Video Content Frame */}
        <div className="relative flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#152033] to-slate-950 px-6 py-12 text-center">
          <div className="text-xs font-medium text-amber-400">
            Sponsored Partner Showcase
          </div>
          <h3
            id="ad-player-title"
            className="mt-2 font-display text-3xl font-bold tracking-wide text-white"
          >
            {isCompleted ? 'Reward Ready' : 'View Ad to Resume Run'}
          </h3>
          <p className="mt-2 max-w-xs text-sm text-slate-300">
            {isCompleted
              ? `View verified. Resume your bike run with +${REVIVE_SHIELD_SECONDS}s shield and +${REVIVE_BONUS_COINS} coins.`
              : 'Simple view-only verification. No external ad clicks are required to claim your continue.'}
          </p>

          <div className="mt-6 w-full max-w-xs">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-mono-tabular">
              <span>{isCompleted ? 'Completed' : 'Viewing'}</span>
              <span>{secondsRemaining}s remaining</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-4 py-3 bg-[#111927]">
          <button
            type="button"
            onClick={onAbandon}
            className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            Skip (No Reward)
          </button>

          <button
            type="button"
            disabled={!isCompleted}
            onClick={onRewardCompleted}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              isCompleted
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isCompleted ? 'Continue Ride' : `Wait ${secondsRemaining}s`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
