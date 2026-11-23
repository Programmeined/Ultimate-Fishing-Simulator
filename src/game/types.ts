export type FishCategory = 'Friedfisch' | 'Raubfisch' | 'Weitere';
export type DepthOption = 'shallow' | 'mid' | 'deep';
export type DayPhase = 'Morgen' | 'Tag' | 'Abend' | 'Nacht';
export type WeatherType =
  | 'Sonnig'
  | 'Bewölkt'
  | 'Leichter Regen'
  | 'Starker Regen'
  | 'Nebel'
  | 'Windig';

export type FishingPhase = 'idle' | 'waiting' | 'bite' | 'fight';
export type ShellState = 'title' | 'playing' | 'paused';
export type ControlMode = 'tap' | 'keyboard';
export type DifficultyMode = 'standard' | 'schwer';

export interface WeatherForecast {
  nextWeather: WeatherType;
  nextTemperature: number;
  nextWind: number;
  inGameMinutesRemaining: number;
}

export type NavPage =
  | 'fishing'
  | 'locations'
  | 'equipment'
  | 'shop'
  | 'missions'
  | 'logbook'
  | 'records'
  | 'achievements'
  | 'encyclopedia'
  | 'tournaments'
  | 'tutorial'
  | 'settings'
  | 'admin';

export interface FishSpecies {
  name: string;
  type: FishCategory;
  weight: [number, number];
  length: [number, number];
  rarity: number;
  baits: string[];
  depth: DepthOption[];
  times: DayPhase[];
  preferredWeather: WeatherType[];
  tempRange: [number, number];
  habitat: string;
  food: string;
}

export interface LocationDef {
  id: string;
  name: string;
  level: number;
  description: string;
  depth: number;
  bottom: string;
  plants: string;
  fish: string[];
  kind: 'See' | 'Bergsee' | 'Fluss' | 'Küste' | 'Hochsee';
  difficulty: number;
  currentStrength: number;
}

export interface RodDef {
  name: string;
  price: number;
  power: number;
  level: number;
}

export interface LineDef {
  name: string;
  price: number;
  level: number;
  strengthMultiplier: number;
  stealthBonus: number;
  description: string;
}

export interface BaitDef {
  name: string;
  price: number;
  stock: number;
}

export interface ShopItemDef {
  name: string;
  price: number;
  kind: 'rod' | 'gear' | 'boat' | 'line';
  effect: string;
}

export interface CatchEntry {
  id: string;
  name: string;
  type: FishCategory;
  weight: number;
  length: number;
  location: string;
  bait: string;
  rod: string;
  date: string;
  released: boolean;
  value: number;
}

export interface RecordsMap {
  heaviest: CatchEntry | null;
  longest: CatchEntry | null;
  carp: CatchEntry | null;
  pike: CatchEntry | null;
}

export interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  target: number;
  reward: number;
  xp: number;
}

export interface MissionItem extends MissionTemplate {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface TournamentDef {
  id: 'heavy' | 'carpCup' | 'speciesCup' | 'deepSeaCup';
  name: string;
  description: string;
  requirement: string;
  targetValue: number;
  unit: string;
  reward: number;
}

export type AchievementTier = 'Bronze' | 'Silber' | 'Gold' | 'Platin';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  category: 'Fänge' | 'Arten & Gewicht' | 'Fortschritt';
  target: number;
  unit: string;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

export interface GameState {
  level: number;
  xp: number;
  money: number;
  catches: CatchEntry[];
  records: RecordsMap;
  ownedRods: string[];
  currentRod: string;
  ownedLines: string[];
  currentLine: string;
  baits: Record<string, number>;
  currentBait: string;
  gear: string[];
  boats: string[];
  location: string;
  missions: MissionItem[];
  weekly: MissionItem[];
  totalWeight: number;
  totalCaught: number;
  sound: number;
  muted: boolean;
  controlMode: ControlMode;
  difficultyMode: DifficultyMode;
  adminMode: boolean;
  adminLuckMultiplier: number;
  released: number;
  unlocked: string[];
  claimedTournaments: string[];
  achievements: UnlockedAchievement[];
  lastDaily: string;
  lastWeekly: string;
}

export interface CaughtFishRuntime extends FishSpecies {
  caughtWeight: number;
  caughtLength: number;
}

export interface FightState {
  tension: number;
  stamina: number;
  distance: number;
  brake: number;
  surging?: boolean;
  surgeTimer?: number;
  slackTicks?: number;
}

export type ServerEventBonusType =
  | 'xp_boost'
  | 'money_boost'
  | 'activity_boost'
  | 'rare_fish'
  | 'luck_boost'
  | 'all_boost';

export interface ServerEvent {
  id: string;
  title: string;
  description: string;
  bonusType: ServerEventBonusType;
  locationId: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  createdByUid: string;
  createdByName?: string;
}

