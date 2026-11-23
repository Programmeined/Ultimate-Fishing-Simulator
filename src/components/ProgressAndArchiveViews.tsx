import { useState } from 'react';
import { Keyboard, KeyRound, Medal, MousePointerClick, ShieldAlert } from 'lucide-react';
import { ACHIEVEMENTS, FISH_DATA, LOCATIONS, TOURNAMENTS } from '../game/data';
import { evaluateTournament, isSpeciesConditionMatch } from '../game/rules';
import type {
  ControlMode,
  DayPhase,
  DifficultyMode,
  FishCategory,
  GameState,
  MissionItem,
  WeatherType,
} from '../game/types';

/* =========================================================
   MISSIONEN
========================================================= */

interface MissionsViewProps {
  gameState: GameState;
  onClaimMission: (kind: 'daily' | 'weekly', index: number) => void;
}

export function MissionsView({ gameState, onClaimMission }: MissionsViewProps) {
  const renderList = (list: MissionItem[], kind: 'daily' | 'weekly') => (
    <div className="divide-y divide-[rgba(208,232,220,0.1)]">
      {list.map((m, idx) => {
        const pct = Math.min(100, (m.progress / m.target) * 100);
        return (
          <div key={m.id} className="py-3.5 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="text-sm font-semibold text-[#edf3ed]">{m.name}</div>
              <div className="text-xs text-[#9eb2a8]">{m.description}</div>
              <div className="h-2 w-full rounded-full bg-[#0a1314] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#759b6e] to-[#c1d49a] transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs text-[#9eb2a8] font-mono-num">
                {m.progress}/{m.target} · Belohnung {m.reward} € · {m.xp} XP
              </div>
            </div>

            <div className="shrink-0">
              {m.claimed ? (
                <span className="text-xs font-medium text-[#8fb886]">Erledigt</span>
              ) : m.completed ? (
                <button
                  type="button"
                  onClick={() => onClaimMission(kind, idx)}
                  className="px-3.5 py-2 rounded-lg bg-[#e5bd70] hover:bg-[#efd08f] text-[#171208] text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  Abholen
                </button>
              ) : (
                <span className="text-xs text-[#7c9087]">Aktiv</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed]">Missionen</h1>
        <p className="text-sm text-[#9eb2a8]">
          Schließe tägliche und wöchentliche Aufgaben ab, um zusätzliches Geld und XP zu verdienen.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5">
          <h2 className="text-base font-semibold text-[#edf3ed] mb-2">Tägliche Aufgaben</h2>
          {renderList(gameState.missions, 'daily')}
        </section>

        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5">
          <h2 className="text-base font-semibold text-[#edf3ed] mb-2">Wochenaufgaben</h2>
          {renderList(gameState.weekly, 'weekly')}
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   FANGBUCH
========================================================= */

interface LogbookViewProps {
  gameState: GameState;
  onOpenAchievements?: () => void;
}

export function LogbookView({ gameState, onOpenAchievements }: LogbookViewProps) {
  const distinctSpecies = new Set(gameState.catches.map((c) => c.name)).size;
  const unlockedIds = new Set((gameState.achievements || []).map((a) => a.id));
  const unlockedAchievements = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed]">
          Persönliches Fangbuch
        </h1>
        <p className="text-sm text-[#9eb2a8]">Übersicht aller gelandeten Fische und Fangstatistik.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-4">
          <div className="text-xs text-[#9eb2a8]">Gesamtfänge</div>
          <div id="totalCatches" className="font-mono-num text-2xl font-bold text-[#edf3ed] mt-1">
            {gameState.totalCaught}
          </div>
        </div>
        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-4">
          <div className="text-xs text-[#9eb2a8]">Gesamtgewicht</div>
          <div id="totalWeight" className="font-mono-num text-2xl font-bold text-[#edf3ed] mt-1">
            {gameState.totalWeight.toFixed(1)} kg
          </div>
        </div>
        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-4">
          <div className="text-xs text-[#9eb2a8]">Arten entdeckt</div>
          <div id="speciesCount" className="font-mono-num text-2xl font-bold text-[#edf3ed] mt-1">
            {distinctSpecies} / {FISH_DATA.length}
          </div>
        </div>
      </div>

      <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-[#e5bd70]" />
            <h2 className="text-sm font-semibold text-[#edf3ed]">
              Freigeschaltete Medaillen ({unlockedAchievements.length} / {ACHIEVEMENTS.length})
            </h2>
          </div>
          {onOpenAchievements && (
            <button
              type="button"
              data-testid="logbook-open-achievements"
              onClick={onOpenAchievements}
              className="px-3 py-1.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-xs font-semibold text-[#e5bd70] border border-[rgba(208,232,220,0.16)] whitespace-nowrap cursor-pointer transition-colors"
            >
              Alle Errungenschaften ansehen
            </button>
          )}
        </div>
        {unlockedAchievements.length === 0 ? (
          <p className="text-xs text-[#82958c]">
            Noch keine Medaille freigeschaltet. Lande deinen ersten Fisch für „Erster Fang“!
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {unlockedAchievements.map((a) => (
              <li
                key={a.id}
                className="rounded-lg bg-[#162728] border border-[rgba(229,189,112,0.22)] px-3 py-2 flex items-center justify-between gap-2 text-xs"
              >
                <span className="font-semibold text-[#edf3ed] truncate">{a.title}</span>
                <span className="text-[#e5bd70] shrink-0">{a.tier}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5">
        <h2 className="text-base font-semibold text-[#edf3ed] mb-3">Letzte Fänge</h2>
        {gameState.catches.length === 0 ? (
          <div className="text-sm text-[#82958c] py-6">
            Noch keine Fische gefangen. Wirf deine Angel aus!
          </div>
        ) : (
          <div id="catchList" className="space-y-2.5">
            {gameState.catches.slice(0, 60).map((f) => (
              <div
                key={f.id}
                className="rounded-lg bg-[#192c2d] border border-[rgba(208,232,220,0.1)] px-4 py-3 flex items-center justify-between gap-4 text-sm"
              >
                <div>
                  <div className="font-semibold text-[#edf3ed]">{f.name}</div>
                  <div className="text-xs text-[#9eb2a8]">
                    {f.location} · {f.date}
                  </div>
                  <div className="text-xs text-[#7c9087]">
                    {f.bait} · {f.rod}
                  </div>
                </div>
                <div className="text-right font-mono-num shrink-0">
                  <div className="font-semibold text-[#edf3ed]">{f.weight.toFixed(2)} kg</div>
                  <div className="text-xs text-[#9eb2a8]">{f.length.toFixed(1)} cm</div>
                  {f.released && <div className="text-[11px] text-[#8fb886]">Zurückgesetzt</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================================================
   REKORDE
========================================================= */

export function RecordsView({ gameState }: { gameState: GameState }) {
  const cards = [
    { title: 'Schwerster Fisch', fish: gameState.records.heaviest, field: 'weight' as const, unit: 'kg' },
    { title: 'Längster Fisch', fish: gameState.records.longest, field: 'length' as const, unit: 'cm' },
    { title: 'Größter Karpfen', fish: gameState.records.carp, field: 'weight' as const, unit: 'kg' },
    { title: 'Längster Hecht', fish: gameState.records.pike, field: 'length' as const, unit: 'cm' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed]">
          Rekorde und Trophäen
        </h1>
        <p className="text-sm text-[#9eb2a8]">Deine persönlichen Bestleistungen aus allen Gewässern.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((r) => (
          <article
            key={r.title}
            className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-2"
          >
            <div className="text-xs text-[#9eb2a8]">Persönlicher Rekord</div>
            <h2 className="text-base font-semibold text-[#edf3ed]">{r.title}</h2>
            {r.fish ? (
              <div className="pt-1">
                <div className="font-mono-num text-2xl font-bold text-[#e5bd70]">
                  {r.fish[r.field]} {r.unit}
                </div>
                <div className="text-sm font-semibold text-[#edf3ed] mt-1">{r.fish.name}</div>
                <div className="text-xs text-[#9eb2a8]">{r.fish.location}</div>
              </div>
            ) : (
              <div className="text-sm text-[#7c9087] pt-2">Noch kein Rekord vorhanden.</div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   FISCHLEXIKON
========================================================= */

const DEPTH_LABELS: Record<'shallow' | 'mid' | 'deep', string> = {
  shallow: 'Flach',
  mid: 'Mittel',
  deep: 'Tief',
};

interface EncyclopediaViewProps {
  gameState: GameState;
  weather: WeatherType;
  temperature: number;
  dayPhase: DayPhase;
}

export function EncyclopediaView({
  gameState,
  weather,
  temperature,
  dayPhase,
}: EncyclopediaViewProps) {
  const [filter, setFilter] = useState<'Alle' | 'Jetzt ideal' | 'Entdeckt' | FishCategory>('Alle');
  const discoveredNames = new Set(gameState.catches.map((c) => c.name));

  const filteredFish = FISH_DATA.filter((f) => {
    if (filter === 'Alle') return true;
    if (filter === 'Entdeckt') return discoveredNames.has(f.name);
    if (filter === 'Jetzt ideal') {
      const match = isSpeciesConditionMatch(f, dayPhase, weather, temperature);
      return match.weatherMatch && match.tempMatch;
    }
    return f.type === filter;
  });

  const filters: Array<'Alle' | 'Jetzt ideal' | 'Entdeckt' | FishCategory> = [
    'Alle',
    'Jetzt ideal',
    'Entdeckt',
    'Friedfisch',
    'Raubfisch',
    'Weitere',
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed]">
            Fischlexikon
          </h1>
          <p className="text-sm text-[#9eb2a8]">
            Wann &amp; wo du welchen Fisch fängst: Wetter, Temperatur, Tageszeit, Tiefe und Köder aller {FISH_DATA.length} Arten.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.12)]">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              data-testid={`lexicon-filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                filter === f
                  ? 'bg-[#25403e] text-[#edf3ed]'
                  : 'text-[#9eb2a8] hover:text-[#edf3ed]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Live Bedingungen als Vergleich */}
      <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#cbd8d1]">
        <span>
          Aktuelle Bedingungen:{' '}
          <strong className="text-[#e5bd70]">{dayPhase}</strong> ·{' '}
          <strong className="text-[#edf3ed]">{weather}</strong> ·{' '}
          <strong className="font-mono-num text-[#edf3ed]">{temperature} °C</strong>
        </span>
        <span className="text-[#8fb886]">
          Passendes Wetter &amp; Temperatur erhöhen die Bisschance deutlich.
        </span>
      </div>

      {filteredFish.length === 0 ? (
        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-8 text-sm text-[#82958c]">
          Keine Fischarten in dieser Kategorie gefunden.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFish.map((f) => {
            const discovered = discoveredNames.has(f.name);
            const match = isSpeciesConditionMatch(f, dayPhase, weather, temperature);
            const locationNames = LOCATIONS.filter((l) => l.fish.includes(f.name)).map((l) => l.name);
            return (
              <article
                key={f.name}
                data-testid={`lexicon-card-${f.name}`}
                className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#9eb2a8]">{f.type}</span>
                  <div className="flex items-center gap-2">
                    {match.idealNow ? (
                      <span className="text-[#e5bd70] font-semibold">Jetzt ideal</span>
                    ) : match.weatherMatch && match.tempMatch ? (
                      <span className="text-[#8fb886] font-semibold">Gutes Wetter</span>
                    ) : null}
                    <span className={discovered ? 'text-[#8fb886] font-semibold' : 'text-[#7c9087]'}>
                      {discovered ? 'Entdeckt' : 'Unentdeckt'}
                    </span>
                  </div>
                </div>
                <h2 className="font-display text-xl font-semibold text-[#edf3ed]">{f.name}</h2>
                <p className="text-xs text-[#9eb2a8]">{f.habitat}</p>
                <div className="pt-2 border-t border-[rgba(208,232,220,0.1)] space-y-1 text-xs text-[#b5c7be]">
                  <div className="font-mono-num">
                    Größe: {f.length[0]}–{f.length[1]} cm · Gewicht: {f.weight[0]}–{f.weight[1]} kg
                  </div>
                  <div>
                    <span className="text-[#8ea59b]">Wetter:</span>{' '}
                    <span className={match.weatherMatch ? 'text-[#8fb886] font-semibold' : 'text-[#edf3ed]'}>
                      {f.preferredWeather.join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8ea59b]">Temperatur:</span>{' '}
                    <span className={`font-mono-num ${match.tempMatch ? 'text-[#8fb886] font-semibold' : 'text-[#edf3ed]'}`}>
                      {f.tempRange[0]}–{f.tempRange[1]} °C
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8ea59b]">Tageszeit:</span>{' '}
                    <span className={match.timeMatch ? 'text-[#e5bd70] font-semibold' : 'text-[#edf3ed]'}>
                      {f.times.join(', ')}
                    </span>{' '}
                    · Tiefe: {f.depth.map((d) => DEPTH_LABELS[d]).join(', ')}
                  </div>
                  <div>
                    <span className="text-[#8ea59b]">Köder:</span> {f.baits.join(', ')}
                  </div>
                  <div>
                    <span className="text-[#8ea59b]">Gewässer:</span> {locationNames.join(', ')}
                  </div>
                  <div>
                    <span className="text-[#8ea59b]">Seltenheit:</span> {'★'.repeat(Math.min(5, f.rarity))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TURNIERE
========================================================= */

interface TournamentsViewProps {
  gameState: GameState;
  onInspectTournament: (id: 'heavy' | 'carpCup' | 'speciesCup' | 'deepSeaCup') => void;
}

export function TournamentsView({ gameState, onInspectTournament }: TournamentsViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed]">Turniere</h1>
        <p className="text-sm text-[#9eb2a8]">
          Miss deine Fänge an den Turnierzielen und sichere dir Preisgelder.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TOURNAMENTS.map((t) => {
          const evalResult = evaluateTournament(t.id, gameState.catches);
          const claimed = gameState.claimedTournaments.includes(t.id);

          return (
            <article
              key={t.id}
              className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="text-xs text-[#9eb2a8]">
                  Angelwettbewerb · Preisgeld {t.reward} €
                </div>
                <h2 className="font-display text-xl font-semibold text-[#edf3ed]">{t.name}</h2>
                <p className="text-sm text-[#b5c7be]">{t.description}</p>
                <div className="text-xs text-[#9eb2a8] pt-1 space-y-1">
                  <div>Regel: {t.requirement}</div>
                  <div className="font-mono-num text-[#e5bd70]">
                    Dein Bestwert: {evalResult.score} / {t.targetValue} {t.unit}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onInspectTournament(t.id)}
                className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  claimed
                    ? 'bg-[#1a2f2e] text-[#8fb886] border border-[rgba(143,184,134,0.3)]'
                    : evalResult.qualified
                    ? 'bg-[#e5bd70] hover:bg-[#efd08f] text-[#171208] font-bold'
                    : 'bg-[#25403e] hover:bg-[#325451] text-[#edf3ed]'
                }`}
              >
                {claimed
                  ? 'Abgeschlossen'
                  : evalResult.qualified
                  ? 'Preisgeld abholen'
                  : 'Ergebnis prüfen'}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   EINSTELLUNGEN
========================================================= */

interface SettingsViewProps {
  gameState: GameState;
  onSaveNow: () => void;
  onRequestReset: () => void;
  onChangeVolume: (vol: number) => void;
  onToggleMute: () => void;
  onChangeControlMode: (mode: ControlMode) => void;
  onChangeDifficulty: (mode: DifficultyMode) => void;
  onOpenCodeModal: () => void;
  onRequestExitAdmin: () => void;
}

export function SettingsView({
  gameState,
  onSaveNow,
  onRequestReset,
  onChangeVolume,
  onToggleMute,
  onChangeControlMode,
  onChangeDifficulty,
  onOpenCodeModal,
  onRequestExitAdmin,
}: SettingsViewProps) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed]">
          Einstellungen und Spielstand
        </h1>
        <p className="text-sm text-[#9eb2a8]">
          Wähle deine bevorzugte Angelsteuerung und verwalte Speicherstand sowie Audioeffekte.
        </p>
      </div>

      {/* Steuerungsmodus */}
      <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[#edf3ed]">Steuerungsmodus</h2>
          <p className="text-sm text-[#9eb2a8] mt-1">
            Lege fest, ob du direkt durch Tippen auf den Bildschirm oder mit der Tastatur angelst.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Steuerungsmodus wählen"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <button
            type="button"
            role="radio"
            aria-checked={gameState.controlMode === 'tap'}
            data-testid="control-mode-tap"
            onClick={() => onChangeControlMode('tap')}
            className={`text-left rounded-xl p-4 border transition-colors cursor-pointer space-y-1.5 ${
              gameState.controlMode === 'tap'
                ? 'bg-[#213837] border-[#8fb886]'
                : 'bg-[#0f1c1d] border-[rgba(208,232,220,0.14)] hover:border-[rgba(208,232,220,0.28)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#edf3ed]">
                <MousePointerClick className="w-4 h-4 text-[#e5bd70]" />
                Bildschirm-Tippen
              </span>
              {gameState.controlMode === 'tap' && (
                <span className="text-[11px] font-semibold text-[#8fb886]">Aktiv</span>
              )}
            </div>
            <p className="text-xs text-[#9eb2a8] leading-relaxed">
              Ohne Tastatur: Tippe direkt auf die Wasserfläche zum Auswerfen, Anschlagen, Kurbeln und Landen.
            </p>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={gameState.controlMode === 'keyboard'}
            data-testid="control-mode-keyboard"
            onClick={() => onChangeControlMode('keyboard')}
            className={`text-left rounded-xl p-4 border transition-colors cursor-pointer space-y-1.5 ${
              gameState.controlMode === 'keyboard'
                ? 'bg-[#213837] border-[#8fb886]'
                : 'bg-[#0f1c1d] border-[rgba(208,232,220,0.14)] hover:border-[rgba(208,232,220,0.28)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#edf3ed]">
                <Keyboard className="w-4 h-4 text-[#e5bd70]" />
                Tastatur
              </span>
              {gameState.controlMode === 'keyboard' && (
                <span className="text-[11px] font-semibold text-[#8fb886]">Aktiv</span>
              )}
            </div>
            <p className="text-xs text-[#9eb2a8] leading-relaxed">
              Leertaste: Auswerfen / Anschlagen / Kurbeln · Enter: Landen · A/D oder Pfeile: Bremse · W/S: Wurfweite · E: Einholen.
            </p>
          </button>
        </div>
      </section>

      {/* Schwierigkeitsgrad */}
      <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[#edf3ed] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#e5bd70]" />
            <span>Schwierigkeitsgrad</span>
          </h2>
          <p className="text-sm text-[#9eb2a8] mt-1">
            Im Modus „Schwer“ starten Fische heftige Fluchten, schlaffe Schnur führt zum Hakenverlust und Bisse verlangen schnellere Reflexe.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Schwierigkeitsgrad wählen"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <button
            type="button"
            role="radio"
            aria-checked={gameState.difficultyMode === 'schwer'}
            data-testid="difficulty-schwer"
            onClick={() => onChangeDifficulty('schwer')}
            className={`text-left rounded-xl p-4 border transition-colors cursor-pointer space-y-1 ${
              gameState.difficultyMode === 'schwer'
                ? 'bg-[#213837] border-[#e5bd70]'
                : 'bg-[#0f1c1d] border-[rgba(208,232,220,0.14)] hover:border-[rgba(208,232,220,0.28)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#edf3ed]">Schwer (Realistisch)</span>
              {gameState.difficultyMode === 'schwer' && (
                <span className="text-[11px] font-semibold text-[#e5bd70]">Aktiv</span>
              )}
            </div>
            <p className="text-xs text-[#9eb2a8]">
              Starke Strömung, häufige Fischfluchten, kurzes Bissfenster und Risiko durch schlaffe Schnur.
            </p>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={gameState.difficultyMode === 'standard'}
            data-testid="difficulty-standard"
            onClick={() => onChangeDifficulty('standard')}
            className={`text-left rounded-xl p-4 border transition-colors cursor-pointer space-y-1 ${
              gameState.difficultyMode === 'standard'
                ? 'bg-[#213837] border-[#8fb886]'
                : 'bg-[#0f1c1d] border-[rgba(208,232,220,0.14)] hover:border-[rgba(208,232,220,0.28)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#edf3ed]">Standard</span>
              {gameState.difficultyMode === 'standard' && (
                <span className="text-[11px] font-semibold text-[#8fb886]">Aktiv</span>
              )}
            </div>
            <p className="text-xs text-[#9eb2a8]">
              Ausgewogene Drill-Physik und längere Reaktionszeit beim Anschlagen.
            </p>
          </button>
        </div>
      </section>

      <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#edf3ed]">Spielverwaltung</h2>
          <p className="text-sm text-[#9eb2a8] mt-1">
            Dein Fortschritt wird automatisch im Browser gespeichert.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            id="saveButton"
            onClick={onSaveNow}
            className="px-4 py-2.5 rounded-lg bg-[#8fb886] hover:bg-[#a1c998] text-[#09140d] font-bold text-sm whitespace-nowrap cursor-pointer"
          >
            Jetzt speichern
          </button>
          <button
            type="button"
            id="resetButton"
            onClick={onRequestReset}
            className="px-4 py-2.5 rounded-lg bg-[#733e38] hover:bg-[#8b4a43] text-[#f7ecea] font-semibold text-sm whitespace-nowrap cursor-pointer"
          >
            Spielstand zurücksetzen
          </button>
        </div>

        <hr className="border-[rgba(208,232,220,0.12)]" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#edf3ed]">Codes &amp; Admin-Modus</h3>
            <p className="text-xs text-[#9eb2a8] mt-0.5">
              {gameState.adminMode
                ? 'Admin-Modus aktiv · Beim Verlassen verlierst du alles und startest von vorn.'
                : 'Gib einen Code ein, um besondere Vorteile freizuschalten.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {gameState.adminMode && (
              <button
                type="button"
                data-testid="settings-exit-admin-button"
                onClick={onRequestExitAdmin}
                className="px-4 py-2.5 rounded-lg bg-[#733e38] hover:bg-[#8b4a43] text-[#f7ecea] font-semibold text-sm whitespace-nowrap cursor-pointer transition-colors"
              >
                Admin-Modus verlassen
              </button>
            )}
            <button
              type="button"
              data-testid="open-code-modal-button"
              onClick={onOpenCodeModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#e5bd70] font-semibold text-sm border border-[rgba(229,189,112,0.3)] whitespace-nowrap cursor-pointer transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              <span>Code eingeben</span>
            </button>
          </div>
        </div>

        <hr className="border-[rgba(208,232,220,0.12)]" />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="soundVolume" className="text-sm font-medium text-[#edf3ed]">
              Soundlautstärke
            </label>
            <span className="font-mono-num text-sm text-[#e5bd70]">
              {gameState.muted ? 'Stumm' : `${gameState.sound} %`}
            </span>
          </div>
          <input
            id="soundVolume"
            type="range"
            min={0}
            max={100}
            value={gameState.sound}
            onChange={(e) => onChangeVolume(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-[#9eb2a8]">
              Soundeffekte werden nach deiner ersten Interaktion aktiviert.
            </p>
            <button
              type="button"
              onClick={onToggleMute}
              className="px-3 py-1.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-xs font-medium text-[#edf3ed] whitespace-nowrap cursor-pointer"
            >
              {gameState.muted ? 'Ton einschalten' : 'Stummschalten'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
