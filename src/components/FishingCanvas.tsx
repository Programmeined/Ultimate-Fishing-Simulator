import { useEffect, useRef } from 'react';
import type { ControlMode, DepthOption, FishingPhase, LocationDef, WeatherType } from '../game/types';

interface FishingCanvasProps {
  location: LocationDef;
  gameTime: number;
  weather: WeatherType;
  phase: FishingPhase;
  castDistance: number;
  maxDistance: number;
  fightDistance: number;
  tension: number;
  depth: DepthOption;
  controlMode?: ControlMode;
  readyToLand?: boolean;
  surging?: boolean;
  isTitleBackdrop?: boolean;
  onStrikeClick?: () => void;
  onLandClick?: () => void;
  onCanvasTap?: (relativeX: number) => void;
}

interface Ripple {
  active: boolean;
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: string;
}

interface SplashParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
}

interface CloudPuff {
  x: number;
  y: number;
  scale: number;
  speed: number;
  alpha: number;
}

interface FishShadow {
  x: number;
  y: number;
  speed: number;
  dir: 1 | -1;
  size: number;
  phaseOffset: number;
}

interface WeedStem {
  xFrac: number;
  height: number;
  blades: number;
  phase: number;
}

const MAX_RIPPLES = 32;
const MAX_SPLASHES = 24;
const MAX_RAINDROPS = 90;
const MAX_CLOUDS = 7;
const MAX_FISH_SHADOWS = 7;
const MAX_WEEDS = 12;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function rgbStr(c: [number, number, number], alpha = 1): string {
  const r = Math.round(c[0]);
  const g = Math.round(c[1]);
  const b = Math.round(c[2]);
  return alpha >= 0.999 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

function mixRgb(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  const k = clamp01(t);
  return [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];
}

function quadBezierPoint(
  p0x: number,
  p0y: number,
  cx: number,
  cy: number,
  p1x: number,
  p1y: number,
  t: number
): [number, number] {
  const u = 1 - t;
  return [
    u * u * p0x + 2 * u * t * cx + t * t * p1x,
    u * u * p0y + 2 * u * t * cy + t * t * p1y,
  ];
}

function buildStaticScene(
  bctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
  loc: LocationDef,
  h: number,
  weather: WeatherType,
  isTitleBackdrop: boolean
) {
  const horizonY = height * 0.37;
  const isNight = h < 5.5 || h >= 20.5;
  const isGoldenHour = (h >= 5.2 && h < 8.4) || (h >= 16.8 && h < 20.5);
  const isOvercast = weather.includes('Regen') || weather === 'Bewölkt';

  bctx.save();
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bctx.clearRect(0, 0, width, height);

  // 1. Multi-stop Atmospheric Sky Palette
  let skyTop: [number, number, number] = [68, 114, 126];
  let skyMid: [number, number, number] = [118, 152, 150];
  let skyBot: [number, number, number] = [178, 194, 178];
  let waterTop: [number, number, number] = [44, 102, 98];
  let waterMid: [number, number, number] = [21, 64, 64];
  let waterBot: [number, number, number] = [8, 28, 30];

  if (h >= 5 && h < 8.5) {
    const t = (h - 5) / 3.5;
    skyTop = mixRgb([26, 44, 58], [70, 112, 124], t);
    skyMid = mixRgb([112, 88, 96], [148, 166, 154], t);
    skyBot = mixRgb([214, 148, 106], [218, 198, 162], t);
    waterTop = mixRgb([56, 78, 82], [44, 98, 94], t);
    waterMid = [22, 58, 58];
    waterBot = [9, 27, 29];
  } else if (h >= 8.5 && h < 17) {
    skyTop = [64, 114, 128];
    skyMid = [114, 154, 152];
    skyBot = [176, 196, 182];
    waterTop = [46, 108, 102];
    waterMid = [21, 68, 66];
    waterBot = [8, 32, 33];
  } else if (h >= 17 && h < 21) {
    const t = (h - 17) / 4;
    skyTop = mixRgb([62, 90, 108], [16, 26, 40], t);
    skyMid = mixRgb([146, 112, 98], [38, 48, 64], t);
    skyBot = mixRgb([224, 144, 88], [76, 62, 74], t);
    waterTop = mixRgb([68, 84, 84], [18, 42, 48], t);
    waterMid = mixRgb([26, 54, 56], [11, 28, 33], t);
    waterBot = [7, 20, 23];
  } else {
    skyTop = [9, 17, 25];
    skyMid = [16, 30, 38];
    skyBot = [28, 48, 52];
    waterTop = [16, 40, 46];
    waterMid = [10, 26, 31];
    waterBot = [5, 14, 17];
  }

  if (isOvercast) {
    skyTop = [skyTop[0] * 0.7, skyTop[1] * 0.75, skyTop[2] * 0.79];
    skyMid = [skyMid[0] * 0.72, skyMid[1] * 0.77, skyMid[2] * 0.8];
    skyBot = [skyBot[0] * 0.74, skyBot[1] * 0.79, skyBot[2] * 0.82];
    waterTop = [waterTop[0] * 0.84, waterTop[1] * 0.88, waterTop[2] * 0.9];
  }

  if (loc.id === 'moorsee') {
    waterTop = [Math.max(10, waterTop[0] - 12), Math.max(24, waterTop[1] - 24), Math.max(18, waterTop[2] - 26)];
    waterMid = [16, 34, 30];
    waterBot = [6, 16, 15];
  } else if (loc.kind === 'Hochsee') {
    waterTop = mixRgb(waterTop, [20, 72, 96], 0.6);
    waterMid = [11, 44, 62];
    waterBot = [4, 18, 28];
  } else if (loc.kind === 'Bergsee') {
    waterTop = mixRgb(waterTop, [38, 114, 118], 0.45);
    waterMid = [18, 66, 72];
  }

  const skyGrad = bctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, rgbStr(skyTop));
  skyGrad.addColorStop(0.55, rgbStr(skyMid));
  skyGrad.addColorStop(1, rgbStr(skyBot));
  bctx.fillStyle = skyGrad;
  bctx.fillRect(0, 0, width, horizonY);

  // Celestial Body (Sun with atmospheric halo or Moon)
  const celestialX = width * 0.76;
  const sunElevation = h >= 5.5 && h < 20 ? Math.sin(((h - 5.5) / 14.5) * Math.PI) : 0.72;
  const celestialY = horizonY * (0.76 - sunElevation * 0.48);

  if (h >= 5.5 && h < 20 && weather !== 'Starker Regen') {
    const sunRadius = isGoldenHour ? 92 : 76;
    const sunAlpha = weather === 'Sonnig' ? 0.94 : 0.45;
    const sunGlow = bctx.createRadialGradient(
      celestialX,
      celestialY,
      4,
      celestialX,
      celestialY,
      sunRadius
    );
    sunGlow.addColorStop(0, `rgba(255, 243, 202, ${sunAlpha})`);
    sunGlow.addColorStop(0.2, `rgba(248, 222, 152, ${(sunAlpha * 0.56).toFixed(3)})`);
    sunGlow.addColorStop(0.55, `rgba(240, 198, 126, ${(sunAlpha * 0.16).toFixed(3)})`);
    sunGlow.addColorStop(1, 'rgba(240, 198, 126, 0)');
    bctx.fillStyle = sunGlow;
    bctx.beginPath();
    bctx.arc(celestialX, celestialY, sunRadius, 0, Math.PI * 2);
    bctx.fill();
  } else if (isNight) {
    const moonGlow = bctx.createRadialGradient(celestialX, celestialY, 8, celestialX, celestialY, 48);
    moonGlow.addColorStop(0, 'rgba(220, 236, 230, 0.28)');
    moonGlow.addColorStop(1, 'rgba(220, 236, 230, 0)');
    bctx.fillStyle = moonGlow;
    bctx.beginPath();
    bctx.arc(celestialX, celestialY, 48, 0, Math.PI * 2);
    bctx.fill();

    bctx.fillStyle = 'rgba(232, 240, 232, 0.9)';
    bctx.beginPath();
    bctx.arc(celestialX, celestialY, 13, 0, Math.PI * 2);
    bctx.fill();

    bctx.fillStyle = 'rgba(182, 198, 192, 0.35)';
    bctx.beginPath();
    bctx.arc(celestialX - 3.5, celestialY - 2, 3, 0, Math.PI * 2);
    bctx.arc(celestialX + 4, celestialY + 3, 2.2, 0, Math.PI * 2);
    bctx.fill();
  }

  // 2. Three-Layer Parallax Ridges & Biome Terrain
  const farRidgeColor = isNight
    ? '#14262a'
    : isGoldenHour
    ? '#4c5e60'
    : loc.kind === 'Bergsee' || loc.kind === 'Hochsee'
    ? '#496670'
    : '#506b62';
  const midRidgeColor = isNight
    ? '#0f1e21'
    : loc.kind === 'Bergsee' || loc.kind === 'Hochsee'
    ? '#2e4750'
    : loc.kind === 'Küste'
    ? '#455b4e'
    : '#324d42';
  const nearTreeDark = isNight ? '#0a1516' : '#182b22';
  const nearTreeLit = isNight ? '#112223' : '#254335';

  // Layer A: Far misty ridge
  bctx.fillStyle = farRidgeColor;
  bctx.beginPath();
  bctx.moveTo(0, horizonY);
  if (loc.kind === 'Bergsee' || loc.kind === 'Hochsee') {
    const peaks = [0, 0.12, 0.24, 0.39, 0.54, 0.68, 0.84, 1];
    const peakH =
      loc.kind === 'Hochsee'
        ? [0.24, 0.32, 0.14, 0.48, 0.62, 0.22, 0.16, 0.38]
        : [0.58, 0.16, 0.44, 0.1, 0.42, 0.15, 0.36, 0.52];
    peaks.forEach((px, idx) => bctx.lineTo(px * width, horizonY * peakH[idx]));
  } else {
    for (let i = 0; i <= 24; i++) {
      const x = (i / 24) * width;
      const y = horizonY - (18 + Math.sin(i * 0.52 + 0.6) * 11 + Math.cos(i * 0.9) * 5);
      bctx.lineTo(x, y);
    }
  }
  bctx.lineTo(width, horizonY);
  bctx.closePath();
  bctx.fill();

  const ridgeHaze = bctx.createLinearGradient(0, horizonY * 0.45, 0, horizonY);
  ridgeHaze.addColorStop(0, 'rgba(204, 224, 218, 0)');
  ridgeHaze.addColorStop(1, isNight ? 'rgba(24, 48, 52, 0.42)' : 'rgba(210, 228, 220, 0.25)');
  bctx.fillStyle = ridgeHaze;
  bctx.fillRect(0, horizonY * 0.45, width, horizonY * 0.55);

  // Layer B: Midground foothills
  bctx.fillStyle = midRidgeColor;
  bctx.beginPath();
  bctx.moveTo(0, horizonY);
  for (let i = 0; i <= 28; i++) {
    const x = (i / 28) * width;
    const amp = loc.kind === 'Bergsee' ? 20 : loc.kind === 'Hochsee' ? 16 : 11;
    const y = horizonY - (9 + Math.abs(Math.sin(i * 0.46 + 1.8)) * amp);
    bctx.lineTo(x, y);
  }
  bctx.lineTo(width, horizonY);
  bctx.closePath();
  bctx.fill();

  // Layer C: Biome Landmarks & Lush Overlapping Shoreline Forest
  if (loc.kind === 'Küste') {
    const lx = width * 0.84;
    bctx.fillStyle = '#33463d';
    bctx.beginPath();
    bctx.moveTo(lx - 68, horizonY);
    bctx.quadraticCurveTo(lx - 14, horizonY - 18, lx + 76, horizonY);
    bctx.fill();

    bctx.fillStyle = isNight ? '#213032' : '#dde3dc';
    bctx.fillRect(lx - 4.5, horizonY - 40, 9, 36);
    bctx.fillStyle = '#c55242';
    bctx.fillRect(lx - 4.5, horizonY - 30, 9, 7);
    bctx.fillRect(lx - 5.5, horizonY - 44, 11, 5);
  } else if (loc.kind !== 'Hochsee') {
    bctx.fillStyle = nearTreeDark;
    bctx.fillRect(0, horizonY - 6, width, 7);
    const treeScale = Math.max(1, height / 340);
    const treeCount = Math.floor(width / 10);
    for (let i = 0; i <= treeCount; i++) {
      const jitter = Math.sin(i * 12.9898 + 4.1) * 7.5;
      const hJitter = Math.abs(Math.sin(i * 78.233 + 1.7));
      const tx = (i / treeCount) * width + jitter;
      const treeH =
        (15 + hJitter * 28 + (loc.kind === 'Fluss' ? -2 : loc.id === 'moorsee' ? -4 : 4)) *
        Math.min(1.55, treeScale * 0.95);
      const treeW = (12 + ((i * 7) % 9)) * Math.min(1.35, treeScale * 0.9);

      if ((loc.id === 'karpfensee' || loc.id === 'moorsee') && i % 3 === 0) {
        bctx.fillStyle = i % 2 === 0 ? nearTreeDark : nearTreeLit;
        bctx.beginPath();
        bctx.arc(tx, horizonY - treeH * 0.56, treeW * 0.72, 0, Math.PI * 2);
        bctx.arc(tx - treeW * 0.35, horizonY - treeH * 0.34, treeW * 0.5, 0, Math.PI * 2);
        bctx.arc(tx + treeW * 0.35, horizonY - treeH * 0.38, treeW * 0.46, 0, Math.PI * 2);
        bctx.fill();
      } else {
        bctx.fillStyle = i % 2 === 0 ? nearTreeDark : nearTreeLit;
        bctx.beginPath();
        bctx.moveTo(tx, horizonY - treeH);
        bctx.lineTo(tx - treeW * 0.38, horizonY - treeH * 0.46);
        bctx.lineTo(tx - treeW * 0.22, horizonY - treeH * 0.46);
        bctx.lineTo(tx - treeW * 0.62, horizonY);
        bctx.lineTo(tx + treeW * 0.62, horizonY);
        bctx.lineTo(tx + treeW * 0.22, horizonY - treeH * 0.46);
        bctx.lineTo(tx + treeW * 0.38, horizonY - treeH * 0.46);
        bctx.closePath();
        bctx.fill();
      }
    }
    bctx.fillStyle = nearTreeDark;
    for (let i = 0; i < Math.floor(width / 26); i++) {
      const sx = i * 26 + Math.sin(i * 4.3) * 8;
      bctx.beginPath();
      bctx.ellipse(sx, horizonY - 2, 16 + (i % 4) * 5, 5 + (i % 3) * 2.5, 0, Math.PI, Math.PI * 2);
      bctx.fill();
    }
  }

  // Soft shoreline reflection mist ribbon
  const mistGrad = bctx.createLinearGradient(0, horizonY - 14, 0, horizonY + 18);
  mistGrad.addColorStop(0, 'rgba(210, 228, 220, 0)');
  mistGrad.addColorStop(
    0.48,
    loc.id === 'moorsee'
      ? 'rgba(182, 208, 198, 0.32)'
      : isNight
      ? 'rgba(130, 165, 165, 0.09)'
      : 'rgba(222, 238, 230, 0.18)'
  );
  mistGrad.addColorStop(1, 'rgba(210, 228, 220, 0)');
  bctx.fillStyle = mistGrad;
  bctx.fillRect(0, horizonY - 14, width, 32);

  // 3. Water Surface & Depth Column
  const waterGrad = bctx.createLinearGradient(0, horizonY, 0, height);
  waterGrad.addColorStop(0, rgbStr(waterTop));
  waterGrad.addColorStop(0.45, rgbStr(waterMid));
  waterGrad.addColorStop(1, rgbStr(waterBot));
  bctx.fillStyle = waterGrad;
  bctx.fillRect(0, horizonY, width, height - horizonY);

  // Soft tree/ridge reflection beneath far bank
  const bankReflect = bctx.createLinearGradient(0, horizonY, 0, horizonY + 34);
  bankReflect.addColorStop(0, 'rgba(10, 24, 22, 0.42)');
  bankReflect.addColorStop(0.55, 'rgba(12, 28, 26, 0.18)');
  bankReflect.addColorStop(1, 'rgba(10, 24, 22, 0)');
  bctx.fillStyle = bankReflect;
  bctx.fillRect(0, horizonY, width, 34);

  // Soft Feathered Underwater Light Shafts
  if (!isNight && weather !== 'Starker Regen') {
    const rayPeak = weather === 'Sonnig' ? 0.042 : 0.018;
    const rayDepth = horizonY + (height - horizonY) * 0.68;
    for (let i = 0; i < 3; i++) {
      const rx = width * (0.42 + i * 0.18);
      const rayGrad = bctx.createLinearGradient(rx, horizonY, rx - 36, rayDepth);
      rayGrad.addColorStop(0, `rgba(226, 246, 230, ${rayPeak})`);
      rayGrad.addColorStop(0.55, `rgba(226, 246, 230, ${(rayPeak * 0.35).toFixed(3)})`);
      rayGrad.addColorStop(1, 'rgba(226, 246, 230, 0)');
      bctx.fillStyle = rayGrad;
      bctx.beginPath();
      bctx.moveTo(rx - 18, horizonY);
      bctx.lineTo(rx + 46, horizonY);
      bctx.lineTo(rx + 18, rayDepth);
      bctx.lineTo(rx - 78, rayDepth);
      bctx.closePath();
      bctx.fill();

      bctx.beginPath();
      bctx.moveTo(rx - 4, horizonY);
      bctx.lineTo(rx + 28, horizonY);
      bctx.lineTo(rx + 4, rayDepth * 0.9);
      bctx.lineTo(rx - 44, rayDepth * 0.9);
      bctx.closePath();
      bctx.fill();
    }
  }

  // Static riverbed pebbles
  if (loc.kind !== 'Hochsee') {
    for (let i = 0; i < 11; i++) {
      const sx = width * (0.06 + i * 0.09);
      const sy = height - 4 + (i % 3) * 1.5;
      bctx.fillStyle = i % 2 === 0 ? 'rgba(22, 36, 34, 0.5)' : 'rgba(42, 62, 58, 0.35)';
      bctx.beginPath();
      bctx.ellipse(sx, sy, 12 + (i % 4) * 5, 4.5 + (i % 2) * 2, 0, 0, Math.PI * 2);
      bctx.fill();
    }
  }

  // Lily pads & blossoms
  if (loc.kind === 'See' || loc.id === 'moorsee') {
    const pads = [
      { x: width * 0.74, y: height * 0.79, rx: 16, ry: 6, blossom: true },
      { x: width * 0.79, y: height * 0.84, rx: 14, ry: 5.2, blossom: false },
      { x: width * 0.84, y: height * 0.77, rx: 17, ry: 6.2, blossom: true },
      { x: width * 0.88, y: height * 0.83, rx: 12, ry: 4.5, blossom: false },
    ];
    for (const pad of pads) {
      bctx.fillStyle = isNight ? 'rgba(24, 48, 36, 0.78)' : 'rgba(48, 86, 56, 0.82)';
      bctx.beginPath();
      bctx.moveTo(pad.x, pad.y);
      bctx.ellipse(pad.x, pad.y, pad.rx, pad.ry, 0, 0.35, Math.PI * 2 - 0.15);
      bctx.closePath();
      bctx.fill();
      bctx.strokeStyle = 'rgba(130, 174, 118, 0.25)';
      bctx.lineWidth = 0.8;
      bctx.stroke();

      if (pad.blossom && !isNight) {
        bctx.fillStyle = '#f2ebe1';
        bctx.beginPath();
        bctx.ellipse(pad.x - 2, pad.y - 2.5, 4.5, 2.2, -0.25, 0, Math.PI * 2);
        bctx.ellipse(pad.x + 2, pad.y - 2.5, 4.5, 2.2, 0.25, 0, Math.PI * 2);
        bctx.fill();
        bctx.fillStyle = '#e5bd70';
        bctx.beginPath();
        bctx.arc(pad.x, pad.y - 2.6, 1.6, 0, Math.PI * 2);
        bctx.fill();
      }
    }
  }

  // Foreground Left Bank & Weathered Wooden Dock
  const bankGrad = bctx.createLinearGradient(0, height - 44, width * 0.22, height);
  bankGrad.addColorStop(0, isNight ? '#111c19' : '#25392c');
  bankGrad.addColorStop(1, isNight ? '#0a1211' : '#18261e');
  bctx.fillStyle = bankGrad;
  bctx.beginPath();
  bctx.moveTo(0, height - 42);
  bctx.quadraticCurveTo(width * 0.11, height - 34, width * 0.21, height);
  bctx.lineTo(0, height);
  bctx.closePath();
  bctx.fill();

  if (!isTitleBackdrop) {
    const dockEndX = width * 0.155;
    const dockTopY = height - 22;
    bctx.fillStyle = isNight ? '#1f1914' : '#4a392b';
    bctx.fillRect(0, dockTopY, dockEndX, 9);
    bctx.fillStyle = isNight ? '#16110e' : '#35271d';
    bctx.fillRect(dockEndX - 11, dockTopY - 8, 9, 32);
    bctx.fillStyle = 'rgba(224, 198, 158, 0.18)';
    bctx.fillRect(0, dockTopY, dockEndX, 1.6);
  }

  // Subtle top/bottom vignette
  const vigGrad = bctx.createLinearGradient(0, 0, 0, height);
  vigGrad.addColorStop(0, 'rgba(7, 14, 15, 0.18)');
  vigGrad.addColorStop(0.14, 'rgba(7, 14, 15, 0)');
  vigGrad.addColorStop(0.84, 'rgba(7, 14, 15, 0)');
  vigGrad.addColorStop(1, 'rgba(7, 14, 15, 0.26)');
  bctx.fillStyle = vigGrad;
  bctx.fillRect(0, 0, width, height);

  bctx.restore();
}

