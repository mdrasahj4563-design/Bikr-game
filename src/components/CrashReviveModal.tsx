import React from 'react';
import { Play, ShieldAlert, XCircle } from 'lucide-react';
import { CrashSummary } from '../types/game';
import { REVIVE_BONUS_COINS, REVIVE_SHIELD_SECONDS } from '../data/gameData';

interface CrashReviveModalProps {
  crashSummary: CrashSummary;
  adsConsentEnabled: boolean;
  onWatchAdsgramToContinue: () => void;
  onNoThanks: () => void;
}

export const CrashReviveModal: React.FC<CrashReviveModalProps> = ({
  crashSummary,
  adsConsentEnabled,
  onWatchAdsgramToContinue,
  onNoThanks,
}) => {
  const revivesLeft = Math.max(
    0,
    crashSummary.maxRevivesPerRun - crashSummary.revivesUsedThisRun
  );
  const canOfferAdContinue = adsConsentEnabled && revivesLeft > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crash-modal-title"
    >
      <div className="w-full max-w-md rounded-xl bg-[#131B29] border border-slate-700/80 p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="crash-modal-title"
              className="font-display text-2xl font-bold tracking-wide text-slate-100"
            >
              Obstacle Collision
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Your bike hit a <span className="font-medium text-slate-200">{crashSummary.obstacleName}</span> at{' '}
              <span className="font-mono-tabular font-semibold text-amber-400">
                {crashSummary.distanceMeters} m
              </span>
              .
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-800 py-4 text-center">
          <div>
            <div className="text-xs text-slate-400">Distance</div>
            <div className="mt-0.5 font-mono-tabular text-lg font-bold text-slate-100">
              {crashSummary.distanceMeters} m
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Coins</div>
            <div className="mt-0.5 font-mono-tabular text-lg font-bold text-amber-400">
              {crashSummary.coinsThisRun}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Revives Left</div>
            <div className="mt-0.5 font-mono-tabular text-lg font-bold text-emerald-400">
              {revivesLeft} / {crashSummary.maxRevivesPerRun}
            </div>
          </div>
        </div>

        {canOfferAdContinue ? (
          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            Optional rewarded continue (Placement: <span className="font-mono-tabular text-slate-300">CRASH_REVIVE_MODAL</span>). Watching completes view-only credit for{' '}
            <span className="text-emerald-400 font-medium">+{REVIVE_SHIELD_SECONDS}s shield</span> and{' '}
            <span className="text-amber-400 font-medium">+{REVIVE_BONUS_COINS} coins</span>. No ad click required.
          </p>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            {!adsConsentEnabled
              ? 'Rewarded ad prompts are disabled in your Ad Consent settings.'
              : 'Maximum rewarded continues reached for this run.'}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {canOfferAdContinue && (
            <button
              type="button"
              onClick={onWatchAdsgramToContinue}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 active:bg-amber-600 transition-colors cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Watch Adsgram Ad to Continue</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNoThanks}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            <XCircle className="h-4 w-4" />
            <span>No Thanks</span>
          </button>
        </div>
      </div>
    </div>
  );
};
