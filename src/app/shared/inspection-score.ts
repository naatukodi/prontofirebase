// inspection-score.ts
// One scoring engine shared by the AVO inspection page and the QC pages.
//
// This is a direct port of CalculateSystemScoreOrNull / MapVerdict /
// GetScoreDisplayFromDouble in ProntoPDFGeneration's PdfReportService.cs. The
// numbers a user sees on the AVO page must be the numbers printed on the report,
// so any change here has to be mirrored there — and vice versa.
//
// Most fields are scored, and NO counts as 1/10, so answering NO pulls the
// section down — which is what a reviewer expects when they look at a card full
// of NOs. The exceptions are marked `scored: false` in the registry: OTHER
// SYSTEMS (accessories and fitments) and ABS. Those are facts about how the
// vehicle was built, not judgements of its condition, and a vehicle that never
// had a crash guard should not score worse than one that does.
//
// Where an item genuinely does not apply to the vehicle — no air conditioner was
// ever fitted, a crash guard was never part of the spec — the answer is N/A, not
// NO. N/A is excluded from the average rather than scored zero, so it neither
// rewards nor penalises. That is the lever for "this isn't a defect"; the field
// list itself makes no such judgement.
//
// Verified against a real report (TS15UD1953, REF PM-519499-K):
//   BASIC SYSTEMS  9×GOOD + 1×AVERAGE → (8.5×9 + 5.5)/10 = 8.2   ✓ matches PDF
//
// The same report also recorded OTHER SYSTEMS 4×NO + 4×GOOD → 3.8, and an overall
// of 8.0 as the mean of all 10 sections. Both figures predate this change: OTHER
// SYSTEMS is no longer scored, so it contributes nothing and the overall is now
// the mean of the 9 scored sections. A report regenerated for that vehicle will
// therefore show a higher overall than the one on file, which is the point — the
// old figure was marked down for accessories the vehicle never had.
//
// The 2026-09 checklist added two answers that the NO-is-bad rule gets backwards,
// so a field can name its own rule (`scoring` in the registry, see answerPoints):
// Fluid Leaks, where NO is the good answer, and Missing Tyres, a count where 0 is.
// PdfReportService does the same in ScoresAs — change the two together.

import {
  InspectionField,
  InspectionSection,
  VehicleTypeKey,
  getFieldRegistry,
  normalizeVehicleType,
} from './inspection-field-registry';

/**
 * Normalises a stored inspection value to one of
 * GOOD / AVERAGE / POOR / DAMAGED / MISSING / YES / NO / NA.
 * Anything else is returned upper-cased and handled as a possible number.
 *
 * YES is its own verdict so the report can print it (ENGINE STARTED: YES, not GOOD);
 * it scores the same as GOOD. true/false are pre-2026-09 Engine Started / Vehicle Moved
 * answers and read as YES / NO.
 */
export function mapVerdict(input: string | null | undefined): string {
  if (input === null || input === undefined || !String(input).trim()) return 'NA';
  const raw = String(input);
  const lower = raw.toLowerCase().trim();

  if (['yes', 'true'].includes(lower)) return 'YES';
  if (['1', 'good', 'ok'].includes(lower)) return 'GOOD';
  if (['0', 'bad', 'poor'].includes(lower)) return 'POOR';
  if (['no', 'false'].includes(lower)) return 'NO';
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

/**
 * Points one field's answer contributes, by the field's `scoring` rule.
 * `null` means "excluded from the average".
 */
export function answerPoints(field: InspectionField, value: unknown): number | null {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  switch (field.scoring) {
    case 'no-is-good': {
      // Only the YES / NO pair swaps; GOOD, POOR, N/A and the rest score as usual.
      const lower = raw.toLowerCase();
      if (lower === 'no'  || lower === 'false') return 8.5;
      if (lower === 'yes' || lower === 'true')  return 1.0;
      break;
    }
    case 'zero-is-good': {
      if (!raw) return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return null;
      return n === 0 ? 8.5 : 1.0;
    }
  }
  return verdictPoints(mapVerdict(raw));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Mean of the points that could be scored, to one decimal place; null when there are none. */
function meanOrNull(points: Array<number | null>): number | null {
  const scored = points.filter((p): p is number => p !== null);
  if (scored.length === 0) return null;
  return round1(scored.reduce((a, b) => a + b, 0) / scored.length);
}

/**
 * Mean of the scorable values, to one decimal place, by the plain condition rule.
 *
 * Returns null when nothing in the section could be scored — every field blank
 * or N/A. The PDF substitutes 8.0 in that case; this deliberately does not,
 * because a section nobody filled in should read as unscored rather than as a
 * pass. Callers that need parity with the printed badge can use `?? 8.0`.
 */
export function sectionScoreOrNull(values: Array<string | null | undefined>): number | null {
  return meanOrNull(values.map(v => verdictPoints(mapVerdict(v))));
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

/**
 * Score for one section, given a way to read each field's current value.
 *
 * Returns null for a section marked `scored: false`, which reads downstream as
 * "unscored" exactly like a section nobody filled in — so it drops out of the
 * overall average rather than counting as a zero.
 */
export function sectionScoreFor(
  section: InspectionSection,
  readValue: (key: string) => unknown
): number | null {
  if (section.scored === false) return null;
  return meanOrNull(
    section.fields.filter(f => f.scored !== false).map(f => answerPoints(f, readValue(f.key)))
  );
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
  readValue: (key: string) => unknown
): SectionScore[] {
  if (!vehicleType) return [];
  return getFieldRegistry(vehicleType).map((section: InspectionSection) => {
    const scorable = section.scored === false
      ? []
      : section.fields.filter(f => f.scored !== false);
    const points = scorable.map(f => answerPoints(f, readValue(f.key)));
    const rated = points.filter(p => p !== null).length;
    return {
      section: section.section,
      score: scorable.length === 0 ? null : meanOrNull(points),
      rated,
      // Counts only the fields that can move the score, so "3 of 4 rated" does
      // not silently include one that never counts.
      total: scorable.length,
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
