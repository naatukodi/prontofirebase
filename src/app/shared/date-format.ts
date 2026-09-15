// date-format.ts
// DD-MM-YYYY for code paths that build strings directly instead of using the
// `date` pipe, and so never see LOCALE_ID or DATE_PIPE_DEFAULT_OPTIONS.
//
// `toLocaleDateString('en-IN')` is not a substitute: it yields "15/5/2024" —
// slash-separated and without a leading zero — and the bare `toLocaleDateString()`
// renders differently on each user's machine.

const pad = (n: number) => String(n).padStart(2, '0');

/** "2024-05-15T00:00:00Z" → "15-05-2024". Empty string when unparseable. */
export function formatDdMmYyyy(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** As above, with a 24-hour clock: "15-05-2024 14:30". */
export function formatDdMmYyyyHhMm(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${formatDdMmYyyy(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
