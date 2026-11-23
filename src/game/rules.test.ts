import test from 'node:test';
import assert from 'node:assert/strict';
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
  calculateActivityLevel,
  calculateCatchValue,
  calculateServerEventModifiers,
  calculateTapCastDistance,
  canLandFish,
  createInitialState,
  createNextWeatherForecast,
  evaluateAchievements,
  evaluateTournament,
  exitAdminModeAndReset,
  formatClock,
  formatEventRemainingTime,
  getAchievementProgress,
  getBiteWindowMs,
  getDayPhase,
  getLineByName,
  getLocationById,
  getMaxCastDistance,
  getRealTimeHours,
  getWaitTimeMs,
  isServerEventCurrentlyLive,
  isSpeciesConditionMatch,
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
} from './rules';
import { BAITS, FISH_DATA, LINES, LOCATIONS, RODS } from './data';
import type { CatchEntry, ServerEvent } from './types';

test('createInitialState starts at Level 1, 250 EUR, Waldsee', () => {
  const s = createInitialState(new Date('2026-11-20T08:00:00Z'));
  assert.equal(s.level, 1);
  assert.equal(s.money, 250);
  assert.equal(s.location, 'waldsee');
  assert.equal(s.ownedRods.length, 1);
  assert.equal(s.missions.length, 3);
  assert.equal(s.weekly.length, 3);
});

test('all 26 fish species appear in at least one location', () => {
  const allLocationFish = new Set(LOCATIONS.flatMap((l) => l.fish));
  for (const fish of FISH_DATA) {
    assert.equal(
      allLocationFish.has(fish.name),
      true,
      `${fish.name} should be reachable in at least one location`
    );
  }
});

test('XP gain levels up and unlocks Karpfensee at level 5', () => {
  let state = createInitialState();
  // Level 1->2: 120, 2->3: 240, 3->4: 360, 4->5: 480 => total 1200 XP
  const res = applyXpGain(state, 1250);
  assert.equal(res.nextState.level, 5);
  assert.equal(res.nextState.xp, 50);
  assert.equal(res.leveledUpTo, 5);
  assert.equal(res.nextState.unlocked.includes('karpfensee'), true);
});

test('clock formatting, real-time hours, and day phases map accurately', () => {
  assert.equal(formatClock(7.5), '07:30');
  assert.equal(formatClock(22.25), '22:15');
  assert.equal(formatClock(14 + 5 / 60 + 9 / 3600, true), '14:05:09');

  const sampleDate = new Date(2026, 10, 20, 18, 42, 15, 0);
  const rtHours = getRealTimeHours(sampleDate);
  assert.equal(formatClock(rtHours, true), '18:42:15');

  const rtTick = advanceWorldTick(
    {
      gameTime: 0,
      weather: 'Sonnig',
      temperature: 18,
      wind: 5,
      forecast: { nextWeather: 'Nebel', nextTemperature: 14, nextWind: 4, inGameMinutesRemaining: 10 },
    },
    () => 0.5,
    { realTimeDate: sampleDate, forecastStepMinutes: 1 / 60 }
  );
  assert.equal(formatClock(rtTick.gameTime, true), '18:42:15');
  assert.ok(Math.abs(rtTick.forecast.inGameMinutesRemaining - (10 - 1 / 60)) < 1e-6);

  assert.equal(getDayPhase(6), 'Morgen');
  assert.equal(getDayPhase(12), 'Tag');
  assert.equal(getDayPhase(19), 'Abend');
  assert.equal(getDayPhase(23), 'Nacht');
});

test('activity level increases at dawn/dusk and gentle rain', () => {
  const daySun = calculateActivityLevel('Tag', 'Sonnig', 0);
  const morningRain = calculateActivityLevel('Morgen', 'Leichter Regen', 0);
  assert.ok(morningRain > daySun);
});

test('weighted fish selection returns an eligible fish from the active location', () => {
  const waldsee = getLocationById('waldsee');
  const fish = selectWeightedFish(waldsee, 'Mais', 'mid', 'Morgen', 'Sonnig', () => 0.15);
  assert.equal(waldsee.fish.includes(fish.name), true);
});

