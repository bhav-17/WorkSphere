export type TransitMode = 'foot' | 'bike' | 'bus' | 'rail' | 'metro' | 'car_ice';

export interface CarbonCalculationInput {
  distanceKm: number;
  mode: TransitMode;
  iceBaselineGramsPerKm?: number;
}

export interface CarbonCalculationResult {
  mode: TransitMode;
  distanceKm: number;
  iceBaselineGrams: number;
  modeEmissionGrams: number;
  carbonSavedGrams: number;
}

export interface CarbonReportRow {
  date: string;
  venue: string;
  transitMode: string;
  distanceKm: number | null;
  co2eSavedKg: number;
}

export const EMISSION_GRAMS_PER_PKM: Record<TransitMode, number> = {
  foot: 0,
  bike: 0,
  rail: 35,
  metro: 28,
  bus: 68,
  car_ice: 192,
};

export const DEFAULT_ICE_BASELINE_GRAMS_PER_KM = EMISSION_GRAMS_PER_PKM.car_ice;

export function calculateCarbonSavings(
  input: CarbonCalculationInput
): CarbonCalculationResult {
  const safeKm = Math.max(0, Number.isFinite(input.distanceKm) ? input.distanceKm : 0);
  const baselineRate =
    input.iceBaselineGramsPerKm ?? DEFAULT_ICE_BASELINE_GRAMS_PER_KM;
  const modeRate = EMISSION_GRAMS_PER_PKM[input.mode] ?? 0;

  const iceBaselineGrams = Math.round(safeKm * baselineRate * 100) / 100;
  const modeEmissionGrams = Math.round(safeKm * modeRate * 100) / 100;
  const carbonSavedGrams =
    Math.round(Math.max(0, iceBaselineGrams - modeEmissionGrams) * 100) / 100;

  return {
    mode: input.mode,
    distanceKm: Math.round(safeKm * 1000) / 1000,
    iceBaselineGrams,
    modeEmissionGrams,
    carbonSavedGrams,
  };
}

const CSV_FORMULA_PREFIX = /^[\u0000-\u0020]*[=+@-]/;

function escapeCsvCell(value: string | number): string {
  let cell = String(value ?? '');

  // Prefix formula-like text so spreadsheet applications treat it as data.
  if (CSV_FORMULA_PREFIX.test(cell)) {
    cell = `'${cell}`;
  }

  return `"${cell.replace(/"/g, '""')}"`;
}

export function stringifyCarbonReportCsv(rows: CarbonReportRow[]): string {
  const headers = ['Date', 'Venue', 'Transit Mode', 'KM', 'CO2e Saved (kg)'];
  const records = rows.map((row) => [
    row.date,
    row.venue,
    row.transitMode,
    row.distanceKm !== null && Number.isFinite(row.distanceKm) ? row.distanceKm : '',
    Number.isFinite(row.co2eSavedKg) ? row.co2eSavedKg : '',
  ]);

  return [headers, ...records]
    .map((record) => record.map(escapeCsvCell).join(','))
    .join('\r\n');
}
