import { Compass, Eye, GraduationCap, Keyboard, MousePointerClick, Radio, Sparkles } from 'lucide-react';
import { FishingCanvas } from './FishingCanvas';
import { WeatherForecast } from './WeatherForecast';
import {
  calculateActivityLevel,
  calculateServerEventModifiers,
  canLandFish,
  formatClock,
  getDayPhase,
  getLandingReach,
  getMaxCastDistance,
  SERVER_EVENT_BONUS_INFO,
} from '../game/rules';
import type {
  CaughtFishRuntime,
  DepthOption,
  FightState,
  FishingPhase,
  GameState,
  LocationDef,
  ServerEvent,
  WeatherForecast as WeatherForecastType,
  WeatherType,
} from '../game/types';

interface FishingViewProps {
  gameState: GameState;
  location: LocationDef;
  gameTime: number;
  weather: WeatherType;
  forecast: WeatherForecastType;
  temperature: number;
  wind: number;
  eventLabel: string;
  activeServerEvents: ServerEvent[];
  phase: FishingPhase;
  castDistance: number;
  depth: DepthOption;
  fightState: FightState;
  hookedFish: CaughtFishRuntime | null;
  statusText: string;
  chumSecondsLeft: number;
  onChangeRod: (rodName: string) => void;
  onChangeLine: (lineName: string) => void;
  onChangeBait: (baitName: string) => void;
  onChangeDepth: (depth: DepthOption) => void;
  onChangeCastDistance: (dist: number) => void;
  onChangeBrake: (brake: number) => void;
  onCast: () => void;
  onReelOrStrike: () => void;
  onReelPull: () => void;
  onLandFish: () => void;
  onChum: () => void;
  onCanvasTap: (relativeX: number) => void;
  onOpenScanner: () => void;
  onOpenUnderwater: () => void;
  onNavigateLocations: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
}

const WEATHER_DISPLAY: Record<WeatherType, string> = {
  Sonnig: 'Sonnig',
  Bewölkt: 'Bewölkt',
  'Leichter Regen': 'Leichter Regen',
  'Starker Regen': 'Starkregen',
  Nebel: 'Nebel',
  Windig: 'Windig',
};

