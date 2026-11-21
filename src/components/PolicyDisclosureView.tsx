import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { ADSGRAM_PLACEMENT_SPEC } from '../data/gameData';
import { UserAdSettings } from '../types/game';

interface PolicyDisclosureViewProps {
  settings: UserAdSettings;
  onUpdateSettings: (next: UserAdSettings) => void;
}

export const PolicyDisclosureView: React.FC<PolicyDisclosureViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2.5 text-emerald-400 text-xs font-medium">
          <ShieldCheck className="h-4 w-4" />
          <span>Adsgram Placement &amp; User Consent Controls</span>
        </div>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-wide text-slate-100">
          Ad Placement Specification &amp; Preferences
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Exact disclosure of where rewarded ads appear, how rewards are verified, and your opt-in controls.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Placement Specification */}
        <div className="rounded-xl border border-slate-800 bg-[#111824] p-6">
          <h2 className="font-display text-xl font-bold text-slate-100">
            01. Exact Placement Location
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Placement ID &amp; Screen</dt>
              <dd className="mt-0.5 font-mono-tabular text-amber-400">
                {ADSGRAM_PLACEMENT_SPEC.placementId}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Trigger Moment</dt>
              <dd className="mt-0.5 text-slate-200">
                {ADSGRAM_PLACEMENT_SPEC.triggerMoment}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">User Choice &amp; Decline Path</dt>
              <dd className="mt-0.5 text-slate-200">
                {ADSGRAM_PLACEMENT_SPEC.userControl}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">View-Only Verification</dt>
              <dd className="mt-0.5 text-slate-200">
                {ADSGRAM_PLACEMENT_SPEC.adClickPolicy}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Balanced Reward Cap</dt>
              <dd className="mt-0.5 text-slate-200">
                {ADSGRAM_PLACEMENT_SPEC.rewardCap}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Core Gameplay Freedom</dt>
              <dd className="mt-0.5 text-slate-200">
                {ADSGRAM_PLACEMENT_SPEC.freePlayGuarantee}
              </dd>
            </div>
          </dl>
        </div>

        {/* User Preferences & Block ID */}
        <div className="rounded-xl border border-slate-800 bg-[#111824] p-6">
          <h2 className="font-display text-xl font-bold text-slate-100">
            02. Rider Profile &amp; Ad Consent
          </h2>

          <div className="mt-5 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Opt-In Rewarded Ad Prompts
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  When enabled, hitting an obstacle displays the optional &ldquo;Watch Adsgram Ad to Continue&rdquo; or &ldquo;No Thanks&rdquo; prompt. Turn off to skip ad prompts completely.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.rewardedAdsConsent}
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    rewardedAdsConsent: !settings.rewardedAdsConsent,
                  })
                }
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  settings.rewardedAdsConsent ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    settings.rewardedAdsConsent ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label
                htmlFor="rider-handle-input"
                className="block text-xs font-medium text-slate-300"
              >
                Rider Handle (Leaderboard &amp; Reward Ledger)
              </label>
              <input
                id="rider-handle-input"
                type="text"
                maxLength={24}
                value={settings.riderHandle}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    riderHandle: e.target.value,
                  })
                }
                placeholder="@your_handle"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="adsgram-block-input"
                className="block text-xs font-medium text-slate-300"
              >
                Adsgram Block ID (for Live Telegram Mini App SDK)
              </label>
              <input
                id="adsgram-block-input"
                type="text"
                maxLength={32}
                value={settings.adsgramBlockId}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    adsgramBlockId: e.target.value,
                  })
                }
                placeholder="e.g. 10428"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono-tabular text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Calls <span className="font-mono-tabular text-slate-300">window.Adsgram.init({'{ blockId }'})</span> when the Adsgram SDK is present, with an interactive view-only preview in web browsers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
