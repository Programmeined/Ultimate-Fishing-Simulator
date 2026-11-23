import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Anchor,
  Award,
  Backpack,
  BookOpen,
  ClipboardList,
  Compass,
  Fish,
  GraduationCap,
  Medal,
  Pause,
  Settings,
  Shield,
  ShoppingBag,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { TitleScreen } from './components/TitleScreen';
import { FishingView } from './components/FishingView';
import { EquipmentView, LocationsView, ShopView } from './components/WorldAndGearViews';
import {
  EncyclopediaView,
  LogbookView,
  MissionsView,
  RecordsView,
  SettingsView,
  TournamentsView,
} from './components/ProgressAndArchiveViews';
import { AchievementsView } from './components/AchievementsView';
import { GameModal, type ActiveModal } from './components/GameModal';
import { AdminPanelView } from './components/AdminPanelView';
import { TutorialView } from './components/TutorialView';
import { ServerEventBanner } from './components/ServerEventBanner';
import {
  auth,
  isFirebaseAdminUser,
  signInAdminWithGoogle,
  signOutFirebase,
} from './firebase';
import {
  createServerEvent,
  deleteServerEvent,
  subscribeActiveServerEvents,
  subscribeAllServerEvents,
  toggleServerEventActive,
} from './services/serverEvents';
import {
  EVENTS,
  FISH_DATA,
  STORAGE_KEY,
  TOURNAMENTS,
} from './game/data';
import {
  adminCompleteAllMissions,
  adminGrantAllContent,
  adminGrantBait,
  adminGrantFishToLogbook,
  adminGrantMoney,
  adminSetLevel,
  adminSetLuckMultiplier,
  advanceWorldTick,
  applyReelPull,
  applyXpGain,
  calculateCatchValue,
  calculateServerEventModifiers,
  calculateTapCastDistance,
  canLandFish,
  createInitialState,
  createNextWeatherForecast,
  evaluateAchievements,
  evaluateTournament,
  exitAdminModeAndReset,
  getAnglerRank,
  getBiteWindowMs,
  getDayPhase,
  getLineByName,
  getLocationById,
  getMaxCastDistance,
  getRealTimeHours,
  getRodByName,
  getWaitTimeMs,
  getXpNeededForLevel,
  isLocationUnlocked,
  isServerEventCurrentlyLive,
  MAX_LEVEL,
  migrateSavedState,
  purchaseBaitPack,
  purchaseShopItem,
  redeemCode,
  rollLuckWeightedRatio,
  selectWeightedFish,
  stepFightPhysics,
  updateMissionsWithCatch,
  updateRecordsWithCatch,
} from './game/rules';
import {
  playBiteSound,
  playCastSound,
  playLandFanfare,
  playPurchaseSound,
  playReelClick,
  playSnapSound,
  playStrikeSound,
} from './game/audio';
import type {
  CatchEntry,
  CaughtFishRuntime,
  DepthOption,
  FightState,
  FishingPhase,
  GameState,
  NavPage,
  ServerEvent,
  ShellState,
  WeatherForecast,
  WeatherType,
} from './game/types';

function loadInitialGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return migrateSavedState(JSON.parse(raw));
  } catch {
    return createInitialState();
  }
}

