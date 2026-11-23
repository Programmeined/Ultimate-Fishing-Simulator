import { useState } from 'react';
import {
  Anchor,
  Award,
  Backpack,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Fish,
  GraduationCap,
  Keyboard,
  Layers,
  MousePointerClick,
  Radio,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type { NavPage } from '../game/types';

interface TutorialViewProps {
  controlMode: 'tap' | 'keyboard';
  difficultyMode: 'standard' | 'schwer';
  onNavigate: (page: NavPage) => void;
}

interface TutorialStep {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Anchor;
  summary: string;
  bullets: Array<{ heading: string; text: string }>;
  tip: string;
  actionLabel: string;
  actionPage: NavPage;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'world-clock',
    title: '1. Echtzeit-Uhrzeit, Wetter & Fischaktivität',
    subtitle: 'Wie Tageszeit und Klima dein Angeln beeinflussen',
    icon: Clock,
    summary:
      'Die Uhr im Spiel läuft synchron zu deiner echten Systemzeit (Echtzeit). Je nach Tageszeit und Wetter beißen bestimmte Fischarten deutlich häufiger.',
    bullets: [
      {
        heading: 'Echtzeit-Tagesphasen',
        text: 'Morgen (05–08 Uhr) und Abend (17–21 Uhr) bringen +18 % höhere Fischaktivität – ideal für Raubfische wie Zander, Aal oder Hecht. Nachts sinkt die Aktivität leicht, doch Wels und Aal bleiben aktiv.',
      },
      {
        heading: 'Wetter, Temperatur & Fischauswahl',
        text: 'Jede Fischart bevorzugt bestimmtes Wetter und einen eigenen Temperaturbereich: Bei Sonne & Wärme beißen z. B. Karpfen oder Rotfeder häufiger, bei Regen, Nebel & Kühle eher Forelle, Quappe, Zander oder Aal. Wetterwechsel erfolgen langsam alle 20–30 Minuten.',
      },
      {
        heading: 'Himmel & Wasser im Live-Bild',
        text: 'Die Gewässeransicht passt Lichtstimmung, Sonne, Wolken, Regen und Nebel automatisch an die aktuelle Echtzeit-Phase und das Wetter an.',
      },
    ],
    tip: 'Schau vor dem Auswerfen kurz ins Fischlexikon: Dort siehst du zu jeder Art die beste Tageszeit, Tiefe und den Lieblingsköder.',
    actionLabel: 'Zum Fischlexikon',
    actionPage: 'encyclopedia',
  },
  {
    id: 'gear-setup',
    title: '2. Angel vorbereiten: Rute, Schnur, Köder & Tiefe',
    subtitle: 'Die richtige Zusammenstellung vor jedem Wurf',
    icon: Backpack,
    summary:
      'Im linken Deck „Angel vorbereiten“ stellst du dein Setup passend zum Gewässer und deinem Zielfisch zusammen.',
    bullets: [
      {
        heading: 'Angelrute & Angelschnur',
        text: 'Stärkere Ruten erhöhen die Einholkraft und erlauben schwerere Fische. Hochwertige Schnüre (z. B. Fluorocarbon, Geflochtene Pro oder Titan-Meeresvorfach) erhöhen die Tragkraft und verringern das Misstrauen der Fische (kürzere Wartezeit).',
      },
      {
        heading: '15 Ködersorten',
        text: 'Friedfische mögen Wurm, Mais, Maden, Brot, Käse oder Boilies. Raubfische reagieren stark auf Blinker, Spinner, Wobbler, Gummifisch oder Köderfisch. Für Küste und Hochsee gibt es Heringsfetzen, Krabbe, Wattwurm und Pilker.',
      },
      {
        heading: 'Angeltiefe & Wurfweite',
        text: 'Wähle Flach (0,5–1 m), Mittel (1–3 m) oder Tief (3–7 m) passend zum Fisch. Mit dem Regler „Wurfweite“ bestimmst du die Distanz (Standard bis 80 m, mit Ruderboot bis 105 m, mit Motorboot bis 130 m).',
      },
    ],
    tip: 'Wenn dir ein Köder ausgeht, wählt das Spiel automatisch den nächsten verfügbaren Köder – oder kaufe Nachschub im Shop.',
    actionLabel: 'Zur Ausrüstung',
    actionPage: 'equipment',
  },
  {
    id: 'controls',
    title: '3. Auswerfen & Biss: Tippen oder Tastatur',
    subtitle: 'Zwei vollständige Steuerungsmodi jederzeit wählbar',
    icon: MousePointerClick,
    summary:
      'Du entscheidest selbst in den Einstellungen, ob du komplett durch Tippen auf das Wasser spielst oder klassisch mit der Tastatur.',
    bullets: [
      {
        heading: 'Steuerung „Bildschirm-Tippen“',
        text: 'Tippe im Ruhezustand direkt auf das Wasser (weiter rechts = größere Wurfweite), um auszuwerfen. Bei einem Biss leuchtet die Pose – tippe sofort auf das Wasser oder die Schaltfläche, um anzuschlagen.',
      },
      {
        heading: 'Steuerung „Tastatur“',
        text: 'Leertaste: Auswerfen / Anschlagen / Kurbeln · Enter: Fisch landen · A/D oder Pfeile Links/Rechts: Bremskraft einstellen · W/S oder Pfeile Hoch/Runter: Wurfweite vor dem Wurf wählen · E: Angel einholen.',
      },
      {
        heading: 'Globale Kurztasten',
        text: 'Mit P oder Esc pausierst du jederzeit das Spiel, mit M schaltest du den Ton stumm oder wieder ein.',
      },
    ],
    tip: 'Über die Schaltfläche „Steuerung: Tippen / Tastatur“ oben in der Angel-Ansicht springst du direkt zum Umschalten in die Einstellungen.',
    actionLabel: 'Steuerung in Einstellungen wählen',
    actionPage: 'settings',
  },
  {
    id: 'fight-difficulty',
    title: '4. Der Drill, Bremskraft & Modus „Schwer“',
    subtitle: 'Spannung halten, Fluchten abfangen und sicher landen',
    icon: ShieldAlert,
    summary:
      'Sobald der Fisch hängt, beginnt der Drill. Achte gleichzeitig auf Schnurspannung, Fisch-Ausdauer, Bremskraft und Entfernung.',
    bullets: [
      {
        heading: 'Schnurspannung & Bremse',
        text: 'Steigt die Spannung über 95 %, reißt die Schnur! Halte sie idealerweise im grünen/gelben Bereich. Eine niedrigere Bremskraft schont die Schnur bei großen Fischen, während höhere Bremskraft den Fisch schneller ermüdet.',
      },
      {
        heading: 'Fischfluchten & schlaffe Schnur (Modus „Schwer“)',
        text: 'Im standardmäßig aktiven Modus „Schwer (Realistisch)“ starten Fische plötzliche Fluchten („flieht!“) – kurble dann kurz NICHT, sonst schnellt die Spannung hoch. Lässt du die Spannung zu lange auf ~0–4 % abfallen, schlitzt der Haken durch schlaffe Schnur aus!',
      },
      {
        heading: 'Landen, Verkaufen oder Catch & Release',
        text: 'Bei ≤ 3,5 m Entfernung (≤ 6 m mit Kescher-Upgrade) oder erschöpftem Fisch kannst du „Fisch landen“ auslösen. Danach wählst du: Verkaufen für Euro (€) oder Catch & Release für extra XP (35 XP mit Abhakmatte statt 20 XP).',
      },
    ],
    tip: 'Ist dir „Schwer (Realistisch)“ am Anfang zu anspruchsvoll, kannst du in den Einstellungen jederzeit auf „Standard“ wechseln.',
    actionLabel: 'Jetzt am Wasser testen',
    actionPage: 'fishing',
  },
  {
    id: 'spot-tools',
    title: '5. Angelplatz-Werkzeuge: Anfüttern, Echolot & Kamera',
    subtitle: 'Wartezeiten verkürzen und Fischschwärme aufspüren',
    icon: Radio,
    summary:
      'Im rechten Deck „Angelplatz-Analyse“ stehen dir drei taktische Werkzeuge zur Verfügung, um gezielter und schneller zu fangen.',
    bullets: [
      {
        heading: 'Anfüttern (15 € / 90 Sekunden)',
        text: 'Erhöht die lokale Fischaktivität und verkürzt die Wartezeit bis zum Biss spürbar. Mit dem „Futterkorb-Set“ aus dem Shop fällt der Boost noch stärker aus.',
      },
      {
        heading: 'Echolot scannen',
        text: 'Sendet Sonarimpulse ins Wasser und zeigt dir erkannte Fischsignale sowie Tiefe und Grundbeschaffenheit. Mit dem Echolot-Upgrade aus dem Shop wird die Erkennung präziser.',
      },
      {
        heading: 'Unterwasserblick',
        text: 'Öffnet die Unterwasserkamera und zeigt dir live, welche Fischarten am aktuellen Gewässer vorkommen.',
      },
    ],
    tip: 'Kombiniere Anfüttern mit der passenden Tiefe und einem von der Zielart bevorzugten Köder für maximale Bissfrequenz.',
    actionLabel: 'Angelplatz öffnen',
    actionPage: 'fishing',
  },
  {
    id: 'progression-shop',
    title: '6. Gewässer, Shop, Boote, Missionen & Turniere',
    subtitle: 'Langfristiger Aufstieg von Level 1 bis Level 30',
    icon: Compass,
    summary:
      'Jeder Fang und jede abgeschlossene Mission bringt dir Erfahrungspunkte (XP) und Geld für bessere Ausrüstung und neue Angelreviere.',
    bullets: [
      {
        heading: '8 Angelgebiete bis Hochsee-Fjord',
        text: 'Du startest am Waldsee (Lvl 1). Mit steigendem Level schaltest du Karpfensee (Lvl 5), Forellenfluss (Lvl 8), Bergsee (Lvl 10), Moorsee (Lvl 12), Großer Strom (Lvl 15), Boddengewässer (Lvl 17) und Hochsee-Fjord (Lvl 20) frei.',
      },
      {
        heading: 'Shop & Boote',
        text: 'Investiere Preisgelder in stärkere Ruten, Tragkraft-Schnüre, Kescher-Upgrade, Bissanzeiger Pro, Abhakmatte, Futterkorb-Set, Ruderboot (105 m) und Motorboot (130 m).',
      },
      {
        heading: 'Missionen, Fangbuch, Rekorde & Turniere',
        text: 'Hol dir in „Missionen“ tägliche und wöchentliche Belohnungen ab. Im „Fangbuch“ und unter „Rekorde“ werden deine Bestwerte gespeichert, und in 4 „Turnieren“ (bis zum Hochsee-Giganten-Cup) gewinnst du hohe Preisgelder.',
      },
    ],
    tip: 'Ein Bissanzeiger Pro verlängert das Zeitfenster beim Biss deutlich – ideal für seltene Raubfische in Gewässern mit starker Strömung.',
    actionLabel: 'Zum Shop',
    actionPage: 'shop',
  },
  {
    id: 'settings-admin',
    title: '7. Einstellungen & Geheimcodes',
    subtitle: 'Spielstand verwalten, testen & zurücksetzen',
    icon: Settings,
    summary:
      'Dein Spielstand wird automatisch im Browser gespeichert. In den Einstellungen passt du alles an deine Spielweise an.',
    bullets: [
      {
        heading: 'Speicherstand & Audio',
        text: 'Du kannst deinen Fortschritt manuell speichern, zurücksetzen oder Soundlautstärke und Stummschaltung regulieren.',
      },
      {
        heading: 'Geheimcode einlösen (5704)',
        text: 'Unter „Codes & Admin-Modus“ kannst du über „Code eingeben“ besondere Modi freischalten. Im Admin-Modus sind alle Inhalte gratis und ein separates „Admin-Panel“ erscheint in der Navigation.',
      },
      {
        heading: 'Admin-Modus wieder verlassen',
        text: 'Möchtest du später wieder komplett fair von vorn beginnen, kannst du den Admin-Modus im Admin-Panel oder in den Einstellungen verlassen – dabei wird alles auf Level 1 zurückgesetzt.',
      },
    ],
    tip: 'Du kannst dieses Tutorial jederzeit wieder über „Tutorial“ in der Seitenleiste oder über die Angel-Ansicht öffnen.',
    actionLabel: 'Zu den Einstellungen',
    actionPage: 'settings',
  },
];