test('fight physics snaps line when tension exceeds 95%', () => {
  const res = stepFightPhysics(
    { tension: 94.5, stamina: 80, distance: 25, brake: 10 },
    35,
    5,
    0.5,
    () => 0.99
  );
  assert.equal(res.outcome, 'snapped');
  assert.equal(res.next.tension, 100);
});

test('reel pull reduces distance and stamina', () => {
  const res = applyReelPull({ tension: 30, stamina: 50, distance: 20, brake: 45 }, 12);
  assert.equal(res.outcome, 'ongoing');
  assert.ok(res.next.distance < 20);
  assert.ok(res.next.stamina < 50);
  assert.ok(res.next.tension > 30);
});

test('canLandFish respects Kescher-Upgrade reach', () => {
  assert.equal(canLandFish(5, 40, false), false);
  assert.equal(canLandFish(5, 40, true), true);
  assert.equal(canLandFish(3, 40, false), true);
  assert.equal(canLandFish(7, 10, false), true);
});

test('shop purchases enforce money and level requirements', () => {
  const s = createInitialState();
  const failLevel = purchaseShopItem({ ...s, money: 5000 }, 'Karpfenrute'); // requires level 3
  assert.equal(failLevel.ok, false);

  const buyFeeder = purchaseShopItem({ ...s, level: 2 }, 'Feederrute'); // 180 EUR, level 2
  assert.equal(buyFeeder.ok, true);
  assert.equal(buyFeeder.nextState.money, 70);
  assert.equal(buyFeeder.nextState.ownedRods.includes('Feederrute'), true);

  const buyBait = purchaseBaitPack(s, 'Mais'); // 10 * 2 = 20 EUR
  assert.equal(buyBait.ok, true);
  assert.equal(buyBait.nextState.money, 230);
  assert.equal(buyBait.nextState.baits.Mais, 20);
});

test('records, missions, and tournaments update on catch', () => {
  const s = createInitialState();
  const catchEntry: CatchEntry = {
    id: 'c1',
    name: 'Spiegelkarpfen',
    type: 'Friedfisch',
    weight: 9.5,
    length: 78,
    location: 'Waldsee',
    bait: 'Boilie',
    rod: 'Karpfenrute',
    date: '20.11.2026, 08:15:00',
    released: false,
    value: calculateCatchValue(9.5, 78),
  };

  const records = updateRecordsWithCatch(s.records, catchEntry);
  assert.equal(records.heaviest?.weight, 9.5);
  assert.equal(records.carp?.weight, 9.5);

  const mRes = updateMissionsWithCatch(s.missions, s.weekly, catchEntry, [catchEntry], 9.5);
  const carpMission = mRes.missions.find((m) => m.id === 'carp');
  const bigFishMission = mRes.missions.find((m) => m.id === 'bigfish');
  assert.equal(carpMission?.completed, true);
  assert.equal(bigFishMission?.completed, true);

  const carpCup = evaluateTournament('carpCup', [catchEntry]);
  assert.equal(carpCup.qualified, true);
  assert.equal(carpCup.score, 9.5);
});

test('migrateSavedState safely hydrates partial saved objects and controlMode', () => {
  const migrated = migrateSavedState({ level: 4, money: 999 });
  assert.equal(migrated.level, 4);
  assert.equal(migrated.money, 999);
  assert.equal(migrated.controlMode, 'tap');
  assert.equal(migrated.ownedRods[0], 'Einsteiger-Angelrute');
  assert.equal(migrated.missions.length, 3);

  const migratedKeyboard = migrateSavedState({ controlMode: 'keyboard' });
  assert.equal(migratedKeyboard.controlMode, 'keyboard');
});