export function FishingCanvas({
  location,
  gameTime,
  weather,
  phase,
  castDistance,
  maxDistance,
  fightDistance,
  tension,
  depth,
  controlMode = 'tap',
  readyToLand = false,
  surging = false,
  isTitleBackdrop = false,
  onStrikeClick,
  onLandClick,
  onCanvasTap,
}: FishingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    location,
    gameTime,
    weather,
    phase,
    castDistance,
    maxDistance,
    fightDistance,
    tension,
    depth,
    isTitleBackdrop,
  });

  stateRef.current = {
    location,
    gameTime,
    weather,
    phase,
    castDistance,
    maxDistance,
    fightDistance,
    tension,
    depth,
    isTitleBackdrop,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const staticCanvas = document.createElement('canvas');
    const staticCtx = staticCanvas.getContext('2d');
    let staticCacheKey = '';

    const ripples: Ripple[] = Array.from({ length: MAX_RIPPLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      r: 0,
      maxR: 30,
      alpha: 0,
      color: '210, 235, 220',
    }));
    let rippleCursor = 0;

    const splashes: SplashParticle[] = Array.from({ length: MAX_SPLASHES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.45,
      size: 2,
      color: '235, 246, 240',
    }));
    let splashCursor = 0;

    const raindrops: RainDrop[] = Array.from({ length: MAX_RAINDROPS }, (_, idx) => ({
      x: ((idx * 97) % 1000) / 1000,
      y: ((idx * 233) % 1000) / 1000,
      len: 10 + (idx % 5) * 3,
      speed: 0.72 + ((idx * 17) % 10) * 0.06,
    }));

    const clouds: CloudPuff[] = Array.from({ length: MAX_CLOUDS }, (_, i) => ({
      x: (i / MAX_CLOUDS) * 1.15 - 0.08,
      y: 0.14 + (i % 3) * 0.16,
      scale: 0.75 + (i % 3) * 0.28,
      speed: 0.004 + (i % 4) * 0.002,
      alpha: 0.34 + (i % 3) * 0.14,
    }));

    const fishShadows: FishShadow[] = Array.from({ length: MAX_FISH_SHADOWS }, (_, i) => ({
      x: ((i * 157 + 40) % 1000) / 1000,
      y: 0.42 + (i / MAX_FISH_SHADOWS) * 0.46,
      speed: 0.014 + (i % 3) * 0.008,
      dir: i % 2 === 0 ? 1 : -1,
      size: 15 + (i % 4) * 5.5,
      phaseOffset: i * 1.25,
    }));

    const weeds: WeedStem[] = Array.from({ length: MAX_WEEDS }, (_, i) => ({
      xFrac: 0.14 + i * 0.072 + ((i % 2) * 0.015),
      height: 26 + ((i * 19) % 34),
      blades: 2 + (i % 2),
      phase: i * 0.9,
    }));

    let width = 1000;
    let height = 330;
    let dpr = 1;

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      if (staticCanvas.width !== targetW || staticCanvas.height !== targetH) {
        staticCanvas.width = targetW;
        staticCanvas.height = targetH;
        staticCacheKey = '';
      }
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);

    const spawnRipple = (x: number, y: number, maxR: number, color = '210, 235, 220') => {
      const rp = ripples[rippleCursor];
      rippleCursor = (rippleCursor + 1) % MAX_RIPPLES;
      rp.active = true;
      rp.x = x;
      rp.y = y;
      rp.r = 2.5;
      rp.maxR = maxR;
      rp.alpha = 0.78;
      rp.color = color;
    };

    const spawnSplashBurst = (
      x: number,
      y: number,
      count: number,
      color = '235, 246, 240'
    ) => {
      for (let i = 0; i < count; i++) {
        const sp = splashes[splashCursor];
        splashCursor = (splashCursor + 1) % MAX_SPLASHES;
        const angle = -Math.PI * (0.18 + Math.random() * 0.64);
        const speed = 26 + Math.random() * 44;
        sp.active = true;
        sp.x = x + (Math.random() - 0.5) * 8;
        sp.y = y;
        sp.vx = Math.cos(angle) * speed;
        sp.vy = Math.sin(angle) * speed - 12;
        sp.life = 0;
        sp.maxLife = 0.34 + Math.random() * 0.24;
        sp.size = 1.5 + Math.random() * 1.6;
        sp.color = color;
      }
    };

    let lastTime = performance.now();
    let elapsed = 0;
    let rippleTimer = 0;
    let splashTimer = 0;
    let rainRippleTimer = 0;
    let rafId = 0;

    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      const rawDt = (now - lastTime) / 1000;
      if (rawDt < 0.032) return;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));
      lastTime = now;
      elapsed += dt;
      rippleTimer += dt;
      splashTimer += dt;
      rainRippleTimer += dt;

      const s = stateRef.current;
      const horizonY = height * 0.37;
      const h = ((s.gameTime % 24) + 24) % 24;
      const isNight = h < 5.5 || h >= 20.5;
      const isGoldenHour = (h >= 5.2 && h < 8.4) || (h >= 16.8 && h < 20.5);
      const isOvercast = s.weather.includes('Regen') || s.weather === 'Bewölkt';

      const timeBucket = Math.floor(h * 12);
      const nextCacheKey = `${width}x${height}@${dpr}:${s.location.id}:${timeBucket}:${s.weather}:${s.isTitleBackdrop}`;
      if (staticCtx && staticCacheKey !== nextCacheKey) {
        buildStaticScene(staticCtx, width, height, dpr, s.location, h, s.weather, s.isTitleBackdrop);
        staticCacheKey = nextCacheKey;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Blit pre-rendered static backdrop in one call
      ctx.drawImage(staticCanvas, 0, 0, width, height);

      // Night stars
      if (isNight) {
        for (let i = 0; i < 30; i++) {
          const sx = (((i * 197 + 41) % 997) / 997) * width;
          const sy = (((i * 113 + 17) % 887) / 887) * (horizonY * 0.78);
          const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(elapsed * 1.2 + i));
          ctx.fillStyle = `rgba(232, 244, 236, ${(twinkle * 0.7).toFixed(3)})`;
          ctx.fillRect(sx, sy, i % 5 === 0 ? 2 : 1.3, i % 5 === 0 ? 2 : 1.3);
        }
      }

      // Drifting soft multi-lobe clouds
      const cloudWindMult = s.weather === 'Windig' ? 2.4 : 1;
      const cloudBaseRgb = isNight
        ? '62, 84, 96'
        : isGoldenHour
        ? '242, 198, 166'
        : isOvercast
        ? '138, 156, 160'
        : '238, 246, 242';
      for (const c of clouds) {
        c.x += c.speed * cloudWindMult * dt;
        if (c.x > 1.18) c.x = -0.2;
        const cx = c.x * width;
        const cy = c.y * horizonY;
        const sc = c.scale;
        const baseA = isOvercast ? Math.min(0.42, c.alpha * 0.78) : c.alpha * 0.4;

        // Underside soft mist shadow
        ctx.fillStyle = `rgba(${cloudBaseRgb}, ${(baseA * 0.42).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(cx + 1 * sc, cy + 3.5 * sc, 28 * sc, 5.5 * sc, 0, 0, Math.PI * 2);
        ctx.fill();

        // Organic overlapping cloud puffs
        ctx.fillStyle = `rgba(${cloudBaseRgb}, ${baseA.toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(cx - 16 * sc, cy + 1.5 * sc, 18 * sc, 6.2 * sc, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 1 * sc, cy - 2.5 * sc, 21 * sc, 8.5 * sc, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 18 * sc, cy + 1.5 * sc, 16 * sc, 5.8 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Animated lighthouse beam for Küste
      if (s.location.kind === 'Küste' && (isNight || s.weather === 'Nebel' || isGoldenHour)) {
        const lx = width * 0.84;
        const beamSweep = Math.sin(elapsed * 0.9) * 14;
        ctx.fillStyle = 'rgba(250, 222, 146, 0.22)';
        ctx.beginPath();
        ctx.moveTo(lx, horizonY - 41);
        ctx.lineTo(lx - 140, horizonY - 56 + beamSweep);
        ctx.lineTo(lx - 140, horizonY - 26 + beamSweep);
        ctx.closePath();
        ctx.fill();
      }

      // Celestial Shimmer Column on Water
      const celestialX = width * 0.76;
      const glintColor = isNight
        ? 'rgba(186, 214, 216, '
        : isGoldenHour
        ? 'rgba(252, 208, 134, '
        : 'rgba(248, 236, 188, ';
      for (let i = 0; i < 11; i++) {
        const y = horizonY + 5 + i * 8.5;
        const w = 96 - i * 6 + Math.sin(elapsed * 1.9 + i * 0.8) * 14;
        const x = celestialX - w * 0.5 + Math.sin(elapsed * 1.2 + i * 1.3) * 8;
        const a = Math.max(0.03, (0.22 - i * 0.015) * (isOvercast ? 0.4 : 1));
        ctx.fillStyle = `${glintColor}${a.toFixed(3)})`;
        ctx.fillRect(x, y, Math.max(12, w), 1.8);
      }

      // Animated Wave Crests / Swells
      const flowSpeed =
        s.location.kind === 'Fluss'
          ? 56
          : s.location.kind === 'Hochsee'
          ? 48
          : s.location.kind === 'Küste'
          ? 36
          : 14;
      const waveAmp = s.location.kind === 'Hochsee' ? 3.8 : s.weather === 'Windig' ? 3 : 1.9;
      for (let row = 0; row < 10; row++) {
        const y = horizonY + 14 + row * ((height - horizonY - 18) / 10);
        const offset = ((elapsed * flowSpeed + row * 63) % 130) - 130;
        const alpha = 0.05 + (row / 10) * 0.06;
        ctx.strokeStyle = `rgba(210, 236, 224, ${alpha.toFixed(3)})`;
        ctx.lineWidth = row > 6 ? 1.4 : 1;
        ctx.beginPath();
        for (let x = offset; x < width + 130; x += 130) {
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + 32, y - waveAmp, x + 65, y);
        }
        ctx.stroke();
      }

      // Swaying submerged aquatic weeds
      if (s.location.kind !== 'Hochsee') {
        ctx.strokeStyle = isNight ? 'rgba(34, 60, 48, 0.42)' : 'rgba(64, 108, 78, 0.38)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const wd of weeds) {
          const wx = wd.xFrac * width;
          for (let b = 0; b < wd.blades; b++) {
            const sway = Math.sin(elapsed * 1.4 + wd.phase + b) * 7;
            ctx.moveTo(wx + b * 4, height);
            ctx.quadraticCurveTo(
              wx + b * 4 + sway * 0.5,
              height - wd.height * 0.5,
              wx + b * 4 + sway,
              height - wd.height
            );
          }
        }
        ctx.stroke();
      }

      // Articulated Underwater Fish Silhouettes
      ctx.fillStyle = 'rgba(6, 20, 21, 0.34)';
      for (const f of fishShadows) {
        f.x += f.dir * f.speed * dt;
        if (f.x > 1.15) f.x = -0.15;
        if (f.x < -0.15) f.x = 1.15;
        const fx = f.x * width;
        const fy = horizonY + (height - horizonY) * f.y + Math.sin(elapsed * 2 + f.phaseOffset) * 3;
        const tailWag = Math.sin(elapsed * 6.5 + f.phaseOffset) * 2.8;

        ctx.beginPath();
        ctx.ellipse(fx, fy, f.size, f.size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(fx - f.dir * 2, fy - f.size * 0.22);
        ctx.lineTo(fx - f.dir * f.size * 0.38, fy - f.size * 0.42);
        ctx.lineTo(fx - f.dir * f.size * 0.48, fy - f.size * 0.16);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(fx - f.dir * f.size * 0.84, fy);
        ctx.lineTo(fx - f.dir * (f.size + 8.5), fy - 5.5 + tailWag);
        ctx.lineTo(fx - f.dir * (f.size + 4.5), fy + tailWag * 0.4);
        ctx.lineTo(fx - f.dir * (f.size + 8.5), fy + 5.5 + tailWag);
        ctx.closePath();
        ctx.fill();
      }

      // Swaying foreground reeds & cattails
      const windFactor = s.weather === 'Windig' ? 2.0 : 1.0;
      for (let i = 0; i < 12; i++) {
        const bx = 14 + i * 9;
        const by = height;
        const reedH = 48 + ((i * 13) % 28);
        const sway = Math.sin(elapsed * 1.75 * windFactor + i * 0.55) * 5.5 * windFactor;
        const tipX = bx + sway;
        const tipY = by - reedH;

        ctx.strokeStyle = isNight ? '#334532' : i % 2 === 0 ? '#798d59' : '#94a269';
        ctx.lineWidth = i % 3 === 0 ? 2.4 : 1.7;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + sway * 0.42, by - reedH * 0.55, tipX, tipY);
        ctx.stroke();

        if (i % 4 === 1) {
          ctx.strokeStyle = isNight ? '#2c1f19' : '#573c2c';
          ctx.lineWidth = 4.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tipX - sway * 0.08, tipY + 11);
          ctx.lineTo(tipX - sway * 0.02, tipY + 2);
          ctx.stroke();
          ctx.lineCap = 'butt';
        }
      }

      // 4. Tapered Rod, Reel, Guides, Catenary Line & Two-Tone Bobber
      if (!s.isTitleBackdrop) {
        const rodBaseX = width * 0.115;
        const rodBaseY = height + 4;
        const bend = s.phase === 'fight' ? (s.tension / 100) * 34 : s.phase === 'bite' ? 11 : 0;
        const rodCtrlX = width * 0.18 + bend * 0.15;
        const rodCtrlY = height * 0.7 + bend * 0.25;
        const rodTipX = width * 0.255 + bend * 0.45;
        const rodTipY = height * 0.49 + bend;

        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1b221e';
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        ctx.moveTo(rodBaseX, rodBaseY);
        ctx.quadraticCurveTo(rodCtrlX, rodCtrlY, rodTipX, rodTipY);
        ctx.stroke();

        const [corkEndX, corkEndY] = quadBezierPoint(
          rodBaseX,
          rodBaseY,
          rodCtrlX,
          rodCtrlY,
          rodTipX,
          rodTipY,
          0.28
        );
        ctx.strokeStyle = '#a87d52';
        ctx.lineWidth = 7.5;
        ctx.beginPath();
        ctx.moveTo(rodBaseX, rodBaseY);
        ctx.lineTo(corkEndX, corkEndY);
        ctx.stroke();

        const [reelX, reelY] = quadBezierPoint(
          rodBaseX,
          rodBaseY,
          rodCtrlX,
          rodCtrlY,
          rodTipX,
          rodTipY,
          0.22
        );
        ctx.fillStyle = '#c8a363';
        ctx.beginPath();
        ctx.arc(reelX + 5, reelY + 5, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#243130';
        ctx.beginPath();
        ctx.arc(reelX + 5, reelY + 5, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#d3b273';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(corkEndX, corkEndY);
        ctx.quadraticCurveTo(rodCtrlX + 1, rodCtrlY - 1, rodTipX, rodTipY);
        ctx.stroke();

        ctx.fillStyle = '#d9e3dc';
        for (const gt of [0.42, 0.62, 0.8, 0.99]) {
          const [gx, gy] = quadBezierPoint(
            rodBaseX,
            rodBaseY,
            rodCtrlX,
            rodCtrlY,
            rodTipX,
            rodTipY,
            gt
          );
          ctx.beginPath();
          ctx.arc(gx + 1.5, gy - 1.5, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.lineCap = 'butt';

        if (s.phase !== 'idle') {
          const activeDist = s.phase === 'fight' ? s.fightDistance : s.castDistance;
          const distRatio = Math.max(0.08, Math.min(1, activeDist / Math.max(80, s.maxDistance)));
          const bobberX = lerp(width * 0.34, width * 0.84, distRatio);
          const depthOffset = s.depth === 'shallow' ? 0.24 : s.depth === 'mid' ? 0.34 : 0.44;
          let bobberY = horizonY + (height - horizonY) * depthOffset;

          if (s.phase === 'waiting') {
            bobberY += Math.sin(elapsed * 2.5) * 1.8;
            if (rippleTimer > 1.25) {
              rippleTimer = 0;
              spawnRipple(bobberX, bobberY + 4, 24, '210, 235, 220');
            }
          } else if (s.phase === 'bite') {
            bobberY += Math.sin(elapsed * 22) * 5 + 5;
            if (rippleTimer > 0.18) {
              rippleTimer = 0;
              spawnRipple(bobberX, bobberY + 3, 42, '241, 197, 110');
            }
            if (splashTimer > 0.22) {
              splashTimer = 0;
              spawnSplashBurst(bobberX, bobberY, 4, '246, 225, 165');
            }
          } else if (s.phase === 'fight') {
            bobberY += Math.cos(elapsed * 9) * 4;
            if (rippleTimer > 0.15) {
              rippleTimer = 0;
              spawnRipple(bobberX, bobberY + 2, 46, '235, 243, 237');
            }
            if (splashTimer > 0.14) {
              splashTimer = 0;
              spawnSplashBurst(bobberX, bobberY, 5, '236, 246, 244');
            }
          }

          ctx.strokeStyle =
            s.phase === 'fight' && s.tension > 78
              ? 'rgba(225, 126, 112, 0.95)'
              : 'rgba(235, 243, 232, 0.78)';
          ctx.lineWidth = s.phase === 'fight' ? 1.65 : 1.15;
          ctx.beginPath();
          ctx.moveTo(rodTipX, rodTipY);
          const sag = s.phase === 'fight' ? Math.max(2, 10 - (s.tension / 100) * 8) : 22;
          ctx.quadraticCurveTo(
            (rodTipX + bobberX) * 0.5,
            Math.max(rodTipY, bobberY) + sag,
            bobberX,
            bobberY - 7
          );
          ctx.stroke();

          ctx.fillStyle = 'rgba(12, 30, 30, 0.35)';
          ctx.beginPath();
          ctx.ellipse(bobberX, bobberY + 7, 5, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ece6d4';
          ctx.strokeStyle = '#1b2625';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(bobberX, bobberY, 5.2, 8.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = s.phase === 'bite' ? '#f0b84e' : '#d24d3b';
          ctx.beginPath();
          ctx.ellipse(bobberX, bobberY - 3, 4.7, 4.4, 0, Math.PI, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = s.phase === 'bite' ? '#f8d888' : '#e05845';
          ctx.fillRect(bobberX - 1.3, bobberY - 14, 2.6, 7);

          ctx.strokeStyle = 'rgba(235, 246, 240, 0.55)';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.ellipse(bobberX, bobberY + 2, 7.5, 2.2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (s.weather.includes('Regen') && rainRippleTimer > (s.weather === 'Starker Regen' ? 0.08 : 0.18)) {
        rainRippleTimer = 0;
        const rx = Math.random() * width;
        const ry = horizonY + 10 + Math.random() * (height - horizonY - 20);
        spawnRipple(rx, ry, 14, '210, 232, 232');
      }

      // 5. Ripples & Splash Droplets
      for (const rp of ripples) {
        if (!rp.active) continue;
        rp.r += 24 * dt;
        rp.alpha = Math.max(0, 1 - rp.r / rp.maxR) * 0.62;
        if (rp.r >= rp.maxR) {
          rp.active = false;
          continue;
        }
        ctx.strokeStyle = `rgba(${rp.color}, ${rp.alpha.toFixed(3)})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.34, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const sp of splashes) {
        if (!sp.active) continue;
        sp.life += dt;
        if (sp.life >= sp.maxLife) {
          sp.active = false;
          continue;
        }
        sp.vy += 170 * dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        const a = Math.max(0, 1 - sp.life / sp.maxLife) * 0.85;
        ctx.fillStyle = `rgba(${sp.color}, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Weather Overlays
      if (s.weather === 'Nebel') {
        ctx.fillStyle = 'rgba(206, 224, 220, 0.22)';
        ctx.fillRect(0, horizonY * 0.55, width, horizonY * 0.65);
      }

      if (s.weather.includes('Regen')) {
        const density = s.weather === 'Starker Regen' ? MAX_RAINDROPS : 44;
        ctx.strokeStyle = 'rgba(218, 238, 240, 0.3)';
        ctx.lineWidth = 1.05;
        ctx.beginPath();
        for (let i = 0; i < density; i++) {
          const drop = raindrops[i];
          drop.y += drop.speed * dt * (s.weather === 'Starker Regen' ? 1.55 : 1.05);
          drop.x -= 0.16 * dt;
          if (drop.y > 1) {
            drop.y = 0;
            drop.x = Math.random();
          }
          if (drop.x < 0) drop.x = 1;
          const rx = drop.x * width;
          const ry = drop.y * height;
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3.5, ry + drop.len);
        }
        ctx.stroke();
      }

      ctx.restore();
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isTitleBackdrop || controlMode !== 'tap' || !onCanvasTap) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
    onCanvasTap(relX);
  };

  const tapHintText =
    phase === 'idle'
      ? 'Aufs Wasser tippen: Auswerfen'
      : phase === 'waiting'
      ? 'Warte auf Biss …'
      : phase === 'bite'
      ? 'Tippen: Anschlagen!'
      : readyToLand
      ? 'Tippen: Fisch landen!'
      : 'Tippen: Kurbeln!';

  const keyboardHintText =
    phase === 'idle'
      ? 'Leertaste: Auswerfen · W/S: Weite'
      : phase === 'waiting'
      ? 'Warte auf Biss · E: Einholen'
      : phase === 'bite'
      ? 'Leertaste: Anschlagen!'
      : readyToLand
      ? 'Enter: Fisch landen!'
      : 'Leertaste: Kurbeln · A/D: Bremse';

  return (
    <div
      className={`relative w-full overflow-hidden select-none ${
        isTitleBackdrop
          ? 'h-full'
          : 'h-[235px] sm:h-[258px] lg:h-[272px] rounded-xl border border-[rgba(208,232,220,0.24)] shadow-[0_14px_34px_-16px_rgba(0,0,0,0.75)]'
      }`}
    >
      <canvas
        ref={canvasRef}
        data-testid="fishing-canvas"
        aria-label={`Gewässeransicht ${location.name}, Wetter ${weather}`}
        onClick={handleCanvasClick}
        className={`block w-full h-full ${
          !isTitleBackdrop && controlMode === 'tap' ? 'cursor-pointer' : ''
        }`}
      />

      {!isTitleBackdrop && phase === 'bite' && (
        <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-10">
          <button
            type="button"
            onClick={onStrikeClick}
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-[#e5bd70] hover:bg-[#efd08f] text-[#171208] text-xs sm:text-sm font-bold tracking-wide shadow-xl border border-[#f8e7bc] whitespace-nowrap cursor-pointer transition-colors"
          >
            BISS! JETZT ANSCHLAGEN!
          </button>
        </div>
      )}

      {!isTitleBackdrop && phase === 'fight' && surging && !readyToLand && (
        <div
          data-testid="surge-warning"
          className="pointer-events-none absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-10 px-3 sm:px-4 py-1.5 rounded-lg bg-[#9c342b]/95 text-[#fdf0ed] text-[11px] sm:text-xs font-bold tracking-wider uppercase border border-[#f09b91] shadow-lg whitespace-nowrap"
        >
          Fisch flieht! Kurz nicht kurbeln
        </div>
      )}

      {!isTitleBackdrop && phase === 'fight' && readyToLand && (
        <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-10">
          <button
            type="button"
            onClick={onLandClick}
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-[#8fb886] hover:bg-[#a1c998] text-[#09140d] text-xs sm:text-sm font-bold tracking-wide shadow-xl border border-[#cce2c6] whitespace-nowrap cursor-pointer transition-colors"
          >
            FISCH BEREIT · JETZT LANDEN!
          </button>
        </div>
      )}

      {!isTitleBackdrop && (
        <div
          data-testid="canvas-control-hint"
          className="pointer-events-none absolute bottom-2.5 right-3 z-10 px-2.5 py-1 rounded-md bg-[#091213]/88 text-[11px] font-medium text-[#d6e2dc] border border-[rgba(208,232,220,0.18)]"
        >
          {controlMode === 'tap' ? tapHintText : keyboardHintText}
        </div>
      )}
    </div>
  );
}
