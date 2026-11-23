import { Sparkles } from 'lucide-react';
import { FishingCanvas } from './FishingCanvas';
import { LOCATIONS } from '../game/data';
import {
  formatEventRemainingTime,
  getLocationById,
  SERVER_EVENT_BONUS_INFO,
} from '../game/rules';
import type { GameState, ServerEvent } from '../game/types';

interface TitleScreenProps {
  gameState: GameState;
  activeServerEvents?: ServerEvent[];
  onStart: () => void;
  onOpenTutorial: () => void;
}

export function TitleScreen({
  gameState,
  activeServerEvents = [],
  onStart,
  onOpenTutorial,
}: TitleScreenProps) {
  const hasProgress = gameState.level > 1 || gameState.totalCaught > 0 || gameState.money !== 250;
  const primaryEvent = activeServerEvents[0] || null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0b1415] flex flex-col justify-between">
      {/* Live atmospheric lakeside dawn canvas */}
      <div className="absolute inset-0 pointer-events-none">
        <FishingCanvas
          location={LOCATIONS[0]}
          gameTime={6.5}
          weather="Sonnig"
          phase="idle"
          castDistance={45}
          maxDistance={80}
          fightDistance={0}
          tension={0}
          depth="mid"
          isTitleBackdrop={true}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(95deg, rgba(8, 16, 17, 0.9) 0%, rgba(10, 20, 21, 0.62) 46%, rgba(8, 16, 17, 0.16) 100%), radial-gradient(circle at 20% 50%, rgba(229, 189, 112, 0.08) 0%, rgba(8, 16, 17, 0) 55%)',
          }}
        />
      </div>

      {/* Top safe spacer */}
      <div className="relative z-10 px-8 pt-8 sm:px-14 sm:pt-12 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.24em] text-[#b4c4bc] font-medium">
          Naturgetreue Angel-Simulation
        </div>
      </div>

      {/* Left-third negative-space title emblem & primary CTA */}
      <div className="relative z-10 px-8 sm:px-14 max-w-2xl my-auto py-12">
        <svg
          viewBox="0 0 420 124"
          className="w-full max-w-[410px] h-auto mb-6 drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)]"
          role="img"
          aria-label="Ultimate Fishing Simulator"
        >
          {/* Minimalist lakeside & bobber crest */}
          <g stroke="#e5bd70" strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M4 22 H122" strokeOpacity="0.45" />
            <circle cx="140" cy="22" r="5" fill="#e5bd70" fillOpacity="0.22" />
            <path d="M140 12 V32" />
            <path d="M158 22 H260" strokeOpacity="0.45" />
          </g>
          <text
            x="2"
            y="64"
            fill="#edf3ed"
            fontFamily="Fraunces, Georgia, serif"
            fontWeight="700"
            fontSize="40"
            letterSpacing="-0.5"
          >
            Ultimate Fishing
          </text>
          <text
            x="4"
            y="102"
            fill="#e5bd70"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="700"
            fontSize="22"
            letterSpacing="6"
          >
            SIMULATOR
          </text>
        </svg>

        <p className="text-base sm:text-lg text-[#cad8d0] leading-relaxed max-w-md mb-6">
          Acht Gewässer, 32 Fischarten, Echtzeit-Uhrzeit &amp; Wetter und gefühlvoller Drill bis zum Kescher.
        </p>

        {primaryEvent && (
          <div
            data-testid="title-server-event"
            className="mb-6 max-w-md rounded-xl panel-surface border border-[rgba(229,189,112,0.45)] px-4 py-3 space-y-1"
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e5bd70] text-[#171208]">
                <Sparkles className="w-3 h-3" />
                <span>Live Server-Event</span>
              </span>
              <span className="text-[#8fb886]">
                {SERVER_EVENT_BONUS_INFO[primaryEvent.bonusType].shortBadge}
              </span>
              <span className="text-[#9eb2a8] font-mono-num">
                · Noch {formatEventRemainingTime(primaryEvent.endsAt)}
              </span>
            </div>
            <div className="text-sm font-semibold text-[#edf3ed]">{primaryEvent.title}</div>
            <div className="text-xs text-[#cbd8d1]">
              {primaryEvent.locationId === 'all'
                ? 'Alle Gewässer'
                : getLocationById(primaryEvent.locationId).name}
              {primaryEvent.description ? ` · ${primaryEvent.description}` : ''}
              {activeServerEvents.length > 1 ? ` (+${activeServerEvents.length - 1} weitere)` : ''}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="px-7 py-3.5 rounded-lg bg-[#e5bd70] hover:bg-[#edd08e] text-[#171208] font-bold text-base tracking-wide shadow-[0_10px_24px_-8px_rgba(229,189,112,0.5)] transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            {hasProgress ? `Weiter angeln (Level ${gameState.level})` : 'Angeln starten'}
          </button>
          <button
            type="button"
            data-testid="title-tutorial-button"
            onClick={onOpenTutorial}
            className="px-5 py-3.5 rounded-lg bg-[#142425]/92 hover:bg-[#1e3534] text-[#edf3ed] font-semibold text-sm border border-[rgba(208,232,220,0.26)] backdrop-blur-sm cursor-pointer whitespace-nowrap transition-colors"
          >
            Tutorial ansehen
          </button>
        </div>
      </div>

      {/* Flat borderless control hint in bottom safe margin */}
      <div className="relative z-10 px-8 pb-7 sm:px-14 flex flex-wrap items-center justify-between gap-4 text-xs text-[#a5b8ae]">
        <span>
          Leertaste / Klick: Auswerfen &amp; Kurbeln · Regler: Wurfweite &amp; Bremse · P / Esc: Pause
        </span>
        {hasProgress && (
          <span className="font-mono-num text-[#d8e3dc]">
            {gameState.totalCaught} Fänge · {gameState.money} €
          </span>
        )}
      </div>
    </div>
  );
}
