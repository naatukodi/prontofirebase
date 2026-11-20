/**
 * When a vehicle was manufactured, for anything that works out its age.
 *
 * `manufacturedDate` comes first. Until 2026-11-19 the API copied the REGISTRATION date
 * into `yearOfMfg` / `monthOfMfg` and kept VAHAN's manufacturing date only in
 * `manufacturedDate`, so every case saved before then still holds the registration month
 * in those two fields: JH13N8259, made MAR-2025 and registered NOV-2026, read as 0 years
 * old. The report's "Mfg" label has always printed `manufacturedDate` first.
 */
export interface Manufacture {
  year: number | null;
  /** 1 to 12, or null when only the year is known. */
  month: number | null;
}

/**
 * @param fallBackToRegistration Use the registration date when nothing else is known.
 *   Off for the manufacture-vs-registration gap check, where it would compare the
 *   registration date with itself and always pass.
 */
export function manufacture(vd: {
  manufacturedDate?: string | null;
  yearOfMfg?: number | null;
  monthOfMfg?: number | null;
  dateOfRegistration?: string | null;
} | null | undefined, fallBackToRegistration = true): Manufacture {
  const fromIso = (iso: string | null | undefined): Manufacture | null => {
    const m = /^(\d{4})-(\d{2})/.exec(String(iso ?? ''));
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    return year > 1900 ? { year, month: month >= 1 && month <= 12 ? month : null } : null;
  };

  const made = fromIso(vd?.manufacturedDate);
  if (made) return made;
  const year = Number(vd?.yearOfMfg ?? 0);
  if (year > 1900) {
    const month = Number(vd?.monthOfMfg ?? 0);
    return { year, month: month >= 1 && month <= 12 ? month : null };
  }
  return (fallBackToRegistration ? fromIso(vd?.dateOfRegistration) : null) ?? { year: null, month: null };
}

/** Whole years from manufacture to today; null when the manufacture year is unknown. */
export function vehicleAgeYears(vd: Parameters<typeof manufacture>[0], asOf: Date = new Date()): number | null {
  const { year, month } = manufacture(vd);
  if (!year) return null;
  const months = (asOf.getFullYear() - year) * 12 + (asOf.getMonth() + 1 - (month ?? 1));
  return Math.max(0, Math.floor(months / 12));
}