export function TutorialView({
  controlMode,
  difficultyMode,
  onNavigate,
}: TutorialViewProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const current = TUTORIAL_STEPS[stepIndex];
  const Icon = current.icon;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#e5bd70] flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Vollständige Spielanleitung</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#edf3ed] mt-0.5">
            Tutorial &amp; Erklärungen
          </h1>
          <p className="text-sm text-[#9eb2a8]">
            Schritt für Schritt alle Mechaniken, Steuerungen, Taktiken und Menüs verständlich erklärt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="tutorial-toggle-all"
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#142425] hover:bg-[#1e3534] border border-[rgba(208,232,220,0.18)] text-xs font-semibold text-[#edf3ed] whitespace-nowrap cursor-pointer transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[#e5bd70]" />
            <span>{showAll ? 'Einzelansicht (Schritte)' : 'Alle Kapitel anzeigen'}</span>
          </button>

          <button
            type="button"
            data-testid="tutorial-start-fishing"
            onClick={() => onNavigate('fishing')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#e5bd70] hover:bg-[#edd08e] text-[#171208] text-xs font-bold whitespace-nowrap cursor-pointer transition-colors"
          >
            <Anchor className="w-3.5 h-3.5" />
            <span>Direkt zum Angeln</span>
          </button>
        </div>
      </div>

      {/* Live Quick-Status Strip */}
      <div className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#cbd8d1]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            {controlMode === 'tap' ? (
              <MousePointerClick className="w-3.5 h-3.5 text-[#e5bd70]" />
            ) : (
              <Keyboard className="w-3.5 h-3.5 text-[#e5bd70]" />
            )}
            <span>
              Aktive Steuerung:{' '}
              <strong className="text-[#edf3ed]">
                {controlMode === 'tap' ? 'Bildschirm-Tippen' : 'Tastatur'}
              </strong>
            </span>
          </span>
          <span aria-hidden="true" className="text-[#5e736a]">·</span>
          <span>
            Schwierigkeit:{' '}
            <strong className="text-[#edf3ed]">
              {difficultyMode === 'schwer' ? 'Schwer (Realistisch)' : 'Standard'}
            </strong>
          </span>
        </div>
        <span className="text-[#8fb886] font-medium">Uhrzeit: Echtzeit aktiv</span>
      </div>

      {!showAll ? (
        <>
          {/* Step Selector Pills (Numbered Chapter Tabs) */}
          <div
            role="tablist"
            aria-label="Tutorial-Kapitel"
            className="flex flex-wrap gap-1.5"
          >
            {TUTORIAL_STEPS.map((step, idx) => {
              const active = idx === stepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`tutorial-tab-${idx}`}
                  onClick={() => setStepIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#223937] text-[#e5bd70] border-[rgba(229,189,112,0.4)] font-semibold'
                      : 'bg-[#101c1d] hover:bg-[#182928] text-[#9eb2a8] border-[rgba(208,232,220,0.12)]'
                  }`}
                >
                  Schritt {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Active Step Detail Card */}
          <section
            data-testid="tutorial-active-card"
            className="rounded-xl bg-[#142425] border border-[rgba(208,232,220,0.16)] p-5 sm:p-6 space-y-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1e3534] border border-[rgba(229,189,112,0.28)] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#e5bd70]" />
                </div>
                <div>
                  <div className="text-xs font-mono-num text-[#8fb886] font-semibold">
                    Schritt {stepIndex + 1} von {TUTORIAL_STEPS.length}
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#edf3ed]">
                    {current.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#9eb2a8] mt-0.5">{current.subtitle}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-[#d6e2dc] leading-relaxed">{current.summary}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {current.bullets.map((b) => (
                <div
                  key={b.heading}
                  className="rounded-xl bg-[#0e191a] border border-[rgba(208,232,220,0.12)] p-4 space-y-1.5"
                >
                  <div className="text-sm font-semibold text-[#e5bd70] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8fb886] shrink-0" />
                    <span>{b.heading}</span>
                  </div>
                  <p className="text-xs text-[#b7c7bf] leading-relaxed">{b.text}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-[#182c2a] border border-[rgba(143,184,134,0.28)] px-4 py-3 text-xs text-[#d6e2dc] flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#8fb886] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#8fb886]">Praxis-Tipp:</strong> {current.tip}
              </div>
            </div>

            {/* Step Footer Controls */}
            <div className="pt-2 border-t border-[rgba(208,232,220,0.12)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="tutorial-prev-btn"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-[#1e3534] hover:bg-[#2a4746] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-[#edf3ed] border border-[rgba(208,232,220,0.16)] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Zurück</span>
                </button>
                <button
                  type="button"
                  data-testid="tutorial-next-btn"
                  disabled={stepIndex === TUTORIAL_STEPS.length - 1}
                  onClick={() =>
                    setStepIndex((i) => Math.min(TUTORIAL_STEPS.length - 1, i + 1))
                  }
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-[#8fb886] hover:bg-[#a1c998] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-[#09140d] cursor-pointer"
                >
                  <span>Weiter</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigate(current.actionPage)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#223937] hover:bg-[#2d4a48] text-[#e5bd70] text-xs font-semibold border border-[rgba(229,189,112,0.28)] cursor-pointer"
              >
                <span>{current.actionLabel}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        </>
      ) : (
        <div className="space-y-3" data-testid="tutorial-all-list">
          {TUTORIAL_STEPS.map((step) => {
            const StepIcon = step.icon;
            return (
              <section
                key={step.id}
                className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <StepIcon className="w-4 h-4 text-[#e5bd70] shrink-0" />
                    <h2 className="text-base font-semibold text-[#edf3ed]">{step.title}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate(step.actionPage)}
                    className="text-xs font-semibold text-[#e5bd70] hover:underline cursor-pointer"
                  >
                    {step.actionLabel} →
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-[#cbd8d1]">{step.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {step.bullets.map((b) => (
                    <div
                      key={b.heading}
                      className="rounded-lg bg-[#0e191a] border border-[rgba(208,232,220,0.1)] p-3 space-y-1"
                    >
                      <div className="text-xs font-semibold text-[#8fb886]">{b.heading}</div>
                      <p className="text-xs text-[#a8b8b0] leading-relaxed">{b.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Quick Nav Footer Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Fischlexikon (32 Arten)', page: 'encyclopedia' as NavPage, icon: Fish },
          { label: 'Shop & Boote', page: 'shop' as NavPage, icon: ShoppingBag },
          { label: 'Missionen & Fangbuch', page: 'missions' as NavPage, icon: BookOpen },
          { label: 'Turniere', page: 'tournaments' as NavPage, icon: Award },
        ].map((item) => {
          const NavIcon = item.icon;
          return (
            <button
              key={item.page}
              type="button"
              onClick={() => onNavigate(item.page)}
              className="rounded-xl bg-[#142425] hover:bg-[#1c3233] border border-[rgba(208,232,220,0.14)] px-3.5 py-2.5 text-left flex items-center gap-2 text-xs font-medium text-[#edf3ed] cursor-pointer transition-colors"
            >
              <NavIcon className="w-4 h-4 text-[#e5bd70] shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
