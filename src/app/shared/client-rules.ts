/**
 * Rules that depend on who the client (the stakeholder's name) is.
 *
 * TVS Credit wants four extra facts on its reports: VIN plate, estimated life
 * remaining, whether another finance company has seized the vehicle, and accident
 * status. QC used to type them into REMARKS on TVS cases only. The report now
 * prints an "Additional Details" box on page 3 for TVS Credit alone, and the AVO
 * and backend pages ask for those facts on the same cases, so nobody is asked a
 * question no report prints. Accident status is on every cover, so it is not
 * part of this rule.
 *
 * Every live TVS case reads "TVS Credit Services Limited" (the stakeholder
 * dropdown). The match is looser than that so "TVS Credit Service Ltd" still
 * counts. Keep it the same as IsTvsCredit in ProntoPDFGeneration.
 */
export function isTvsCredit(clientName?: string | null): boolean {
  return /\btvs\s*credit\b/i.test(clientName ?? '');
}

/**
 * What a TVS Credit report adds to the cover's REMARKS when the AVO found no VIN
 * plate (its Additional Details box just says NOT AVAILABLE). The client's own wording.
 */
export const VIN_PLATE_MISSING_TEXT =
  'VIN plate not found. Chassis number physically inspected and found original.';
