import { BikeModel, LeaderboardEntry, RewardLedgerEntry } from '../types/game';

export const MAX_REVIVES_PER_RUN = 2;
export const REVIVE_SHIELD_SECONDS = 3;
export const REVIVE_BONUS_COINS = 25;

export const BIKE_MODELS: BikeModel[] = [
  {
    id: 'scrambler-250',
    name: 'Street Scrambler 250',
    category: 'Standard Urban',
    costCoins: 0,
    baseSpeed: 370,
    maxSpeed: 640,
    handling: 1.0,
    jumpDurationMs: 560,
    primaryColor: '#F59E0B',
    accentColor: '#FEF3C7',
    description: 'Nimble commuter chassis with steady lane response and balanced wheelie clearance.',
  },
  {
    id: 'apex-sport-600',
    name: 'Apex Sport 600',
    category: 'Highway Aero',
    costCoins: 180,
    baseSpeed: 420,
    maxSpeed: 740,
    handling: 1.18,
    jumpDurationMs: 540,
    primaryColor: '#38BDF8',
    accentColor: '#E0F2FE',
    description: 'Tuned fairing and quick lateral snap for high-speed lane weaving between vans.',
  },
  {
    id: 'terra-enduro-450',
    name: 'Terra Enduro 450',
    category: 'Suspension Pro',
    costCoins: 380,
    baseSpeed: 400,
    maxSpeed: 700,
    handling: 1.12,
    jumpDurationMs: 700,
    primaryColor: '#10B981',
    accentColor: '#D1FAE5',
    description: 'Long-travel suspension delivers extended air-time over cones, potholes, and oil slicks.',
  },
];

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'lb-1',
    riderHandle: '@kaito_moto',
    bikeName: 'Apex Sport 600',
    distanceMeters: 2840,
    coinsEarned: 195,
    recordedAt: '2026-11-20 19:42 UTC',
  },
  {
    id: 'lb-2',
    riderHandle: '@elena_v',
    bikeName: 'Terra Enduro 450',
    distanceMeters: 2315,
    coinsEarned: 162,
    recordedAt: '2026-11-20 21:15 UTC',
  },
  {
    id: 'lb-3',
    riderHandle: '@marcus_lane',
    bikeName: 'Apex Sport 600',
    distanceMeters: 1890,
    coinsEarned: 134,
    recordedAt: '2026-11-21 02:18 UTC',
  },
  {
    id: 'lb-4',
    riderHandle: '@soren_r',
    bikeName: 'Street Scrambler 250',
    distanceMeters: 1420,
    coinsEarned: 98,
    recordedAt: '2026-11-21 04:50 UTC',
  },
  {
    id: 'lb-5',
    riderHandle: '@nadia_drift',
    bikeName: 'Street Scrambler 250',
    distanceMeters: 965,
    coinsEarned: 74,
    recordedAt: '2026-11-21 06:05 UTC',
  },
];

export const INITIAL_REWARD_LEDGER: RewardLedgerEntry[] = [
  {
    id: 'rw-101',
    txRef: 'AG-REV-84921',
    riderHandle: '@kaito_moto',
    placementId: 'CRASH_REVIVE_MODAL',
    placementMoment: 'Obstacle Collision Continue (Opt-in)',
    rewardGranted: '1x Run Continue (3s Shield) + 25 Coins',
    status: 'Verified',
    timestamp: '2026-11-20 19:39 UTC',
  },
  {
    id: 'rw-102',
    txRef: 'AG-REV-84934',
    riderHandle: '@elena_v',
    placementId: 'CRASH_REVIVE_MODAL',
    placementMoment: 'Obstacle Collision Continue (Opt-in)',
    rewardGranted: '1x Run Continue (3s Shield) + 25 Coins',
    status: 'Verified',
    timestamp: '2026-11-20 21:11 UTC',
  },
  {
    id: 'rw-103',
    txRef: 'AG-REV-84958',
    riderHandle: '@marcus_lane',
    placementId: 'CRASH_REVIVE_MODAL',
    placementMoment: 'Obstacle Collision Continue (Opt-in)',
    rewardGranted: '1x Run Continue (3s Shield) + 25 Coins',
    status: 'Verified',
    timestamp: '2026-11-21 02:14 UTC',
  },
  {
    id: 'rw-104',
    txRef: 'AG-REV-84972',
    riderHandle: '@nadia_drift',
    placementId: 'CRASH_REVIVE_MODAL',
    placementMoment: 'Obstacle Collision Continue (Opt-in)',
    rewardGranted: '1x Run Continue (3s Shield) + 25 Coins',
    status: 'Verified',
    timestamp: '2026-11-21 06:02 UTC',
  },
];

export const ADSGRAM_PLACEMENT_SPEC = {
  placementId: 'CRASH_REVIVE_MODAL',
  triggerMoment: 'Displayed exclusively after the bike collides with a road obstacle during an active run.',
  userControl: 'Two equal-access choices: "Watch Adsgram Ad to Continue" (opt-in) or "No Thanks" (ends run cleanly without penalty).',
  adClickPolicy: 'View-completion only. External ad clicks are never required to claim the revive or continue playing.',
  rewardCap: `Maximum ${MAX_REVIVES_PER_RUN} rewarded revives per run. Grants +${REVIVE_SHIELD_SECONDS}s collision shield and +${REVIVE_BONUS_COINS} Ride Coins.`,
  freePlayGuarantee: 'All steering, jumping, bike garage unlocks, and restarts remain 100% playable without watching ads.',
};
