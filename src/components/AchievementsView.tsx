import { useState } from 'react';
import { ACHIEVEMENTS } from '../game/data';
import { getAchievementProgress } from '../game/rules';
import type { AchievementTier, GameState } from '../game/types';

interface AchievementsViewProps {
  gameState: GameState;
}

const TIER_STYLES: Record<
  AchievementTier,
  { disc: string; rim: string; ribbon: string; text: string; accentBorder: string }
> = {
  Bronze: {
    disc: '#b57845',
    rim: '#e0aa7a',
    ribbon: '#753f2e',
    text: 'text-[#d9a273]',
    accentBorder: 'border-[rgba(217,162,115,0.32)]',
  },
  Silber: {
    disc: '#9eb1b6',
    rim: '#dbe6e8',
    ribbon: '#385662',
    text: 'text-[#c8d8dc]',
    accentBorder: 'border-[rgba(200,216,220,0.32)]',
  },
  Gold: {
    disc: '#cf9e3d',
    rim: '#f2d388',
    ribbon: '#6f4b1a',
    text: 'text-[#e5bd70]',
    accentBorder: 'border-[rgba(229,189,112,0.38)]',
  },
  Platin: {
    disc: '#79b7ae',
    rim: '#c5ede6',
    ribbon: '#244b48',
    text: 'text-[#a3ddd3]',
    accentBorder: 'border-[rgba(163,221,211,0.4)]',
  },
};

function MedalEmblem({ tier, unlocked }: { tier: AchievementTier; unlocked: boolean }) {
  const style = TIER_STYLES[tier];
  const discColor = unlocked ? style.disc : '#1c2b2c';
  const rimColor = unlocked ? style.rim : '#384c4c';
  const ribbonColor = unlocked ? style.ribbon : '#152223';

  return (
    <svg
      viewBox="0 0 48 56"
      className={`w-11 h-13 shrink-0 ${unlocked ? '' : 'opacity-55'}`}
      aria-hidden="true"
    >
      {/* Left & Right Medal Ribbon */}
      <polygon points="14,2 22,2 24,20 17,20" fill={ribbonColor} />
      <polygon points="34,2 26,2 24,20 31,20" fill={ribbonColor} opacity="0.82" />
      <rect x="19" y="18" width="10" height="3" rx="1" fill={rimColor} />
      {/* Medal Disc */}
      <circle cx="24" cy="36" r="15" fill={discColor} stroke={rimColor} strokeWidth="2.2" />
      <circle
        cx="24"
        cy="36"
        r="10.5"
        fill="none"
        stroke={rimColor}
        strokeWidth="1"
        strokeOpacity="0.65"
      />
      {/* Center Star / Lock Indicator */}
      {unlocked ? (
        <polygon
          points="24,28.5 26.2,33.2 31.3,33.9 27.6,37.4 28.5,42.5 24,40 19.5,42.5 20.4,37.4 16.7,33.9 21.8,33.2"
          fill={rimColor}
        />
      ) : (
        <circle cx="24" cy="36" r="3.2" fill="#3b5050" />
      )}
    </svg>
  );
}