export function FishingView({
  gameState,
  location,
  gameTime,
  weather,
  forecast,
  temperature,
  wind,
  eventLabel,
  activeServerEvents,
  phase,
  castDistance,
  depth,
  fightState,
  hookedFish,
  statusText,
  chumSecondsLeft,
  onChangeRod,
  onChangeLine,
  onChangeBait,
  onChangeDepth,
  onChangeCastDistance,
  onChangeBrake,
  onCast,
  onReelOrStrike,
  onReelPull,
  onLandFish,
  onChum,
  onCanvasTap,
  onOpenScanner,
  onOpenUnderwater,
  onNavigateLocations,
  onOpenSettings,
  onOpenTutorial,
}: FishingViewProps) {
  const maxDistance = getMaxCastDistance(gameState);
  const hasNetUpgrade = gameState.gear.includes('Kescher-Upgrade');
  const landingReach = getLandingReach(gameState);
  const readyToLand =
    phase === 'fight' && canLandFish(fightState.distance, fightState.stamina, hasNetUpgrade);

  const dayPhase = getDayPhase(gameTime);
  const serverMods = calculateServerEventModifiers(activeServerEvents, location.id);
  const chumBoost = chumSecondsLeft > 0 ? (gameState.gear.includes('Futterkorb-Set') ? 22 : 14) : 0;
  const activity = calculateActivityLevel(dayPhase, weather, chumBoost + serverMods.activityBonus);
  const activityLabel = activity > 70 ? 'Hoch' : activity > 42 ? 'Mittel' : 'Niedrig';
  const effectiveEventTag =
    serverMods.liveEvents.length > 0
      ? `${serverMods.liveEvents[0].title} (${SERVER_EVENT_BONUS_INFO[serverMods.liveEvents[0].bonusType].shortBadge})`
      : eventLabel;

  const availableBaits = Object.entries(gameState.baits)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({ name, count }));

  const tensionDanger = fightState.tension >= 78;

  return (
    <div className="space-y-3">
      {/* Location Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-[#9eb2a8] flex flex-wrap items-center gap-2">
            <span>{location.kind}</span>
            <span aria-hidden="true">·</span>
            <span>{dayPhase}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#e5bd70]">{'★'.repeat(location.difficulty)}</span>
            <span aria-hidden="true">·</span>
            <span id="eventTag" className="text-[#e5bd70]">
              {effectiveEventTag}
            </span>
          </div>
          <h1 id="locationTitle" className="font-display text-2xl font-semibold tracking-tight text-[#edf3ed] mt-0.5">
            {location.name}
          </h1>
          <p id="locationDescription" className="text-xs sm:text-sm text-[#9eb2a8]">
            {location.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="control-mode-link"
            onClick={onOpenSettings}
            title="Steuerungsmodus in den Einstellungen wechseln"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#142425] hover:bg-[#1e3534] border border-[rgba(208,232,220,0.14)] text-xs font-medium text-[#cbd8d1] whitespace-nowrap transition-colors cursor-pointer"
          >
            {gameState.controlMode === 'tap' ? (
              <MousePointerClick className="w-3.5 h-3.5 text-[#e5bd70]" />
            ) : (
              <Keyboard className="w-3.5 h-3.5 text-[#e5bd70]" />
            )}
            <span>Steuerung: {gameState.controlMode === 'tap' ? 'Tippen' : 'Tastatur'}</span>
          </button>

          <button
            type="button"
            data-testid="open-tutorial-btn"
            onClick={onOpenTutorial}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#142425] hover:bg-[#1e3534] border border-[rgba(208,232,220,0.14)] text-xs font-medium text-[#cbd8d1] whitespace-nowrap transition-colors cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#e5bd70]" />
            <span>Tutorial</span>
          </button>

          <button
            type="button"
            onClick={onNavigateLocations}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#192d2e] hover:bg-[#233d3e] border border-[rgba(208,232,220,0.16)] text-xs font-medium text-[#edf3ed] whitespace-nowrap transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#8fb886]" />
            <span>Gebiet wechseln</span>
          </button>
        </div>
      </div>

      {/* Live Canvas2D Viewport */}
      <FishingCanvas
        location={location}
        gameTime={gameTime}
        weather={weather}
        phase={phase}
        castDistance={castDistance}
        maxDistance={maxDistance}
        fightDistance={fightState.distance}
        tension={fightState.tension}
        depth={depth}
        controlMode={gameState.controlMode}
        readyToLand={readyToLand}
        surging={Boolean(fightState.surging)}
        onStrikeClick={onReelOrStrike}
        onLandClick={onLandFish}
        onCanvasTap={onCanvasTap}
      />

      {/* 4-Column Environment Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] px-3.5 py-2.5">
          <div className="text-xs text-[#9eb2a8] flex items-center justify-between gap-1">
            <span>Uhrzeit</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8fb886]">
              Echtzeit
            </span>
          </div>
          <div id="clock" className="font-mono-num text-base font-semibold text-[#edf3ed]">
            {formatClock(gameTime, true)}
          </div>
        </div>
        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] px-3.5 py-2.5">
          <div className="text-xs text-[#9eb2a8]">Wetter</div>
          <div id="weather" className="text-base font-semibold text-[#edf3ed] truncate">
            {WEATHER_DISPLAY[weather]}
          </div>
        </div>
        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] px-3.5 py-2.5">
          <div className="text-xs text-[#9eb2a8]">Temperatur</div>
          <div id="temperature" className="font-mono-num text-base font-semibold text-[#edf3ed]">
            {temperature} °C
          </div>
        </div>
        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] px-3.5 py-2.5">
          <div className="text-xs text-[#9eb2a8]">Wind</div>
          <div id="wind" className="font-mono-num text-base font-semibold text-[#edf3ed]">
            {wind} km/h
          </div>
        </div>
      </div>

      {/* 30-Minute In-Game Weather Forecast */}
      <WeatherForecast gameTime={gameTime} forecast={forecast} />

      {/* 3-Column Control Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Panel 1: Prepare Rod & Cast */}
        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-3.5 flex flex-col justify-between gap-2.5">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[#edf3ed]">Angel vorbereiten</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label htmlFor="rodSelect" className="block text-xs text-[#9eb2a8] mb-0.5">
                  Angelrute
                </label>
                <select
                  id="rodSelect"
                  value={gameState.currentRod}
                  disabled={phase !== 'idle'}
                  onChange={(e) => onChangeRod(e.target.value)}
                  className="w-full rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.16)] px-2.5 py-1.5 text-xs sm:text-sm text-[#edf3ed] disabled:opacity-50"
                >
                  {gameState.ownedRods.map((rodName) => (
                    <option key={rodName} value={rodName}>
                      {rodName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="lineSelect" className="block text-xs text-[#9eb2a8] mb-0.5">
                  Angelschnur
                </label>
                <select
                  id="lineSelect"
                  value={gameState.currentLine}
                  disabled={phase !== 'idle'}
                  onChange={(e) => onChangeLine(e.target.value)}
                  className="w-full rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.16)] px-2.5 py-1.5 text-xs sm:text-sm text-[#edf3ed] disabled:opacity-50"
                >
                  {gameState.ownedLines.map((lineName) => (
                    <option key={lineName} value={lineName}>
                      {lineName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label htmlFor="baitSelect" className="block text-xs text-[#9eb2a8] mb-0.5">
                  Köder
                </label>
                <select
                  id="baitSelect"
                  value={gameState.currentBait}
                  disabled={phase !== 'idle' || availableBaits.length === 0}
                  onChange={(e) => onChangeBait(e.target.value)}
                  className="w-full rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.16)] px-2.5 py-1.5 text-xs sm:text-sm text-[#edf3ed] disabled:opacity-50"
                >
                  {availableBaits.length === 0 ? (
                    <option value="">Kein Köder vorrätig</option>
                  ) : (
                    availableBaits.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name} ({b.count}×)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="depthSelect" className="block text-xs text-[#9eb2a8] mb-0.5">
                  Angeltiefe
                </label>
                <select
                  id="depthSelect"
                  value={depth}
                  disabled={phase !== 'idle'}
                  onChange={(e) => onChangeDepth(e.target.value as DepthOption)}
                  className="w-full rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.16)] px-2.5 py-1.5 text-xs sm:text-sm text-[#edf3ed] disabled:opacity-50"
                >
                  <option value="shallow">Flach (0,5–1 m)</option>
                  <option value="mid">Mittel (1–3 m)</option>
                  <option value="deep">Tief (3–7 m)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="distanceInput" className="text-[#9eb2a8]">
                  Wurfweite
                </label>
                <span id="distanceValue" className="font-mono-num font-semibold text-[#edf3ed]">
                  {castDistance} m
                </span>
              </div>
              <input
                id="distanceInput"
                type="range"
                min={10}
                max={maxDistance}
                value={Math.min(castDistance, maxDistance)}
                disabled={phase !== 'idle'}
                onChange={(e) => onChangeCastDistance(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-[#7c9087] font-mono-num mt-1">
                <span>10 m</span>
                <span>{maxDistance} m</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              id="castButton"
              disabled={phase !== 'idle' || availableBaits.length === 0}
              onClick={onCast}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#8fb886] hover:bg-[#a1c998] text-[#09140d] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer transition-colors"
            >
              Auswerfen
            </button>
            <button
              type="button"
              id="reelButton"
              disabled={phase !== 'waiting' && phase !== 'bite'}
              onClick={onReelOrStrike}
              className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm border whitespace-nowrap transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                phase === 'bite'
                  ? 'bg-[#e5bd70] hover:bg-[#efd08f] text-[#171208] border-[#f4dc9c]'
                  : 'bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] border-[rgba(208,232,220,0.18)]'
              }`}
            >
              {phase === 'bite' ? 'Anschlagen!' : 'Einholen'}
            </button>
          </div>
        </section>

        {/* Panel 2: Fight Control */}
        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-3.5 flex flex-col justify-between gap-2.5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#edf3ed]">Drill-Kontrolle</h2>
              {phase === 'fight' && hookedFish && (
                <span className="font-mono-num text-xs text-[#e5bd70]">
                  {Math.round(fightState.distance)} m entfernt
                </span>
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#9eb2a8]">Schnurspannung</span>
                <span
                  className={`font-mono-num font-semibold ${
                    tensionDanger || fightState.surging ? 'text-[#e17e70]' : 'text-[#edf3ed]'
                  }`}
                >
                  {Math.round(fightState.tension)} %{' '}
                  {fightState.surging
                    ? '· FLUCHT!'
                    : tensionDanger
                    ? '· KRITISCH'
                    : (fightState.slackTicks ?? 0) >= 8
                    ? '· SCHLAFF!'
                    : ''}
                </span>
              </div>
              <div className="relative h-2.5 w-full rounded-full bg-[#091213] border border-[rgba(208,232,220,0.1)] overflow-hidden">
                <div
                  id="tensionBar"
                  className={`h-full transition-all duration-150 ${
                    tensionDanger
                      ? 'bg-gradient-to-r from-[#d59b58] to-[#e17e70]'
                      : 'bg-gradient-to-r from-[#8fb886] to-[#e5bd70]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, fightState.tension))}%` }}
                />
                <div
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 left-[80%] w-px bg-[rgba(225,126,112,0.55)]"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#9eb2a8]">Fisch-Ausdauer</span>
                <span className="font-mono-num font-semibold text-[#edf3ed]">
                  {Math.round(fightState.stamina)} %
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#091213] border border-[rgba(208,232,220,0.1)] overflow-hidden">
                <div
                  id="staminaBar"
                  className="h-full bg-gradient-to-r from-[#5e8e5d] to-[#8fb886] transition-all duration-150"
                  style={{ width: `${Math.min(100, Math.max(0, fightState.stamina))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="brakeInput" className="text-[#9eb2a8]">
                  Bremskraft
                </label>
                <span id="brakeValue" className="font-mono-num font-semibold text-[#edf3ed]">
                  {fightState.brake} %
                </span>
              </div>
              <input
                id="brakeInput"
                type="range"
                min={10}
                max={90}
                value={fightState.brake}
                onChange={(e) => onChangeBrake(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <p id="fishingStatus" className="text-xs text-[#b5c7be] leading-relaxed min-h-[2rem]">
              {statusText}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              id="reelInButton"
              disabled={phase !== 'fight'}
              onClick={onReelPull}
              className="flex-1 px-4 py-2 rounded-lg bg-[#25403e] hover:bg-[#325451] text-[#edf3ed] font-semibold text-sm border border-[rgba(208,232,220,0.18)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer transition-colors"
            >
              Kurbeln
            </button>
            <button
              type="button"
              id="releaseButton"
              disabled={!readyToLand}
              onClick={onLandFish}
              title={`Landen möglich ab ${landingReach} m oder bei ermüdetem Fisch`}
              className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                readyToLand
                  ? 'bg-[#e5bd70] hover:bg-[#efd08f] text-[#171208]'
                  : 'bg-[#1a2e2e] text-[#9eb2a8] border border-[rgba(208,232,220,0.12)]'
              }`}
            >
              Fisch landen
            </button>
          </div>
        </section>

        {/* Panel 3: Spot Analysis */}
        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-3.5 flex flex-col justify-between gap-2.5">
          <div className="space-y-2.5">
            <h2 className="text-sm font-semibold text-[#edf3ed]">Angelplatz-Analyse</h2>
            <p id="analysisText" className="text-xs text-[#9eb2a8] leading-relaxed">
              Tiefe: {location.depth} m · Boden: {location.bottom} · Pflanzen: {location.plants} · Gewässer: {location.kind}.
            </p>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#9eb2a8]">Fischaktivität</span>
                <span id="activityText" className="font-semibold text-[#edf3ed]">
                  {activityLabel} ({activity}%)
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#091213] border border-[rgba(208,232,220,0.1)] overflow-hidden">
                <div
                  id="activityBar"
                  className="h-full bg-gradient-to-r from-[#759b6e] to-[#c1d49a] transition-all duration-300"
                  style={{ width: `${activity}%` }}
                />
              </div>
            </div>

            <div className="text-xs text-[#9eb2a8] pt-0.5">
              Zielfische: <span className="text-[#d6e2dc]">{location.fish.slice(0, 4).join(', ')}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              id="chumButton"
              disabled={chumSecondsLeft > 0}
              onClick={onChum}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1d332d] hover:bg-[#27463d] text-[#d6e2dc] text-xs font-semibold border border-[rgba(143,184,134,0.28)] disabled:opacity-65 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8fb886]" />
              <span>
                {chumSecondsLeft > 0
                  ? `Futterteppich aktiv (${chumSecondsLeft} s)`
                  : gameState.adminMode
                  ? 'Anfüttern (Gratis)'
                  : 'Anfüttern (15 €)'}
              </span>
            </button>
            <button
              type="button"
              id="scannerButton"
              onClick={onOpenScanner}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1e3534] hover:bg-[#294645] text-[#edf3ed] text-sm font-medium border border-[rgba(208,232,220,0.18)] whitespace-nowrap cursor-pointer transition-colors"
            >
              <Radio className="w-4 h-4 text-[#8fb886]" />
              <span>Echolot scannen</span>
            </button>
            <button
              type="button"
              id="underwaterButton"
              onClick={onOpenUnderwater}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1e3534] hover:bg-[#294645] text-[#edf3ed] text-sm font-medium border border-[rgba(208,232,220,0.18)] whitespace-nowrap cursor-pointer transition-colors"
            >
              <Eye className="w-4 h-4 text-[#e5bd70]" />
              <span>Unterwasserblick</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
