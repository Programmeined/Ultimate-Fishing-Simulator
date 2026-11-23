import { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CloudSun,
  Coins,
  Fish,
  Globe,
  LogIn,
  LogOut,
  PackagePlus,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import { BAITS, FISH_DATA, LOCATIONS, WEATHER_OPTIONS } from '../game/data';
import {
  formatClock,
  formatEventRemainingTime,
  getLocationById,
  isServerEventCurrentlyLive,
  MAX_LEVEL,
  SERVER_EVENT_BONUS_INFO,
} from '../game/rules';
import type {
  GameState,
  ServerEvent,
  ServerEventBonusType,
  WeatherForecast,
  WeatherType,
} from '../game/types';
import type { CreateServerEventInput } from '../services/serverEvents';

interface AdminPanelViewProps {
  gameState: GameState;
  gameTime: number;
  weather: WeatherType;
  temperature: number;
  forecast: WeatherForecast;
  chumSecondsLeft: number;
  firebaseUser: User | null;
  isFirebaseAdmin: boolean;
  serverEvents: ServerEvent[];
  serverEventsLoading: boolean;
  onFirebaseGoogleSignIn: () => Promise<void>;
  onFirebaseSignOut: () => Promise<void>;
  onCreateServerEvent: (input: CreateServerEventInput) => Promise<void>;
  onToggleServerEvent: (eventId: string, active: boolean) => Promise<void>;
  onDeleteServerEvent: (eventId: string) => Promise<void>;
  onGrantMoney: (amount: number, mode: 'add' | 'set') => void;
  onSetLevel: (level: number) => void;
  onGrantBait: (baitName: string, amount: number) => void;
  onGrantAll: () => void;
  onCompleteMissions: () => void;
  onSpawnFishBite: (fishName: string, giant: boolean) => void;
  onGrantFishLogbook: (fishName: string, giant: boolean) => void;
  onSetAdminLuck: (mult: number) => void;
  onSetGameTime: (hour: number) => void;
  onResetRealTime: () => void;
  onSetWeather: (weather: WeatherType) => void;
  onSetTemperature: (temp: number) => void;
  onApplyForecastNow: () => void;
  onTriggerChum: () => void;
  onExitAdminMode: () => void;
}

export function AdminPanelView({
  gameState,
  gameTime,
  weather,
  temperature,
  forecast,
  chumSecondsLeft,
  firebaseUser,
  isFirebaseAdmin,
  serverEvents,
  serverEventsLoading,
  onFirebaseGoogleSignIn,
  onFirebaseSignOut,
  onCreateServerEvent,
  onToggleServerEvent,
  onDeleteServerEvent,
  onGrantMoney,
  onSetLevel,
  onGrantBait,
  onGrantAll,
  onCompleteMissions,
  onSpawnFishBite,
  onGrantFishLogbook,
  onSetAdminLuck,
  onSetGameTime,
  onResetRealTime,
  onSetWeather,
  onSetTemperature,
  onApplyForecastNow,
  onTriggerChum,
  onExitAdminMode,
}: AdminPanelViewProps) {
  const [moneyInput, setMoneyInput] = useState<string>('50000');
  const [levelInput, setLevelInput] = useState<string>(String(gameState.level));
  const [selectedFish, setSelectedFish] = useState<string>('Heilbutt');
  const [giantMode, setGiantMode] = useState<boolean>(true);
  const [selectedBait, setSelectedBait] = useState<string>(BAITS[0].name);

  // Server-wide event creation state
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDesc, setEventDesc] = useState<string>('');
  const [eventBonus, setEventBonus] = useState<ServerEventBonusType>('luck_boost');
  const [eventLocationId, setEventLocationId] = useState<string>('all');
  const [eventDurationHours, setEventDurationHours] = useState<number>(24);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [eventBusy, setEventBusy] = useState<boolean>(false);
  const [eventError, setEventError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setEventError(null);
    setAuthBusy(true);
    try {
      await onFirebaseGoogleSignIn();
    } catch (err) {
      setEventError(
        err instanceof Error
          ? err.message
          : 'Google-Anmeldung fehlgeschlagen. Bitte Pop-ups erlauben.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventError(null);
    if (eventTitle.trim().length < 3) {
      setEventError('Bitte gib einen Titel mit mindestens 3 Zeichen ein.');
      return;
    }
    setEventBusy(true);
    try {
      await onCreateServerEvent({
        title: eventTitle,
        description: eventDesc,
        bonusType: eventBonus,
        locationId: eventLocationId,
        durationHours: eventDurationHours,
      });
      setEventTitle('');
      setEventDesc('');
    } catch (err) {
      setEventError(err instanceof Error ? err.message : 'Event konnte nicht gespeichert werden.');
    } finally {
      setEventBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#e5bd70] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin-Steuerzentrale</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed] mt-0.5">
            Admin-Panel
          </h1>
          <p className="text-sm text-[#9eb2a8]">
            Kontrolliere Geld, Level, Ausrüstung, Fisch-Spawns, Weltbedingungen und server-weite Events.
          </p>
        </div>

        <button
          type="button"
          data-testid="admin-exit-button"
          onClick={onExitAdminMode}
          className="px-3.5 py-2 rounded-lg bg-[#733e38] hover:bg-[#8b4a43] text-[#f7ecea] text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
        >
          Admin-Modus verlassen &amp; zurücksetzen
        </button>
      </div>

      {/* Server-weite Events (Cloud Firestore) */}
      <section
        data-testid="admin-server-events-section"
        className="rounded-xl panel-surface border border-[rgba(229,189,112,0.34)] p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#e5bd70]" />
              <h2 className="text-base font-semibold text-[#edf3ed]">
                Server-weite Events (für alle Spieler &amp; Tester)
              </h2>
            </div>
            <p className="text-xs text-[#9eb2a8] mt-0.5">
              Events werden in der Datenbank gespeichert und erscheinen sofort bei allen Spielern und Test-Besuchern ohne Anmeldung.
            </p>
          </div>

          {isFirebaseAdmin ? (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[#1d332d] text-[#8fb886] border border-[rgba(143,184,134,0.35)] text-xs font-semibold">
                Server-Admin verifiziert
              </span>
              <button
                type="button"
                data-testid="admin-google-signout-btn"
                onClick={() => void onFirebaseSignOut()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#cbd8d1] text-xs font-medium border border-[rgba(208,232,220,0.16)] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Abmelden</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {firebaseUser && (
                <button
                  type="button"
                  data-testid="admin-google-signout-btn"
                  onClick={() => void onFirebaseSignOut()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#cbd8d1] text-xs font-medium border border-[rgba(208,232,220,0.16)] cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Konto wechseln</span>
                </button>
              )}
              <button
                type="button"
                data-testid="admin-google-signin-btn"
                disabled={authBusy}
                onClick={() => void handleGoogleLogin()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#e5bd70] hover:bg-[#efd08f] text-[#171208] text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>
                  {authBusy ? 'Anmeldung läuft …' : 'Mit Google als Server-Admin anmelden'}
                </span>
              </button>
            </div>
          )}
        </div>

        {firebaseUser && !isFirebaseAdmin && (
          <div className="rounded-lg bg-[#381d1b] border border-[rgba(225,126,112,0.4)] px-3.5 py-2.5 text-xs text-[#f7d8d4]">
            Dieses Google-Konto besitzt keine Server-Admin-Berechtigung. Nur der Besitzer kann globale Events wie „Mehr Glück“ starten oder verwalten.
          </div>
        )}

        {!firebaseUser && (
          <div className="rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.14)] px-3.5 py-2.5 text-xs text-[#9eb2a8]">
            Nur für den verifizierten Server-Admin: Melde dich oben einmalig mit deinem Google-Admin-Konto an, um globale Events (z. B. „Mehr Glück“) für alle Spieler &amp; Tester zu starten oder zu löschen.
          </div>
        )}

        {eventError && (
          <div
            role="alert"
            className="rounded-lg bg-[#381d1b] border border-[rgba(225,126,112,0.45)] px-3.5 py-2 text-xs text-[#f7d8d4]"
          >
            {eventError}
          </div>
        )}

        {isFirebaseAdmin && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0d1819]/80 border border-[rgba(229,189,112,0.22)] px-3.5 py-2.5">
              <div className="text-xs text-[#cbd8d1]">
                <strong className="text-[#e5bd70]">Schnellstart:</strong> Globales Glücks-Event für alle Spieler sofort aktivieren
              </div>
              <button
                type="button"
                data-testid="event-quick-luck-btn"
                disabled={eventBusy}
                onClick={async () => {
                  setEventError(null);
                  setEventBusy(true);
                  try {
                    await onCreateServerEvent({
                      title: 'Mehr Glück für alle!',
                      description: 'Höhere Chance auf seltene & schwere Fische sowie +25 % Fangwert.',
                      bonusType: 'luck_boost',
                      locationId: 'all',
                      durationHours: 24,
                    });
                  } catch (err) {
                    setEventError(err instanceof Error ? err.message : 'Event konnte nicht gestartet werden.');
                  } finally {
                    setEventBusy(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e5bd70] hover:bg-[#efd08f] text-[#171208] text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>„Mehr Glück“ für alle starten (24 Std.)</span>
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmitEvent(e)} className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label htmlFor="eventTitleInput" className="block text-xs text-[#9eb2a8] mb-1">
                Event-Titel (3–60 Zeichen)
              </label>
              <input
                id="eventTitleInput"
                data-testid="event-title-input"
                type="text"
                maxLength={60}
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="z. B. Großes Wochenend-Angeln"
                className="w-full rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.18)] px-3 py-2 text-sm text-[#edf3ed]"
              />
            </div>

            <div>
              <label htmlFor="eventBonusSelect" className="block text-xs text-[#9eb2a8] mb-1">
                Server-Bonus
              </label>
              <select
                id="eventBonusSelect"
                data-testid="event-bonus-select"
                value={eventBonus}
                onChange={(e) => setEventBonus(e.target.value as ServerEventBonusType)}
                className="w-full rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.18)] px-3 py-2 text-sm text-[#edf3ed]"
              >
                {(Object.keys(SERVER_EVENT_BONUS_INFO) as ServerEventBonusType[]).map((key) => (
                  <option key={key} value={key}>
                    {SERVER_EVENT_BONUS_INFO[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="eventDescInput" className="block text-xs text-[#9eb2a8] mb-1">
                Kurze Beschreibung für Spieler &amp; Tester (optional)
              </label>
              <input
                id="eventDescInput"
                data-testid="event-desc-input"
                type="text"
                maxLength={240}
                value={eventDesc}
                onChange={(e) => setEventDesc(e.target.value)}
                placeholder="z. B. Alle Fänge bringen doppelte XP – viel Petri Heil!"
                className="w-full rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.18)] px-3 py-2 text-sm text-[#edf3ed]"
              />
            </div>

            <div>
              <label htmlFor="eventLocationSelect" className="block text-xs text-[#9eb2a8] mb-1">
                Ziel-Gewässer
              </label>
              <select
                id="eventLocationSelect"
                data-testid="event-location-select"
                value={eventLocationId}
                onChange={(e) => setEventLocationId(e.target.value)}
                className="w-full rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.18)] px-3 py-2 text-sm text-[#edf3ed]"
              >
                <option value="all">Alle Gewässer (Global)</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.kind})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="eventDurationSelect" className="block text-xs text-[#9eb2a8] mb-1">
                  Laufzeit
                </label>
                <select
                  id="eventDurationSelect"
                  data-testid="event-duration-select"
                  value={eventDurationHours}
                  onChange={(e) => setEventDurationHours(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.18)] px-3 py-2 text-sm text-[#edf3ed]"
                >
                  <option value={1}>1 Stunde</option>
                  <option value={6}>6 Stunden</option>
                  <option value={24}>24 Stunden</option>
                  <option value={72}>3 Tage (72 Std.)</option>
                  <option value={168}>7 Tage</option>
                </select>
              </div>
              <button
                type="submit"
                data-testid="event-create-btn"
                disabled={eventBusy}
                className="px-4 py-2 rounded-lg bg-[#8fb886] hover:bg-[#a1c998] text-[#09140d] text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                {eventBusy ? 'Starte …' : 'Server-Event für alle starten'}
              </button>
            </div>
          </form>

        {/* Live & gespeicherte Server-Events (nur für verifizierten Server-Admin sichtbar) */}
        <div className="pt-1 space-y-2" data-testid="admin-server-events-list">
          <div className="flex items-center justify-between text-xs text-[#9eb2a8]">
            <span>Alle Server-Events ({serverEvents.length})</span>
            {serverEventsLoading && <span>Synchronisiere …</span>}
          </div>

          {serverEvents.length === 0 ? (
            <div className="rounded-lg bg-[#0d1819]/75 border border-[rgba(208,232,220,0.1)] px-3.5 py-3 text-xs text-[#9eb2a8]">
              Derzeit sind keine Server-Events aktiv.
            </div>
          ) : (
            <div className="space-y-2">
              {serverEvents.map((evt) => {
                const live = isServerEventCurrentlyLive(evt);
                const bonus = SERVER_EVENT_BONUS_INFO[evt.bonusType];
                const locLabel =
                  evt.locationId === 'all' ? 'Alle Gewässer' : getLocationById(evt.locationId).name;
                return (
                  <div
                    key={evt.id}
                    className="rounded-lg bg-[#0d1819]/85 border border-[rgba(208,232,220,0.14)] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            live
                              ? 'bg-[#1d332d] text-[#8fb886] border border-[rgba(143,184,134,0.35)]'
                              : evt.active
                              ? 'bg-[#382e18] text-[#e5bd70]'
                              : 'bg-[#1a2425] text-[#9eb2a8]'
                          }`}
                        >
                          {live ? 'Live' : evt.active ? 'Abgelaufen' : 'Pausiert'}
                        </span>
                        <strong className="text-sm text-[#edf3ed]">{evt.title}</strong>
                        <span className="text-xs text-[#e5bd70] font-medium">
                          {bonus.shortBadge}
                        </span>
                      </div>
                      <div className="text-xs text-[#9eb2a8]">
                        {locLabel} · Restzeit: {formatEventRemainingTime(evt.endsAt)}
                        {evt.description ? ` · ${evt.description}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void onToggleServerEvent(evt.id, !evt.active)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] text-xs font-medium border border-[rgba(208,232,220,0.16)] cursor-pointer"
                      >
                        {evt.active ? (
                          <>
                            <PauseCircle className="w-3.5 h-3.5 text-[#e5bd70]" />
                            <span>Pausieren</span>
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-3.5 h-3.5 text-[#8fb886]" />
                            <span>Aktivieren</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteServerEvent(evt.id)}
                        aria-label={`Event ${evt.title} löschen`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#4a2521] hover:bg-[#66312b] text-[#f7ecea] text-xs font-medium cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Löschen</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Geld & Level */}
        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#e5bd70]" />
            <h2 className="text-base font-semibold text-[#edf3ed]">Geld &amp; Level steuern</h2>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-[#9eb2a8]">Geld schnell hinzufügen</div>
            <div className="flex flex-wrap gap-2">
              {[1000, 10000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  data-testid={`admin-add-money-${amt}`}
                  onClick={() => onGrantMoney(amt, 'add')}
                  className="px-3 py-1.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#e5bd70] font-mono-num text-xs font-semibold border border-[rgba(208,232,220,0.16)] cursor-pointer"
                >
                  +{amt.toLocaleString('de-DE')} €
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label htmlFor="adminMoneySet" className="sr-only">
                Exakten Geldbetrag setzen
              </label>
              <input
                id="adminMoneySet"
                data-testid="admin-money-input"
                type="number"
                min={0}
                value={moneyInput}
                onChange={(e) => setMoneyInput(e.target.value)}
                className="flex-1 rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.18)] px-3 py-1.5 text-sm font-mono-num text-[#edf3ed]"
              />
              <button
                type="button"
                data-testid="admin-set-money-btn"
                onClick={() => onGrantMoney(Number(moneyInput) || 0, 'set')}
                className="px-3.5 py-1.5 rounded-lg bg-[#8fb886] hover:bg-[#a1c998] text-[#09140d] text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                Geld setzen
              </button>
            </div>
          </div>

          <hr className="border-[rgba(208,232,220,0.1)]" />

          <div className="space-y-2">
            <div className="text-xs text-[#9eb2a8]">
              Level setzen (Aktuell: <strong className="text-[#edf3ed]">Lvl {gameState.level}</strong>)
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 10, 20, MAX_LEVEL].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setLevelInput(String(lvl));
                    onSetLevel(lvl);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] font-mono-num text-xs font-semibold border border-[rgba(208,232,220,0.16)] cursor-pointer"
                >
                  {lvl === MAX_LEVEL ? `Max (${MAX_LEVEL})` : `Lvl ${lvl}`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label htmlFor="adminLevelSet" className="sr-only">
                Exaktes Level setzen
              </label>
              <input
                id="adminLevelSet"
                type="number"
                min={1}
                max={MAX_LEVEL}
                value={levelInput}
                onChange={(e) => setLevelInput(e.target.value)}
                className="flex-1 rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.18)] px-3 py-1.5 text-sm font-mono-num text-[#edf3ed]"
              />
              <button
                type="button"
                onClick={() => onSetLevel(Number(levelInput) || 1)}
                className="px-3.5 py-1.5 rounded-lg bg-[#25403e] hover:bg-[#325451] text-[#edf3ed] text-xs font-semibold border border-[rgba(208,232,220,0.18)] whitespace-nowrap cursor-pointer"
              >
                Level anwenden
              </button>
            </div>
          </div>
        </section>

        {/* 2. Fische spawnen / ins Fangbuch geben */}
        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Fish className="w-4 h-4 text-[#e5bd70]" />
            <h2 className="text-base font-semibold text-[#edf3ed]">Fisch-Kontrolle (Spawnen &amp; Fangbuch)</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="adminFishSelect" className="block text-xs text-[#9eb2a8] mb-1">
                Fischart wählen ({FISH_DATA.length} Arten)
              </label>
              <select
                id="adminFishSelect"
                data-testid="admin-fish-select"
                value={selectedFish}
                onChange={(e) => setSelectedFish(e.target.value)}
                className="w-full rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.18)] px-3 py-2 text-sm text-[#edf3ed]"
              >
                {FISH_DATA.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.type} · {f.weight[0]}–{f.weight[1]} kg)
                  </option>
                ))}
              </select>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-[#cbd8d1] cursor-pointer">
              <input
                type="checkbox"
                checked={giantMode}
                onChange={(e) => setGiantMode(e.target.checked)}
                className="accent-[#e5bd70]"
              />
              <span>Kapitales Rekordgewicht erzeugen (96 % Maximalgewicht)</span>
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                data-testid="admin-spawn-bite-btn"
                onClick={() => onSpawnFishBite(selectedFish, giantMode)}
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#e5bd70] hover:bg-[#efd08f] text-[#171208] text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                Sofort an den Haken (Drill starten)
              </button>
              <button
                type="button"
                data-testid="admin-grant-catch-btn"
                onClick={() => onGrantFishLogbook(selectedFish, giantMode)}
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] text-xs font-semibold border border-[rgba(208,232,220,0.18)] whitespace-nowrap cursor-pointer"
              >
                Direkt ins Fangbuch geben
              </button>
            </div>

            <hr className="border-[rgba(208,232,220,0.1)]" />

            <div className="space-y-2" data-testid="admin-luck-control">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9eb2a8]">Persönliches Admin-Glück (seltener &amp; schwerer)</span>
                <strong className="font-mono-num text-[#e5bd70]">
                  {gameState.adminLuckMultiplier || 1}×
                </strong>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { mult: 1, label: '1× Normal' },
                  { mult: 2, label: '2× Mehr Glück' },
                  { mult: 3, label: '3× Großes Glück' },
                  { mult: 5, label: '5× Mega-Glück' },
                ].map((opt) => {
                  const active = (gameState.adminLuckMultiplier || 1) === opt.mult;
                  return (
                    <button
                      key={opt.mult}
                      type="button"
                      data-testid={`admin-luck-btn-${opt.mult}`}
                      onClick={() => onSetAdminLuck(opt.mult)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#e5bd70] text-[#171208] border-[#f4dc9c]'
                          : 'bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] border-[rgba(208,232,220,0.16)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Ausrüstung, Köder & Missionen geben */}
        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-[#8fb886]" />
            <h2 className="text-base font-semibold text-[#edf3ed]">Inventar, Köder &amp; Missionen</h2>
          </div>

          <div className="space-y-2">
            <label htmlFor="adminBaitSelect" className="block text-xs text-[#9eb2a8]">
              Köder hinzufügen
            </label>
            <div className="flex items-center gap-2">
              <select
                id="adminBaitSelect"
                value={selectedBait}
                onChange={(e) => setSelectedBait(e.target.value)}
                className="flex-1 rounded-lg bg-[#0d1819] border border-[rgba(208,232,220,0.18)] px-3 py-1.5 text-sm text-[#edf3ed]"
              >
                {BAITS.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} (Vorrat: {gameState.baits[b.name] || 0})
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="admin-add-bait-btn"
                onClick={() => onGrantBait(selectedBait, 50)}
                className="px-3.5 py-1.5 rounded-lg bg-[#25403e] hover:bg-[#325451] text-[#edf3ed] text-xs font-semibold border border-[rgba(208,232,220,0.18)] whitespace-nowrap cursor-pointer"
              >
                +50 geben
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              data-testid="admin-unlock-all-btn"
              onClick={onGrantAll}
              className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#8fb886] hover:bg-[#a1c998] text-[#09140d] text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              Alles freischalten &amp; auffüllen
            </button>
            <button
              type="button"
              data-testid="admin-complete-missions-btn"
              onClick={onCompleteMissions}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#e5bd70] text-xs font-semibold border border-[rgba(208,232,220,0.18)] whitespace-nowrap cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Missionen abschließen</span>
            </button>
          </div>
        </section>

        {/* 4. Welt, Wetter & Uhrzeit */}
        <section className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CloudSun className="w-4 h-4 text-[#e5bd70]" />
            <h2 className="text-base font-semibold text-[#edf3ed]">Welt, Uhrzeit &amp; Wetter</h2>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-[#9eb2a8]">
              Aktuelle Uhrzeit: <strong className="font-mono-num text-[#edf3ed]">{formatClock(gameTime, true)} Uhr</strong>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onResetRealTime}
                className="px-2.5 py-1.5 rounded-lg bg-[#1d332d] hover:bg-[#27463d] text-[#8fb886] text-xs font-semibold border border-[rgba(143,184,134,0.3)] cursor-pointer"
              >
                Echtzeit
              </button>
              {[
                { label: 'Morgen (06:00)', hour: 6 },
                { label: 'Mittag (12:00)', hour: 12 },
                { label: 'Abend (19:00)', hour: 19 },
                { label: 'Nacht (23:00)', hour: 23 },
              ].map((t) => (
                <button
                  key={t.hour}
                  type="button"
                  onClick={() => onSetGameTime(t.hour)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] text-xs font-medium border border-[rgba(208,232,220,0.16)] cursor-pointer"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-[#9eb2a8]">
              Aktuelles Wetter: <strong className="text-[#edf3ed]">{weather}</strong> ·{' '}
              <strong className="font-mono-num text-[#edf3ed]">{temperature} °C</strong> (Vorhersage:{' '}
              {forecast.nextWeather}, {forecast.nextTemperature} °C)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WEATHER_OPTIONS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onSetWeather(w)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                    weather === w
                      ? 'bg-[#e5bd70] text-[#171208] border-[#f4dc9c] font-bold'
                      : 'bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] border-[rgba(208,232,220,0.16)]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-[#9eb2a8] mr-1">Temperatur:</span>
              {[6, 12, 18, 24].map((temp) => (
                <button
                  key={temp}
                  type="button"
                  onClick={() => onSetTemperature(temp)}
                  className={`px-2.5 py-1 rounded-lg font-mono-num text-xs border cursor-pointer transition-colors ${
                    temperature === temp
                      ? 'bg-[#8fb886] text-[#09140d] border-[#b2d8a9] font-bold'
                      : 'bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] border-[rgba(208,232,220,0.16)]'
                  }`}
                >
                  {temp} °C
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onApplyForecastNow}
              className="flex-1 px-3 py-2 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] text-[#edf3ed] text-xs font-semibold border border-[rgba(208,232,220,0.16)] whitespace-nowrap cursor-pointer"
            >
              Wetterwechsel sofort auslösen
            </button>
            <button
              type="button"
              onClick={onTriggerChum}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1d332d] hover:bg-[#27463d] text-[#8fb886] text-xs font-semibold border border-[rgba(143,184,134,0.3)] whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {chumSecondsLeft > 0
                  ? `Futterteppich (${chumSecondsLeft} s)`
                  : 'Futterteppich starten'}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
