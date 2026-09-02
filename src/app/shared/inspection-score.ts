// inspection-score.ts
// One scoring engine shared by the AVO inspection page and the QC pages.
//
// This is a direct port of CalculateSystemScoreOrNull / MapVerdict /
// GetScoreDisplayFromDouble in ProntoPDFGeneration's PdfReportService.cs. The
// numbers a user sees on the AVO page must be the numbers printed on the report,
// so any change here has to be mirrored there — and vice versa.
//
// EVERY FIELD IS SCORED, including the OTHER SYSTEMS entries. NO counts as 1/10,
// so answering NO does pull the section down — which is what a reviewer expects
// when they look at a card full of NOs.
//
// Where an item genuinely does not apply to the vehicle — no air conditioner was
// ever fitted, a crash guard was never part of the spec — the answer is N/A, not
// NO. N/A is excluded from the average rather than scored zero, so it neither
// rewards nor penalises. That is the lever for "this isn't a defect"; the field
// list itself makes no such judgement.
//
// Verified against a real report (TS15UD1953, REF PM-519499-K):
//   BASIC SYSTEMS  9×GOOD + 1×AVERAGE → (8.5×9 + 5.5)/10 = 8.2   ✓ matches PDF
//   OTHER SYSTEMS  4×NO + 4×GOOD      → 30.5/8            = 3.8   ✓ matches PDF
//   Overall        mean of 10 sections → 80/10            = 8.0   ✓ matches gauge

import {
  InspectionSection,
  VehicleTypeKey,
  getFieldRegistry,
  normalizeVehicleType,
} from './inspection-field-registry';

/**
 * Normalises a stored inspection value to one of
 * GOOD / AVERAGE / POOR / DAMAGED / MISSING / NO / NA.
 * Anything else is returned upper-cased and handled as a possible number.
 */
export function mapVerdict(input: string | null | undefined): string {
  if (input === null || input === undefined || !String(input).trim()) return 'NA';
  const raw = String(input);
  const lower = raw.toLowerCase().trim();

  if (['true', 'yes', '1', 'good', 'ok'].includes(lower)) return 'GOOD';
  if (['false', '0', 'bad', 'poor'].includes(lower)) return 'POOR';
  if (lower === 'no') return 'NO';
  if (['average', 'fair'].includes(lower)) return 'AVERAGE';
  if (['damaged', 'damage'].includes(lower)) return 'DAMAGED';
  if (lower.startsWith('missing') || ['not present', 'absent'].includes(lower)) return 'MISSING';
  if (['n/a', 'na', 'n.a.', 'not applicable'].includes(lower)) return 'NA';

  return raw.toUpperCase();
}

/** Points a single verdict contributes. `null` means "excluded from the average". */
function verdictPoints(verdict: string): number | null {
  switch (verdict) {
    case 'GOOD':
    case 'YES':     return 8.5;   // GOOD band (7–10)
    case 'AVERAGE': return 5.5;   // AVERAGE band (4–7)
    case 'POOR':
    case 'BAD':     return 2.5;   // POOR band (1–4)
    case 'DAMAGED': return 2.0;   // worse than POOR, better than absent
    case 'NO':      return 1.0;
    case 'MISSING': return 0.5;   // part is not on the vehicle
    case 'NA':      return null;  // not applicable — excluded, not scored zero
    default: {
      const m = verdict.match(/\d+(\.\d+)?/);
      if (!m) return null;
      const n = parseFloat(m[0]);
      return isNaN(n) ? null : Math.min(10, Math.max(0, n));
    }
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Mean of the scorable values, to one decimal place.
 *
 * Returns null when nothing in the section could be scored — every field blank
 * or N/A. The PDF substitutes 8.0 in that case; this deliberately does not,
 * because a section nobody filled in should read as unscored rather than as a
 * pass. Callers that need parity with the printed badge can use `?? 8.0`.
 */
export function sectionScoreOrNull(values: Array<string | null | undefined>): number | null {
  const points: number[] = [];
  for (const v of values) {
    const p = verdictPoints(mapVerdict(v));
    if (p !== null) points.push(p);
  }
  if (points.length === 0) return null;
  return round1(points.reduce((a, b) => a + b, 0) / points.length);
}

/** Mean of the section scores that could be computed. Unscored sections drop out. */
export function overallScoreOrNull(sectionScores: Array<number | null>): number | null {
  const scored = sectionScores.filter((s): s is number => s !== null);
  if (scored.length === 0) return null;
  return round1(scored.reduce((a, b) => a + b, 0) / scored.length);
}

export type ScoreBand = 'good' | 'average' | 'poor';

/** Thresholds mirror GetScoreDisplayFromDouble: ≥7 green, ≥4 amber, else red. */
export function scoreBand(score: number | null): ScoreBand | null {
  if (score === null) return null;
  return score >= 7 ? 'good' : score >= 4 ? 'average' : 'poor';
}

export interface SectionScore {
  section: string;
  score: number | null;
  /** How many fields contributed — the rest were left blank or marked N/A. */
  rated: number;
  total: number;
}

/** Score for one section, given a way to read each field's current value. */
export function sectionScoreFor(
  section: InspectionSection,
  readValue: (key: string) => string | null | undefined
): number | null {
  return sectionScoreOrNull(section.fields.map(f => readValue(f.key)));
}

/**
 * Scores every section of a vehicle type's registry.
 *
 * `readValue` supplies the current value for a field key — the AVO page reads it
 * off the live form, the QC pages off the saved InspectionDetails — so both get
 * identical numbers from identical inputs.
 */
export function scoreSections(
  vehicleType: VehicleTypeKey | null,
  readValue: (key: string) => string | null | undefined
): SectionScore[] {
  if (!vehicleType) return [];
  return getFieldRegistry(vehicleType).map((section: InspectionSection) => {
    const values = section.fields.map(f => readValue(f.key));
    const rated = values.filter(v => verdictPoints(mapVerdict(v)) !== null).length;
    return {
      section: section.section,
      score: sectionScoreOrNull(values),
      rated,
      total: section.fields.length,
    };
  });
}

/**
 * Scores an object whose properties are the camelCase registry keys — i.e. the
 * saved InspectionDetails as the API returns it. Used by the QC pages.
 */
export function scoreInspection(
  vehicleSegment: string | null | undefined,
  inspection: Record<string, unknown> | null | undefined,
  fallbackType?: string | null
): { sections: SectionScore[]; overall: number | null } {
  const vk = normalizeVehicleType(vehicleSegment) ?? normalizeVehicleType(fallbackType);
  if (!vk || !inspection) return { sections: [], overall: null };

  const sections = scoreSections(vk, key => {
    const v = (inspection as Record<string, unknown>)[key];
    return v === null || v === undefined ? null : String(v);
  });
  return { sections, overall: overallScoreOrNull(sections.map(s => s.score)) };
}
