// How each reading is drawn: the band a value falls in, its colour tone and a short, calm name for it. The numbers come from the
// server; these tables only say which band a value falls in, using the published US AQI, WHO UV index, US EPA PM and NWS heat
// index bands. They describe the reading; they give no advice.

export type Tone = 'cool' | 'good' | 'watch' | 'high' | 'severe';

// The word for a tone, used where a one-word status is wanted (for example the air quality chip).
export const TONE_WORD: Record<Tone, string> = {
  cool: 'Low',
  good: 'Normal',
  watch: 'Watch',
  high: 'High',
  severe: 'Critical',
};

export interface Band {
  // Upper edge of the band. The last band has no edge.
  upTo: number | null;
  tone: Tone;
  // The name of the band, in the words of the US AQI scale.
  label: string;
  // A shorter name for a small chip, when the full one is long.
  short?: string;
  // One gentle sentence about the reading, shown on the air quality card.
  sentence?: string;
}

export interface Scale {
  // Lower edge of the first band and upper edge of the last band, only used to place a value inside an open-ended band.
  min: number;
  max: number;
  bands: Band[];
}

export type ScaleName = 'aqi' | 'uv' | 'pm25' | 'pm10' | 'temperature' | 'feelsLike' | 'humidity';

export const SCALES: Record<ScaleName, Scale> = {
  aqi: {
    min: 0,
    max: 500,
    bands: [
      { upTo: 50, tone: 'good', label: 'Good', sentence: 'The air is clean and fresh. A good day to be outdoors.' },
      { upTo: 100, tone: 'watch', label: 'Moderate', sentence: 'Air quality is acceptable. Very sensitive people may notice mild effects.' },
      { upTo: 150, tone: 'high', label: 'Unhealthy for Sensitive Groups', short: 'Sensitive groups', sentence: 'Sensitive respiratory groups may notice mild irritation outdoors today.' },
      { upTo: 200, tone: 'high', label: 'Unhealthy', sentence: 'Many people may notice irritation outdoors. Shorter time outside may feel better.' },
      { upTo: 300, tone: 'severe', label: 'Very Unhealthy', sentence: 'The air is heavily polluted. Keeping outdoor time to a minimum may feel better.' },
      { upTo: null, tone: 'severe', label: 'Hazardous', sentence: 'The air is dangerously polluted. Staying indoors with windows closed may feel best.' },
    ],
  },
  uv: {
    min: 0,
    max: 12,
    bands: [
      { upTo: 3, tone: 'good', label: 'Low' },
      { upTo: 6, tone: 'watch', label: 'Moderate' },
      { upTo: 8, tone: 'high', label: 'High' },
      { upTo: 11, tone: 'severe', label: 'Very high' },
      { upTo: null, tone: 'severe', label: 'Extreme' },
    ],
  },
  pm25: {
    min: 0,
    max: 250,
    bands: [
      { upTo: 12, tone: 'good', label: 'Ideal' },
      { upTo: 35.4, tone: 'watch', label: 'Fair' },
      { upTo: 55.4, tone: 'high', label: 'Above ideal' },
      { upTo: 150, tone: 'high', label: 'Elevated' },
      { upTo: null, tone: 'severe', label: 'Very high' },
    ],
  },
  pm10: {
    min: 0,
    max: 430,
    bands: [
      { upTo: 54, tone: 'good', label: 'Ideal' },
      { upTo: 154, tone: 'watch', label: 'Fair' },
      { upTo: 254, tone: 'high', label: 'Above ideal' },
      { upTo: 354, tone: 'high', label: 'Elevated' },
      { upTo: null, tone: 'severe', label: 'Very high' },
    ],
  },
  temperature: {
    min: -5,
    max: 50,
    bands: [
      { upTo: 10, tone: 'cool', label: 'Cool' },
      { upTo: 30, tone: 'good', label: 'Comfortable' },
      { upTo: 35, tone: 'watch', label: 'Warm' },
      { upTo: 40, tone: 'high', label: 'Hot' },
      { upTo: null, tone: 'severe', label: 'Very hot' },
    ],
  },
  feelsLike: {
    min: 0,
    max: 60,
    bands: [
      { upTo: 27, tone: 'good', label: 'Balanced' },
      { upTo: 32, tone: 'watch', label: 'Warm' },
      { upTo: 41, tone: 'high', label: 'Hot' },
      { upTo: null, tone: 'severe', label: 'Very hot' },
    ],
  },
  humidity: {
    min: 0,
    max: 100,
    bands: [
      { upTo: 30, tone: 'watch', label: 'Dry' },
      { upTo: 60, tone: 'good', label: 'Optimal' },
      { upTo: 70, tone: 'watch', label: 'Humid' },
      { upTo: null, tone: 'high', label: 'Very humid' },
    ],
  },
};

// What each reading measures, in plain words. Shown when a tile is opened.
export const ABOUT: Record<ScaleName, string> = {
  aqi: 'The US Air Quality Index combines the main air pollutants into one scale from 0 to 500. Lower is cleaner.',
  uv: 'The UV index shows how strong the sun’s rays are. The higher it is, the faster unprotected skin can burn.',
  pm25: 'Fine particles smaller than 2.5 micrometres. They are small enough to be breathed deep into the lungs.',
  pm10: 'Dust and other particles smaller than 10 micrometres, such as road dust and pollen.',
  temperature: 'The air temperature right now.',
  feelsLike: 'How warm it feels once humidity and wind are taken into account.',
  humidity: 'How much water vapour is in the air. Very dry or very humid air can feel less comfortable.',
};

export interface Placement {
  // Where the marker sits along the meter, 0 to 1. Each band takes an equal share of the width.
  position: number;
  band: Band;
  index: number;
}

// Finds the band a value falls in, and where inside the meter it sits. Bands have equal width on screen, so a narrow band
// is as easy to read as a wide one; inside a band the marker moves in proportion to the value.
export function place(scale: Scale, value: number): Placement {
  const count = scale.bands.length;
  let index = scale.bands.findIndex((b) => b.upTo !== null && value <= b.upTo);
  if (index < 0) index = count - 1;
  const low = index === 0 ? scale.min : (scale.bands[index - 1].upTo as number);
  const high = scale.bands[index].upTo ?? scale.max;
  const within = high > low ? Math.min(Math.max((value - low) / (high - low), 0), 1) : 0;
  return { position: Math.min((index + within) / count, 1), band: scale.bands[index], index };
}

const ORDER: Tone[] = ['cool', 'good', 'watch', 'high', 'severe'];

// The most serious tone among the readings. A cool reading never raises it.
export function worstTone(tones: Tone[]): Tone {
  return tones.reduce<Tone>((worst, tone) => (ORDER.indexOf(tone) > ORDER.indexOf(worst) && tone !== 'cool' ? tone : worst), 'good');
}

// The heat index is shown as "feels like". Only the gap to the air temperature is worth a note.
export function feelsLikeNote(temperature: number | null | undefined, feelsLike: number | null | undefined): string | null {
  if (temperature == null || feelsLike == null) return null;
  const gap = Math.round(feelsLike - temperature);
  if (gap >= 2) return `${gap}° warmer than the air`;
  if (gap <= -2) return `${Math.abs(gap)}° cooler than the air`;
  return null;
}

const round = (v: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

export const fmt = {
  aqi: (v: number) => String(round(v)),
  micro: (v: number) => `${round(v, 1)} µg/m³`,
  uv: (v: number) => String(round(v, 1)),
  celsius: (v: number) => `${round(v, 1)} °C`,
  percent: (v: number) => `${round(v)}%`,
};
