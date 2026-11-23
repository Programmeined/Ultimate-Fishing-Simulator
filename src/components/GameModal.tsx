import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, X } from 'lucide-react';
import type { CatchEntry, LocationDef } from '../game/types';

export type ActiveModal =
  | { type: 'catch'; catchEntry: CatchEntry; hasAbhakmatte: boolean }
  | { type: 'scanner'; location: LocationDef; detectedFish: string[]; hasSonar: boolean }
  | { type: 'underwater'; location: LocationDef }
  | {
      type: 'tournament';
      id: string;
      name: string;
      description: string;
      score: number;
      target: number;
      unit: string;
      reward: number;
      qualified: boolean;
      alreadyClaimed: boolean;
    }
  | { type: 'pause' }
  | { type: 'confirmReset' }
  | { type: 'confirmExitAdmin' }
  | { type: 'redeemCode' }
  | null;

interface GameModalProps {
  modal: ActiveModal;
  onClose: () => void;
  onKeepCatch: () => void;
  onReleaseCatch: () => void;
  onClaimTournament: (id: string, reward: number) => void;
  onResumeGame: () => void;
  onReturnToTitle: () => void;
  onSaveNow: () => void;
  onConfirmReset: () => void;
  onConfirmExitAdmin: () => void;
  onRedeemCode: (code: string) => { ok: boolean; message: string };
}

