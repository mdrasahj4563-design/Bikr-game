import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Bike as BikeIcon,
  Shield,
  Zap,
} from 'lucide-react';
import {
  AppTab,
  BikeModel,
  CrashSummary,
  GameState,
  LeaderboardEntry,
  RewardLedgerEntry,
  UserAdSettings,
} from './types/game';
import {
  ADSGRAM_PLACEMENT_SPEC,
  BIKE_MODELS,
  INITIAL_LEADERBOARD,
  INITIAL_REWARD_LEDGER,
  REVIVE_BONUS_COINS,
} from './data/gameData';
import { arcadeAudio } from './utils/audio';
import { tryRunLiveAdsgramSdk } from './services/adsgram';
import { BikeCanvas } from './components/BikeCanvas';
import { CrashReviveModal } from './components/CrashReviveModal';
import { AdPlayerModal } from './components/AdPlayerModal';
import { GarageView } from './components/GarageView';
import { LeaderboardAndPayoutsView } from './components/LeaderboardAndPayoutsView';
import { PolicyDisclosureView } from './components/PolicyDisclosureView';

const STORAGE_KEY = 'apex_moto_run_save_v1';

interface SavedProgress {
  totalCoins: number;
  bestDistance: number;
  unlockedBikeIds: string[];
  selectedBikeId: string;
  leaderboard: LeaderboardEntry[];
  rewardLedger: RewardLedgerEntry[];
  adSettings: UserAdSettings;
}

function loadSavedProgress(): SavedProgress {
  const defaults: SavedProgress = {
    totalCoins: 60,
    bestDistance: 0,
    unlockedBikeIds: [BIKE_MODELS[0].id],
    selectedBikeId: BIKE_MODELS[0].id,
    leaderboard: INITIAL_LEADERBOARD,
    rewardLedger: INITIAL_REWARD_LEDGER,
    adSettings: {
      rewardedAdsConsent: true,
      adsgramBlockId: '10428',
      riderHandle: '@rider_guest',
    },
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      totalCoins: typeof parsed.totalCoins === 'number' ? parsed.totalCoins : defaults.totalCoins,
      bestDistance:
        typeof parsed.bestDistance === 'number' ? parsed.bestDistance : defaults.bestDistance,
      unlockedBikeIds: Array.isArray(parsed.unlockedBikeIds)
        ? parsed.unlockedBikeIds
        : defaults.unlockedBikeIds,
      selectedBikeId:
        typeof parsed.selectedBikeId === 'string'
          ? parsed.selectedBikeId
          : defaults.selectedBikeId,
      leaderboard: Array.isArray(parsed.leaderboard)
        ? parsed.leaderboard
        : defaults.leaderboard,
      rewardLedger: Array.isArray(parsed.rewardLedger)
        ? parsed.rewardLedger
        : defaults.rewardLedger,
      adSettings: parsed.adSettings
        ? { ...defaults.adSettings, ...parsed.adSettings }
        : defaults.adSettings,
    };
  } catch {
    return defaults;
  }
}

