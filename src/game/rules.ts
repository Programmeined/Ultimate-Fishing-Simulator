import {
  ACHIEVEMENTS,
  BAITS,
  DAILY_TEMPLATES,
  FISH_DATA,
  LINES,
  LOCATIONS,
  RODS,
  SHOP_ITEMS,
  TOURNAMENTS,
  WEATHER_OPTIONS,
  WEEKLY_TEMPLATES,
} from './data';
import type {
  AchievementDef,
  CatchEntry,
  DayPhase,
  DepthOption,
  DifficultyMode,
  FightState,
  FishSpecies,
  GameState,
  LineDef,
  LocationDef,
  MissionItem,
  RecordsMap,
  RodDef,
  ServerEvent,
  ServerEventBonusType,
  UnlockedAchievement,
  WeatherForecast,
  WeatherType,
} from './types';

export function getWeekKey(date: Date = new Date()): string {
  const first = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) / 7);
  return `${date.getFullYear()}-${week}`;
}

export function createInitialMissions(): MissionItem[] {
  return DAILY_TEMPLATES.slice(0, 3).map((m) => ({
    ...m,
    progress: 0,
    completed: false,
    claimed: false,
  }));
}

export function createInitialWeekly(): MissionItem[] {
  return WEEKLY_TEMPLATES.map((m) => ({
    ...m,
    progress: 0,
    completed: false,
    claimed: false,
  }));
}

export const MAX_LEVEL = 30;
export const ADMIN_CODE = '5704';

export function createInitialState(now: Date = new Date()): GameState {
  return {
    level: 1,
    xp: 0,
    money: 250,
    catches: [],
    records: { heaviest: null, longest: null, carp: null, pike: null },
    ownedRods: ['Einsteiger-Angelrute'],
    currentRod: 'Einsteiger-Angelrute',
    ownedLines: ['Monofile Standard-Schnur'],
    currentLine: 'Monofile Standard-Schnur',
    baits: { Wurm: 20, Mais: 10, Maden: 10 },
    currentBait: 'Wurm',
    gear: ['Einfacher Kescher'],
    boats: [],
    location: 'waldsee',
    missions: createInitialMissions(),
    weekly: createInitialWeekly(),
    totalWeight: 0,
    totalCaught: 0,
    sound: 35,
    muted: false,
    controlMode: 'tap',
    difficultyMode: 'schwer',
    adminMode: false,
    adminLuckMultiplier: 1,
    released: 0,
    unlocked: ['waldsee'],
    claimedTournaments: [],
    achievements: [],
    lastDaily: now.toDateString(),
    lastWeekly: getWeekKey(now),
  };
}

export function migrateSavedState(raw: Partial<GameState> | null | undefined, now: Date = new Date()): GameState {
  const base = createInitialState(now);
  if (!raw || typeof raw !== 'object') return base;
  const isAdmin = Boolean(raw.adminMode);
  const rawLuck = typeof raw.adminLuckMultiplier === 'number' && Number.isFinite(raw.adminLuckMultiplier)
    ? Math.max(1, Math.min(5, Math.round(raw.adminLuckMultiplier)))
    : 1;
  const merged: GameState = {
    ...base,
    ...raw,
    controlMode: raw.controlMode === 'keyboard' ? 'keyboard' : 'tap',
    difficultyMode: raw.difficultyMode === 'standard' ? 'standard' : 'schwer',
    adminMode: isAdmin,
    adminLuckMultiplier: isAdmin ? rawLuck : 1,
    records: { ...base.records, ...(raw.records || {}) },
    baits: { ...base.baits, ...(raw.baits || {}) },
    ownedRods: Array.isArray(raw.ownedRods) && raw.ownedRods.length > 0 ? raw.ownedRods : base.ownedRods,
    ownedLines: Array.isArray(raw.ownedLines) && raw.ownedLines.length > 0 ? raw.ownedLines : base.ownedLines,
    currentLine: typeof raw.currentLine === 'string' && raw.currentLine.length > 0 ? raw.currentLine : base.currentLine,
    gear: Array.isArray(raw.gear) && raw.gear.length > 0 ? raw.gear : base.gear,
    boats: Array.isArray(raw.boats) ? raw.boats : base.boats,
    unlocked: Array.isArray(raw.unlocked) && raw.unlocked.length > 0 ? raw.unlocked : base.unlocked,
    claimedTournaments: Array.isArray(raw.claimedTournaments) ? raw.claimedTournaments : base.claimedTournaments,
    achievements: Array.isArray(raw.achievements)
      ? raw.achievements.filter(
          (a): a is UnlockedAchievement =>
            Boolean(a && typeof a.id === 'string' && typeof a.unlockedAt === 'string')
        )
      : base.achievements,
    catches: Array.isArray(raw.catches) ? raw.catches : base.catches,
    missions: Array.isArray(raw.missions) && raw.missions.length > 0 ? raw.missions : base.missions,
    weekly: Array.isArray(raw.weekly) && raw.weekly.length > 0 ? raw.weekly : base.weekly,
  };
  return evaluateAchievements(refreshMissionsIfExpired(merged, now), now).nextState;
}

