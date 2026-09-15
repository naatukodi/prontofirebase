// indian-date-adapter.ts
// Day-first (DD-MM-YYYY) dates for Angular Material's datepickers.
//
// MAT_DATE_FORMATS alone is not enough with MatNativeDateModule:
//   - `display.dateInput` is an Intl.DateTimeFormat *options object*, not a
//     pattern, so the best en-IN gives you is "15/05/2024" — day-first, but
//     slash-separated.
//   - NativeDateAdapter.parse() is `new Date(Date.parse(value))`, which reads
//     "15-05-2024" as Invalid Date and "05/15/2024" as 15 May whatever the
//     locale says. Typed entry stays broken.
// So both methods are overridden here. Everything else is inherited.

import { Injectable } from '@angular/core';
import { NativeDateAdapter, MatDateFormats } from '@angular/material/core';

const pad = (n: number) => String(n).padStart(2, '0');

/** Matches 15-05-2024, 15/05/2024 and 15.5.2024. */
const DAY_FIRST = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/;

@Injectable()
export class IndianDateAdapter extends NativeDateAdapter {
  /**
   * Always DD-MM-YYYY, built from the LOCAL date parts.
   *
   * Never via toISOString(): a Date at local midnight in IST (+05:30) is 18:30
   * the previous day in UTC, which is how dates were being shown — and stored —
   * one day early.
   */
  override format(date: Date, _displayFormat: object): string {
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
  }

  /** Reads day-first input, falling back to the native parser for ISO strings. */
  override parse(value: any): Date | null {
    if (typeof value === 'string') {
      const m = DAY_FIRST.exec(value.trim());
      if (m) {
        const [, d, mo, y] = m;
        const parsed = new Date(Number(y), Number(mo) - 1, Number(d));
        // Reject overflow like 31-02-2024, which Date would roll into March.
        if (parsed.getDate() === Number(d) && parsed.getMonth() === Number(mo) - 1) {
          return parsed;
        }
        return null;
      }
    }
    return super.parse(value);
  }

  /** The calendar's "first day of week" — Monday, as used in India. */
  override getFirstDayOfWeek(): number {
    return 1;
  }
}

export const INDIAN_DATE_FORMATS: MatDateFormats = {
  parse: {
    // Ignored by the adapter above, which parses day-first itself.
    dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' },
  },
  display: {
    // Also ignored by format(); kept so the shape is a valid MatDateFormats.
    dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' },
    monthYearLabel: { month: 'short', year: 'numeric' },
    dateA11yLabel: { day: 'numeric', month: 'long', year: 'numeric' },
    monthYearA11yLabel: { month: 'long', year: 'numeric' },
  },
};
