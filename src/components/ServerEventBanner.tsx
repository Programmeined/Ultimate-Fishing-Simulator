import { Clock, Globe, MapPin, Sparkles } from 'lucide-react';
import {
  formatEventRemainingTime,
  getLocationById,
  SERVER_EVENT_BONUS_INFO,
} from '../game/rules';
import type { ServerEvent } from '../game/types';

interface ServerEventBannerProps {
  events: ServerEvent[];
  currentLocationId: string;
}

export function ServerEventBanner({ events, currentLocationId }: ServerEventBannerProps) {
  if (events.length === 0) return null;

  return (
    <section
      data-testid="server-event-banner"
      aria-label="Aktive Server-Events"
      className="mb-4 space-y-2"
    >
      {events.map((evt) => {
        const bonusInfo = SERVER_EVENT_BONUS_INFO[evt.bonusType];
        const isGlobal = evt.locationId === 'all';
        const locName = isGlobal ? 'Alle Gewässer' : getLocationById(evt.locationId).name;
        const appliesHere = isGlobal || evt.locationId === currentLocationId;
        const remaining = formatEventRemainingTime(evt.endsAt);

        return (
          <div
            key={evt.id}
            className="rounded-xl panel-surface border border-[rgba(229,189,112,0.45)] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e5bd70] text-[#171208]">
                  <Sparkles className="w-3 h-3" />
                  <span>Server-Event</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1d332d] text-[#8fb886] border border-[rgba(143,184,134,0.3)]">
                  {bonusInfo.shortBadge}
                </span>
                <span
                  className={`inline-flex items-center gap-1 ${
                    appliesHere ? 'text-[#edf3ed]' : 'text-[#9eb2a8]'
                  }`}
                >
                  {isGlobal ? <Globe className="w-3 h-3 text-[#8fb886]" /> : <MapPin className="w-3 h-3 text-[#e5bd70]" />}
                  <span>{locName}</span>
                  {!appliesHere && <span className="text-[#9eb2a8]">(anderes Gebiet)</span>}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h2 className="font-display text-base font-semibold text-[#edf3ed] truncate">
                  {evt.title}
                </h2>
                {evt.description && (
                  <p className="text-xs text-[#cbd8d1] truncate max-w-2xl">{evt.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono-num text-[#e5bd70] shrink-0 bg-[#0d1819]/80 border border-[rgba(208,232,220,0.14)] rounded-lg px-2.5 py-1.5 self-start sm:self-center">
              <Clock className="w-3.5 h-3.5 text-[#8fb886]" />
              <span>Noch {remaining}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
