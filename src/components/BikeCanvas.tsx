import React, { useEffect, useRef, useCallback } from 'react';
import { BikeModel, CrashSummary, GameState, ObstacleKind } from '../types/game';
import { MAX_REVIVES_PER_RUN, REVIVE_SHIELD_SECONDS } from '../data/gameData';
import { arcadeAudio } from '../utils/audio';

interface BikeCanvasProps {
  gameState: GameState;
  bike: BikeModel;
  runSessionId: number;
  reviveTriggerCount: number;
  onTelemetryUpdate: (stats: {
    distanceMeters: number;
    speedKmh: number;
    coinsThisRun: number;
    nearMisses: number;
    shieldSecondsLeft: number;
    boostSecondsLeft: number;
  }) => void;
  onCrash: (summary: CrashSummary) => void;
  onPauseRequest: () => void;
}

interface RoadObstacle {
  id: number;
  kind: ObstacleKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speedOffset: number;
  jumpable: boolean;
  nearMissAwarded: boolean;
}

interface RoadCoin {
  id: number;
  x: number;
  y: number;
  kind: 'coin' | 'nitro';
  collected: boolean;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const LOGICAL_WIDTH = 480;
const LOGICAL_HEIGHT = 700;
const ROAD_LEFT = 68;
const ROAD_RIGHT = 412;
const ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT;
const LANE_COUNT = 4;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;
const BIKE_Y = 568;

const laneCenter = (laneIndex: number) =>
  ROAD_LEFT + LANE_WIDTH * laneIndex + LANE_WIDTH / 2;

export const BikeCanvas: React.FC<BikeCanvasProps> = ({
  gameState,
  bike,
  runSessionId,
  reviveTriggerCount,
  onTelemetryUpdate,
  onCrash,
  onPauseRequest,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const bikeRef = useRef<BikeModel>(bike);
  const onCrashRef = useRef(onCrash);
  const onTelemetryRef = useRef(onTelemetryUpdate);
  const onPauseRef = useRef(onPauseRequest);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    bikeRef.current = bike;
  }, [bike]);

  useEffect(() => {
    onCrashRef.current = onCrash;
  }, [onCrash]);

  useEffect(() => {
    onTelemetryRef.current = onTelemetryUpdate;
  }, [onTelemetryUpdate]);

  useEffect(() => {
    onPauseRef.current = onPauseRequest;
  }, [onPauseRequest]);

