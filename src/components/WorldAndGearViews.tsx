import { BAITS, LINES, LOCATIONS, RODS, SHOP_ITEMS } from '../game/data';
import { getLineByName, getMaxCastDistance, getRodByName, isLocationUnlocked } from '../game/rules';
import type { GameState } from '../game/types';

interface LocationsViewProps {
  gameState: GameState;
  onSelectLocation: (id: string) => void;
}

const BIOME_GRADIENTS: Record<string, string> = {
  waldsee: 'from-[#284b44] via-[#1b3935] to-[#112423]',
  karpfensee: 'from-[#3a523e] via-[#243d32] to-[#122421]',
  forellenfluss: 'from-[#35565e] via-[#1f3d44] to-[#11262a]',
  bergsee: 'from-[#3d5f6f] via-[#213e4b] to-[#102229]',
  moorsee: 'from-[#34433a] via-[#1d2b26] to-[#0f1918]',
  strom: 'from-[#314f56] via-[#1c383e] to-[#0f2125]',
  kueste: 'from-[#3e5b68] via-[#213e4c] to-[#10222c]',
  hochsee: 'from-[#294964] via-[#163046] to-[#0a1926]',
};

export function LocationsView({ gameState, onSelectLocation }: LocationsViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed]">
          Angelgebiete
        </h1>
        <p className="text-sm text-[#9eb2a8]">
          Erkunde unterschiedliche Gewässer, Tiefenstrukturen und ihre Fischbestände.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {LOCATIONS.map((loc) => {
          const unlocked = isLocationUnlocked(gameState, loc);
          const isCurrent = gameState.location === loc.id;
          const biomeGrad = BIOME_GRADIENTS[loc.id] ?? 'from-[#284b44] via-[#1b3935] to-[#112423]';

          return (
            <article
              key={loc.id}
              className={`rounded-xl panel-surface border overflow-hidden flex flex-col justify-between transition-colors ${
                isCurrent
                  ? 'border-[rgba(143,184,134,0.48)]'
                  : 'border-[rgba(208,232,220,0.16)]'
              }`}
            >
              <div>
                <div className={`h-14 w-full bg-gradient-to-b ${biomeGrad} relative border-b border-[rgba(208,232,220,0.1)] px-5 flex items-end pb-2 justify-between`}>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-[#dcebe2]/85 font-semibold">
                    {loc.kind}
                  </span>
                  <span className="text-xs text-[#e5bd70]">{'★'.repeat(loc.difficulty)}</span>
                </div>

                <div className="p-5 pb-0 space-y-2">
                  <div className="text-xs text-[#9eb2a8] flex flex-wrap items-center gap-2">
                    <span className="font-mono-num">Tiefe {loc.depth} m</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">Ab Level {loc.level}</span>
                  </div>
                  <h2 className="font-display text-xl font-semibold text-[#edf3ed]">{loc.name}</h2>
                  <p className="text-sm text-[#b5c7be]">{loc.description}</p>
                  <div className="text-xs text-[#9eb2a8] pt-1 space-y-1">
                    <div>
                      Untergrund: {loc.bottom} · Strömung:{' '}
                      {loc.currentStrength >= 1.8
                        ? 'Stark'
                        : loc.currentStrength >= 0.8
                        ? 'Mittel'
                        : 'Ruhig'}
                    </div>
                    <div>Fische: {loc.fish.join(', ')}</div>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-4">
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelectLocation(loc.id)}
                  aria-label={`${loc.name} auswählen`}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'bg-[#8fb886] text-[#09140d] font-bold cursor-default'
                      : unlocked
                      ? 'bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] border border-[rgba(208,232,220,0.18)] cursor-pointer'
                      : 'bg-[#0e191a] text-[#6d8178] border border-[rgba(208,232,220,0.08)] cursor-not-allowed'
                  }`}
                >
                  {isCurrent
                    ? 'Aktueller Platz'
                    : unlocked
                    ? 'Angelplatz wählen'
                    : `Gesperrt (ab Level ${loc.level})`}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

interface EquipmentViewProps {
  gameState: GameState;
  onSelectRod: (rodName: string) => void;
  onSelectLine: (lineName: string) => void;
  onSelectBait: (baitName: string) => void;
}

export function EquipmentView({
  gameState,
  onSelectRod,
  onSelectLine,
  onSelectBait,
}: EquipmentViewProps) {
  const rod = getRodByName(gameState.currentRod);
  const line = getLineByName(gameState.currentLine);
  const maxCast = getMaxCastDistance(gameState);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed]">
          Meine Ausrüstung
        </h1>
        <p className="text-sm text-[#9eb2a8]">
          Aktives Setup für deine nächste Session am Gewässer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-3">
          <div className="text-xs text-[#9eb2a8]">Aktuelle Angelrute</div>
          <h2 className="font-display text-xl font-semibold text-[#edf3ed]">{rod.name}</h2>
          <p className="text-sm text-[#b5c7be] font-mono-num">Tragkraft-Index: {rod.power}</p>

          <div className="pt-2 border-t border-[rgba(208,232,220,0.1)] space-y-1.5">
            <div className="text-xs text-[#9eb2a8]">Ruten im Besitz ({gameState.ownedRods.length})</div>
            <div className="flex flex-wrap gap-2">
              {gameState.ownedRods.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onSelectRod(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    gameState.currentRod === r
                      ? 'bg-[#8fb886] text-[#09140d] font-bold'
                      : 'bg-[#1a2f2e] hover:bg-[#24403e] text-[#edf3ed] border border-[rgba(208,232,220,0.14)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-3">
          <div className="text-xs text-[#9eb2a8]">Aktueller Köder</div>
          <h2 className="font-display text-xl font-semibold text-[#edf3ed]">{gameState.currentBait}</h2>
          <p className="text-sm text-[#b5c7be] font-mono-num">
            Vorrat: {gameState.baits[gameState.currentBait] || 0} Stück
          </p>

          <div className="pt-2 border-t border-[rgba(208,232,220,0.1)] space-y-1.5">
            <div className="text-xs text-[#9eb2a8]">Vorrätige Köder</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(gameState.baits)
                .filter(([, count]) => count > 0)
                .map(([name, count]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onSelectBait(name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      gameState.currentBait === name
                        ? 'bg-[#e5bd70] text-[#171208] font-bold'
                        : 'bg-[#1a2f2e] hover:bg-[#24403e] text-[#edf3ed] border border-[rgba(208,232,220,0.14)]'
                    }`}
                  >
                    {name} ({count})
                  </button>
                ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-3">
          <div className="text-xs text-[#9eb2a8]">Angelschnur &amp; Reichweite</div>
          <h2 className="text-lg font-semibold text-[#edf3ed]">{line.name}</h2>
          <p className="text-xs text-[#9eb2a8]">{line.description}</p>
          <p className="text-xs text-[#b5c7be] font-mono-num">
            Bruchfestigkeit: {Math.round(line.strengthMultiplier * 100)} % · Max. Wurfweite: {maxCast} m
          </p>

          <div className="pt-2 border-t border-[rgba(208,232,220,0.1)] space-y-1.5">
            <div className="text-xs text-[#9eb2a8]">Schnüre im Besitz ({gameState.ownedLines.length})</div>
            <div className="flex flex-wrap gap-2">
              {gameState.ownedLines.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => onSelectLine(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    gameState.currentLine === l
                      ? 'bg-[#8fb886] text-[#09140d] font-bold'
                      : 'bg-[#1a2f2e] hover:bg-[#24403e] text-[#edf3ed] border border-[rgba(208,232,220,0.14)]'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-2">
          <div className="text-xs text-[#9eb2a8]">Zubehör &amp; Boote</div>
          <h2 className="text-lg font-semibold text-[#edf3ed]">
            {gameState.gear.concat(gameState.boats).join(', ')}
          </h2>
          <p className="text-sm text-[#9eb2a8]">
            Erweitere deine Ausrüstung im Shop für größere Wurfweiten, Bissanzeiger, Futterkorb und Bonus-XP.
          </p>
        </section>
      </div>
    </div>
  );
}

interface ShopViewProps {
  gameState: GameState;
  onBuyItem: (name: string) => void;
  onBuyBait: (name: string) => void;
}

export function ShopView({ gameState, onBuyItem, onBuyBait }: ShopViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed]">
            Ausrüstungsshop
          </h1>
          <p className="text-sm text-[#9eb2a8]">
            {gameState.adminMode
              ? 'Admin-Modus aktiv: Alle Ruten, Zubehörteile und Köder sind kostenlos verfügbar.'
              : 'Verbessere Ruten, Zubehör und Ködervorrat mit deinem verdienten Spielgeld.'}
          </p>
        </div>
        <div className="text-sm text-[#9eb2a8]">
          {gameState.adminMode ? (
            <span className="font-semibold text-[#8fb886]">Admin-Modus · Alles gratis</span>
          ) : (
            <>
              Verfügbar: <strong className="font-mono-num text-[#e5bd70] text-base">{gameState.money} €</strong>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Rods & Gear */}
        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5">
          <h2 className="text-base font-semibold text-[#edf3ed] mb-3">Ruten &amp; Zubehör</h2>
          <div className="divide-y divide-[rgba(208,232,220,0.1)]">
            {SHOP_ITEMS.map((item) => {
              const owned =
                (item.kind === 'rod' && gameState.ownedRods.includes(item.name)) ||
                (item.kind === 'line' && gameState.ownedLines.includes(item.name)) ||
                (item.kind === 'gear' && gameState.gear.includes(item.name)) ||
                (item.kind === 'boat' && gameState.boats.includes(item.name));
              const reqLevel =
                item.kind === 'rod'
                  ? RODS.find((r) => r.name === item.name)?.level || 1
                  : item.kind === 'line'
                  ? LINES.find((l) => l.name === item.name)?.level || 1
                  : 1;
              const levelLocked = !gameState.adminMode && gameState.level < reqLevel;
              const effectivePrice = gameState.adminMode ? 0 : item.price;
              const tooExpensive = gameState.money < effectivePrice;

              return (
                <div key={item.name} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#edf3ed]">{item.name}</div>
                    <div className="text-xs text-[#9eb2a8]">{item.effect}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono-num text-sm font-semibold text-[#e5bd70]">
                      {gameState.adminMode ? 'Gratis' : `${item.price} €`}
                    </span>
                    <button
                      type="button"
                      disabled={owned || levelLocked || tooExpensive}
                      onClick={() => onBuyItem(item.name)}
                      aria-label={`${item.name} kaufen für ${effectivePrice} Euro`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#25403e] hover:bg-[#325451] text-[#edf3ed] border border-[rgba(208,232,220,0.16)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                    >
                      {owned
                        ? 'Besitzt du'
                        : levelLocked
                        ? `Ab Level ${reqLevel}`
                        : gameState.adminMode
                        ? 'Gratis holen'
                        : 'Kaufen'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Baits */}
        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5">
          <h2 className="text-base font-semibold text-[#edf3ed] mb-3">Köder (10er-Pack)</h2>
          <div className="divide-y divide-[rgba(208,232,220,0.1)]">
            {BAITS.map((bait) => {
              const packPrice = gameState.adminMode ? 0 : bait.price * 10;
              const stock = gameState.baits[bait.name] || 0;
              const tooExpensive = gameState.money < packPrice;

              return (
                <div key={bait.name} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[#edf3ed]">{bait.name}</div>
                    <div className="text-xs text-[#9eb2a8] font-mono-num">
                      Vorrat: {stock} · Einzelpreis {gameState.adminMode ? '0' : bait.price} €
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono-num text-sm font-semibold text-[#e5bd70]">
                      {gameState.adminMode ? 'Gratis' : `${packPrice} €`}
                    </span>
                    <button
                      type="button"
                      disabled={tooExpensive}
                      onClick={() => onBuyBait(bait.name)}
                      aria-label={`10 ${bait.name} kaufen für ${packPrice} Euro`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#25403e] hover:bg-[#325451] text-[#edf3ed] border border-[rgba(208,232,220,0.16)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                    >
                      {gameState.adminMode ? '+10 gratis' : '+10 kaufen'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
