import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * The AVO page's odometer box takes the reading, or words when the dial cannot be
 * read ("NOT WORKING"). The API keeps them apart: `odometer` stays a number for the QC
 * and valuation checks, `odometerRemark` holds the words, and saving one clears the other.
 *
 * The reading is km, or engine hours when `odometerUnit` is HOURS: tractors and cranes
 * often log use on an hour meter instead of an odometer.
 */

export type OdometerUnit = 'KM' | 'HOURS';

/** HOURS for an hour-meter reading, KM otherwise — including every case saved before
 *  the unit existed. */
export function odometerUnit(ins: { odometerUnit?: string | null } | null | undefined): OdometerUnit {
  return /^(hours?|hrs?|h)$/i.test(String(ins?.odometerUnit ?? '').trim()) ? 'HOURS' : 'KM';
}

/** "km" or "hours", for text that states a reading. */
export function odometerUnitLabel(ins: { odometerUnit?: string | null } | null | undefined): string {
  return odometerUnit(ins) === 'HOURS' ? 'hours' : 'km';
}

/**
 * The reading as a whole number when the text is one ("45000", "45,000 km", "386 hrs");
 * null for words. An hour meter shows tenths ("386.0"), so a decimal part is accepted and
 * dropped — the API stores whole numbers.
 */
export function parseOdometer(text: unknown): number | null {
  const s = String(text ?? '').trim().replace(/[,\s]/g, '').replace(/(kms?|hours?|hrs?|h)$/i, '');
  return /^\d+(\.\d+)?$/.test(s) ? Math.floor(Number(s)) : null;
}

/**
 * Digits, or words with no digits in them. A reading of 0 is refused as before (`min`),
 * and a mix such as "45000 approx" is refused (`odometerMixed`) so a number never ends
 * up stored as a remark the QC checks cannot compare.
 */
export function odometerValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const text = String(control.value ?? '').trim();
    if (!text) return null;
    const km = parseOdometer(text);
    if (km !== null) return km >= 1 ? null : { min: true };
    return /\d/.test(text) ? { odometerMixed: true } : null;
  };
}

/** The words recorded in place of a reading, upper-cased; null when there are none. */
export function odometerRemark(ins: { odometerRemark?: string | null } | null | undefined): string | null {
  const remark = ins?.odometerRemark?.trim();
  return remark ? remark.toUpperCase() : null;
}