  // Mutable simulation state held in ref for 60fps loop without React re-render overhead
  const simRef = useRef({
    bikeX: LOGICAL_WIDTH / 2,
    bikeVx: 0,
    leanAngle: 0,
    jumpTimerMs: 0,
    isJumping: false,
    shieldMs: 0,
    boostMs: 0,
    distancePx: 0,
    coinsThisRun: 0,
    nearMisses: 0,
    revivesUsedThisRun: 0,
    roadScroll: 0,
    spawnTimerMs: 650,
    coinTimerMs: 420,
    nextEntityId: 1,
    shakeMs: 0,
    obstacles: [] as RoadObstacle[],
    collectibles: [] as RoadCoin[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    keys: {
      left: false,
      right: false,
      up: false,
      down: false,
    },
    pointerActive: false,
    pointerTargetX: LOGICAL_WIDTH / 2,
    lastTelemetryEmit: 0,
  });

  const resetRunState = useCallback(() => {
    const s = simRef.current;
    s.bikeX = LOGICAL_WIDTH / 2;
    s.bikeVx = 0;
    s.leanAngle = 0;
    s.jumpTimerMs = 0;
    s.isJumping = false;
    s.shieldMs = 0;
    s.boostMs = 0;
    s.distancePx = 0;
    s.coinsThisRun = 0;
    s.nearMisses = 0;
    s.revivesUsedThisRun = 0;
    s.roadScroll = 0;
    s.spawnTimerMs = 700;
    s.coinTimerMs = 400;
    s.shakeMs = 0;
    s.obstacles = [];
    s.collectibles = [];
    s.particles = [];
    s.floatingTexts = [];
    s.keys = { left: false, right: false, up: false, down: false };
    s.pointerActive = false;

    onTelemetryRef.current({
      distanceMeters: 0,
      speedKmh: Math.round(bikeRef.current.baseSpeed * 0.19),
      coinsThisRun: 0,
      nearMisses: 0,
      shieldSecondsLeft: 0,
      boostSecondsLeft: 0,
    });
  }, []);

  // Reset simulation whenever a brand-new run session starts
  useEffect(() => {
    resetRunState();
  }, [runSessionId, resetRunState]);

  // Apply Adsgram continue revive when reviveTriggerCount increments
  useEffect(() => {
    if (reviveTriggerCount === 0) return;
    const s = simRef.current;
    s.revivesUsedThisRun += 1;
    s.shieldMs = REVIVE_SHIELD_SECONDS * 1000;
    s.shakeMs = 0;
    // Clear immediate obstacles near the player so resuming is fair and clean
    s.obstacles = s.obstacles.filter((obs) => obs.y < 300);
    s.floatingTexts.push({
      x: s.bikeX,
      y: BIKE_Y - 56,
      text: 'SHIELD ACTIVE!',
      color: '#10B981',
      life: 1.4,
    });
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18;
      s.particles.push({
        x: s.bikeX,
        y: BIKE_Y,
        vx: Math.cos(angle) * 140,
        vy: Math.sin(angle) * 140,
        life: 0.6,
        maxLife: 0.6,
        color: '#10B981',
        size: 3.5,
      });
    }
  }, [reviveTriggerCount]);