export function GameModal({
  modal,
  onClose,
  onKeepCatch,
  onReleaseCatch,
  onClaimTournament,
  onResumeGame,
  onReturnToTitle,
  onSaveNow,
  onConfirmReset,
  onConfirmExitAdmin,
  onRedeemCode,
}: GameModalProps) {
  const [codeValue, setCodeValue] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (modal?.type === 'redeemCode') {
      setCodeValue('');
      setCodeError(null);
    }
  }, [modal]);

  if (!modal) return null;

  const titleMap: Record<NonNullable<ActiveModal>['type'], string> = {
    catch: 'Fang erfolgreich!',
    scanner: 'Echolot-Analyse',
    underwater: 'Unterwasserkamera',
    tournament: modal.type === 'tournament' ? modal.name : 'Turnier',
    pause: 'Spiel pausiert',
    confirmReset: 'Spielstand zurücksetzen?',
    confirmExitAdmin: 'Admin-Modus verlassen?',
    redeemCode: 'Code eingeben',
  };

  const handleCodeSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = onRedeemCode(codeValue);
    if (!res.ok) {
      setCodeError(res.message);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75"
      onClick={(e) => {
        if (e.target === e.currentTarget && modal.type !== 'catch') {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-2xl panel-surface border border-[rgba(208,232,220,0.24)] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 id="modalTitle" className="font-display text-xl font-semibold text-[#edf3ed]">
            {titleMap[modal.type]}
          </h2>
          {modal.type !== 'catch' && (
            <button
              type="button"
              aria-label="Dialog schließen"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#1c302f] hover:bg-[#274341] text-[#cbd8d1] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {modal.type === 'catch' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#0d1819] border border-[rgba(208,232,220,0.16)] p-4 space-y-2 shadow-inner">
              <div className="text-xs text-[#e5bd70] uppercase tracking-wider font-semibold">
                Neuer Fang · {modal.catchEntry.type}
              </div>
              <h3 className="font-display text-2xl font-bold text-[#edf3ed]">
                {modal.catchEntry.name}
              </h3>
              <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                <div>
                  <span className="text-[#9eb2a8] block text-xs">Gewicht</span>
                  <strong className="font-mono-num text-base text-[#edf3ed]">
                    {modal.catchEntry.weight.toFixed(2)} kg
                  </strong>
                </div>
                <div>
                  <span className="text-[#9eb2a8] block text-xs">Länge</span>
                  <strong className="font-mono-num text-base text-[#edf3ed]">
                    {modal.catchEntry.length.toFixed(1)} cm
                  </strong>
                </div>
                <div>
                  <span className="text-[#9eb2a8] block text-xs">Angelgebiet</span>
                  <span className="text-[#d6e2dc]">{modal.catchEntry.location}</span>
                </div>
                <div>
                  <span className="text-[#9eb2a8] block text-xs">Köder</span>
                  <span className="text-[#d6e2dc]">{modal.catchEntry.bait}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[rgba(208,232,220,0.1)] flex justify-between items-center text-sm">
                <span className="text-[#9eb2a8]">Marktwert</span>
                <strong className="font-mono-num text-[#e5bd70]">{modal.catchEntry.value} €</strong>
              </div>
            </div>

            <p className="text-sm text-[#9eb2a8]">
              Behalte den Fang für den Verkauf oder setze ihn schonend zurück, um zusätzliche Erfahrung zu sammeln.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={onKeepCatch}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#8fb886] hover:bg-[#a1c998] text-[#09140d] font-bold text-sm whitespace-nowrap cursor-pointer transition-colors"
              >
                Behalten und verkaufen (+{modal.catchEntry.value} €)
              </button>
              <button
                type="button"
                onClick={onReleaseCatch}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] font-semibold text-sm border border-[rgba(208,232,220,0.2)] whitespace-nowrap cursor-pointer transition-colors"
              >
                Catch &amp; Release (+{modal.hasAbhakmatte ? 35 : 20} XP)
              </button>
            </div>
          </div>
        )}

        {modal.type === 'scanner' && (
          <div className="space-y-4">
            <svg viewBox="0 0 360 132" className="w-full h-32 rounded-xl bg-[#081314] border border-[rgba(208,232,220,0.16)]">
              <defs>
                <linearGradient id="sonarCone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(143,184,134,0.26)" />
                  <stop offset="100%" stopColor="rgba(143,184,134,0.02)" />
                </linearGradient>
                <linearGradient id="sedimentFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(143,184,134,0.34)" />
                  <stop offset="100%" stopColor="rgba(26,48,44,0.8)" />
                </linearGradient>
              </defs>
              {/* Sonar beam & bathymetric depth lines */}
              <polygon points="180,0 24,132 336,132" fill="url(#sonarCone)" />
              <line x1="0" y1="28" x2="360" y2="28" stroke="rgba(164,198,154,0.14)" strokeDasharray="3 4" />
              <line x1="0" y1="62" x2="360" y2="62" stroke="rgba(164,198,154,0.14)" strokeDasharray="3 4" />
              <line x1="0" y1="96" x2="360" y2="96" stroke="rgba(164,198,154,0.14)" strokeDasharray="3 4" />
              <text x="8" y="24" fill="rgba(164,198,154,0.55)" fontSize="8" fontFamily="JetBrains Mono, monospace">
                2 m
              </text>
              <text x="8" y="58" fill="rgba(164,198,154,0.55)" fontSize="8" fontFamily="JetBrains Mono, monospace">
                {Math.round(modal.location.depth * 0.5)} m
              </text>
              <text x="8" y="92" fill="rgba(164,198,154,0.55)" fontSize="8" fontFamily="JetBrains Mono, monospace">
                {modal.location.depth} m
              </text>
              {/* Riverbed / seabed contour */}
              <path
                d="M0 112 Q 65 98 130 108 T 250 100 T 360 106 L 360 132 L 0 132 Z"
                fill="url(#sedimentFill)"
                stroke="#8fb886"
                strokeWidth="1.2"
                strokeOpacity="0.6"
              />
              {/* Fishfinder arches & fish echoes */}
              {modal.detectedFish.map((_, idx) => {
                const x = 58 + (idx * 62) % 256;
                const y = 32 + ((idx * 27) % 52);
                return (
                  <g key={idx} transform={`translate(${x}, ${y})`}>
                    <path d="M-12 -5 Q 0 -13 12 -5" stroke="#e5bd70" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
                    <ellipse cx="0" cy="0" rx="10" ry="3.8" fill="#e5bd70" />
                    <polygon points="-9,0 -16,-4 -16,4" fill="#e5bd70" />
                  </g>
                );
              })}
            </svg>
            <div className="space-y-1.5 text-sm">
              <p>
                <span className="text-[#9eb2a8]">Gewässer:</span>{' '}
                <strong className="text-[#edf3ed]">{modal.location.name}</strong>
              </p>
              <p>
                <span className="text-[#9eb2a8]">Tiefe:</span>{' '}
                <strong className="font-mono-num text-[#edf3ed]">{modal.location.depth} m</strong>
              </p>
              <p>
                <span className="text-[#9eb2a8]">Untergrund:</span>{' '}
                <span className="text-[#edf3ed]">{modal.location.bottom}</span>
              </p>
              <p>
                <span className="text-[#9eb2a8]">Erkannte Fischsignale:</span>{' '}
                <strong className="text-[#e5bd70]">
                  {modal.detectedFish.length > 0
                    ? modal.detectedFish.join(', ')
                    : 'Keine eindeutigen Signale'}
                </strong>
              </p>
              <p className="text-xs text-[#7c9087] pt-1">
                {modal.hasSonar
                  ? 'Echolot-Upgrade aktiv: Erhöhte Signalgenauigkeit.'
                  : 'Tipp: Kaufe das Echolot im Shop für präzisere Schwarm-Scans.'}
              </p>
            </div>
          </div>
        )}

        {modal.type === 'underwater' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-to-b from-[#23565a] via-[#13383c] to-[#081c1f] border border-[rgba(208,232,220,0.2)] p-4 text-center space-y-3 overflow-hidden">
              <svg viewBox="0 0 340 120" className="w-full h-32 rounded-lg">
                <defs>
                  <linearGradient id="uwRay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(224,244,232,0.22)" />
                    <stop offset="100%" stopColor="rgba(224,244,232,0)" />
                  </linearGradient>
                </defs>
                {/* Volumetric light rays */}
                <polygon points="45,0 88,0 56,120 12,120" fill="url(#uwRay)" />
                <polygon points="145,0 198,0 156,120 105,120" fill="url(#uwRay)" />
                <polygon points="248,0 288,0 258,120 215,120" fill="url(#uwRay)" />
                {/* Waterline shimmer */}
                <path d="M0 8 Q 42 4 85 8 T 170 8 T 255 8 T 340 8" stroke="rgba(220,242,235,0.35)" strokeWidth="1.5" fill="none" />
                {/* Riverbed stones & contour */}
                <path d="M0 108 Q 85 98 170 105 T 340 102 L 340 120 L 0 120 Z" fill="rgba(10, 24, 24, 0.72)" />
                <ellipse cx="74" cy="112" rx="18" ry="6" fill="rgba(44, 68, 62, 0.7)" />
                <ellipse cx="220" cy="113" rx="24" ry="7" fill="rgba(38, 60, 56, 0.7)" />
                {/* Aquatic plants */}
                <path d="M24 114 Q 30 74 20 38" stroke="#76a36e" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M36 114 Q 44 68 34 26" stroke="#8fb886" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                <path d="M304 114 Q 296 78 306 40" stroke="#76a36e" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M316 114 Q 324 82 314 52" stroke="#8fb886" strokeWidth="2" fill="none" strokeLinecap="round" />
                {/* Bubbles */}
                <circle cx="102" cy="46" r="2.2" fill="rgba(220,244,240,0.45)" />
                <circle cx="108" cy="30" r="1.5" fill="rgba(220,244,240,0.35)" />
                <circle cx="242" cy="54" r="2" fill="rgba(220,244,240,0.4)" />
                {/* Detailed swimming fish silhouettes */}
                <g transform="translate(152, 50)" fill="#d8e6de" opacity="0.88">
                  <ellipse cx="0" cy="0" rx="24" ry="9" />
                  <polygon points="-22,0 -36,-9 -31,0 -36,9" />
                  <polygon points="-4,-8 -14,-15 -16,-6" />
                  <circle cx="14" cy="-2" r="1.6" fill="#102223" />
                </g>
                <g transform="translate(232, 74)" fill="#a4c69a" opacity="0.75">
                  <ellipse cx="0" cy="0" rx="15" ry="6" />
                  <polygon points="-14,0 -24,-5.5 -20,0 -24,5.5" />
                  <polygon points="-2,-5 -9,-10 -10,-4" />
                </g>
              </svg>
              <div className="text-sm text-[#e1ece7]">
                Wassertiefe: <strong className="font-mono-num">{modal.location.depth} m</strong> · Boden: {modal.location.bottom}
              </div>
              <div className="text-xs text-[#b9ccc3]">
                Vorkommende Arten: <strong className="text-[#edf3ed]">{modal.location.fish.join(' · ')}</strong>
              </div>
            </div>
          </div>
        )}

        {modal.type === 'tournament' && (
          <div className="space-y-4 text-sm">
            <p className="text-[#c5d4cc]">{modal.description}</p>
            <div className="rounded-xl bg-[#0e191a] border border-[rgba(208,232,220,0.14)] p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-[#9eb2a8]">Dein aktueller Bestwert</div>
                <div className="font-mono-num text-xl font-bold text-[#e5bd70]">
                  {modal.score} {modal.unit}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#9eb2a8]">Turnierziel</div>
                <div className="font-mono-num text-base font-semibold text-[#edf3ed]">
                  {modal.target} {modal.unit}
                </div>
              </div>
            </div>

            {modal.alreadyClaimed ? (
              <p className="text-[#8fb886] font-medium">Preisgeld bereits abgeholt.</p>
            ) : modal.qualified ? (
              <button
                type="button"
                onClick={() => onClaimTournament(modal.id, modal.reward)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#e5bd70] hover:bg-[#efd08f] text-[#171208] font-bold cursor-pointer"
              >
                Preisgeld abholen (+{modal.reward} €)
              </button>
            ) : (
              <p className="text-xs text-[#9eb2a8]">
                Erreiche das Turnierziel, um das Preisgeld von {modal.reward} € zu gewinnen.
              </p>
            )}
          </div>
        )}

        {modal.type === 'pause' && (
          <div className="space-y-3">
            <p className="text-sm text-[#9eb2a8]">
              Die Zeit am Gewässer ist pausiert. Dein aktueller Fortschritt bleibt erhalten.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={onResumeGame}
                className="w-full px-4 py-2.5 rounded-lg bg-[#8fb886] hover:bg-[#a1c998] text-[#09140d] font-bold text-sm cursor-pointer"
              >
                Weiterspielen
              </button>
              <button
                type="button"
                onClick={onSaveNow}
                className="w-full px-4 py-2.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] font-semibold text-sm border border-[rgba(208,232,220,0.18)] cursor-pointer"
              >
                Spielstand speichern
              </button>
              <button
                type="button"
                onClick={onReturnToTitle}
                className="w-full px-4 py-2.5 rounded-lg bg-transparent hover:bg-[#1a2c2b] text-[#9eb2a8] font-medium text-sm border border-[rgba(208,232,220,0.14)] cursor-pointer"
              >
                Zurück zum Titelbildschirm
              </button>
            </div>
          </div>
        )}

        {modal.type === 'confirmReset' && (
          <div className="space-y-4">
            <p className="text-sm text-[#c5d4cc]">
              Möchtest du wirklich deinen gesamten Spielstand löschen? Alle Fänge, Ausrüstung und Rekorde gehen verloren.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] text-sm font-semibold cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={onConfirmReset}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#a8443a] hover:bg-[#be4f44] text-white text-sm font-bold cursor-pointer"
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        )}

        {modal.type === 'confirmExitAdmin' && (
          <div className="space-y-4">
            <p className="text-sm text-[#c5d4cc]">
              Wenn du den Admin-Modus verlässt, verlierst du alles – alle Ruten, Schnüre, Ausrüstung, Boote, Köder, Fänge, Rekorde, Geld und Level – und startest komplett von Anfang an.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] text-sm font-semibold cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                data-testid="confirm-exit-admin-btn"
                onClick={onConfirmExitAdmin}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#a8443a] hover:bg-[#be4f44] text-white text-sm font-bold cursor-pointer"
              >
                Verlassen &amp; von vorn starten
              </button>
            </div>
          </div>
        )}

        {modal.type === 'redeemCode' && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <p className="text-sm text-[#c5d4cc]">
              Gib hier einen geheimen Code ein, um besondere Funktionen oder Belohnungen freizuschalten.
            </p>
            <div>
              <label htmlFor="redeemCodeInput" className="block text-xs text-[#9eb2a8] mb-1.5">
                Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#e5bd70] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="redeemCodeInput"
                  data-testid="code-input"
                  type="text"
                  autoFocus
                  value={codeValue}
                  onChange={(e) => {
                    setCodeValue(e.target.value);
                    if (codeError) setCodeError(null);
                  }}
                  placeholder="Code eingeben …"
                  className="w-full rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.2)] pl-9 pr-3 py-2.5 text-sm font-mono-num text-[#edf3ed] focus:outline-none focus:border-[#e5bd70]"
                />
              </div>
              {codeError && (
                <p data-testid="code-error" className="text-xs text-[#e17e70] mt-1.5">
                  {codeError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] text-sm font-semibold cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                data-testid="redeem-code-submit"
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#e5bd70] hover:bg-[#efd08f] text-[#171208] text-sm font-bold cursor-pointer"
              >
                Code einlösen
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