test('weather forecast schedules within 30 minutes and transitions on tick', () => {
  const forecast = createNextWeatherForecast('Sonnig', () => 0.4);
  assert.notEqual(forecast.nextWeather, 'Sonnig');
  assert.ok(forecast.inGameMinutesRemaining >= 15 && forecast.inGameMinutesRemaining <= 30);

  const tick1 = advanceWorldTick(
    {
      gameTime: 7.5,
      weather: 'Sonnig',
      temperature: 18,
      wind: 5,
      forecast: { nextWeather: 'Leichter Regen', nextTemperature: 14, nextWind: 11, inGameMinutesRemaining: 3 },
    },
    () => 0.5
  );
  assert.equal(tick1.weatherChanged, false);
  assert.equal(tick1.weather, 'Sonnig');
  assert.equal(tick1.forecast.inGameMinutesRemaining, 1.5);

  const tick2 = advanceWorldTick(tick1, () => 0.5);
  assert.equal(tick2.weatherChanged, true);
  assert.equal(tick2.weather, 'Leichter Regen');
  assert.equal(tick2.temperature, 14);
  assert.equal(tick2.wind, 11);
  assert.ok(tick2.forecast.inGameMinutesRemaining <= 30);
});

test('calculateTapCastDistance clamps tap coordinates to rod range', () => {
  assert.equal(calculateTapCastDistance(0.1, 80), 10);
  assert.equal(calculateTapCastDistance(0.95, 80), 80);
  assert.equal(calculateTapCastDistance(0.58, 80), 45);
});

test('redeemCode 5704 activates admin mode, max level, unlocks everything, and makes shop free', () => {
  const initial = createInitialState();
  const invalid = redeemCode(initial, '9999');
  assert.equal(invalid.ok, false);
  assert.equal(invalid.nextState.adminMode, false);
  assert.equal(invalid.nextState.level, 1);

  const valid = redeemCode(initial, ' 5704 ');
  assert.equal(valid.ok, true);
  assert.equal(valid.nextState.adminMode, true);
  assert.equal(valid.nextState.level, MAX_LEVEL);
  assert.equal(valid.nextState.ownedRods.length, RODS.length);
  assert.equal(valid.nextState.ownedLines.length, LINES.length);
  assert.equal(valid.nextState.unlocked.length, LOCATIONS.length);
  assert.ok(valid.nextState.boats.includes('Motorboot'));
  assert.equal(getMaxCastDistance(valid.nextState), 130);
  for (const b of BAITS) {
    assert.ok((valid.nextState.baits[b.name] || 0) >= 99);
  }

  const freeBait = purchaseBaitPack(valid.nextState, 'Wobbler');
  assert.equal(freeBait.ok, true);
  assert.equal(freeBait.nextState.money, valid.nextState.money);
  assert.equal(freeBait.nextState.baits.Wobbler, valid.nextState.baits.Wobbler + 10);
});

test('fishing lines, Motorboot cast range, bite window, and surge/slack difficulty behave accurately', () => {
  const state = { ...createInitialState(), level: 25, money: 5000 };
  const lineBuy = purchaseShopItem(state, 'Titan-Meeresvorfach');
  assert.equal(lineBuy.ok, true);
  assert.equal(lineBuy.nextState.currentLine, 'Titan-Meeresvorfach');
  assert.equal(getLineByName('Titan-Meeresvorfach').strengthMultiplier, 1.65);

  const motorBuy = purchaseShopItem(lineBuy.nextState, 'Motorboot');
  assert.equal(motorBuy.ok, true);
  assert.equal(getMaxCastDistance(motorBuy.nextState), 130);

  const shortWindow = getBiteWindowMs(6, 5, false, 'schwer');
  const alarmWindow = getBiteWindowMs(6, 5, true, 'schwer');
  assert.ok(alarmWindow > shortWindow);

  const chumWait = getWaitTimeMs(5, true, true, 0.15, 'schwer', () => 0.5);
  const dryWait = getWaitTimeMs(5, false, false, 0, 'schwer', () => 0.5);
  assert.ok(chumWait < dryWait);

  const slackEscape = stepFightPhysics(
    { tension: 1, stamina: 50, distance: 20, brake: 15, slackTicks: 25 },
    4,
    20,
    0.1,
    () => 0.5,
    { difficultyMode: 'schwer', lineStrength: 1 }
  );
  assert.equal(slackEscape.outcome, 'escaped');
  assert.equal(slackEscape.escapeReason, 'slack');

  const surgeReel = applyReelPull(
    { tension: 85, stamina: 60, distance: 25, brake: 60, surging: true },
    10,
    { lineStrength: 1 }
  );
  assert.ok(surgeReel.next.tension > 90);
});