export function refreshMissionsIfExpired(state: GameState, now: Date = new Date()): GameState {
  const today = now.toDateString();
  const weekKey = getWeekKey(now);
  let changed = false;
  let missions = state.missions;
  let weekly = state.weekly;

  if (state.lastDaily !== today || missions.length === 0) {
    missions = createInitialMissions();
    changed = true;
  }
  if (state.lastWeekly !== weekKey || weekly.length === 0) {
    weekly = createInitialWeekly();
    changed = true;
  }
  if (!changed) return state;
  return {
    ...state,
    missions,
    weekly,
    lastDaily: today,
    lastWeekly: weekKey,
  };
}

export function getLocationById(id: string): LocationDef {
  return LOCATIONS.find((l) => l.id === id) || LOCATIONS[0];
}

export function getRodByName(name: string): RodDef {
  return RODS.find((r) => r.name === name) || RODS[0];
}

export function getLineByName(name: string): LineDef {
  return LINES.find((l) => l.name === name) || LINES[0];
}

export function isLocationUnlocked(state: GameState, loc: LocationDef): boolean {
  return state.level >= loc.level || state.unlocked.includes(loc.id);
}

export function getMaxCastDistance(state: GameState): number {
  if (state.boats.includes('Motorboot')) return 130;
  if (state.boats.includes('Ruderboot')) return 100;
  return 80;
}

export function getBiteWindowMs(
  locationDifficulty: number,
  fishRarity: number,
  hasBiteAlarm: boolean,
  difficultyMode: DifficultyMode
): number {
  const base = difficultyMode === 'schwer' ? 4300 : 5400;
  const penalty = (locationDifficulty - 1) * 200 + (fishRarity - 1) * 140;
  const bonus = hasBiteAlarm ? 1600 : 0;
  return Math.max(2500, base - penalty + bonus);
}

export function getWaitTimeMs(
  locationDifficulty: number,
  chumActive: boolean,
  hasFeederSet: boolean,
  lineStealthBonus: number,
  difficultyMode: DifficultyMode,
  rng: () => number = Math.random,
  activityBonus: number = 0
): number {
  const baseMin = difficultyMode === 'schwer' ? 3200 + locationDifficulty * 350 : 2800 + locationDifficulty * 180;
  const spread = difficultyMode === 'schwer' ? 4800 : 3800;
  let wait = baseMin + rng() * spread;
  if (chumActive) {
    wait *= hasFeederSet ? 0.58 : 0.72;
  }
  if (lineStealthBonus > 0) {
    wait *= 1 - Math.min(0.2, lineStealthBonus);
  }
  if (activityBonus > 0) {
    wait *= Math.max(0.65, 1 - activityBonus / 100);
  }
  return Math.max(1500, Math.round(wait));
}

export function getLandingReach(state: GameState): number {
  return state.gear.includes('Kescher-Upgrade') ? 6 : 3.5;
}

export function getXpNeededForLevel(level: number): number {
  return level * 120;
}

export function getAnglerRank(level: number): string {
  if (level >= 30) return 'Angellegende';
  if (level >= 20) return 'Meisterangler';
  if (level >= 15) return 'Profiangler';
  if (level >= 10) return 'Fortgeschrittener Angler';
  if (level >= 5) return 'Hobbyangler';
  return 'Anfänger';
}

export function applyXpGain(state: GameState, amount: number): { nextState: GameState; leveledUpTo: number | null } {
  let xp = state.xp + Math.max(0, Math.round(amount));
  let level = state.level;
  let leveledUpTo: number | null = null;
  const unlocked = new Set(state.unlocked);

  let needed = getXpNeededForLevel(level);
  while (level < MAX_LEVEL && xp >= needed) {
    xp -= needed;
    level += 1;
    leveledUpTo = level;
    needed = getXpNeededForLevel(level);
    for (const loc of LOCATIONS) {
      if (level >= loc.level) unlocked.add(loc.id);
    }
  }
  if (level >= MAX_LEVEL) {
    level = MAX_LEVEL;
    xp = 0;
  }

  const updated = evaluateAchievements({
    ...state,
    level,
    xp,
    unlocked: Array.from(unlocked),
  }).nextState;

  return {
    nextState: updated,
    leveledUpTo,
  };
}

export function redeemCode(
  state: GameState,
  rawCode: string
): { ok: boolean; nextState: GameState; message: string } {
  const code = rawCode.trim();
  if (code !== ADMIN_CODE) {
    return {
      ok: false,
      nextState: state,
      message: 'Ungültiger Code. Bitte überprüfe deine Eingabe.',
    };
  }

  const allRods = RODS.map((r) => r.name);
  const allLines = LINES.map((l) => l.name);
  const allGear = Array.from(
    new Set([
      ...state.gear,
      ...SHOP_ITEMS.filter((i) => i.kind === 'gear').map((i) => i.name),
    ])
  );
  const allBoats = Array.from(
    new Set([
      ...state.boats,
      ...SHOP_ITEMS.filter((i) => i.kind === 'boat').map((i) => i.name),
    ])
  );
  const allLocations = LOCATIONS.map((l) => l.id);
  const stockedBaits: Record<string, number> = { ...state.baits };
  for (const bait of BAITS) {
    stockedBaits[bait.name] = Math.max(stockedBaits[bait.name] || 0, 99);
  }

  const nextState = evaluateAchievements({
    ...state,
    adminMode: true,
    level: MAX_LEVEL,
    xp: 0,
    money: Math.max(state.money, 99999),
    ownedRods: allRods,
    currentRod: 'Hochsee-Big-Game-Rute',
    ownedLines: allLines,
    currentLine: 'Titan-Meeresvorfach',
    gear: allGear,
    boats: allBoats,
    baits: stockedBaits,
    unlocked: allLocations,
  }).nextState;

  return {
    ok: true,
    nextState,
    message: `Admin-Modus aktiviert! Max-Level ${MAX_LEVEL} und alle Inhalte gratis freigeschaltet.`,
  };
}

