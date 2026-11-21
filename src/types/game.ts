export type AppTab = 'play' | 'garage' | 'leaderboard' | 'policy';

export type GameState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'CRASH_PROMPT'
  | 'WATCHING_AD'
  | 'GAME_OVER';

export type ObstacleKind =
  | 'cone'
  | 'pothole'
  | 'barrier'
  | 'van'
  | 'sedan'
  | 'oil';

export interface BikeModel {
  id: string;
  name: string;
  category: string;
  costCoins: number;
  baseSpeed: number;
  maxSpeed: number;
  handling: number;
  jumpDurationMs: number;
  primaryColor: string;
  accentColor: string;
  description: string;
}

export interface CrashSummary {
  obstacleName: string;
  obstacleKind: ObstacleKind;
  distanceMeters: number;
  coinsThisRun: number;
  nearMisses: number;
  revivesUsedThisRun: number;
  maxRevivesPerRun: number;
}

export interface LeaderboardEntry {
  id: string;
  riderHandle: string;
  bikeName: string;
  distanceMeters: number;
  coinsEarned: number;
  recordedAt: string;
  isCurrentUser?: boolean;
}

export interface RewardLedgerEntry {
  id: string;
  txRef: string;
  riderHandle: string;
  placementId: string;
  placementMoment: string;
  rewardGranted: string;
  status: 'Verified' | 'Completed';
  timestamp: string;
  isCurrentUser?: boolean;
}

export interface UserAdSettings {
  rewardedAdsConsent: boolean;
  adsgramBlockId: string;
  riderHandle: string;
}
