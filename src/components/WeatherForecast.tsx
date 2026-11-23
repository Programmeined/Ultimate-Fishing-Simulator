import { Cloud, CloudFog, CloudRain, CloudSun, Wind } from 'lucide-react';
import { formatClock } from '../game/rules';
import type { WeatherForecast as WeatherForecastType, WeatherType } from '../game/types';

interface WeatherForecastProps {
  gameTime: number;
  forecast: WeatherForecastType;
}

function WeatherIcon({ weather }: { weather: WeatherType }) {
  if (weather === 'Sonnig') return <CloudSun className="w-4 h-4 text-[#e5bd70] shrink-0" />;
  if (weather === 'Bewölkt') return <Cloud className="w-4 h-4 text-[#a8b8b0] shrink-0" />;
  if (weather === 'Nebel') return <CloudFog className="w-4 h-4 text-[#b5c7be] shrink-0" />;
  if (weather === 'Windig') return <Wind className="w-4 h-4 text-[#8fb886] shrink-0" />;
  return <CloudRain className="w-4 h-4 text-[#8eb8c4] shrink-0" />;
}

export function WeatherForecast({ gameTime, forecast }: WeatherForecastProps) {
  const minutesLeft = Math.max(1, Math.ceil(forecast.inGameMinutesRemaining));
  const targetTime = (gameTime + forecast.inGameMinutesRemaining / 60) % 24;

  return (
    <div
      data-testid="weather-forecast"
      aria-label="Wettervorhersage für die nächsten 30 Spielminuten"
      className="rounded-xl panel-surface border border-[rgba(208,232,220,0.16)] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
    >
      <div className="flex items-center gap-2 text-[#9eb2a8]">
        <WeatherIcon weather={forecast.nextWeather} />
        <span className="font-medium text-[#d6e2dc]">Wetter-Vorhersage (nächste 30 Min.)</span>
        <span aria-hidden="true">·</span>
        <span>
          Nächster Wechsel in <strong className="font-mono-num text-[#edf3ed]">{minutesLeft} Min.</strong>{' '}
          <span className="font-mono-num text-[#9eb2a8]">(ca. {formatClock(targetTime)} Uhr)</span>
        </span>
      </div>

      <div className="flex items-center gap-3 font-mono-num text-[#edf3ed]">
        <span className="font-sans font-semibold text-[#e5bd70]">{forecast.nextWeather}</span>
        <span aria-hidden="true" className="text-[#70867d]">·</span>
        <span>{forecast.nextTemperature} °C</span>
        <span aria-hidden="true" className="text-[#70867d]">·</span>
        <span>{forecast.nextWind} km/h</span>
      </div>
    </div>
  );
}