export function getRealTimeHours(now: Date = new Date()): number {
  return (
    now.getHours() +
    now.getMinutes() / 60 +
    now.getSeconds() / 3600 +
    now.getMilliseconds() / 3600000
  );
}

export function formatClock(gameTime: number, includeSeconds: boolean = false): string {
  const normalized = ((gameTime % 24) + 24) % 24;
  const totalSeconds = Math.floor(normalized * 3600 + 1e-6);
  const h = Math.floor(totalSeconds / 3600) % 24;
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (includeSeconds) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getDayPhase(gameTime: number): DayPhase {
  const h = ((gameTime % 24) + 24) % 24;
  if (h >= 5 && h < 8) return 'Morgen';
  if (h >= 8 && h < 17) return 'Tag';
  if (h >= 17 && h < 21) return 'Abend';
  return 'Nacht';
}

export function calculateActivityLevel(phase: DayPhase, weather: WeatherType, jitter: number = 0): number {
  let value = 48;
  if (phase === 'Morgen' || phase === 'Abend') value += 18;
  if (phase === 'Nacht') value -= 5;
  if (weather === 'Leichter Regen') value += 10;
  if (weather === 'Starker Regen') value -= 8;
  if (weather === 'Nebel') value += 5;
  return Math.max(10, Math.min(95, Math.round(value + jitter)));
}

export function getTargetTemperatureForWeather(
  weather: WeatherType,
  rng: () => number = Math.random
): number {
  const ranges: Record<WeatherType, [number, number]> = {
    Sonnig: [17, 26],
    Bewölkt: [11, 20],
    'Leichter Regen': [8, 16],
    'Starker Regen': [5, 13],
    Nebel: [4, 13],
    Windig: [7, 17],
  };
  const [min, max] = ranges[weather];
  return Math.round(min + rng() * (max - min));
}

export function createNextWeatherForecast(
  currentWeather: WeatherType,
  rng: () => number = Math.random,
  currentTemperature?: number
): WeatherForecast {
  const alternatives = WEATHER_OPTIONS.filter((w) => w !== currentWeather);
  const pool = alternatives.length > 0 ? alternatives : WEATHER_OPTIONS;
  const nextWeather = pool[Math.floor(rng() * pool.length)];
  const rawTargetTemp = getTargetTemperatureForWeather(nextWeather, rng);
  // Gradual temperature shift (max +-4 °C per transition) so weather/temperature never jumps abruptly
  const nextTemperature =
    typeof currentTemperature === 'number'
      ? Math.max(4, Math.min(27, Math.max(currentTemperature - 4, Math.min(currentTemperature + 4, rawTargetTemp))))
      : rawTargetTemp;
  const nextWind = Math.round(
    (nextWeather === 'Windig' ? 18 : 3) + rng() * (nextWeather === 'Windig' ? 14 : 12)
  );
  // Slow natural pace: 20 to 30 real/in-game minutes before next weather shift
  const inGameMinutesRemaining = Math.round(20 + rng() * 10);
  return {
    nextWeather,
    nextTemperature,
    nextWind,
    inGameMinutesRemaining,
  };
}

export function advanceWorldTick(
  params: {
    gameTime: number;
    weather: WeatherType;
    temperature: number;
    wind: number;
    forecast: WeatherForecast;
  },
  rng: () => number = Math.random,
  options?: {
    realTimeDate?: Date;
    timeOffsetHours?: number;
    forecastStepMinutes?: number;
  }
): {
  gameTime: number;
  weather: WeatherType;
  temperature: number;
  wind: number;
  forecast: WeatherForecast;
  weatherChanged: boolean;
} {
  const nextGameTime = options?.realTimeDate
    ? (getRealTimeHours(options.realTimeDate) + (options.timeOffsetHours ?? 0) + 24) % 24
    : (params.gameTime + 0.025) % 24;
  const stepMinutes = options?.forecastStepMinutes ?? 1.5;
  const remaining = params.forecast.inGameMinutesRemaining - stepMinutes;

  if (remaining <= 0) {
    const nextWeather = params.forecast.nextWeather;
    return {
      gameTime: nextGameTime,
      weather: nextWeather,
      temperature: params.forecast.nextTemperature,
      wind: params.forecast.nextWind,
      forecast: createNextWeatherForecast(nextWeather, rng, params.forecast.nextTemperature),
      weatherChanged: true,
    };
  }

  return {
    gameTime: nextGameTime,
    weather: params.weather,
    temperature: params.temperature,
    wind: params.wind,
    forecast: {
      ...params.forecast,
      inGameMinutesRemaining: remaining,
    },
    weatherChanged: false,
  };
}

export function calculateTapCastDistance(relativeX: number, maxDistance: number): number {
  const clampedRatio = Math.max(0, Math.min(1, (relativeX - 0.28) / 0.6));
  return Math.round(10 + clampedRatio * (maxDistance - 10));
}

export function isSpeciesConditionMatch(
  fish: FishSpecies,
  phase: DayPhase,
  weather: WeatherType,
  temperature: number
): { weatherMatch: boolean; tempMatch: boolean; timeMatch: boolean; idealNow: boolean } {
  const weatherMatch = fish.preferredWeather.includes(weather);
  const tempMatch = temperature >= fish.tempRange[0] && temperature <= fish.tempRange[1];
  const timeMatch = fish.times.includes(phase);
  return {
    weatherMatch,
    tempMatch,
    timeMatch,
    idealNow: weatherMatch && tempMatch && timeMatch,
  };
}

export function selectWeightedFish(
  location: LocationDef,
  bait: string,
  depth: DepthOption,
  phase: DayPhase,
  weather: WeatherType,
  rng: () => number = Math.random,
  temperature: number = 16,
  options?: { rareFishBoost?: number }
): FishSpecies {
  let candidates = FISH_DATA.filter((f) => location.fish.includes(f.name) && f.depth.includes(depth));
  if (candidates.length === 0) {
    candidates = FISH_DATA.filter((f) => location.fish.includes(f.name));
  }
  if (candidates.length === 0) {
    candidates = FISH_DATA;
  }

  const rareBoost = Math.max(0, options?.rareFishBoost ?? 0);

  const weights = candidates.map((f) => {
    let score = 1 / Math.max(1, f.rarity);
    if (f.baits.includes(bait)) score *= 3.5;
    if (f.times.includes(phase)) score *= 1.8;

    // Strong weather preference weighting
    if (f.preferredWeather.includes(weather)) {
      score *= 3.2;
    } else {
      score *= 0.35;
    }

    // Strong temperature band weighting
    const [minT, maxT] = f.tempRange;
    if (temperature >= minT && temperature <= maxT) {
      score *= 2.8;
    } else {
      const dist = temperature < minT ? minT - temperature : temperature - maxT;
      score *= dist <= 3 ? 0.85 : 0.22;
    }

    // Server-wide rare fish event boost
    if (rareBoost > 0 && f.rarity >= 3) {
      score *= 1 + rareBoost;
    }

    return Math.max(0.05, score);
  });

  const total = weights.reduce((acc, w) => acc + w, 0);
  let pick = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    pick -= weights[i];
    if (pick <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

export function calculateCatchValue(weight: number, length: number): number {
  return Math.max(2, Math.round(weight * 4 + length * 0.12));
}

export function stepFightPhysics(
  fight: FightState,
  fishWeight: number,
  rodPower: number,
  dtSeconds: number,
  rng: () => number = Math.random,
  options?: {
    lineStrength?: number;
    currentStrength?: number;
    difficultyMode?: DifficultyMode;
  }
): {
  next: FightState;
  outcome: 'ongoing' | 'snapped' | 'escaped';
  escapeReason?: 'distance' | 'slack';
} {
  const clampedDt = Math.min(0.1, Math.max(0.01, dtSeconds));
  const stepScale = clampedDt / 0.5;
  const lineStrength = options?.lineStrength ?? 1;
  const currentStrength = options?.currentStrength ?? 0;
  const difficultyMode = options?.difficultyMode ?? 'standard';
  const difficultyMult = difficultyMode === 'schwer' ? 1.24 : 1.0;

  let surging = Boolean(fight.surging);
  let surgeTimer = Math.max(0, (fight.surgeTimer ?? 0) - clampedDt);

  if (!surging && surgeTimer <= 0) {
    const surgeChance = (difficultyMode === 'schwer' ? 0.12 : 0.06) * stepScale;
    if (fight.stamina > 25 && rng() < surgeChance) {
      surging = true;
      surgeTimer = 1.4 + rng() * 1.1;
    }
  } else if (surging && surgeTimer <= 0) {
    surging = false;
    surgeTimer = 1.8;
  }

  const surgeMult = surging ? 1.48 : 1.0;
  const fishForce =
    (fishWeight * 1.35 * difficultyMult + currentStrength * 3.2 + rng() * 14) * surgeMult;
  const rodPressure = (fight.brake * 0.55 + rodPower * 0.95) * lineStrength;
  const delta = fishForce - rodPressure;

  const tensionGainFactor = delta > 0 ? 0.19 / Math.max(1, lineStrength * 0.9) : 0.18;
  let tension = Math.max(0, Math.min(100, fight.tension + delta * tensionGainFactor * stepScale));

  const staminaDrain = Math.max(0.9, (rodPressure - fishForce * 0.48) * 0.13) * stepScale;
  const stamina = Math.max(0, fight.stamina - staminaDrain);

  let distance = fight.distance;
  if (surging) {
    distance = Math.min(95, distance + (1.6 + currentStrength * 0.5 + rng() * 1.8) * stepScale);
  } else if (stamina > 10 && rng() < 0.25 * stepScale) {
    distance = Math.min(95, distance + (rng() * 2.2 + currentStrength * 0.35) * stepScale);
  } else if (stamina <= 0) {
    distance = Math.max(0, distance - 1.3 * stepScale);
    tension = Math.max(8, tension - 4 * stepScale);
  }

  let slackTicks = fight.slackTicks ?? 0;
  if (difficultyMode === 'schwer') {
    if (tension <= 4 && fight.stamina > 15) {
      slackTicks += 1;
    } else {
      slackTicks = Math.max(0, slackTicks - 2);
    }
  }

  if (tension > 95) {
    return {
      next: { ...fight, tension: 100, stamina, distance, surging, surgeTimer, slackTicks },
      outcome: 'snapped',
    };
  }
  if (distance > 88) {
    return {
      next: { ...fight, tension, stamina, distance, surging, surgeTimer, slackTicks },
      outcome: 'escaped',
      escapeReason: 'distance',
    };
  }
  if (difficultyMode === 'schwer' && slackTicks >= 26) {
    return {
      next: { ...fight, tension, stamina, distance, surging, surgeTimer, slackTicks },
      outcome: 'escaped',
      escapeReason: 'slack',
    };
  }

  return {
    next: { ...fight, tension, stamina, distance, surging, surgeTimer, slackTicks },
    outcome: 'ongoing',
  };
}

export function applyReelPull(
  fight: FightState,
  rodPower: number,
  options?: { lineStrength?: number }
): {
  next: FightState;
  outcome: 'ongoing' | 'snapped';
} {
  const lineStrength = options?.lineStrength ?? 1;
  const surgePenalty = fight.surging ? 2.15 : 1.0;
  const tensionStep = (Math.max(1.2, fight.brake * 0.045) * surgePenalty) / Math.max(1, lineStrength * 0.85);
  const tension = fight.tension + tensionStep;
  const pullDistance = fight.surging
    ? Math.max(0.25, rodPower * 0.05)
    : Math.max(0.85, rodPower * 0.16);
  const distance = Math.max(0, fight.distance - pullDistance);
  const stamina = Math.max(0, fight.stamina - (fight.surging ? 1.2 : 2.4));

  if (tension > 95) {
    return { next: { ...fight, tension: 100, distance, stamina }, outcome: 'snapped' };
  }
  return { next: { ...fight, tension, distance, stamina, slackTicks: 0 }, outcome: 'ongoing' };
}

export function canLandFish(distance: number, stamina: number, hasLandingNetUpgrade: boolean): boolean {
  const reach = hasLandingNetUpgrade ? 6 : 3.5;
  return distance <= reach || (stamina <= 15 && distance <= reach + 4.5);
}

export function updateRecordsWithCatch(records: RecordsMap, entry: CatchEntry): RecordsMap {
  const next = { ...records };
  if (!next.heaviest || entry.weight > next.heaviest.weight) {
    next.heaviest = entry;
  }
  if (!next.longest || entry.length > next.longest.length) {
    next.longest = entry;
  }
  if (entry.name.toLowerCase().includes('karpfen')) {
    if (!next.carp || entry.weight > next.carp.weight) {
      next.carp = entry;
    }
  }
  if (entry.name === 'Hecht') {
    if (!next.pike || entry.length > next.pike.length) {
      next.pike = entry;
    }
  }
  return next;
}

export function updateMissionsWithCatch(
  missions: MissionItem[],
  weekly: MissionItem[],
  entry: CatchEntry,
  allCatches: CatchEntry[],
  totalWeight: number
): {
  missions: MissionItem[];
  weekly: MissionItem[];
  newlyCompleted: string[];
} {
  const newlyCompleted: string[] = [];
  const distinctSpeciesCount = new Set(allCatches.map((c) => c.name)).size;

  const advanceList = (list: MissionItem[]): MissionItem[] =>
    list.map((m) => {
      if (m.completed) return m;
      let progress = m.progress;

      if (m.id === 'catch3' || m.id === 'week10') progress += 1;
      if (m.id === 'carp' && entry.name.toLowerCase().includes('karpfen')) progress += 1;
      if (m.id === 'bigfish' && entry.weight >= 2) progress += 1;
      if (m.id === 'species' || m.id === 'weekspecies') progress = distinctSpeciesCount;
      if (m.id === 'predator' && entry.type === 'Raubfisch') progress += 1;
      if (m.id === 'weekweight') progress = Number(totalWeight.toFixed(1));

      const completed = progress >= m.target;
      if (completed) {
        progress = m.target;
        newlyCompleted.push(m.name);
      }

      return { ...m, progress, completed };
    });

  return {
    missions: advanceList(missions),
    weekly: advanceList(weekly),
    newlyCompleted,
  };
}

export function purchaseShopItem(
  state: GameState,
  itemName: string
): { ok: boolean; nextState: GameState; message: string } {
  const item = SHOP_ITEMS.find((x) => x.name === itemName);
  if (!item) return { ok: false, nextState: state, message: 'Artikel nicht gefunden.' };
  const effectivePrice = state.adminMode ? 0 : item.price;
  if (state.money < effectivePrice) return { ok: false, nextState: state, message: 'Dafür hast du nicht genug Geld.' };

  if (item.kind === 'rod') {
    const rod = RODS.find((r) => r.name === itemName);
    if (!state.adminMode && (!rod || state.level < rod.level)) {
      return { ok: false, nextState: state, message: 'Dein Level reicht noch nicht.' };
    }
    if (state.ownedRods.includes(itemName)) {
      return { ok: false, nextState: state, message: 'Du besitzt diese Angelrute bereits.' };
    }
    return {
      ok: true,
      nextState: {
        ...state,
        money: state.money - effectivePrice,
        ownedRods: [...state.ownedRods, itemName],
        currentRod: itemName,
      },
      message: `${itemName} ${state.adminMode ? 'gratis erhalten' : 'gekauft'} und ausgerüstet!`,
    };
  }

  if (item.kind === 'line') {
    const line = LINES.find((l) => l.name === itemName);
    if (!state.adminMode && (!line || state.level < line.level)) {
      return { ok: false, nextState: state, message: 'Dein Level reicht noch nicht.' };
    }
    if (state.ownedLines.includes(itemName)) {
      return { ok: false, nextState: state, message: 'Du besitzt diese Schnur bereits.' };
    }
    return {
      ok: true,
      nextState: {
        ...state,
        money: state.money - effectivePrice,
        ownedLines: [...state.ownedLines, itemName],
        currentLine: itemName,
      },
      message: `${itemName} ${state.adminMode ? 'gratis erhalten' : 'gekauft'} und aufgezogen!`,
    };
  }

  if (item.kind === 'boat') {
    if (state.boats.includes(itemName)) {
      return { ok: false, nextState: state, message: 'Du besitzt dieses Boot bereits.' };
    }
    const maxDistAfter = itemName === 'Motorboot' ? 130 : getMaxCastDistance({ ...state, boats: [...state.boats, itemName] });
    return {
      ok: true,
      nextState: evaluateAchievements({
        ...state,
        money: state.money - effectivePrice,
        boats: [...state.boats, itemName],
      }).nextState,
      message: `${itemName} ${state.adminMode ? 'gratis erhalten' : 'gekauft'}! Maximale Wurfweite beträgt jetzt ${maxDistAfter} m.`,
    };
  }

  if (state.gear.includes(itemName)) {
    return { ok: false, nextState: state, message: 'Du besitzt diese Ausrüstung bereits.' };
  }
  return {
    ok: true,
    nextState: {
      ...state,
      money: state.money - effectivePrice,
      gear: [...state.gear, itemName],
    },
    message: `${itemName} ${state.adminMode ? 'gratis erhalten' : 'gekauft'}!`,
  };
}

export function purchaseBaitPack(
  state: GameState,
  baitName: string
): { ok: boolean; nextState: GameState; message: string } {
  const bait = BAITS.find((b) => b.name === baitName);
  if (!bait) return { ok: false, nextState: state, message: 'Köder nicht gefunden.' };
  const cost = state.adminMode ? 0 : bait.price * 10;
  if (state.money < cost) {
    return { ok: false, nextState: state, message: 'Nicht genug Geld.' };
  }
  return {
    ok: true,
    nextState: {
      ...state,
      money: state.money - cost,
      baits: {
        ...state.baits,
        [baitName]: (state.baits[baitName] || 0) + 10,
      },
    },
    message: state.adminMode ? `10 × ${baitName} gratis hinzugefügt.` : `10 × ${baitName} gekauft.`,
  };
}

export function evaluateTournament(
  tournamentId: 'heavy' | 'carpCup' | 'speciesCup' | 'deepSeaCup',
  catches: CatchEntry[]
): {
  score: number;
  qualified: boolean;
  description: string;
} {
  const def = TOURNAMENTS.find((t) => t.id === tournamentId);
  if (!def) {
    return { score: 0, qualified: false, description: 'Unbekanntes Turnier.' };
  }

  let score = 0;
  let description = 'Noch kein gültiger Fang.';

  if ((tournamentId === 'heavy' || tournamentId === 'deepSeaCup') && catches.length > 0) {
    const best = catches.reduce((a, b) => (a.weight > b.weight ? a : b));
    score = best.weight;
    description = `Dein bester Fang: ${best.name} (${best.weight} kg).`;
  }

  if (tournamentId === 'carpCup') {
    const carps = catches.filter((f) => f.name.toLowerCase().includes('karpfen'));
    if (carps.length > 0) {
      const best = carps.reduce((a, b) => (a.weight > b.weight ? a : b));
      score = best.weight;
      description = `Dein bester Karpfen: ${best.name} (${best.weight} kg).`;
    }
  }

  if (tournamentId === 'speciesCup') {
    score = new Set(catches.map((f) => f.name)).size;
    description = `Du hast ${score} unterschiedliche Fischarten gefangen.`;
  }

  return {
    score,
    qualified: score >= def.targetValue,
    description,
  };
}

export function adminGrantMoney(
  state: GameState,
  amount: number,
  mode: 'add' | 'set' = 'add'
): GameState {
  if (!state.adminMode) return state;
  const nextMoney =
    mode === 'set' ? Math.max(0, Math.round(amount)) : Math.max(0, Math.round(state.money + amount));
  return { ...state, money: nextMoney };
}

export function adminSetLevel(state: GameState, targetLevel: number): GameState {
  if (!state.adminMode) return state;
  const level = Math.max(1, Math.min(MAX_LEVEL, Math.round(targetLevel)));
  const unlocked = new Set(state.unlocked);
  for (const loc of LOCATIONS) {
    if (level >= loc.level) unlocked.add(loc.id);
  }
  return evaluateAchievements({
    ...state,
    level,
    xp: 0,
    unlocked: Array.from(unlocked),
  }).nextState;
}

export function adminGrantBait(
  state: GameState,
  baitName: string,
  amount: number = 25
): GameState {
  if (!state.adminMode) return state;
  const exists = BAITS.some((b) => b.name === baitName);
  if (!exists) return state;
  return {
    ...state,
    baits: {
      ...state.baits,
      [baitName]: Math.max(0, (state.baits[baitName] || 0) + Math.max(1, Math.round(amount))),
    },
  };
}

export function adminGrantAllContent(state: GameState): GameState {
  if (!state.adminMode) return state;
  const stockedBaits: Record<string, number> = { ...state.baits };
  for (const bait of BAITS) {
    stockedBaits[bait.name] = Math.max(stockedBaits[bait.name] || 0, 99);
  }
  return evaluateAchievements({
    ...state,
    level: MAX_LEVEL,
    xp: 0,
    ownedRods: RODS.map((r) => r.name),
    ownedLines: LINES.map((l) => l.name),
    gear: Array.from(
      new Set([
        ...state.gear,
        ...SHOP_ITEMS.filter((i) => i.kind === 'gear').map((i) => i.name),
      ])
    ),
    boats: Array.from(
      new Set([
        ...state.boats,
        ...SHOP_ITEMS.filter((i) => i.kind === 'boat').map((i) => i.name),
      ])
    ),
    unlocked: LOCATIONS.map((l) => l.id),
    baits: stockedBaits,
  }).nextState;
}

export function adminCompleteAllMissions(state: GameState): GameState {
  if (!state.adminMode) return state;
  return evaluateAchievements({
    ...state,
    missions: state.missions.map((m) => ({ ...m, progress: m.target, completed: true })),
    weekly: state.weekly.map((m) => ({ ...m, progress: m.target, completed: true })),
  }).nextState;
}

export function adminGrantFishToLogbook(
  state: GameState,
  fishName: string,
  giantMode: boolean = false
): GameState {
  if (!state.adminMode) return state;
  const fish = FISH_DATA.find((f) => f.name === fishName);
  if (!fish) return state;
  const loc = getLocationById(state.location);
  const ratio = giantMode ? 0.96 : 0.55;
  const weight = Number((fish.weight[0] + (fish.weight[1] - fish.weight[0]) * ratio).toFixed(2));
  const length = Number((fish.length[0] + (fish.length[1] - fish.length[0]) * ratio).toFixed(1));
  const entry: CatchEntry = {
    id: `adm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: fish.name,
    type: fish.type,
    weight,
    length,
    location: loc.name,
    bait: state.currentBait,
    rod: state.currentRod,
    date: new Date().toLocaleString('de-DE'),
    released: false,
    value: calculateCatchValue(weight, length),
  };
  const catches = [entry, ...state.catches];
  const totalCaught = state.totalCaught + 1;
  const totalWeight = Number((state.totalWeight + entry.weight).toFixed(2));
  const records = updateRecordsWithCatch(state.records, entry);
  const missionUpdate = updateMissionsWithCatch(
    state.missions,
    state.weekly,
    entry,
    catches,
    totalWeight
  );
  return evaluateAchievements({
    ...state,
    catches,
    totalCaught,
    totalWeight,
    records,
    missions: missionUpdate.missions,
    weekly: missionUpdate.weekly,
  }).nextState;
}

export function getAchievementProgress(achievementId: string, state: GameState): number {
  const maxSingleWeight =
    state.records.heaviest?.weight ??
    state.catches.reduce((max, c) => (c.weight > max ? c.weight : max), 0);
  const distinctSpecies = new Set(state.catches.map((c) => c.name)).size;
  const unlockedLocations = new Set([
    ...state.unlocked,
    ...LOCATIONS.filter((l) => state.level >= l.level).map((l) => l.id),
  ]).size;
  const completedMissions =
    state.missions.filter((m) => m.completed || m.claimed).length +
    state.weekly.filter((m) => m.completed || m.claimed).length;

  switch (achievementId) {
    case 'first-catch':
    case 'catch-10':
    case 'catch-50':
      return state.totalCaught;
    case 'release-5':
      return state.released;
    case 'heavy-5kg':
    case 'heavy-20kg':
      return Number(maxSingleWeight.toFixed(1));
    case 'total-weight-100':
      return Number(state.totalWeight.toFixed(1));
    case 'species-5':
    case 'species-15':
      return distinctSpecies;
    case 'profi-angler':
    case 'angellegende':
      return state.level;
    case 'fleet-captain':
      return state.boats.length;
    case 'world-explorer':
      return unlockedLocations;
    case 'mission-claim':
      return completedMissions;
    default:
      return 0;
  }
}

export function evaluateAchievements(
  state: GameState,
  now: Date = new Date()
): { nextState: GameState; newlyUnlocked: AchievementDef[] } {
  const existing = state.achievements || [];
  const unlockedIds = new Set(existing.map((a) => a.id));
  const newlyUnlocked: AchievementDef[] = [];
  const nextAchievements: UnlockedAchievement[] = [...existing];
  const timestamp = now.toLocaleDateString('de-DE');

  for (const def of ACHIEVEMENTS) {
    if (unlockedIds.has(def.id)) continue;
    const progress = getAchievementProgress(def.id, state);
    if (progress >= def.target) {
      unlockedIds.add(def.id);
      newlyUnlocked.push(def);
      nextAchievements.push({ id: def.id, unlockedAt: timestamp });
    }
  }

  if (newlyUnlocked.length === 0) {
    return { nextState: state, newlyUnlocked };
  }
  return {
    nextState: {
      ...state,
      achievements: nextAchievements,
    },
    newlyUnlocked,
  };
}

export function exitAdminModeAndReset(
  _state: GameState,
  now: Date = new Date()
): GameState {
  return createInitialState(now);
}

export function adminSetLuckMultiplier(state: GameState, mult: number): GameState {
  if (!state.adminMode) return state;
  const clamped = Math.max(1, Math.min(5, Math.round(mult)));
  return { ...state, adminLuckMultiplier: clamped };
}

export function rollLuckWeightedRatio(
  luckFactor: number,
  rng: () => number = Math.random
): number {
  const raw = Math.max(0, Math.min(1, rng()));
  const clampedLuck = Math.max(0, Math.min(2.5, luckFactor));
  if (clampedLuck <= 0) return raw;
  const exponent = 1 / (1 + clampedLuck * 2.4);
  return Math.max(0, Math.min(1, Math.pow(raw, exponent)));
}

export const SERVER_EVENT_BONUS_INFO: Record<
  ServerEventBonusType,
  { label: string; shortBadge: string; description: string }
> = {
  xp_boost: {
    label: 'Doppelte XP (×2)',
    shortBadge: '×2 XP',
    description: 'Alle gefangenen und zurückgesetzten Fische geben doppelte Erfahrungspunkte.',
  },
  money_boost: {
    label: 'Goldrausch (+50 % Fangwert)',
    shortBadge: '+50 % €',
    description: 'Jeder gefangene Fisch bringt 50 % mehr Verkaufswert ein.',
  },
  activity_boost: {
    label: 'Beißlaune (+25 % Aktivität)',
    shortBadge: '+25 % Aktivität',
    description: 'Erhöht die Fischaktivität und verkürzt die Wartezeit bis zum Biss.',
  },
  rare_fish: {
    label: 'Seltene Fische (×2,8 Chance)',
    shortBadge: 'Seltene +',
    description: 'Seltene und kapitale Fischarten beißen deutlich häufiger an.',
  },
  luck_boost: {
    label: 'Mehr Glück (Seltene & schwere Fische)',
    shortBadge: 'Mehr Glück',
    description: 'Erhöht das Angelglück stark: häufiger seltene Arten, deutlich schwerere Fänge, +15 % Aktivität und +25 % Fangwert.',
  },
  all_boost: {
    label: 'Großes Angel-Festival (Alle Boni)',
    shortBadge: 'Festival-Boost',
    description: '+50 % XP, +30 % Fangwert, +20 % Aktivität, mehr Glück und höhere Chance auf seltene Fische.',
  },
};

export function isServerEventCurrentlyLive(
  event: ServerEvent,
  now: Date = new Date()
): boolean {
  if (!event.active) return false;
  const startMs = Date.parse(event.startsAt);
  const endMs = Date.parse(event.endsAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
  const nowMs = now.getTime();
  return nowMs >= startMs && nowMs < endMs;
}

export function calculateServerEventModifiers(
  events: ServerEvent[],
  locationId: string,
  now: Date = new Date()
): {
  xpMult: number;
  moneyMult: number;
  activityBonus: number;
  rareFishBoost: number;
  weightLuckBias: number;
  liveEvents: ServerEvent[];
} {
  const liveEvents = events.filter(
    (e) =>
      isServerEventCurrentlyLive(e, now) &&
      (e.locationId === 'all' || e.locationId === locationId)
  );

  let xpMult = 1;
  let moneyMult = 1;
  let activityBonus = 0;
  let rareFishBoost = 0;
  let weightLuckBias = 0;

  for (const evt of liveEvents) {
    switch (evt.bonusType) {
      case 'xp_boost':
        xpMult *= 2;
        break;
      case 'money_boost':
        moneyMult *= 1.5;
        break;
      case 'activity_boost':
        activityBonus += 25;
        break;
      case 'rare_fish':
        rareFishBoost += 1.8;
        break;
      case 'luck_boost':
        rareFishBoost += 2.4;
        weightLuckBias += 0.45;
        activityBonus += 15;
        moneyMult *= 1.25;
        break;
      case 'all_boost':
        xpMult *= 1.5;
        moneyMult *= 1.3;
        activityBonus += 20;
        rareFishBoost += 1.0;
        weightLuckBias += 0.25;
        break;
    }
  }

  return {
    xpMult: Math.min(4, Number(xpMult.toFixed(2))),
    moneyMult: Math.min(3, Number(moneyMult.toFixed(2))),
    activityBonus: Math.min(45, activityBonus),
    rareFishBoost: Math.min(4, Number(rareFishBoost.toFixed(2))),
    weightLuckBias: Math.min(0.85, Number(weightLuckBias.toFixed(2))),
    liveEvents,
  };
}

export function formatEventRemainingTime(
  endsAtIso: string,
  now: Date = new Date()
): string {
  const endMs = Date.parse(endsAtIso);
  if (!Number.isFinite(endMs)) return 'Unbekannt';
  const diffMs = endMs - now.getTime();
  if (diffMs <= 0) return 'Abgelaufen';
  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 1) return 'unter 1 Min.';
  if (totalMinutes < 60) return `${totalMinutes} Min.`;
  const totalHours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    return remMinutes > 0 ? `${totalHours} Std. ${remMinutes} Min.` : `${totalHours} Std.`;
  }
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  return remHours > 0 ? `${days} T. ${remHours} Std.` : `${days} T.`;
}