test('admin panel helpers only operate when adminMode is active', () => {
  const normal = createInitialState();
  assert.equal(adminGrantMoney(normal, 5000).money, 250);
  assert.equal(adminSetLevel(normal, 25).level, 1);
  assert.equal(adminGrantFishToLogbook(normal, 'Heilbutt', true).totalCaught, 0);

  const admin = redeemCode(normal, '5704').nextState;
  const richer = adminGrantMoney(admin, 5000, 'add');
  assert.equal(richer.money, admin.money + 5000);
  const exact = adminGrantMoney(richer, 12345, 'set');
  assert.equal(exact.money, 12345);

  const lvl15 = adminSetLevel(exact, 15);
  assert.equal(lvl15.level, 15);

  const moreBait = adminGrantBait(lvl15, 'Pilker', 30);
  assert.equal(moreBait.baits.Pilker, lvl15.baits.Pilker + 30);

  const withCatch = adminGrantFishToLogbook(moreBait, 'Heilbutt', true);
  assert.equal(withCatch.totalCaught, 1);
  assert.equal(withCatch.catches[0].name, 'Heilbutt');

  const doneMissions = adminCompleteAllMissions(withCatch);
  assert.equal(doneMissions.missions.every((m) => m.completed), true);
  assert.equal(doneMissions.weekly.every((m) => m.completed), true);

  const restored = adminGrantAllContent(lvl15);
  assert.equal(restored.level, MAX_LEVEL);
  assert.equal(restored.ownedRods.length, RODS.length);
  assert.equal(restored.ownedLines.length, LINES.length);
  assert.equal(restored.unlocked.length, LOCATIONS.length);

  const exited = exitAdminModeAndReset(restored);
  assert.equal(exited.adminMode, false);
  assert.equal(exited.level, 1);
  assert.equal(exited.xp, 0);
  assert.equal(exited.money, 250);
  assert.equal(exited.totalCaught, 0);
  assert.equal(exited.catches.length, 0);
  assert.deepEqual(exited.ownedRods, ['Einsteiger-Angelrute']);
  assert.deepEqual(exited.ownedLines, ['Monofile Standard-Schnur']);
  assert.deepEqual(exited.boats, []);
  assert.deepEqual(exited.unlocked, ['waldsee']);
  assert.equal(exited.records.heaviest, null);
});

test('weather and temperature steer fish selection and transition gradually', () => {
  for (const fish of FISH_DATA) {
    assert.ok(fish.preferredWeather.length >= 1, `${fish.name} needs preferredWeather`);
    assert.ok(fish.tempRange[0] < fish.tempRange[1], `${fish.name} needs valid tempRange`);
  }

  // On Waldsee shallow: Sonnig + 21°C strongly favors warm sun fish (Rotfeder/Karausche/Rotauge),
  // whereas Bewölkt/Leichter Regen + 11°C favors cooler fish (Hecht/Schleie/Rotauge)
  const moorsee = getLocationById('moorsee');
  const coldFogCounts: Record<string, number> = {};
  const warmSunCounts: Record<string, number> = {};
  for (let i = 0; i < 40; i++) {
    const r = (i + 0.5) / 40;
    const coldFish = selectWeightedFish(moorsee, 'Wurm', 'deep', 'Nacht', 'Nebel', () => r, 6);
    coldFogCounts[coldFish.name] = (coldFogCounts[coldFish.name] || 0) + 1;

    const warmFish = selectWeightedFish(moorsee, 'Wurm', 'deep', 'Nacht', 'Sonnig', () => r, 22);
    warmSunCounts[warmFish.name] = (warmSunCounts[warmFish.name] || 0) + 1;
  }
  assert.ok((coldFogCounts['Quappe'] || 0) > (warmSunCounts['Quappe'] || 0));
  assert.ok((warmSunCounts['Wels'] || 0) > (coldFogCounts['Wels'] || 0));

  const quappe = FISH_DATA.find((f) => f.name === 'Quappe')!;
  assert.equal(isSpeciesConditionMatch(quappe, 'Nacht', 'Nebel', 7).idealNow, true);
  assert.equal(isSpeciesConditionMatch(quappe, 'Nacht', 'Sonnig', 23).idealNow, false);

  // Slow forecast pacing (20-30 min) and gradual temperature change (<= 4 °C)
  const slowForecast = createNextWeatherForecast('Sonnig', () => 0.1, 24);
  assert.ok(slowForecast.inGameMinutesRemaining >= 20 && slowForecast.inGameMinutesRemaining <= 30);
  assert.ok(Math.abs(slowForecast.nextTemperature - 24) <= 4);
});