  const triggerJump = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING') return;
    const s = simRef.current;
    if (!s.isJumping) {
      s.isJumping = true;
      s.jumpTimerMs = bikeRef.current.jumpDurationMs;
      arcadeAudio.playJump();
      for (let i = 0; i < 6; i++) {
        s.particles.push({
          x: s.bikeX + (Math.random() - 0.5) * 14,
          y: BIKE_Y + 26,
          vx: (Math.random() - 0.5) * 60,
          vy: 110 + Math.random() * 70,
          life: 0.35,
          maxLife: 0.35,
          color: '#CBD5E1',
          size: 3,
        });
      }
    }
  }, []);

  // Keyboard bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'PAUSED') {
          onPauseRef.current();
        }
        return;
      }

      if (gameStateRef.current !== 'PLAYING') return;
      const s = simRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        s.keys.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        s.keys.right = true;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        s.keys.down = true;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        e.preventDefault();
        triggerJump();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = simRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        s.keys.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        s.keys.right = false;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        s.keys.down = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerJump]);

  // Pointer / Touch drag steering on canvas
  const updatePointerX = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const normX = ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    simRef.current.pointerTargetX = Math.max(ROAD_LEFT + 22, Math.min(ROAD_RIGHT - 22, normX));
  };

  // Main 60fps requestAnimationFrame loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const spawnObstacleWave = (distanceMeters: number) => {
      const s = simRef.current;
      const laneOrder = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      // Scale wave density smoothly with distance, always leaving >= 1 clear lane
      const doubleChance = Math.min(0.62, 0.18 + distanceMeters / 2200);
      const tripleChance = distanceMeters > 650 ? Math.min(0.28, (distanceMeters - 650) / 3500) : 0;
      const count =
        Math.random() < tripleChance ? 3 : Math.random() < doubleChance ? 2 : 1;

      const pickObstacle = (): Omit<RoadObstacle, 'id' | 'x' | 'y' | 'nearMissAwarded'> => {
        const r = Math.random();
        if (r < 0.24) {
          return {
            kind: 'cone',
            name: 'Traffic Cone',
            width: 30,
            height: 30,
            speedOffset: 0,
            jumpable: true,
          };
        }
        if (r < 0.42) {
          return {
            kind: 'pothole',
            name: 'Road Pothole',
            width: 44,
            height: 28,
            speedOffset: 0,
            jumpable: true,
          };
        }
        if (r < 0.56) {
          return {
            kind: 'oil',
            name: 'Oil Slick',
            width: 48,
            height: 32,
            speedOffset: 0,
            jumpable: true,
          };
        }
        if (r < 0.72) {
          return {
            kind: 'barrier',
            name: 'Concrete Roadblock',
            width: 64,
            height: 32,
            speedOffset: 0,
            jumpable: false,
          };
        }
        if (r < 0.87) {
          return {
            kind: 'sedan',
            name: 'Highway Sedan',
            width: 48,
            height: 82,
            speedOffset: -140 - Math.random() * 60,
            jumpable: false,
          };
        }
        return {
          kind: 'van',
          name: 'Delivery Van',
          width: 54,
          height: 102,
          speedOffset: -180 - Math.random() * 50,
          jumpable: false,
        };
      };

      let nonJumpableCount = 0;
      for (let i = 0; i < count; i++) {
        const lane = laneOrder[i];
        let spec = pickObstacle();
        // Guarantee we never wall off all 4 lanes with tall unjumpable obstacles
        if (!spec.jumpable) {
          nonJumpableCount += 1;
          if (nonJumpableCount >= 3) {
            spec = {
              kind: 'cone',
              name: 'Traffic Cone',
              width: 30,
              height: 30,
              speedOffset: 0,
              jumpable: true,
            };
          }
        }
        s.obstacles.push({
          id: s.nextEntityId++,
          ...spec,
          x: laneCenter(lane),
          y: -110 - i * (Math.random() * 35),
          nearMissAwarded: false,
        });
      }
    };

    const spawnCollectible = () => {
      const s = simRef.current;
      const lane = Math.floor(Math.random() * LANE_COUNT);
      const isNitro = Math.random() < 0.08;
      s.collectibles.push({
        id: s.nextEntityId++,
        x: laneCenter(lane),
        y: -40,
        kind: isNitro ? 'nitro' : 'coin',
        collected: false,
        phase: Math.random() * Math.PI * 2,
      });
    };

    const step = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const s = simRef.current;
      const currentBike = bikeRef.current;
      const state = gameStateRef.current;

      // Ambient idle scroll on TITLE_MENU so the road looks alive immediately
      if (state === 'TITLE_MENU') {
        s.roadScroll = (s.roadScroll + 160 * dt) % 120;
      }

      if (state === 'PLAYING') {
        const distanceMeters = Math.floor(s.distancePx / 18);
        const speedRamp = Math.min(1, distanceMeters / 2400);
        let roadSpeed =
          currentBike.baseSpeed +
          (currentBike.maxSpeed - currentBike.baseSpeed) * speedRamp;

        if (s.boostMs > 0) {
          s.boostMs = Math.max(0, s.boostMs - dt * 1000);
          roadSpeed *= 1.38;
        } else if (s.keys.down) {
          roadSpeed *= 0.72;
        }

        if (s.shieldMs > 0) {
          s.shieldMs = Math.max(0, s.shieldMs - dt * 1000);
        }
        if (s.shakeMs > 0) {
          s.shakeMs = Math.max(0, s.shakeMs - dt * 1000);
        }

        // Steering physics
        const steerAccel = 1950 * currentBike.handling;
        const maxLateral = 390 * currentBike.handling;
        if (s.pointerActive) {
          const diff = s.pointerTargetX - s.bikeX;
          s.bikeVx = Math.max(-maxLateral, Math.min(maxLateral, diff * 10));
        } else {
          if (s.keys.left && !s.keys.right) {
            s.bikeVx = Math.max(-maxLateral, s.bikeVx - steerAccel * dt);
          } else if (s.keys.right && !s.keys.left) {
            s.bikeVx = Math.min(maxLateral, s.bikeVx + steerAccel * dt);
          } else {
            s.bikeVx *= Math.pow(0.0015, dt);
            if (Math.abs(s.bikeVx) < 4) s.bikeVx = 0;
          }
        }

        s.bikeX += s.bikeVx * dt;
        const minX = ROAD_LEFT + 22;
        const maxX = ROAD_RIGHT - 22;
        if (s.bikeX < minX) {
          s.bikeX = minX;
          s.bikeVx = 0;
        } else if (s.bikeX > maxX) {
          s.bikeX = maxX;
          s.bikeVx = 0;
        }

        const targetLean = (s.bikeVx / maxLateral) * 0.28;
        s.leanAngle += (targetLean - s.leanAngle) * Math.min(1, dt * 14);

        // Jump timer
        if (s.isJumping) {
          s.jumpTimerMs -= dt * 1000;
          if (s.jumpTimerMs <= 0) {
            s.isJumping = false;
            s.jumpTimerMs = 0;
          }
        }

        // Exhaust particles
        if (Math.random() < (s.boostMs > 0 ? 0.95 : 0.45)) {
          s.particles.push({
            x: s.bikeX - s.leanAngle * 14 + (Math.random() - 0.5) * 5,
            y: BIKE_Y + 34,
            vx: (Math.random() - 0.5) * 20,
            vy: 140 + Math.random() * 80,
            life: 0.28,
            maxLife: 0.28,
            color: s.boostMs > 0 ? '#F97316' : '#64748B',
            size: s.boostMs > 0 ? 4.5 : 2.5,
          });
        }

        // Distance & road scroll
        s.distancePx += roadSpeed * dt;
        s.roadScroll = (s.roadScroll + roadSpeed * dt) % 120;

        // Spawn obstacles & coins
        s.spawnTimerMs -= dt * 1000;
        if (s.spawnTimerMs <= 0) {
          spawnObstacleWave(distanceMeters);
          const minDelay = Math.max(480, 960 - distanceMeters * 0.18);
          s.spawnTimerMs = minDelay + Math.random() * 280;
        }

        s.coinTimerMs -= dt * 1000;
        if (s.coinTimerMs <= 0) {
          spawnCollectible();
          s.coinTimerMs = 560 + Math.random() * 440;
        }

        // Bike collision box
        const bikeHalfW = 13;
        const bikeHalfH = 26;
        const jumpProgress = s.isJumping
          ? 1 - s.jumpTimerMs / currentBike.jumpDurationMs
          : 0;
        const jumpHeight = s.isJumping ? Math.sin(jumpProgress * Math.PI) : 0;
        const airborneClearance = jumpHeight > 0.22;

        // Update obstacles & check collisions
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const obs = s.obstacles[i];
          obs.y += (roadSpeed + obs.speedOffset) * dt;

          const obsHalfW = obs.width * 0.43;
          const obsHalfH = obs.height * 0.43;
          const dx = Math.abs(s.bikeX - obs.x);
          const dy = Math.abs(BIKE_Y - obs.y);

          const overlapping = dx < bikeHalfW + obsHalfW && dy < bikeHalfH + obsHalfH;

          if (overlapping) {
            if (airborneClearance && obs.jumpable) {
              // Cleared obstacle mid-air!
            } else if (s.shieldMs > 0) {
              // Shield smashes obstacle safely
              s.obstacles.splice(i, 1);
              for (let p = 0; p < 10; p++) {
                s.particles.push({
                  x: obs.x,
                  y: obs.y,
                  vx: (Math.random() - 0.5) * 200,
                  vy: (Math.random() - 0.5) * 200,
                  life: 0.4,
                  maxLife: 0.4,
                  color: '#10B981',
                  size: 3.5,
                });
              }
              continue;
            } else {
              // Crash! Trigger CrashReviveModal popup
              s.shakeMs = 360;
              arcadeAudio.playCrash();
              for (let p = 0; p < 22; p++) {
                const ang = Math.random() * Math.PI * 2;
                const spd = 60 + Math.random() * 200;
                s.particles.push({
                  x: s.bikeX,
                  y: BIKE_Y,
                  vx: Math.cos(ang) * spd,
                  vy: Math.sin(ang) * spd,
                  life: 0.65,
                  maxLife: 0.65,
                  color: p % 2 === 0 ? '#EF4444' : '#F59E0B',
                  size: 4,
                });
              }
              onCrashRef.current({
                obstacleName: obs.name,
                obstacleKind: obs.kind,
                distanceMeters: Math.floor(s.distancePx / 18),
                coinsThisRun: s.coinsThisRun,
                nearMisses: s.nearMisses,
                revivesUsedThisRun: s.revivesUsedThisRun,
                maxRevivesPerRun: MAX_REVIVES_PER_RUN,
              });
              break;
            }
          } else if (
            !obs.nearMissAwarded &&
            obs.y > BIKE_Y + 10 &&
            obs.y < BIKE_Y + 46 &&
            dx < bikeHalfW + obsHalfW + 18
          ) {
            obs.nearMissAwarded = true;
            s.nearMisses += 1;
            s.coinsThisRun += 2;
            arcadeAudio.playNearMiss();
            s.floatingTexts.push({
              x: s.bikeX,
              y: BIKE_Y - 40,
              text: 'CLOSE CALL +2',
              color: '#38BDF8',
              life: 0.9,
            });
          }

          if (obs.y > LOGICAL_HEIGHT + 130) {
            s.obstacles.splice(i, 1);
          }
        }

        // Update collectibles
        for (let i = s.collectibles.length - 1; i >= 0; i--) {
          const item = s.collectibles[i];
          item.y += roadSpeed * dt;
          item.phase += dt * 6;

          const dist = Math.hypot(s.bikeX - item.x, BIKE_Y - item.y);
          if (!item.collected && dist < 34) {
            item.collected = true;
            if (item.kind === 'coin') {
              s.coinsThisRun += 1;
              arcadeAudio.playCoin();
              s.floatingTexts.push({
                x: item.x,
                y: item.y - 12,
                text: '+1',
                color: '#FBBF24',
                life: 0.65,
              });
            } else {
              s.boostMs = 2600;
              s.coinsThisRun += 3;
              arcadeAudio.playReviveShield();
              s.floatingTexts.push({
                x: item.x,
                y: item.y - 16,
                text: 'NITRO +3',
                color: '#F97316',
                life: 1.0,
              });
            }
            for (let p = 0; p < 8; p++) {
              const ang = Math.random() * Math.PI * 2;
              s.particles.push({
                x: item.x,
                y: item.y,
                vx: Math.cos(ang) * 90,
                vy: Math.sin(ang) * 90,
                life: 0.35,
                maxLife: 0.35,
                color: item.kind === 'coin' ? '#FBBF24' : '#F97316',
                size: 3,
              });
            }
            s.collectibles.splice(i, 1);
            continue;
          }

          if (item.y > LOGICAL_HEIGHT + 60) {
            s.collectibles.splice(i, 1);
          }
        }

        // Update particles & floating texts
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const pt = s.particles[i];
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.life -= dt;
          if (pt.life <= 0) s.particles.splice(i, 1);
        }

        for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
          const ft = s.floatingTexts[i];
          ft.y -= 44 * dt;
          ft.life -= dt;
          if (ft.life <= 0) s.floatingTexts.splice(i, 1);
        }

        // Emit HUD telemetry at ~12Hz to keep React smooth
        if (now - s.lastTelemetryEmit > 80) {
          s.lastTelemetryEmit = now;
          onTelemetryRef.current({
            distanceMeters: Math.floor(s.distancePx / 18),
            speedKmh: Math.round(roadSpeed * 0.19),
            coinsThisRun: s.coinsThisRun,
            nearMisses: s.nearMisses,
            shieldSecondsLeft: Math.ceil(s.shieldMs / 1000),
            boostSecondsLeft: Math.ceil(s.boostMs / 1000),
          });
        }
      }

      // Render Frame
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const targetW = LOGICAL_WIDTH * dpr;
          const targetH = LOGICAL_HEIGHT * dpr;
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          ctx.save();
          ctx.scale(dpr, dpr);

          // Screen shake offset
          if (s.shakeMs > 0) {
            const mag = (s.shakeMs / 360) * 8;
            ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
          }

          // Background Roadside Terrain
          ctx.fillStyle = '#0F1A14';
          ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

          // Roadside scrolling foliage / posts
          for (let y = -120 + s.roadScroll; y < LOGICAL_HEIGHT + 120; y += 120) {
            // Left tree cluster
            ctx.fillStyle = '#14291E';
            ctx.beginPath();
            ctx.arc(28, y + 30, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1B3829';
            ctx.beginPath();
            ctx.arc(24, y + 26, 13, 0, Math.PI * 2);
            ctx.fill();

            // Right tree cluster
            ctx.fillStyle = '#14291E';
            ctx.beginPath();
            ctx.arc(452, y + 75, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1B3829';
            ctx.beginPath();
            ctx.arc(448, y + 70, 14, 0, Math.PI * 2);
            ctx.fill();

            // Guardrail posts
            ctx.fillStyle = '#475569';
            ctx.fillRect(ROAD_LEFT - 12, y, 6, 18);
            ctx.fillRect(ROAD_RIGHT + 6, y, 6, 18);
          }

          // Continuous guardrails
          ctx.fillStyle = '#334155';
          ctx.fillRect(ROAD_LEFT - 7, 0, 7, LOGICAL_HEIGHT);
          ctx.fillRect(ROAD_RIGHT, 0, 7, LOGICAL_HEIGHT);

          // Asphalt road surface
          ctx.fillStyle = '#1E2430';
          ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, LOGICAL_HEIGHT);

          // Subtle outer shoulder stripes
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(ROAD_LEFT + 4, 0, 3, LOGICAL_HEIGHT);
          ctx.fillRect(ROAD_RIGHT - 7, 0, 3, LOGICAL_HEIGHT);

          // Dashed lane dividers (4 lanes -> 3 inner dividers)
          ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
          for (let lane = 1; lane < LANE_COUNT; lane++) {
            const dividerX = ROAD_LEFT + LANE_WIDTH * lane - 2;
            for (let y = -120 + (s.roadScroll % 60); y < LOGICAL_HEIGHT + 60; y += 60) {
              ctx.fillRect(dividerX, y, 4, 30);
            }
          }

          // Draw collectibles
          s.collectibles.forEach((item) => {
            ctx.save();
            ctx.translate(item.x, item.y);
            if (item.kind === 'coin') {
              const scaleX = 0.55 + Math.abs(Math.sin(item.phase)) * 0.45;
              ctx.scale(scaleX, 1);
              ctx.fillStyle = '#F59E0B';
              ctx.beginPath();
              ctx.arc(0, 0, 12, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#FEF3C7';
              ctx.beginPath();
              ctx.arc(0, 0, 7, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#B45309';
              ctx.fillRect(-1.5, -4, 3, 8);
            } else {
              // Nitro canister
              ctx.fillStyle = '#EA580C';
              ctx.beginPath();
              ctx.roundRect(-10, -14, 20, 28, 5);
              ctx.fill();
              ctx.fillStyle = '#FFEDD5';
              ctx.fillRect(-6, -5, 12, 10);
              ctx.fillStyle = '#9A3412';
              ctx.fillRect(-4, -17, 8, 4);
            }
            ctx.restore();
          });

          // Draw obstacles
          s.obstacles.forEach((obs) => {
            ctx.save();
            ctx.translate(obs.x, obs.y);
            if (obs.kind === 'cone') {
              ctx.fillStyle = 'rgba(0,0,0,0.35)';
              ctx.beginPath();
              ctx.ellipse(0, 10, 14, 6, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#F97316';
              ctx.beginPath();
              ctx.moveTo(-12, 10);
              ctx.lineTo(12, 10);
              ctx.lineTo(4, -14);
              ctx.lineTo(-4, -14);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = '#F8FAFC';
              ctx.fillRect(-7, -2, 14, 5);
            } else if (obs.kind === 'pothole') {
              ctx.fillStyle = '#090D14';
              ctx.beginPath();
              ctx.ellipse(0, 0, 21, 13, 0.1, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#475569';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else if (obs.kind === 'oil') {
              ctx.fillStyle = '#0B1020';
              ctx.beginPath();
              ctx.ellipse(0, 0, 23, 15, -0.2, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
              ctx.beginPath();
              ctx.ellipse(-5, -3, 11, 5, 0.3, 0, Math.PI * 2);
              ctx.fill();
            } else if (obs.kind === 'barrier') {
              ctx.fillStyle = 'rgba(0,0,0,0.4)';
              ctx.fillRect(-31, -10, 62, 26);
              ctx.fillStyle = '#E2E8F0';
              ctx.beginPath();
              ctx.roundRect(-30, -14, 60, 24, 4);
              ctx.fill();
              ctx.fillStyle = '#DC2626';
              for (let sx = -24; sx < 24; sx += 16) {
                ctx.fillRect(sx, -14, 8, 24);
              }
            } else if (obs.kind === 'sedan') {
              // Shadow
              ctx.fillStyle = 'rgba(0,0,0,0.45)';
              ctx.beginPath();
              ctx.roundRect(-24, -36, 48, 78, 10);
              ctx.fill();
              // Body
              ctx.fillStyle = '#475569';
              ctx.beginPath();
              ctx.roundRect(-22, -39, 44, 76, 9);
              ctx.fill();
              // Cabin / windshield
              ctx.fillStyle = '#0F172A';
              ctx.beginPath();
              ctx.roundRect(-16, -18, 32, 34, 5);
              ctx.fill();
              ctx.fillStyle = '#64748B';
              ctx.fillRect(-14, -8, 28, 18);
              // Taillights
              ctx.fillStyle = '#EF4444';
              ctx.fillRect(-19, 31, 10, 5);
              ctx.fillRect(9, 31, 10, 5);
            } else if (obs.kind === 'van') {
              // Shadow
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              ctx.beginPath();
              ctx.roundRect(-27, -46, 54, 98, 8);
              ctx.fill();
              // Cargo body
              ctx.fillStyle = '#CBD5E1';
              ctx.beginPath();
              ctx.roundRect(-25, -49, 50, 96, 7);
              ctx.fill();
              // Cab roof line
              ctx.fillStyle = '#94A3B8';
              ctx.fillRect(-25, -49, 50, 22);
              ctx.fillStyle = '#1E293B';
              ctx.fillRect(-20, -45, 40, 12);
              // Taillights
              ctx.fillStyle = '#EF4444';
              ctx.fillRect(-22, 41, 12, 5);
              ctx.fillRect(10, 41, 12, 5);
            }
            ctx.restore();
          });

          // Draw particles
          s.particles.forEach((pt) => {
            ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;

          // Draw Player Bike
          const jumpProg = s.isJumping
            ? 1 - s.jumpTimerMs / currentBike.jumpDurationMs
            : 0;
          const jumpSin = s.isJumping ? Math.sin(jumpProg * Math.PI) : 0;
          const bikeScale = 1 + jumpSin * 0.24;

          // Bike ground shadow
          ctx.save();
          ctx.translate(s.bikeX, BIKE_Y + 6 + jumpSin * 16);
          ctx.scale(1 - jumpSin * 0.15, 1 - jumpSin * 0.15);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 14, 30, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Bike sprite
          ctx.save();
          ctx.translate(s.bikeX, BIKE_Y - jumpSin * 24);
          ctx.rotate(s.leanAngle);
          ctx.scale(bikeScale, bikeScale);

          // Headlight cone
          const beamGrad = ctx.createLinearGradient(0, -30, 0, -140);
          beamGrad.addColorStop(0, 'rgba(254, 243, 199, 0.35)');
          beamGrad.addColorStop(1, 'rgba(254, 243, 199, 0)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(-6, -30);
          ctx.lineTo(6, -30);
          ctx.lineTo(36, -140);
          ctx.lineTo(-36, -140);
          ctx.closePath();
          ctx.fill();

          // Rear & front tires
          ctx.fillStyle = '#090D14';
          ctx.beginPath();
          ctx.roundRect(-5, -32, 10, 16, 4);
          ctx.roundRect(-6, 16, 12, 18, 4);
          ctx.fill();

          // Bike chassis / tank
          ctx.fillStyle = currentBike.primaryColor;
          ctx.beginPath();
          ctx.roundRect(-9, -20, 18, 40, 6);
          ctx.fill();

          // Handlebars
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-15, -15);
          ctx.lineTo(15, -15);
          ctx.stroke();

          // Fairing / Windshield accent
          ctx.fillStyle = currentBike.accentColor;
          ctx.beginPath();
          ctx.roundRect(-6, -24, 12, 9, 3);
          ctx.fill();

          // Rider jacket & shoulders
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.roundRect(-12, -6, 24, 20, 7);
          ctx.fill();

          // Rider helmet
          ctx.fillStyle = '#F8FAFC';
          ctx.beginPath();
          ctx.arc(0, -1, 8.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(-5, -6, 10, 4);

          // Taillight
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(-4, 29, 8, 3.5);

          // Shield aura if active
          if (s.shieldMs > 0) {
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.55 + Math.sin(now * 0.015) * 0.25;
            ctx.beginPath();
            ctx.ellipse(0, 0, 24, 42, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }

          ctx.restore();

          // Floating callouts
          s.floatingTexts.forEach((ft) => {
            ctx.save();
            ctx.globalAlpha = Math.min(1, ft.life * 1.4);
            ctx.font = '700 15px "Barlow Condensed", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
          });

          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="relative flex flex-col items-center w-full">
      <div className="relative w-full max-w-[440px] aspect-[480/700] rounded-xl overflow-hidden border border-slate-800 bg-[#0B0F17] shadow-2xl select-none">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            if (gameState !== 'PLAYING') return;
            simRef.current.pointerActive = true;
            updatePointerX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (!simRef.current.pointerActive || gameState !== 'PLAYING') return;
            updatePointerX(e.clientX);
          }}
          onPointerUp={() => {
            simRef.current.pointerActive = false;
          }}
          onPointerCancel={() => {
            simRef.current.pointerActive = false;
          }}
          className="w-full h-full block touch-none cursor-crosshair"
        />
      </div>

      {/* Touch & Mouse Control Bar for mobile / TMA accessibility */}
      {gameState === 'PLAYING' && (
        <div className="mt-3 grid grid-cols-3 gap-2.5 w-full max-w-[440px]">
          <button
            type="button"
            onPointerDown={() => {
              simRef.current.keys.left = true;
            }}
            onPointerUp={() => {
              simRef.current.keys.left = false;
            }}
            onPointerLeave={() => {
              simRef.current.keys.left = false;
            }}
            className="h-12 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border border-slate-700 text-sm font-semibold text-slate-200 transition-colors select-none touch-none whitespace-nowrap"
          >
            Steer Left
          </button>
          <button
            type="button"
            onPointerDown={() => {
              triggerJump();
            }}
            className="h-12 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500 active:text-slate-950 border border-amber-500/40 text-sm font-semibold text-amber-300 transition-colors select-none touch-none whitespace-nowrap"
          >
            Hop Obstacle
          </button>
          <button
            type="button"
            onPointerDown={() => {
              simRef.current.keys.right = true;
            }}
            onPointerUp={() => {
              simRef.current.keys.right = false;
            }}
            onPointerLeave={() => {
              simRef.current.keys.right = false;
            }}
            className="h-12 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border border-slate-700 text-sm font-semibold text-slate-200 transition-colors select-none touch-none whitespace-nowrap"
          >
            Steer Right
          </button>
        </div>
      )}
    </div>
  );
};