function formatUtcTimestamp(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

export default function App() {
  const initial = useMemo(() => loadSavedProgress(), []);

  const [activeTab, setActiveTab] = useState<AppTab>('play');
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [runSessionId, setRunSessionId] = useState<number>(1);
  const [reviveTriggerCount, setReviveTriggerCount] = useState<number>(0);

  const [totalCoins, setTotalCoins] = useState<number>(initial.totalCoins);
  const [bestDistance, setBestDistance] = useState<number>(initial.bestDistance);
  const [unlockedBikeIds, setUnlockedBikeIds] = useState<string[]>(initial.unlockedBikeIds);
  const [selectedBikeId, setSelectedBikeId] = useState<string>(initial.selectedBikeId);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initial.leaderboard);
  const [rewardLedger, setRewardLedger] = useState<RewardLedgerEntry[]>(initial.rewardLedger);
  const [adSettings, setAdSettings] = useState<UserAdSettings>(initial.adSettings);

  const [muted, setMuted] = useState<boolean>(false);
  const [crashSummary, setCrashSummary] = useState<CrashSummary | null>(null);
  const [lastRunPayoutCoins, setLastRunPayoutCoins] = useState<number>(0);

  const [telemetry, setTelemetry] = useState({
    distanceMeters: 0,
    speedKmh: 70,
    coinsThisRun: 0,
    nearMisses: 0,
    shieldSecondsLeft: 0,
    boostSecondsLeft: 0,
  });

  const equippedBike = useMemo(
    () => BIKE_MODELS.find((b) => b.id === selectedBikeId) ?? BIKE_MODELS[0],
    [selectedBikeId]
  );

  // Persist save state
  useEffect(() => {
    try {
      const payload: SavedProgress = {
        totalCoins,
        bestDistance,
        unlockedBikeIds,
        selectedBikeId,
        leaderboard,
        rewardLedger,
        adSettings,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    totalCoins,
    bestDistance,
    unlockedBikeIds,
    selectedBikeId,
    leaderboard,
    rewardLedger,
    adSettings,
  ]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    arcadeAudio.setMuted(next);
  };

  const startNewRun = useCallback(() => {
    arcadeAudio.playButton();
    setActiveTab('play');
    setCrashSummary(null);
    setLastRunPayoutCoins(0);
    setReviveTriggerCount(0);
    setRunSessionId((prev) => prev + 1);
    setGameState('PLAYING');
  }, []);

  const finalizeRunToGameOver = useCallback(
    (summary: CrashSummary) => {
      const earned = summary.coinsThisRun;
      setLastRunPayoutCoins(earned);
      setTotalCoins((prev) => prev + earned);
      setBestDistance((prev) => Math.max(prev, summary.distanceMeters));

      if (summary.distanceMeters > 0) {
        const cleanHandle = adSettings.riderHandle.trim() || '@rider_guest';
        const newEntry: LeaderboardEntry = {
          id: `lb-user-${Date.now()}`,
          riderHandle: cleanHandle,
          bikeName: equippedBike.name,
          distanceMeters: summary.distanceMeters,
          coinsEarned: earned,
          recordedAt: formatUtcTimestamp(),
          isCurrentUser: true,
        };
        setLeaderboard((prev) =>
          [...prev, newEntry]
            .sort((a, b) => b.distanceMeters - a.distanceMeters)
            .slice(0, 12)
        );
      }

      setGameState('GAME_OVER');
    },
    [adSettings.riderHandle, equippedBike.name]
  );

  const handleCrash = useCallback((summary: CrashSummary) => {
    setCrashSummary(summary);
    setGameState('CRASH_PROMPT');
  }, []);

  const grantReviveReward = useCallback(() => {
    arcadeAudio.playReviveShield();
    setTotalCoins((prev) => prev + REVIVE_BONUS_COINS);
    const cleanHandle = adSettings.riderHandle.trim() || '@rider_guest';
    const txRef = `AG-REV-${String(Date.now()).slice(-5)}`;
    const entry: RewardLedgerEntry = {
      id: `rw-${Date.now()}`,
      txRef,
      riderHandle: cleanHandle,
      placementId: ADSGRAM_PLACEMENT_SPEC.placementId,
      placementMoment: 'Obstacle Collision Continue (Opt-in)',
      rewardGranted: `1x Run Continue (3s Shield) + ${REVIVE_BONUS_COINS} Coins`,
      status: 'Verified',
      timestamp: formatUtcTimestamp(),
      isCurrentUser: true,
    };
    setRewardLedger((prev) => [entry, ...prev].slice(0, 20));
    setCrashSummary(null);
    setReviveTriggerCount((prev) => prev + 1);
    setGameState('PLAYING');
  }, [adSettings.riderHandle]);

  const handleWatchAdsgramToContinue = async () => {
    arcadeAudio.playButton();
    const sdkResult = await tryRunLiveAdsgramSdk(adSettings.adsgramBlockId);
    if (sdkResult.mode === 'live_sdk') {
      if (sdkResult.rewarded) {
        grantReviveReward();
      } else if (crashSummary) {
        finalizeRunToGameOver(crashSummary);
      }
      return;
    }

    // Fallback to clean view-only interactive preview player in web preview
    setGameState('WATCHING_AD');
  };

  const handleNoThanks = () => {
    arcadeAudio.playButton();
    if (crashSummary) {
      finalizeRunToGameOver(crashSummary);
    } else {
      setGameState('GAME_OVER');
    }
  };

  const handleTogglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'PLAYING') return 'PAUSED';
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  }, []);

  const handleTabChange = (tab: AppTab) => {
    arcadeAudio.playButton();
    if (tab !== 'play' && gameState === 'PLAYING') {
      setGameState('PAUSED');
    }
    setActiveTab(tab);
  };

  const handleUnlockBike = (bike: BikeModel) => {
    if (totalCoins < bike.costCoins || unlockedBikeIds.includes(bike.id)) return;
    arcadeAudio.playReviveShield();
    setTotalCoins((prev) => prev - bike.costCoins);
    setUnlockedBikeIds((prev) => [...prev, bike.id]);
    setSelectedBikeId(bike.id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
      {/* Three-Zone Top Bar Contract */}
      <header className="border-b border-slate-800/90 bg-[#0D131F]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleTabChange('play')}
            className="font-display text-2xl font-extrabold tracking-wide text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Apex Moto Run
          </button>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav className="flex items-center gap-5 sm:gap-7 text-sm font-medium overflow-x-auto">
            {(
              [
                { id: 'play', label: 'Highway' },
                { id: 'garage', label: 'Garage' },
                { id: 'leaderboard', label: 'Leaderboard' },
                { id: 'policy', label: 'Ad Policy' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === item.id
                    ? 'border-amber-500 text-slate-100'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0 hidden sm:block">
            {activeTab === 'play' && gameState === 'PLAYING' ? (
              <button
                type="button"
                onClick={handleTogglePause}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Pause Ride
              </button>
            ) : (
              <button
                type="button"
                onClick={startNewRun}
                className="rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start Ride
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'play' && (
          <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left / Primary Anchor: Highway Bike Canvas & HUD */}
              <div className="lg:col-span-7 flex flex-col items-center">
                {/* Compact Unboxed HUD Bar */}
                <div className="mb-3 flex w-full max-w-[440px] items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#111824] px-4 py-2.5">
                  <div className="flex items-center gap-5">
                    <div>
                      <div className="text-[11px] text-slate-400">Distance</div>
                      <div className="font-mono-tabular text-base font-bold text-slate-100">
                        {telemetry.distanceMeters} m
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Speed</div>
                      <div className="font-mono-tabular text-base font-bold text-slate-200">
                        {telemetry.speedKmh} km/h
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Run Coins</div>
                      <div className="font-mono-tabular text-base font-bold text-amber-400">
                        {telemetry.coinsThisRun}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {telemetry.shieldSecondsLeft > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 font-mono-tabular">
                        <Shield className="h-3.5 w-3.5" />
                        {telemetry.shieldSecondsLeft}s
                      </span>
                    )}
                    {telemetry.boostSecondsLeft > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-orange-400 font-mono-tabular">
                        <Zap className="h-3.5 w-3.5" />
                        {telemetry.boostSecondsLeft}s
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
                      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
                    >
                      {muted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
                      <button
                        type="button"
                        onClick={handleTogglePause}
                        className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                        aria-label={gameState === 'PAUSED' ? 'Resume ride' : 'Pause ride'}
                      >
                        {gameState === 'PAUSED' ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Canvas Container with State Overlays */}
                <div className="relative w-full flex flex-col items-center">
                  <BikeCanvas
                    gameState={gameState}
                    bike={equippedBike}
                    runSessionId={runSessionId}
                    reviveTriggerCount={reviveTriggerCount}
                    onTelemetryUpdate={setTelemetry}
                    onCrash={handleCrash}
                    onPauseRequest={handleTogglePause}
                  />

                  {/* Title Menu Overlay */}
                  {gameState === 'TITLE_MENU' && (
                    <div className="absolute inset-0 mx-auto max-w-[440px] flex items-center justify-center rounded-xl bg-slate-950/75 backdrop-blur-[2px] p-6">
                      <div className="w-full max-w-sm rounded-xl border border-slate-700/80 bg-[#121A28] p-6 text-center shadow-2xl">
                        <div className="text-xs font-medium text-amber-400">
                          Equipped · {equippedBike.name}
                        </div>
                        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-wide text-white">
                          Hit the Highway
                        </h1>
                        <p className="mt-2 text-sm text-slate-300">
                          Weave across 4 highway lanes, hop over low cones and potholes, and collect gold coins.
                        </p>

                        <div className="mt-5 space-y-2 border-y border-slate-800 py-4 text-left text-xs text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Steer Left / Right</span>
                            <span className="font-mono-tabular text-slate-100">A / D or Arrows or Drag</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Hop Low Obstacles</span>
                            <span className="font-mono-tabular text-slate-100">Space / W / Up</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Brake</span>
                            <span className="font-mono-tabular text-slate-100">S / Down</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={startNewRun}
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          <span>Start Game</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Pause Overlay */}
                  {gameState === 'PAUSED' && (
                    <div className="absolute inset-0 mx-auto max-w-[440px] flex items-center justify-center rounded-xl bg-slate-950/75 backdrop-blur-[2px] p-6">
                      <div className="w-full max-w-xs rounded-xl border border-slate-700 bg-[#121A28] p-6 text-center shadow-2xl">
                        <h2 className="font-display text-3xl font-bold text-white">
                          Ride Paused
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">
                          Distance {telemetry.distanceMeters} m · Coins {telemetry.coinsThisRun}
                        </p>
                        <div className="mt-5 flex flex-col gap-2.5">
                          <button
                            type="button"
                            onClick={handleTogglePause}
                            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                          >
                            Resume Ride
                          </button>
                          <button
                            type="button"
                            onClick={startNewRun}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            Restart Run
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Game Over Overlay */}
                  {gameState === 'GAME_OVER' && (
                    <div className="absolute inset-0 mx-auto max-w-[440px] flex items-center justify-center rounded-xl bg-slate-950/80 backdrop-blur-[2px] p-6">
                      <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-[#121A28] p-6 text-center shadow-2xl">
                        <div className="text-xs font-medium text-slate-400">
                          Run Complete
                        </div>
                        <h2 className="mt-1 font-display text-3xl font-bold text-white">
                          Ride Summary
                        </h2>

                        <div className="mt-4 grid grid-cols-3 gap-3 border-y border-slate-800 py-4">
                          <div>
                            <div className="text-xs text-slate-400">Distance</div>
                            <div className="mt-0.5 font-mono-tabular text-lg font-bold text-slate-100">
                              {crashSummary?.distanceMeters ?? telemetry.distanceMeters} m
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Earned</div>
                            <div className="mt-0.5 font-mono-tabular text-lg font-bold text-amber-400">
                              +{lastRunPayoutCoins}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Best</div>
                            <div className="mt-0.5 font-mono-tabular text-lg font-bold text-emerald-400">
                              {bestDistance} m
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-col gap-2.5">
                          <button
                            type="button"
                            onClick={startNewRun}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>Play Again</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTabChange('garage')}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            Visit Bike Garage ({totalCoins} Coins)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Rider Stats, Road Hazard Guide & Placement Summary */}
              <aside className="lg:col-span-5 space-y-6">
                {/* Rider Career Summary */}
                <div className="rounded-xl border border-slate-800 bg-[#111824] p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-bold text-slate-100">
                      Rider Profile
                    </h2>
                    <span className="font-mono-tabular text-xs text-slate-400">
                      {adSettings.riderHandle}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-800 pt-4">
                    <div>
                      <div className="text-xs text-slate-400">Wallet</div>
                      <div className="mt-0.5 font-mono-tabular text-xl font-bold text-amber-400">
                        {totalCoins}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Best Run</div>
                      <div className="mt-0.5 font-mono-tabular text-xl font-bold text-slate-100">
                        {bestDistance} m
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Close Calls</div>
                      <div className="mt-0.5 font-mono-tabular text-xl font-bold text-sky-400">
                        {telemetry.nearMisses}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                    <div className="flex items-center gap-2.5">
                      <BikeIcon
                        className="h-5 w-5"
                        style={{ color: equippedBike.primaryColor }}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-100">
                          {equippedBike.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {equippedBike.category} · Top {Math.round(equippedBike.maxSpeed * 0.19)} km/h
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTabChange('garage')}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer whitespace-nowrap"
                    >
                      Change Bike
                    </button>
                  </div>
                </div>

                {/* Highway Obstacles Reference */}
                <div className="rounded-xl border border-slate-800 bg-[#111824] p-6">
                  <h2 className="font-display text-2xl font-bold text-slate-100">
                    Road Obstacles Guide
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Hitting any obstacle ends the run unless you opt to watch an Adsgram continue ad or decline with No Thanks.
                  </p>

                  <div className="mt-4 divide-y divide-slate-800/80 text-sm">
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-slate-200">Traffic Cones &amp; Potholes</span>
                      <span className="text-xs font-medium text-emerald-400">
                        Steer or Hop (Space)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-slate-200">Oil Slicks</span>
                      <span className="text-xs font-medium text-emerald-400">
                        Steer or Hop (Space)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-slate-200">Concrete Roadblocks</span>
                      <span className="text-xs font-medium text-amber-400">
                        Steer Around Only
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-slate-200">Sedans &amp; Delivery Vans</span>
                      <span className="text-xs font-medium text-amber-400">
                        Steer Around Only
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compact Placement & Ledger Transparency */}
                <div className="rounded-xl border border-slate-800 bg-[#111824] p-6">
                  <h2 className="font-display text-xl font-bold text-slate-100">
                    Ad Placement &amp; Payout Transparency
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    Ads appear strictly at <span className="font-mono-tabular text-slate-200">CRASH_REVIVE_MODAL</span> when you choose &ldquo;Watch Adsgram Ad to Continue&rdquo;. Selecting &ldquo;No Thanks&rdquo; or opting out keeps gameplay 100% ad-free.
                  </p>
                  <div className="mt-4 flex items-center gap-5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => handleTabChange('leaderboard')}
                      className="text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      View Verified Reward Ledger ({rewardLedger.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange('policy')}
                      className="text-slate-300 hover:text-white cursor-pointer"
                    >
                      Ad Consent: {adSettings.rewardedAdsConsent ? 'Opted In' : 'Opted Out'}
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {activeTab === 'garage' && (
          <GarageView
            totalCoins={totalCoins}
            unlockedBikeIds={unlockedBikeIds}
            selectedBikeId={selectedBikeId}
            onSelectBike={(id) => {
              arcadeAudio.playButton();
              setSelectedBikeId(id);
            }}
            onUnlockBike={handleUnlockBike}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardAndPayoutsView
            leaderboard={leaderboard}
            rewardLedger={rewardLedger}
          />
        )}

        {activeTab === 'policy' && (
          <PolicyDisclosureView
            settings={adSettings}
            onUpdateSettings={setAdSettings}
          />
        )}
      </main>

      {/* Required Crash Popup: 2 Buttons ("Watch Adsgram Ad to Continue" or "No Thanks") */}
      {gameState === 'CRASH_PROMPT' && crashSummary && (
        <CrashReviveModal
          crashSummary={crashSummary}
          adsConsentEnabled={adSettings.rewardedAdsConsent}
          onWatchAdsgramToContinue={handleWatchAdsgramToContinue}
          onNoThanks={handleNoThanks}
        />
      )}

      {/* View-Only Adsgram Preview Player (when native Telegram Adsgram SDK isn't injected) */}
      {gameState === 'WATCHING_AD' && (
        <AdPlayerModal
          blockId={adSettings.adsgramBlockId}
          onRewardCompleted={grantReviveReward}
          onAbandon={handleNoThanks}
        />
      )}
    </div>
  );
}