test('achievements unlock accurately on catches, level-ups, migration, and reset cleanly', () => {
  const initial = createInitialState();
  assert.deepEqual(initial.achievements, []);
  assert.equal(getAchievementProgress('first-catch', initial), 0);

  // Admin grant fish unlocks Erster Fang + Kapitaler Brocken + Tiefsee-Bezwinger (Heilbutt ~62 kg)
  const admin = redeemCode(initial, '5704').nextState;
  const adminIds = new Set(admin.achievements.map((a) => a.id));
  assert.equal(adminIds.has('profi-angler'), true);
  assert.equal(adminIds.has('angellegende'), true);
  assert.equal(adminIds.has('fleet-captain'), true);
  assert.equal(adminIds.has('world-explorer'), true);
  assert.equal(adminIds.has('first-catch'), false);

  const afterCatch = adminGrantFishToLogbook(admin, 'Heilbutt', true);
  const afterIds = new Set(afterCatch.achievements.map((a) => a.id));
  assert.equal(afterIds.has('first-catch'), true);
  assert.equal(afterIds.has('heavy-5kg'), true);
  assert.equal(afterIds.has('heavy-20kg'), true);

  // Re-evaluating does not duplicate existing unlocked medals
  const reEval = evaluateAchievements(afterCatch);
  assert.equal(reEval.newlyUnlocked.length, 0);
  assert.equal(reEval.nextState.achievements.length, afterCatch.achievements.length);

  // Migration from older savegames without achievements unlocks earned medals automatically
  const migrated = migrateSavedState({ level: 15, totalCaught: 1, released: 5 });
  const migIds = new Set(migrated.achievements.map((a) => a.id));
  assert.equal(migIds.has('first-catch'), true);
  assert.equal(migIds.has('profi-angler'), true);
  assert.equal(migIds.has('release-5'), true);

  // Exiting admin resets achievements back to empty
  const reset = exitAdminModeAndReset(afterCatch);
  assert.deepEqual(reset.achievements, []);
});