function shouldAutostart(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

const NAV_ITEMS: Array<{ id: NavPage; label: string; group: 'SPIEL' | 'FORTSCHRITT' | 'WEITERE'; icon: typeof Anchor }> = [
  { id: 'fishing', label: 'Angeln', group: 'SPIEL', icon: Anchor },
  { id: 'locations', label: 'Angelgebiete', group: 'SPIEL', icon: Compass },
  { id: 'equipment', label: 'Ausrüstung', group: 'SPIEL', icon: Backpack },
  { id: 'shop', label: 'Shop', group: 'SPIEL', icon: ShoppingBag },
  { id: 'missions', label: 'Missionen', group: 'FORTSCHRITT', icon: ClipboardList },
  { id: 'logbook', label: 'Fangbuch', group: 'FORTSCHRITT', icon: BookOpen },
  { id: 'records', label: 'Rekorde', group: 'FORTSCHRITT', icon: Trophy },
  { id: 'achievements', label: 'Errungenschaften', group: 'FORTSCHRITT', icon: Medal },
  { id: 'encyclopedia', label: 'Fischlexikon', group: 'FORTSCHRITT', icon: Fish },
  { id: 'tournaments', label: 'Turniere', group: 'WEITERE', icon: Award },
  { id: 'tutorial', label: 'Tutorial', group: 'WEITERE', icon: GraduationCap },
  { id: 'settings', label: 'Einstellungen', group: 'WEITERE', icon: Settings },
  { id: 'admin', label: 'Admin-Panel', group: 'WEITERE', icon: Shield },
];

export default function App() {
  const [shellState, setShellState] = useState<ShellState>(() =>
    shouldAutostart() ? 'playing' : 'title'
  );
  const [activePage, setActivePage] = useState<NavPage>('fishing');
  const [gameState, setGameState] = useState<GameState>(loadInitialGameState);

  // World conditions & 30-min forecast
  const [world, setWorld] = useState<{
    gameTime: number;
    weather: WeatherType;
    temperature: number;
    wind: number;
    forecast: WeatherForecast;
  }>(() => ({
    gameTime: getRealTimeHours(new Date()),
    weather: 'Sonnig',
    temperature: 18,
    wind: 5,
    forecast: createNextWeatherForecast('Sonnig', Math.random, 18),
  }));
  const timeOffsetRef = useRef<number>(0);
  const [eventIndex, setEventIndex] = useState<number>(0);

  // Fishing session state
  const [phase, setPhase] = useState<FishingPhase>('idle');
  const [depth, setDepth] = useState<DepthOption>('mid');
  const [castDistance, setCastDistance] = useState<number>(45);
  const [fightState, setFightState] = useState<FightState>({
    tension: 0,
    stamina: 0,
    distance: 0,
    brake: 45,
    surging: false,
    surgeTimer: 0,
    slackTicks: 0,
  });
  const [hookedFish, setHookedFish] = useState<CaughtFishRuntime | null>(null);
  const [chumSecondsLeft, setChumSecondsLeft] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>(
    'Wähle deine Ausrüstung und wirf aus.'
  );

  // Modal & toast
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Firebase Auth & Server-Wide Events (Cloud Firestore)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [publicServerEvents, setPublicServerEvents] = useState<ServerEvent[]>([]);
  const [adminServerEvents, setAdminServerEvents] = useState<ServerEvent[]>([]);
  const [serverEventsLoading, setServerEventsLoading] = useState<boolean>(true);
  const [eventNowMs, setEventNowMs] = useState<number>(() => Date.now());
  const isFirebaseAdmin = isFirebaseAdminUser(firebaseUser);

  const liveServerEvents = useMemo(() => {
    const now = new Date(eventNowMs);
    return publicServerEvents.filter((evt) => isServerEventCurrentlyLive(evt, now));
  }, [publicServerEvents, eventNowMs]);

  // Refs for timers & latest state inside intervals
  const biteTimeoutRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const worldRef = useRef(world);
  worldRef.current = world;
  const hookedFishRef = useRef(hookedFish);
  hookedFishRef.current = hookedFish;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const shellStateRef = useRef(shellState);
  shellStateRef.current = shellState;
  const fightStateRef = useRef(fightState);
  fightStateRef.current = fightState;
  const castDistanceRef = useRef(castDistance);
  castDistanceRef.current = castDistance;
  const liveServerEventsRef = useRef(liveServerEvents);
  liveServerEventsRef.current = liveServerEvents;

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const persistState = useCallback((next: GameState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  useEffect(() => {
    persistState(gameState);
  }, [gameState, persistState]);

  useEffect(() => {
    document.body.dataset.state = shellState;
  }, [shellState]);

  useEffect(() => {
    if (activePage === 'admin' && !gameState.adminMode) {
      setActivePage('fishing');
    }
  }, [activePage, gameState.adminMode]);

  const clearFishingTimers = useCallback(() => {
    if (biteTimeoutRef.current !== null) {
      window.clearTimeout(biteTimeoutRef.current);
      biteTimeoutRef.current = null;
    }
  }, []);

  const resetFishingSession = useCallback(
    (message = 'Wähle deine Ausrüstung und wirf aus.') => {
      clearFishingTimers();
      setPhase('idle');
      setHookedFish(null);
      setFightState((prev) => ({
        ...prev,
        tension: 0,
        stamina: 0,
        distance: 0,
        surging: false,
        surgeTimer: 0,
        slackTicks: 0,
      }));
      setStatusText(message);
    },
    [clearFishingTimers]
  );

  useEffect(() => {
    return () => {
      clearFishingTimers();
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    };
  }, [clearFishingTimers]);

  // Listen to Firebase Auth state for admin login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  // Subscribe to public active server-wide events for all players & unauthenticated testers
  useEffect(() => {
    setServerEventsLoading(true);
    const unsub = subscribeActiveServerEvents(
      (events) => {
        setPublicServerEvents(events);
        setServerEventsLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to active server events:', err);
        setServerEventsLoading(false);
      }
    );
    const timer = window.setInterval(() => setEventNowMs(Date.now()), 15000);
    return () => {
      unsub();
      window.clearInterval(timer);
    };
  }, []);

  // When verified Firebase Admin is signed in, also subscribe to all events (including paused/expired)
  useEffect(() => {
    if (!isFirebaseAdmin) {
      setAdminServerEvents([]);
      return;
    }
    const unsub = subscribeAllServerEvents(
      (events) => {
        setAdminServerEvents(events);
      },
      (err) => {
        console.error('Failed to subscribe to admin server events:', err);
      }
    );
    return () => unsub();
  }, [isFirebaseAdmin]);

  // Real-time world clock & 30-min forecast weather simulation
  useEffect(() => {
    if (shellState !== 'playing') return;
    let tickCount = 0;
    const syncTick = () => {
      setWorld((prev) =>
        advanceWorldTick(prev, Math.random, {
          realTimeDate: new Date(),
          timeOffsetHours: timeOffsetRef.current,
          forecastStepMinutes: 1 / 60,
        })
      );
    };
    syncTick();
    const id = window.setInterval(() => {
      syncTick();
      setChumSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      tickCount += 1;
      if (tickCount % 90 === 0) {
        setEventIndex((i) => (i + 1) % EVENTS.length);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [shellState]);

  // Fight physics loop when phase === 'fight'
  useEffect(() => {
    if (shellState !== 'playing' || phase !== 'fight') return;
    const id = window.setInterval(() => {
      const fish = hookedFishRef.current;
      if (!fish || phaseRef.current !== 'fight') return;
      const gs = gameStateRef.current;
      const rodPower = getRodByName(gs.currentRod).power;
      const lineStrength = getLineByName(gs.currentLine).strengthMultiplier;
      const loc = getLocationById(gs.location);
      const res = stepFightPhysics(
        fightStateRef.current,
        fish.caughtWeight,
        rodPower,
        0.1,
        Math.random,
        {
          lineStrength,
          currentStrength: loc.currentStrength,
          difficultyMode: gs.difficultyMode,
        }
      );

      if (res.outcome === 'snapped') {
        playSnapSound(gs.sound, gs.muted);
        notify('Die Schnur ist gerissen! Der Fisch entkommt.');
        resetFishingSession('Schnur gerissen. Bremse lockern oder stärkere Schnur nutzen.');
        return;
      }
      if (res.outcome === 'escaped') {
        playSnapSound(gs.sound, gs.muted);
        if (res.escapeReason === 'slack') {
          notify('Die Schnur wurde schlaff – der Fisch hat den Haken abgeschüttelt!');
          resetFishingSession('Schnur zu schlaff! Halte beim Drill immer etwas Zug auf der Rute.');
        } else {
          notify('Der Fisch hat zu viel Schnur abgezogen und ist entkommen.');
          resetFishingSession('Der Fisch hat sich befreit. Wirf erneut aus.');
        }
        return;
      }

      setFightState(res.next);
      const hasNetUpgrade = gs.gear.includes('Kescher-Upgrade');
      if (canLandFish(res.next.distance, res.next.stamina, hasNetUpgrade)) {
        setStatusText(
          `${fish.name} ist nah genug oder ermüdet (${Math.round(res.next.distance)} m). Jetzt "Fisch landen" drücken!`
        );
      } else if (res.next.surging) {
        setStatusText(
          `${fish.name} flieht! Kurz nicht kurbeln – Entfernung: ${Math.round(res.next.distance)} m`
        );
      } else {
        setStatusText(
          `${fish.name} am Haken · Entfernung: ${Math.round(res.next.distance)} m · Spannung: ${Math.round(res.next.tension)} %`
        );
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [shellState, phase, notify, resetFishingSession]);

  const handleStartGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setShellState('playing');
  }, []);

  const triggerBite = useCallback(() => {
    if (phaseRef.current !== 'waiting' || shellStateRef.current !== 'playing') return;
    const gs = gameStateRef.current;
    const w = worldRef.current;
    const loc = getLocationById(gs.location);
    const eventMods = calculateServerEventModifiers(liveServerEventsRef.current, loc.id);
    const personalLuckBonus = gs.adminMode && gs.adminLuckMultiplier > 1
      ? (gs.adminLuckMultiplier - 1) * 0.9
      : 0;
    const chosen = selectWeightedFish(
      loc,
      gs.currentBait,
      depth,
      getDayPhase(w.gameTime),
      w.weather,
      Math.random,
      w.temperature,
      { rareFishBoost: eventMods.rareFishBoost + personalLuckBonus }
    );
    const totalWeightLuck =
      eventMods.weightLuckBias +
      (gs.adminMode && gs.adminLuckMultiplier > 1 ? (gs.adminLuckMultiplier - 1) * 0.16 : 0);
    const sizeRatio = rollLuckWeightedRatio(totalWeightLuck);
    const weight = chosen.weight[0] + sizeRatio * (chosen.weight[1] - chosen.weight[0]);
    const length = chosen.length[0] + sizeRatio * (chosen.length[1] - chosen.length[0]);
    setHookedFish({ ...chosen, caughtWeight: weight, caughtLength: length });
    setPhase('bite');
    setStatusText('Ein Fisch hat angebissen! Jetzt anschlagen!');
    playBiteSound(gs.sound, gs.muted);

    biteTimeoutRef.current = window.setTimeout(() => {
      if (phaseRef.current === 'bite') {
        notify('Der Fisch hat den Köder wieder losgelassen.');
        resetFishingSession();
      }
    }, getBiteWindowMs(loc.difficulty, chosen.rarity, gs.gear.includes('Bissanzeiger Pro'), gs.difficultyMode));
  }, [depth, notify, resetFishingSession]);

  const handleChum = useCallback(() => {
    if (chumSecondsLeft > 0) return;
    const gs = gameStateRef.current;
    const cost = gs.adminMode ? 0 : 15;
    if (gs.money < cost) {
      notify('Nicht genug Geld zum Anfüttern (15 €).');
      return;
    }
    if (cost > 0) {
      setGameState((prev) => ({ ...prev, money: prev.money - cost }));
    }
    setChumSecondsLeft(90);
    playPurchaseSound(gs.sound, gs.muted);
    notify('Angefüttert! Fischaktivität für 90 Sekunden erhöht.');
  }, [chumSecondsLeft, notify]);

  const handleCast = useCallback(
    (overrideDistance?: number) => {
      if (phaseRef.current !== 'idle') {
        notify('Deine Angel ist bereits im Wasser.');
        return;
      }
      const gs = gameStateRef.current;
      const baitCount = gs.baits[gs.currentBait] || 0;
      if (baitCount <= 0) {
        notify('Du hast diesen Köder nicht mehr. Kaufe Nachschub im Shop.');
        return;
      }

      if (typeof overrideDistance === 'number') {
        castDistanceRef.current = overrideDistance;
        setCastDistance(overrideDistance);
      }

      const nextBaits = { ...gs.baits, [gs.currentBait]: baitCount - 1 };
      let nextCurrentBait = gs.currentBait;
      if (nextBaits[nextCurrentBait] <= 0) {
        const fallback = Object.keys(nextBaits).find((k) => nextBaits[k] > 0);
        if (fallback) nextCurrentBait = fallback;
      }

      setGameState((prev) => ({
        ...prev,
        baits: { ...prev.baits, [prev.currentBait]: Math.max(0, (prev.baits[prev.currentBait] || 1) - 1) },
        currentBait: nextCurrentBait,
      }));

      setPhase('waiting');
      setStatusText('Der Köder liegt im Wasser. Warte auf einen Biss …');
      playCastSound(gs.sound, gs.muted);
      notify('Ausgeworfen! Jetzt aufmerksam bleiben.');

      const loc = getLocationById(gs.location);
      const line = getLineByName(gs.currentLine);
      const eventMods = calculateServerEventModifiers(liveServerEventsRef.current, loc.id);
      const waitMs = getWaitTimeMs(
        loc.difficulty,
        chumSecondsLeft > 0,
        gs.gear.includes('Futterkorb-Set'),
        line.stealthBonus,
        gs.difficultyMode,
        Math.random,
        eventMods.activityBonus
      );
      biteTimeoutRef.current = window.setTimeout(triggerBite, waitMs);
    },
    [chumSecondsLeft, notify, triggerBite]
  );

  const handleReelOrStrike = useCallback(() => {
    if (phaseRef.current === 'waiting') {
      resetFishingSession('Du hast die Angel eingeholt.');
      notify('Du hast die Angel eingeholt.');
      return;
    }
    if (phaseRef.current === 'bite') {
      clearFishingTimers();
      const fish = hookedFishRef.current;
      if (!fish) {
        resetFishingSession();
        return;
      }
      setPhase('fight');
      setFightState((prev) => ({
        ...prev,
        tension: 25,
        stamina: 100,
        distance: Math.max(12, Math.min(48, castDistanceRef.current * 0.72)),
      }));
      setStatusText(`${fish.name} am Haken! Halte die Spannung unter 95 %.`);
      playStrikeSound(gameStateRef.current.sound, gameStateRef.current.muted);
      notify(`${fish.name} hat angebissen! Der Drill beginnt.`);
    }
  }, [clearFishingTimers, notify, resetFishingSession]);

  const handleLandFish = useCallback(() => {
    if (phaseRef.current !== 'fight') return;
    const fish = hookedFishRef.current;
    if (!fish) return;

    const gs = gameStateRef.current;
    const loc = getLocationById(gs.location);
    const eventMods = calculateServerEventModifiers(liveServerEventsRef.current, loc.id);
    const weight = Number(fish.caughtWeight.toFixed(2));
    const length = Number(fish.caughtLength.toFixed(1));
    const baseValue = calculateCatchValue(weight, length);
    const value = Math.max(2, Math.round(baseValue * eventMods.moneyMult));

    const entry: CatchEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: fish.name,
      type: fish.type,
      weight,
      length,
      location: loc.name,
      bait: gs.currentBait,
      rod: gs.currentRod,
      date: new Date().toLocaleString('de-DE'),
      released: false,
      value,
    };

    playLandFanfare(gs.sound, gs.muted);

    setGameState((prev) => {
      const catches = [entry, ...prev.catches];
      const totalCaught = prev.totalCaught + 1;
      const totalWeight = Number((prev.totalWeight + entry.weight).toFixed(2));
      const records = updateRecordsWithCatch(prev.records, entry);
      const missionUpdate = updateMissionsWithCatch(
        prev.missions,
        prev.weekly,
        entry,
        catches,
        totalWeight
      );
      if (missionUpdate.newlyCompleted.length > 0) {
        notify(`Mission abgeschlossen: ${missionUpdate.newlyCompleted[0]}`);
      }
      const xpGain = Math.round((15 + entry.weight * 2) * eventMods.xpMult);
      const { nextState: xpState, leveledUpTo } = applyXpGain(
        {
          ...prev,
          catches,
          totalCaught,
          totalWeight,
          records,
          missions: missionUpdate.missions,
          weekly: missionUpdate.weekly,
        },
        xpGain
      );
      const prevIds = new Set((prev.achievements || []).map((a) => a.id));
      const { nextState, newlyUnlocked } = evaluateAchievements(xpState);
      const unlockedDiff = nextState.achievements.filter((a) => !prevIds.has(a.id));
      if (unlockedDiff.length > 0 || newlyUnlocked.length > 0) {
        notify(`Medaille freigeschaltet! Schau im Reiter „Errungenschaften“ vorbei.`);
      } else if (leveledUpTo) {
        notify(`Levelaufstieg! Du bist jetzt Level ${leveledUpTo}.`);
      }
      return nextState;
    });

    resetFishingSession();
    setActiveModal({
      type: 'catch',
      catchEntry: entry,
      hasAbhakmatte: gs.gear.includes('Abhakmatte'),
    });
  }, [notify, resetFishingSession]);

  const handleReelPull = useCallback(() => {
    if (phaseRef.current !== 'fight') return;
    const gs = gameStateRef.current;
    const rodPower = getRodByName(gs.currentRod).power;
    const lineStrength = getLineByName(gs.currentLine).strengthMultiplier;
    const res = applyReelPull(fightStateRef.current, rodPower, { lineStrength });
    playReelClick(gs.sound, gs.muted);

    if (res.outcome === 'snapped') {
      playSnapSound(gs.sound, gs.muted);
      notify('Zu viel Druck! Die Schnur ist gerissen.');
      resetFishingSession('Schnur gerissen. Bei Fischfluchten kurz nicht kurbeln!');
      return;
    }

    setFightState(res.next);
    if (res.next.distance <= 1.5 && res.next.stamina <= 20) {
      handleLandFish();
    }
  }, [handleLandFish, notify, resetFishingSession]);

  const handleCanvasTap = useCallback(
    (relativeX: number) => {
      if (gameStateRef.current.controlMode !== 'tap') return;
      if (phaseRef.current === 'idle') {
        const dist = calculateTapCastDistance(
          relativeX,
          getMaxCastDistance(gameStateRef.current)
        );
        handleCast(dist);
        return;
      }
      if (phaseRef.current === 'bite') {
        handleReelOrStrike();
        return;
      }
      if (phaseRef.current === 'fight') {
        const hasNetUpgrade = gameStateRef.current.gear.includes('Kescher-Upgrade');
        if (
          canLandFish(
            fightStateRef.current.distance,
            fightStateRef.current.stamina,
            hasNetUpgrade
          )
        ) {
          handleLandFish();
        } else {
          handleReelPull();
        }
      }
    },
    [handleCast, handleLandFish, handleReelOrStrike, handleReelPull]
  );

  const handleKeepCatch = useCallback(() => {
    if (activeModal?.type !== 'catch') return;
    const entry = activeModal.catchEntry;
    setGameState((prev) => ({
      ...prev,
      money: prev.money + entry.value,
    }));
    setActiveModal(null);
    notify(`${entry.name} verkauft (+${entry.value} €).`);
  }, [activeModal, notify]);

  const handleReleaseCatch = useCallback(() => {
    if (activeModal?.type !== 'catch') return;
    const entry = activeModal.catchEntry;
    const eventMods = calculateServerEventModifiers(
      liveServerEventsRef.current,
      gameStateRef.current.location
    );
    const baseBonusXp = activeModal.hasAbhakmatte ? 35 : 20;
    const bonusXp = Math.round(baseBonusXp * eventMods.xpMult);

    setGameState((prev) => {
      const updatedCatches = prev.catches.map((c) =>
        c.id === entry.id ? { ...c, released: true } : c
      );
      const prevIds = new Set((prev.achievements || []).map((a) => a.id));
      const { nextState: xpState, leveledUpTo } = applyXpGain(
        {
          ...prev,
          catches: updatedCatches,
          released: prev.released + 1,
        },
        bonusXp
      );
      const { nextState } = evaluateAchievements(xpState);
      const newlyUnlockedCount = nextState.achievements.filter((a) => !prevIds.has(a.id)).length;
      if (newlyUnlockedCount > 0) {
        notify('Neue Medaille freigeschaltet! Sieh dir deine Errungenschaften an.');
      } else if (leveledUpTo) {
        notify(`Levelaufstieg! Du bist jetzt Level ${leveledUpTo}.`);
      }
      return nextState;
    });
    setActiveModal(null);
    notify(`${entry.name} schonend zurückgesetzt (+${bonusXp} XP).`);
  }, [activeModal, notify]);

  // Keyboard bindings
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shellStateRef.current === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (activeModal && activeModal.type !== 'catch' && activeModal.type !== 'pause') {
          setActiveModal(null);
          return;
        }
        if (activeModal?.type === 'catch') return;
        e.preventDefault();
        if (shellStateRef.current === 'playing') {
          setShellState('paused');
          setActiveModal({ type: 'pause' });
        } else if (shellStateRef.current === 'paused') {
          setActiveModal(null);
          setShellState('playing');
        }
        return;
      }

      if (shellStateRef.current !== 'playing' || activeModal) return;

      if (e.key === 'm' || e.key === 'M') {
        setGameState((prev) => ({ ...prev, muted: !prev.muted }));
        return;
      }

      if (
        activePage === 'fishing' &&
        gameStateRef.current.controlMode === 'keyboard' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLSelectElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLButtonElement)
      ) {
        if (e.key === ' ') {
          e.preventDefault();
          if (phaseRef.current === 'idle') handleCast();
          else if (phaseRef.current === 'bite') handleReelOrStrike();
          else if (phaseRef.current === 'fight') handleReelPull();
          return;
        }
        if (e.key === 'Enter' && phaseRef.current === 'fight') {
          const hasNetUpgrade = gameStateRef.current.gear.includes('Kescher-Upgrade');
          if (
            canLandFish(
              fightStateRef.current.distance,
              fightStateRef.current.stamina,
              hasNetUpgrade
            )
          ) {
            e.preventDefault();
            handleLandFish();
          }
          return;
        }
        if ((e.key === 'e' || e.key === 'E') && phaseRef.current === 'waiting') {
          e.preventDefault();
          handleReelOrStrike();
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          setFightState((prev) => ({ ...prev, brake: Math.max(10, prev.brake - 5) }));
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          setFightState((prev) => ({ ...prev, brake: Math.min(90, prev.brake + 5) }));
          return;
        }
        if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && phaseRef.current === 'idle') {
          e.preventDefault();
          const maxD = getMaxCastDistance(gameStateRef.current);
          setCastDistance((prev) => Math.min(maxD, prev + 5));
          return;
        }
        if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && phaseRef.current === 'idle') {
          e.preventDefault();
          setCastDistance((prev) => Math.max(10, prev - 5));
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeModal,
    activePage,
    handleCast,
    handleLandFish,
    handleReelOrStrike,
    handleReelPull,
    handleStartGame,
  ]);

  const currentLoc = getLocationById(gameState.location);
  const xpNeeded = getXpNeededForLevel(gameState.level);
  const anglerRank = getAnglerRank(gameState.level);
  const maxCastDist = getMaxCastDistance(gameState);

  if (shellState === 'title') {
    return (
      <TitleScreen
        gameState={gameState}
        activeServerEvents={liveServerEvents}
        onStart={handleStartGame}
        onOpenTutorial={() => {
          setActivePage('tutorial');
          handleStartGame();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,#152829_0%,#0c1617_52%,#091112_100%)] text-[#edf3ed]">
      {/* Compact Game HUD Top Bar */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 bg-[#091213] border-b border-[rgba(208,232,220,0.16)] sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#edf3ed] whitespace-nowrap truncate">
            Ultimate <span className="text-[#e5bd70]">Fishing</span>
          </span>
          <span className="hidden md:inline text-xs text-[#9eb2a8] whitespace-nowrap truncate">
            {anglerRank} · {currentLoc.name}
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-6 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-4 text-xs sm:text-sm">
            <div className="whitespace-nowrap">
              <span className="text-[#9eb2a8] mr-1">Lvl</span>
              <strong id="headerLevel" className="font-mono-num text-[#edf3ed]">
                {gameState.level}
              </strong>
            </div>
            <div className="hidden sm:block whitespace-nowrap">
              <span className="text-[#9eb2a8] mr-1.5">XP</span>
              <strong id="headerXP" className="font-mono-num text-[#edf3ed]">
                {gameState.level >= MAX_LEVEL ? 'MAX' : `${gameState.xp}/${xpNeeded}`}
              </strong>
            </div>
            <div className="whitespace-nowrap">
              <span className="hidden sm:inline text-[#9eb2a8] mr-1.5">Geld</span>
              <strong id="headerMoney" className="font-mono-num text-[#e5bd70]">
                {gameState.money} €
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              aria-label={gameState.muted ? 'Ton einschalten' : 'Stummschalten'}
              title="Ton [M]"
              onClick={(e) => {
                e.currentTarget.blur();
                setGameState((prev) => ({ ...prev, muted: !prev.muted }));
              }}
              className="p-1.5 sm:p-2 rounded-lg bg-[#142425] hover:bg-[#1e3534] border border-[rgba(208,232,220,0.16)] text-[#cbd8d1] cursor-pointer transition-colors"
            >
              {gameState.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Spiel pausieren"
              title="Pause [P]"
              onClick={(e) => {
                e.currentTarget.blur();
                setShellState('paused');
                setActiveModal({ type: 'pause' });
              }}
              className="p-1.5 sm:p-2 rounded-lg bg-[#142425] hover:bg-[#1e3534] border border-[rgba(208,232,220,0.16)] text-[#cbd8d1] cursor-pointer transition-colors"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Shell: Left Sim Navigation Rail + Active Workspace */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[224px_minmax(0,1fr)]">
        <nav
          aria-label="Spielnavigation"
          className="bg-[#0e191a]/90 border-b md:border-b-0 md:border-r border-[rgba(208,232,220,0.14)] p-2 md:py-4 md:px-3 flex md:flex-col gap-1 overflow-x-auto"
        >
          {(['SPIEL', 'FORTSCHRITT', 'WEITERE'] as const).map((group) => (
            <div key={group} className="flex md:flex-col gap-1 md:mb-3 shrink-0">
              <div className="hidden md:block px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.18em] text-[#70867d]">
                {group}
              </div>
              {NAV_ITEMS.filter(
                (item) => item.group === group && (item.id !== 'admin' || gameState.adminMode)
              ).map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePage(item.id)}
                    className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-[#243d3b] to-[#1c3130] text-[#edf3ed] border border-[rgba(164,198,154,0.34)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                        : 'text-[#a8b8b0] hover:text-[#edf3ed] hover:bg-[#182928] border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#e5bd70]' : 'text-[#84998f]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <main className="p-4 sm:p-6 min-w-0 max-w-6xl w-full">
          <ServerEventBanner events={liveServerEvents} currentLocationId={currentLoc.id} />
          {activePage === 'fishing' && (
            <FishingView
              gameState={gameState}
              location={currentLoc}
              gameTime={world.gameTime}
              weather={world.weather}
              forecast={world.forecast}
              temperature={world.temperature}
              wind={world.wind}
              eventLabel={EVENTS[eventIndex]}
              activeServerEvents={liveServerEvents}
              phase={phase}
              castDistance={Math.min(castDistance, maxCastDist)}
              depth={depth}
              fightState={fightState}
              hookedFish={hookedFish}
              statusText={statusText}
              chumSecondsLeft={chumSecondsLeft}
              onChangeRod={(rodName) =>
                setGameState((prev) => ({ ...prev, currentRod: rodName }))
              }
              onChangeLine={(lineName) =>
                setGameState((prev) => ({ ...prev, currentLine: lineName }))
              }
              onChangeBait={(baitName) =>
                setGameState((prev) => ({ ...prev, currentBait: baitName }))
              }
              onChangeDepth={setDepth}
              onChangeCastDistance={setCastDistance}
              onChangeBrake={(brake) =>
                setFightState((prev) => ({ ...prev, brake }))
              }
              onCast={() => handleCast()}
              onReelOrStrike={handleReelOrStrike}
              onReelPull={handleReelPull}
              onLandFish={handleLandFish}
              onChum={handleChum}
              onCanvasTap={handleCanvasTap}
              onOpenScanner={() => {
                const hasSonar = gameState.gear.includes('Echolot');
                const detected = currentLoc.fish.filter(
                  () => Math.random() > (hasSonar ? 0.2 : 0.45)
                );
                setActiveModal({
                  type: 'scanner',
                  location: currentLoc,
                  detectedFish: detected,
                  hasSonar,
                });
              }}
              onOpenUnderwater={() =>
                setActiveModal({ type: 'underwater', location: currentLoc })
              }
              onNavigateLocations={() => setActivePage('locations')}
              onOpenSettings={() => setActivePage('settings')}
              onOpenTutorial={() => setActivePage('tutorial')}
            />
          )}

          {activePage === 'locations' && (
            <LocationsView
              gameState={gameState}
              onSelectLocation={(id) => {
                if (phase !== 'idle') {
                  notify('Hole zuerst deine Angel ein.');
                  return;
                }
                const loc = getLocationById(id);
                if (!isLocationUnlocked(gameState, loc)) {
                  notify('Dein Level ist noch zu niedrig.');
                  return;
                }
                setGameState((prev) => ({
                  ...prev,
                  location: id,
                  unlocked: prev.unlocked.includes(id) ? prev.unlocked : [...prev.unlocked, id],
                }));
                setActivePage('fishing');
                notify(`Du angelst jetzt am ${loc.name}.`);
              }}
            />
          )}

          {activePage === 'equipment' && (
            <EquipmentView
              gameState={gameState}
              onSelectRod={(rodName) => {
                if (phase !== 'idle') {
                  notify('Hole zuerst deine Angel ein.');
                  return;
                }
                setGameState((prev) => ({ ...prev, currentRod: rodName }));
                notify(`${rodName} ausgerüstet.`);
              }}
              onSelectLine={(lineName) => {
                if (phase !== 'idle') {
                  notify('Hole zuerst deine Angel ein.');
                  return;
                }
                setGameState((prev) => ({ ...prev, currentLine: lineName }));
                notify(`${lineName} aufgezogen.`);
              }}
              onSelectBait={(baitName) => {
                if (phase !== 'idle') {
                  notify('Hole zuerst deine Angel ein.');
                  return;
                }
                setGameState((prev) => ({ ...prev, currentBait: baitName }));
                notify(`${baitName} ausgewählt.`);
              }}
            />
          )}

          {activePage === 'shop' && (
            <ShopView
              gameState={gameState}
              onBuyItem={(name) => {
                const res = purchaseShopItem(gameState, name);
                if (!res.ok) {
                  notify(res.message);
                  return;
                }
                playPurchaseSound(gameState.sound, gameState.muted);
                setGameState(res.nextState);
                notify(res.message);
              }}
              onBuyBait={(name) => {
                const res = purchaseBaitPack(gameState, name);
                if (!res.ok) {
                  notify(res.message);
                  return;
                }
                playPurchaseSound(gameState.sound, gameState.muted);
                setGameState(res.nextState);
                notify(res.message);
              }}
            />
          )}

          {activePage === 'missions' && (
            <MissionsView
              gameState={gameState}
              onClaimMission={(kind, index) => {
                const list = kind === 'daily' ? gameState.missions : gameState.weekly;
                const target = list[index];
                if (!target || !target.completed || target.claimed) return;

                playPurchaseSound(gameState.sound, gameState.muted);
                setGameState((prev) => {
                  const nextDaily =
                    kind === 'daily'
                      ? prev.missions.map((m, i) => (i === index ? { ...m, claimed: true } : m))
                      : prev.missions;
                  const nextWeekly =
                    kind === 'weekly'
                      ? prev.weekly.map((m, i) => (i === index ? { ...m, claimed: true } : m))
                      : prev.weekly;
                  const { nextState, leveledUpTo } = applyXpGain(
                    {
                      ...prev,
                      money: prev.money + target.reward,
                      missions: nextDaily,
                      weekly: nextWeekly,
                    },
                    target.xp
                  );
                  if (leveledUpTo) {
                    notify(`Levelaufstieg! Du bist jetzt Level ${leveledUpTo}.`);
                  }
                  return nextState;
                });
                notify(`Belohnung erhalten: ${target.reward} € und ${target.xp} XP`);
              }}
            />
          )}

          {activePage === 'logbook' && (
            <LogbookView
              gameState={gameState}
              onOpenAchievements={() => setActivePage('achievements')}
            />
          )}

          {activePage === 'records' && <RecordsView gameState={gameState} />}

          {activePage === 'achievements' && <AchievementsView gameState={gameState} />}

          {activePage === 'encyclopedia' && (
            <EncyclopediaView
              gameState={gameState}
              weather={world.weather}
              temperature={world.temperature}
              dayPhase={getDayPhase(world.gameTime)}
            />
          )}

          {activePage === 'tournaments' && (
            <TournamentsView
              gameState={gameState}
              onInspectTournament={(id) => {
                const def = TOURNAMENTS.find((t) => t.id === id);
                if (!def) return;
                const res = evaluateTournament(id, gameState.catches);
                setActiveModal({
                  type: 'tournament',
                  id: def.id,
                  name: def.name,
                  description: res.description,
                  score: res.score,
                  target: def.targetValue,
                  unit: def.unit,
                  reward: def.reward,
                  qualified: res.qualified,
                  alreadyClaimed: gameState.claimedTournaments.includes(def.id),
                });
              }}
            />
          )}

          {activePage === 'tutorial' && (
            <TutorialView
              controlMode={gameState.controlMode}
              difficultyMode={gameState.difficultyMode}
              onNavigate={(page) => setActivePage(page)}
            />
          )}

          {activePage === 'settings' && (
            <SettingsView
              gameState={gameState}
              onSaveNow={() => {
                persistState(gameState);
                notify('Spielstand gespeichert.');
              }}
              onRequestReset={() => setActiveModal({ type: 'confirmReset' })}
              onChangeVolume={(vol) =>
                setGameState((prev) => ({ ...prev, sound: vol, muted: vol === 0 }))
              }
              onToggleMute={() =>
                setGameState((prev) => ({ ...prev, muted: !prev.muted }))
              }
              onChangeControlMode={(controlMode) => {
                setGameState((prev) => ({ ...prev, controlMode }));
                notify(
                  controlMode === 'tap'
                    ? 'Steuerung auf Bildschirm-Tippen umgestellt.'
                    : 'Steuerung auf Tastatur umgestellt.'
                );
              }}
              onChangeDifficulty={(difficultyMode) => {
                setGameState((prev) => ({ ...prev, difficultyMode }));
                notify(
                  difficultyMode === 'schwer'
                    ? 'Schwierigkeit: Schwer (Realistisch) aktiviert.'
                    : 'Schwierigkeit: Standard aktiviert.'
                );
              }}
              onOpenCodeModal={() => setActiveModal({ type: 'redeemCode' })}
              onRequestExitAdmin={() => setActiveModal({ type: 'confirmExitAdmin' })}
            />
          )}

          {activePage === 'admin' && gameState.adminMode && (
            <AdminPanelView
              gameState={gameState}
              gameTime={world.gameTime}
              weather={world.weather}
              temperature={world.temperature}
              forecast={world.forecast}
              chumSecondsLeft={chumSecondsLeft}
              firebaseUser={firebaseUser}
              isFirebaseAdmin={isFirebaseAdmin}
              serverEvents={isFirebaseAdmin ? adminServerEvents : liveServerEvents}
              serverEventsLoading={serverEventsLoading}
              onFirebaseGoogleSignIn={async () => {
                const user = await signInAdminWithGoogle();
                if (isFirebaseAdminUser(user)) {
                  notify('Als Server-Admin angemeldet!');
                } else {
                  notify('Dieses Konto ist kein Server-Admin.');
                }
              }}
              onFirebaseSignOut={async () => {
                await signOutFirebase();
                notify('Google-Admin-Konto abgemeldet.');
              }}
              onCreateServerEvent={async (input) => {
                if (!firebaseUser || !isFirebaseAdmin) {
                  throw new Error('Bitte zuerst als Server-Admin anmelden.');
                }
                await createServerEvent(input, firebaseUser);
                playLandFanfare(gameState.sound, gameState.muted);
                notify(`Server-Event „${input.title.trim()}“ gestartet! Alle Spieler sehen es jetzt.`);
              }}
              onToggleServerEvent={async (eventId, active) => {
                await toggleServerEventActive(eventId, active);
                notify(active ? 'Server-Event aktiviert.' : 'Server-Event pausiert.');
              }}
              onDeleteServerEvent={async (eventId) => {
                await deleteServerEvent(eventId);
                notify('Server-Event gelöscht.');
              }}
              onGrantMoney={(amount, mode) => {
                setGameState((prev) => adminGrantMoney(prev, amount, mode));
                notify(
                  mode === 'add'
                    ? `+${Math.round(Math.max(0, amount)).toLocaleString('de-DE')} € gutgeschrieben.`
                    : `Kontostand auf ${Math.round(Math.max(0, amount)).toLocaleString('de-DE')} € gesetzt.`
                );
              }}
              onSetLevel={(level) => {
                const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.round(level)));
                setGameState((prev) => adminSetLevel(prev, clamped));
                notify(`Level auf ${clamped} gesetzt.`);
              }}
              onGrantBait={(baitName, amount) => {
                setGameState((prev) => adminGrantBait(prev, baitName, amount));
                notify(`+${amount}× ${baitName} hinzugefügt.`);
              }}
              onGrantAll={() => {
                setGameState((prev) => adminGrantAllContent(prev));
                playLandFanfare(gameState.sound, gameState.muted);
                notify('Alle Ruten, Schnüre, Ausrüstung, Boote & Köder aufgefüllt.');
              }}
              onCompleteMissions={() => {
                setGameState((prev) => adminCompleteAllMissions(prev));
                playLandFanfare(gameState.sound, gameState.muted);
                notify('Alle Tages- & Wochenmissionen abgeschlossen.');
              }}
              onSpawnFishBite={(fishName, giant) => {
                if (!gameStateRef.current.adminMode) return;
                const species = FISH_DATA.find((f) => f.name === fishName);
                if (!species) return;
                const ratio = giant ? 0.96 : 0.55;
                const caughtWeight =
                  species.weight[0] + ratio * (species.weight[1] - species.weight[0]);
                const caughtLength =
                  species.length[0] + ratio * (species.length[1] - species.length[0]);
                clearFishingTimers();
                setHookedFish({
                  ...species,
                  caughtWeight,
                  caughtLength,
                });
                setPhase('fight');
                setFightState((prev) => ({
                  ...prev,
                  tension: 28,
                  stamina: 100,
                  distance: 35,
                  surging: false,
                  surgeTimer: 0,
                  slackTicks: 0,
                }));
                setStatusText(
                  `${species.name} am Haken! Ziehe ihn ein (Entfernung: 35 m).`
                );
                setActivePage('fishing');
                playStrikeSound(gameStateRef.current.sound, gameStateRef.current.muted);
                notify(`${species.name} sofort an den Haken geholt!`);
              }}
              onGrantFishLogbook={(fishName, giant) => {
                setGameState((prev) => adminGrantFishToLogbook(prev, fishName, giant));
                playLandFanfare(gameState.sound, gameState.muted);
                notify(`${fishName} ins Fangbuch eingetragen.`);
              }}
              onSetAdminLuck={(mult) => {
                setGameState((prev) => adminSetLuckMultiplier(prev, mult));
                notify(
                  mult <= 1
                    ? 'Persönliches Admin-Glück auf Normal (1×) zurückgesetzt.'
                    : `Persönliches Admin-Glück auf ${mult}× aktiviert.`
                );
              }}
              onSetGameTime={(hour) => {
                const now = new Date();
                const offset = (hour - getRealTimeHours(now) + 24) % 24;
                timeOffsetRef.current = offset;
                setWorld((prev) => ({
                  ...prev,
                  gameTime: (getRealTimeHours(now) + offset) % 24,
                }));
                notify(`Uhrzeit auf ${String(hour).padStart(2, '0')}:00 Uhr gestellt (läuft ab hier in Echtzeit).`);
              }}
              onResetRealTime={() => {
                timeOffsetRef.current = 0;
                setWorld((prev) => ({
                  ...prev,
                  gameTime: getRealTimeHours(new Date()),
                }));
                notify('Uhrzeit wieder auf lokale Echtzeit synchronisiert.');
              }}
              onSetWeather={(weather) => {
                setWorld((prev) => ({
                  ...prev,
                  weather,
                  forecast: createNextWeatherForecast(weather, Math.random, prev.temperature),
                }));
                notify(`Wetter auf „${weather}“ gesetzt.`);
              }}
              onSetTemperature={(temperature) => {
                setWorld((prev) => ({
                  ...prev,
                  temperature,
                }));
                notify(`Temperatur auf ${temperature} °C gesetzt.`);
              }}
              onApplyForecastNow={() => {
                setWorld((prev) => ({
                  ...prev,
                  weather: prev.forecast.nextWeather,
                  temperature: prev.forecast.nextTemperature,
                  wind: prev.forecast.nextWind,
                  forecast: createNextWeatherForecast(
                    prev.forecast.nextWeather,
                    Math.random,
                    prev.forecast.nextTemperature
                  ),
                }));
                notify('Vorhergesagter Wetterwechsel sofort ausgelöst.');
              }}
              onTriggerChum={() => {
                setChumSecondsLeft(90);
                playPurchaseSound(gameState.sound, gameState.muted);
                notify('Futterteppich für 90 Sekunden gestartet.');
              }}
              onExitAdminMode={() => setActiveModal({ type: 'confirmExitAdmin' })}
            />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-5 z-50 px-4 py-2.5 rounded-lg bg-[#e5bd70] text-[#171208] text-sm font-bold shadow-xl border border-[#f5dfa9]"
        >
          {toast}
        </div>
      )}

      {/* Active Modal */}
      <GameModal
        modal={activeModal}
        onClose={() => {
          if (activeModal?.type === 'pause') {
            setShellState('playing');
          }
          setActiveModal(null);
        }}
        onKeepCatch={handleKeepCatch}
        onReleaseCatch={handleReleaseCatch}
        onClaimTournament={(id, reward) => {
          if (gameState.claimedTournaments.includes(id)) return;
          playLandFanfare(gameState.sound, gameState.muted);
          setGameState((prev) => ({
            ...prev,
            money: prev.money + reward,
            claimedTournaments: [...prev.claimedTournaments, id],
          }));
          setActiveModal(null);
          notify(`Turnierpreisgeld erhalten: +${reward} €`);
        }}
        onResumeGame={() => {
          setActiveModal(null);
          setShellState('playing');
        }}
        onReturnToTitle={() => {
          resetFishingSession();
          setActiveModal(null);
          setShellState('title');
        }}
        onSaveNow={() => {
          persistState(gameState);
          notify('Spielstand gespeichert.');
        }}
        onConfirmReset={() => {
          resetFishingSession();
          setChumSecondsLeft(0);
          timeOffsetRef.current = 0;
          const fresh = createInitialState();
          localStorage.removeItem(STORAGE_KEY);
          setGameState(fresh);
          setWorld((prev) => ({ ...prev, gameTime: getRealTimeHours(new Date()) }));
          setActiveModal(null);
          setActivePage('fishing');
          notify('Spielstand wurde zurückgesetzt.');
        }}
        onConfirmExitAdmin={() => {
          resetFishingSession();
          setChumSecondsLeft(0);
          timeOffsetRef.current = 0;
          const fresh = exitAdminModeAndReset(gameState);
          localStorage.removeItem(STORAGE_KEY);
          setGameState(fresh);
          setWorld((prev) => ({ ...prev, gameTime: getRealTimeHours(new Date()) }));
          setActiveModal(null);
          setActivePage('fishing');
          notify('Admin-Modus verlassen. Alles zurückgesetzt – Neustart bei Level 1!');
        }}
        onRedeemCode={(rawCode) => {
          const res = redeemCode(gameState, rawCode);
          if (!res.ok) {
            return { ok: false, message: res.message };
          }
          playLandFanfare(gameState.sound, gameState.muted);
          setGameState(res.nextState);
          setActiveModal(null);
          notify(res.message);
          return { ok: true, message: res.message };
        }}
      />
    </div>
  );
}
