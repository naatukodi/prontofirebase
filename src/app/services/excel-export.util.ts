// src/app/services/excel-export.util.ts
import * as XLSX from 'xlsx-js-style';
import { MisRow } from '../models/mis-row.model';

/**
 * Column order, headers, widths and alignment — the single source of truth for
 * the MIS table AND the Excel export.
 *   wch = column width in characters, sized to the content it holds.
 *   num = numeric column (right-aligned, thousands-separated in Excel).
 */
export const MIS_COLUMNS: ReadonlyArray<{
  header: string;
  key: keyof MisRow;
  wch: number;
  num?: boolean;
}> = [
  { header: 'UNIQ ID',                   key: 'uniqId',               wch: 24 },
  { header: 'CLIENT NAME',               key: 'clientName',           wch: 36 },
  { header: 'CLIENT STATE',              key: 'clientState',          wch: 24 },
  { header: 'BRANCH',                    key: 'branch',               wch: 24 },
  { header: 'INSPECTION TYPE',           key: 'inspectionType',       wch: 22 },
  { header: 'LEAD CREATION DATE & TIME', key: 'leadCreationDateTime', wch: 26 },
  { header: 'INSPECTION DATE & TIME',    key: 'inspectionDateTime',   wch: 26 },
  { header: 'APPROVED DATE & TIME',      key: 'approvedDateTime',     wch: 26 },
  { header: 'LEAD STATUS',               key: 'leadStatus',           wch: 20 },
  { header: 'TAT',                       key: 'tat',                  wch: 20 },
  { header: 'VEHICLE NO',                key: 'vehicleNo',            wch: 22 },
  { header: 'OWNER NAME',                key: 'ownerName',            wch: 32 },
  { header: 'APPLICANT NAME',            key: 'applicantName',        wch: 32 },
  { header: 'MOBILE NO',                 key: 'mobileNo',             wch: 20 },
  { header: 'MAKE',                      key: 'make',                 wch: 28 },
  { header: 'MODEL',                     key: 'model',                wch: 28 },
  { header: 'VARIANT',                   key: 'variant',              wch: 24 },
  { header: 'VEHICLE CATEGORY',          key: 'vehicleCategory',      wch: 22 },
  { header: 'INSPECTOR',                 key: 'inspector',            wch: 28 },
  { header: 'YEAR',                      key: 'year',                 wch: 14 },
  { header: 'VEHICLE CLASS',             key: 'vehicleClass',         wch: 28 },
  { header: 'VALUATION PRICE',           key: 'valuationPrice',       wch: 22, num: true },
  { header: 'EXECUTIVE NAME',            key: 'executiveName',        wch: 30 },
  { header: 'EXECUTIVE MOBILE',          key: 'executiveMobile',      wch: 22 },
  { header: 'PAYMENT STATUS',            key: 'paymentStatus',        wch: 22 },
  { header: 'PAYMENT MODE',              key: 'paymentMode',          wch: 20 },
  { header: 'UTR / REFERENCE',           key: 'paymentReference',     wch: 26 },
  { header: 'PAYMENT AMOUNT',            key: 'paymentAmount',        wch: 22, num: true },
  { header: 'PAYMENT DATE',              key: 'paymentDate',          wch: 24 },
];

// ── Brand palette (ARGB, as Excel expects) ──────────────────────────
const TEAL   = 'FF037076';
const ORANGE = 'FFDE7B33';
const GRID   = 'FFD5E2E2';
const ZEBRA  = 'FFF2F9F9';
const INK    = 'FF10282A';
const MUTED  = 'FF9DB0B1';

const thin = { style: 'thin', color: { rgb: GRID } };

/** Shown wherever a value is missing, so empty cells never read as an oversight. */
export const BLANK = '---';

const headerStyle = {
  // Larger and bolder than the body so the header row reads as a header at a glance.
  font: { bold: true, sz: 12, color: { rgb: 'FFFFFFFF' }, name: 'Calibri' },
  fill: { fgColor: { rgb: TEAL } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: TEAL } },
    left: { style: 'thin', color: { rgb: 'FFFFFFFF' } },
    right: { style: 'thin', color: { rgb: 'FFFFFFFF' } },
    bottom: { style: 'medium', color: { rgb: ORANGE } },
  },
};

function bodyStyle(rowIndex: number, numeric: boolean, placeholder: boolean) {
  return {
    // Placeholders are muted and centred so they read as "no data", not as a value.
    font: { sz: 10, color: { rgb: placeholder ? MUTED : INK } },
    // Zebra striping keeps long 29-column rows readable across the sheet.
    ...(rowIndex % 2 === 1 ? { fill: { fgColor: { rgb: ZEBRA } } } : {}),
    alignment: {
      horizontal: placeholder ? 'center' : numeric ? 'right' : 'left',
      vertical: 'center',
      // Indent keeps text off the gridline on both sides — the "padding" Excel lacks.
      indent: placeholder ? 0 : 1,
    },
    border: { top: thin, left: thin, right: thin, bottom: thin },
    ...(numeric && !placeholder ? { numFmt: '#,##0' } : {}),
  };
}

/** Build and download a styled .xlsx of the MIS rows. */
export function exportMisToExcel(rows: MisRow[], fileName: string): void {
  const header = MIS_COLUMNS.map(c => c.header);
  const body = rows.map(r =>
    MIS_COLUMNS.map(c => {
      const v = r[c.key];
      // Missing values read as "---" rather than an ambiguous empty cell.
      if (v === null || v === undefined || v === '') return BLANK;
      // Text is already uppercased by the API; guard anything that slips through.
      return typeof v === 'string' ? v.toUpperCase() : v;
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);

  // Apply styles cell by cell.
  for (let c = 0; c < MIS_COLUMNS.length; c++) {
    const col = MIS_COLUMNS[c];

    const hRef = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[hRef]) (ws[hRef] as any).s = headerStyle;

    for (let r = 0; r < body.length; r++) {
      const ref = XLSX.utils.encode_cell({ r: r + 1, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: BLANK }; // keep the grid continuous
      (ws[ref] as any).s = bodyStyle(r, !!col.num, body[r][c] === BLANK);
    }
  }

  ws['!cols'] = MIS_COLUMNS.map(c => ({ wch: c.wch }));
  // Taller header, roomier data rows.
  ws['!rows'] = [{ hpt: 42 }, ...body.map(() => ({ hpt: 24 }))];
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: body.length, c: MIS_COLUMNS.length - 1 },
    }),
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'MIS');
  XLSX.writeFile(wb, fileName);
}