test('server-wide events evaluate active windows, location scope, multipliers, and rare fish boost', () => {
  const now = new Date('2026-11-22T12:00:00Z');
  const makeEvent = (overrides: Partial<ServerEvent>): ServerEvent => ({
    id: 'evt-1',
    title: 'Test Event',
    description: 'Beschreibung',
    bonusType: 'xp_boost',
    locationId: 'all',
    active: true,
    startsAt: '2026-11-22T10:00:00Z',
    endsAt: '2026-11-22T18:00:00Z',
    createdByUid: 'admin-uid',
    ...overrides,
  });

  const liveGlobal = makeEvent({ id: 'live-xp', bonusType: 'xp_boost', locationId: 'all' });
  const liveLocal = makeEvent({
    id: 'live-local',
    bonusType: 'money_boost',
    locationId: 'waldsee',
  });
  const pausedEvt = makeEvent({ id: 'paused', active: false, bonusType: 'all_boost' });
  const expiredEvt = makeEvent({
    id: 'expired',
    endsAt: '2026-11-22T11:59:00Z',
    bonusType: 'rare_fish',
  });

  assert.equal(isServerEventCurrentlyLive(liveGlobal, now), true);
  assert.equal(isServerEventCurrentlyLive(pausedEvt, now), false);
  assert.equal(isServerEventCurrentlyLive(expiredEvt, now), false);

  const waldseeMods = calculateServerEventModifiers(
    [liveGlobal, liveLocal, pausedEvt, expiredEvt],
    'waldsee',
    now
  );
  assert.equal(waldseeMods.liveEvents.length, 2);
  assert.equal(waldseeMods.xpMult, 2);
  assert.equal(waldseeMods.moneyMult, 1.5);
  assert.equal(waldseeMods.activityBonus, 0);

  const karpfenseeMods = calculateServerEventModifiers(
    [liveGlobal, liveLocal, pausedEvt, expiredEvt],
    'karpfensee',
    now
  );
  assert.equal(karpfenseeMods.liveEvents.length, 1);
  assert.equal(karpfenseeMods.xpMult, 2);
  assert.equal(karpfenseeMods.moneyMult, 1);

  assert.equal(formatEventRemainingTime('2026-11-22T14:30:00Z', now), '2 Std. 30 Min.');
  assert.equal(formatEventRemainingTime('2026-11-22T11:00:00Z', now), 'Abgelaufen');
  assert.equal(formatEventRemainingTime('2026-11-24T15:00:00Z', now), '2 T. 3 Std.');

  const baseWait = getWaitTimeMs(3, false, false, 0, 'schwer', () => 0.5, 0);
  const boostedWait = getWaitTimeMs(3, false, false, 0, 'schwer', () => 0.5, 25);
  assert.ok(boostedWait < baseWait);

  // Rare fish boost shifts weighted selection toward rarity >= 3 species (e.g. Wels, Aal, Stör, Barbe in Großer Fluss)
  const fluss = getLocationById('fluss');
  let normalRare = 0;
  let boostedRare = 0;
  for (let i = 0; i < 60; i++) {
    const r = (i + 0.5) / 60;
    const fNormal = selectWeightedFish(fluss, 'Wurm', 'deep', 'Nacht', 'Bewölkt', () => r, 16);
    const fBoosted = selectWeightedFish(fluss, 'Wurm', 'deep', 'Nacht', 'Bewölkt', () => r, 16, {
      rareFishBoost: 2.5,
    });
    if (fNormal.rarity >= 3) normalRare += 1;
    if (fBoosted.rarity >= 3) boostedRare += 1;
  }
  assert.ok(boostedRare > normalRare);

  // luck_boost server event increases rareFishBoost, weightLuckBias, moneyMult, and activityBonus
  const luckEvt = makeEvent({ id: 'live-luck', bonusType: 'luck_boost', locationId: 'all' });
  const luckMods = calculateServerEventModifiers([luckEvt], 'waldsee', now);
  assert.ok(luckMods.rareFishBoost >= 2);
  assert.ok(luckMods.weightLuckBias >= 0.4);
  assert.equal(luckMods.activityBonus, 15);
  assert.equal(luckMods.moneyMult, 1.25);

  // rollLuckWeightedRatio favors heavier fish when luckFactor > 0
  assert.ok(rollLuckWeightedRatio(0.5, () => 0.25) > 0.25);
  assert.equal(rollLuckWeightedRatio(0, () => 0.25), 0.25);

  // Personal admin luck only applies in adminMode and resets on exit/migration
  const nonAdmin = createInitialState();
  assert.equal(adminSetLuckMultiplier(nonAdmin, 5).adminLuckMultiplier, 1);
  const admin = redeemCode(nonAdmin, '5704').nextState;
  const luckyAdmin = adminSetLuckMultiplier(admin, 5);
  assert.equal(luckyAdmin.adminLuckMultiplier, 5);
  assert.equal(exitAdminModeAndReset(luckyAdmin).adminLuckMultiplier, 1);
  assert.equal(migrateSavedState({ adminMode: false, adminLuckMultiplier: 5 }).adminLuckMultiplier, 1);
});