export function AchievementsView({ gameState }: AchievementsViewProps) {
  const [filter, setFilter] = useState<'Alle' | 'Freigeschaltet' | 'Offen'>('Alle');
  const unlockedMap = new Map((gameState.achievements || []).map((a) => [a.id, a.unlockedAt]));

  const unlockedDefs = ACHIEVEMENTS.filter((def) => unlockedMap.has(def.id));
  const bronzeCount = unlockedDefs.filter((d) => d.tier === 'Bronze').length;
  const silverCount = unlockedDefs.filter((d) => d.tier === 'Silber').length;
  const goldPlatinumCount = unlockedDefs.filter(
    (d) => d.tier === 'Gold' || d.tier === 'Platin'
  ).length;
  const totalPct = Math.round((unlockedDefs.length / ACHIEVEMENTS.length) * 100);

  const visibleAchievements = ACHIEVEMENTS.filter((def) => {
    const isUnlocked = unlockedMap.has(def.id);
    if (filter === 'Freigeschaltet') return isUnlocked;
    if (filter === 'Offen') return !isUnlocked;
    return true;
  }).sort((a, b) => {
    const aDone = unlockedMap.has(a.id) ? 1 : 0;
    const bDone = unlockedMap.has(b.id) ? 1 : 0;
    return bDone - aDone;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed]">
            Errungenschaften
          </h1>
          <p className="text-sm text-[#9eb2a8]">
            Sammle Bronze-, Silber-, Gold- und Platin-Medaillen für besondere Angelerfolge.
          </p>
        </div>

        <div
          role="group"
          aria-label="Errungenschaften filtern"
          className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.12)]"
        >
          {(['Alle', 'Freigeschaltet', 'Offen'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              data-testid={`achievement-filter-${tab}`}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                filter === tab
                  ? 'bg-[#25403e] text-[#edf3ed]'
                  : 'text-[#9eb2a8] hover:text-[#edf3ed]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-4 space-y-2">
          <div className="text-xs text-[#9eb2a8]">Freigeschaltete Medaillen</div>
          <div
            data-testid="achievements-unlocked-count"
            className="font-mono-num text-2xl font-bold text-[#edf3ed]"
          >
            {unlockedDefs.length} / {ACHIEVEMENTS.length}
          </div>
          <div className="h-2 w-full rounded-full bg-[#0a1314] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8fb886] to-[#e5bd70] transition-all duration-300"
              style={{ width: `${totalPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-4">
          <div className="text-xs text-[#9eb2a8]">Bronze-Medaillen</div>
          <div className="font-mono-num text-2xl font-bold text-[#d9a273] mt-1">
            {bronzeCount}
          </div>
        </div>

        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-4">
          <div className="text-xs text-[#9eb2a8]">Silber-Medaillen</div>
          <div className="font-mono-num text-2xl font-bold text-[#c8d8dc] mt-1">
            {silverCount}
          </div>
        </div>

        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-4">
          <div className="text-xs text-[#9eb2a8]">Gold &amp; Platin</div>
          <div className="font-mono-num text-2xl font-bold text-[#e5bd70] mt-1">
            {goldPlatinumCount}
          </div>
        </div>
      </div>

      {/* Medals Grid / List */}
      {visibleAchievements.length === 0 ? (
        <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-8 text-sm text-[#9eb2a8]">
          {filter === 'Freigeschaltet'
            ? 'Noch keine Medaille freigeschaltet. Wirf deine Angel aus und lande deinen ersten Fang!'
            : 'Du hast bereits alle verfügbaren Medaillen freigeschaltet!'}
        </div>
      ) : (
        <div
          data-testid="achievements-list"
          className="grid grid-cols-1 md:grid-cols-2 gap-3.5"
        >
          {visibleAchievements.map((def) => {
            const unlockedAt = unlockedMap.get(def.id);
            const isUnlocked = Boolean(unlockedAt);
            const current = Math.min(def.target, getAchievementProgress(def.id, gameState));
            const pct = Math.min(100, Math.round((current / def.target) * 100));
            const tierStyle = TIER_STYLES[def.tier];

            return (
              <article
                key={def.id}
                data-testid={`achievement-card-${def.id}`}
                data-unlocked={isUnlocked ? 'true' : 'false'}
                className={`rounded-xl panel-surface border p-4 flex items-start gap-4 transition-colors ${
                  isUnlocked ? tierStyle.accentBorder : 'border-[rgba(208,232,220,0.12)] opacity-85'
                }`}
              >
                <MedalEmblem tier={def.tier} unlocked={isUnlocked} />

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold uppercase tracking-wider ${isUnlocked ? tierStyle.text : 'text-[#7c9087]'}`}>
                        {def.tier}
                      </span>
                      <span aria-hidden="true" className="text-[#5c7069]">·</span>
                      <span className="text-[#9eb2a8]">{def.category}</span>
                    </div>
                    <span
                      className={`font-medium ${
                        isUnlocked ? 'text-[#8fb886]' : 'text-[#7c9087]'
                      }`}
                    >
                      {isUnlocked ? `Freigeschaltet · ${unlockedAt}` : 'Noch offen'}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-display text-lg font-semibold text-[#edf3ed] leading-snug">
                      {def.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#a8bab1] mt-0.5">{def.description}</p>
                  </div>

                  <div className="space-y-1 pt-0.5">
                    <div className="h-2 w-full rounded-full bg-[#0a1314] border border-[rgba(208,232,220,0.08)] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isUnlocked
                            ? 'bg-gradient-to-r from-[#8fb886] to-[#e5bd70]'
                            : 'bg-[#365350]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono-num text-[#9eb2a8]">
                      <span>
                        Fortschritt: {current} / {def.target} {def.unit}
                      </span>
                      <span>{pct} %</span>
                    </div>
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
