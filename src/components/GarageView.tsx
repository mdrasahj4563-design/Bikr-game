import React from 'react';
import { Check, Lock, Bike as BikeIcon } from 'lucide-react';
import { BikeModel } from '../types/game';
import { BIKE_MODELS } from '../data/gameData';

interface GarageViewProps {
  totalCoins: number;
  unlockedBikeIds: string[];
  selectedBikeId: string;
  onSelectBike: (bikeId: string) => void;
  onUnlockBike: (bike: BikeModel) => void;
}

export const GarageView: React.FC<GarageViewProps> = ({
  totalCoins,
  unlockedBikeIds,
  selectedBikeId,
  onSelectBike,
  onUnlockBike,
}) => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide text-slate-100">
            Rider Garage
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Unlock and equip bikes using coins collected on the highway. Zero ad requirements.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Available Balance</div>
          <div className="font-mono-tabular text-2xl font-bold text-amber-400">
            {totalCoins} Coins
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {BIKE_MODELS.map((bike) => {
          const isUnlocked = unlockedBikeIds.includes(bike.id);
          const isEquipped = selectedBikeId === bike.id;
          const canAfford = totalCoins >= bike.costCoins;

          return (
            <div
              key={bike.id}
              className={`flex flex-col justify-between rounded-xl border p-6 transition-colors ${
                isEquipped
                  ? 'border-amber-500/70 bg-[#151F30]'
                  : 'border-slate-800 bg-[#111824]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{bike.category}</span>
                  <span>
                    {isEquipped
                      ? 'Equipped'
                      : isUnlocked
                        ? 'Owned'
                        : `${bike.costCoins} Coins`}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-700"
                    style={{ backgroundColor: `${bike.primaryColor}20` }}
                  >
                    <BikeIcon
                      className="h-6 w-6"
                      style={{ color: bike.primaryColor }}
                    />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-slate-100">
                    {bike.name}
                  </h2>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {bike.description}
                </p>

                <dl className="mt-5 space-y-2.5 border-t border-slate-800 pt-4 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Top Speed</dt>
                    <dd className="font-mono-tabular font-semibold text-slate-200">
                      {Math.round(bike.maxSpeed * 0.19)} km/h
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Steering Response</dt>
                    <dd className="font-mono-tabular font-semibold text-slate-200">
                      {Math.round(bike.handling * 100)}%
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Hop Air-Time</dt>
                    <dd className="font-mono-tabular font-semibold text-slate-200">
                      {bike.jumpDurationMs} ms
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6">
                {isEquipped ? (
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-4 py-2.5 text-sm font-semibold text-emerald-300"
                  >
                    <Check className="h-4 w-4" />
                    <span>Equipped for Next Run</span>
                  </button>
                ) : isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onSelectBike(bike.id)}
                    className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors cursor-pointer"
                  >
                    Equip Bike
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onUnlockBike(bike)}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                      canAfford
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
                        : 'bg-slate-800/70 text-slate-500 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <Lock className="h-4 w-4" />
                    <span>
                      {canAfford
                        ? `Unlock for ${bike.costCoins} Coins`
                        : `Need ${bike.costCoins - totalCoins} More Coins`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
