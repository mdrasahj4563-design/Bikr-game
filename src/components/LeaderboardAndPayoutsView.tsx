import React, { useState } from 'react';
import { Trophy, ReceiptText } from 'lucide-react';
import { LeaderboardEntry, RewardLedgerEntry } from '../types/game';

interface LeaderboardAndPayoutsViewProps {
  leaderboard: LeaderboardEntry[];
  rewardLedger: RewardLedgerEntry[];
}

export const LeaderboardAndPayoutsView: React.FC<LeaderboardAndPayoutsViewProps> = ({
  leaderboard,
  rewardLedger,
}) => {
  const [subTab, setSubTab] = useState<'leaderboard' | 'payouts'>('leaderboard');

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide text-slate-100">
            Public Leaderboard &amp; Reward Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Transparent highway distance rankings and verifiable in-game Adsgram continue reward confirmations.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#111824] p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('leaderboard')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'leaderboard'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>Rider Rankings</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('payouts')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'payouts'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <ReceiptText className="h-3.5 w-3.5" />
            <span>Reward Confirmations ({rewardLedger.length})</span>
          </button>
        </div>
      </div>

      {subTab === 'leaderboard' ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-[#111824]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-3.5 font-medium">Rank</th>
                <th className="px-5 py-3.5 font-medium">Rider</th>
                <th className="px-5 py-3.5 font-medium">Bike</th>
                <th className="px-5 py-3.5 font-medium text-right">Distance</th>
                <th className="px-5 py-3.5 font-medium text-right">Coins</th>
                <th className="px-5 py-3.5 font-medium text-right">Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {leaderboard.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={
                    entry.isCurrentUser ? 'bg-amber-500/10' : 'hover:bg-slate-800/30'
                  }
                >
                  <td className="px-5 py-3.5 font-mono-tabular font-semibold text-slate-300">
                    #{idx + 1}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-100">
                    {entry.riderHandle}
                    {entry.isCurrentUser && (
                      <span className="ml-2 text-xs text-amber-400">You</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{entry.bikeName}</td>
                  <td className="px-5 py-3.5 text-right font-mono-tabular font-semibold text-slate-100">
                    {entry.distanceMeters.toLocaleString()} m
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-tabular text-amber-400">
                    {entry.coinsEarned}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-tabular text-xs text-slate-400">
                    {entry.recordedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-[#111824]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-3.5 font-medium">Reference</th>
                <th className="px-5 py-3.5 font-medium">Rider</th>
                <th className="px-5 py-3.5 font-medium">Ad Placement</th>
                <th className="px-5 py-3.5 font-medium">Reward Delivered</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rewardLedger.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.isCurrentUser ? 'bg-emerald-500/10' : 'hover:bg-slate-800/30'
                  }
                >
                  <td className="px-5 py-3.5 font-mono-tabular text-xs text-slate-300">
                    {item.txRef}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-100">
                    {item.riderHandle}
                    {item.isCurrentUser && (
                      <span className="ml-2 text-xs text-emerald-400">You</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">
                    <div className="font-mono-tabular text-xs text-slate-200">
                      {item.placementId}
                    </div>
                    <div className="text-xs text-slate-400">{item.placementMoment}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-200">{item.rewardGranted}</td>
                  <td className="px-5 py-3.5 text-xs font-medium text-emerald-400">
                    {item.status}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-tabular text-xs text-slate-400">
                    {item.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
