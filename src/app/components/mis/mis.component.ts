// src/app/components/mis/mis.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MisService } from '../../services/mis.service';
import { MisRow } from '../../models/mis-row.model';
import { MIS_COLUMNS, exportMisToExcel, BLANK } from '../../services/excel-export.util';

type MisMode = 'daily' | 'weekly' | 'monthly' | 'custom';

@Component({
  selector: 'app-mis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis.component.html',
  styleUrls: ['./mis.component.scss'],
})
export class MisComponent implements OnInit {
  readonly columns = MIS_COLUMNS;

  mode: MisMode = 'daily';
  refDate = this.toInput(new Date());          // daily / weekly / monthly anchor
  fromDate = this.toInput(new Date());         // custom range
  toDate = this.toInput(new Date());

  rows: MisRow[] = [];
  loading = false;
  error: string | null = null;
  generated = false;

  constructor(private mis: MisService) {}

  ngOnInit(): void {
    this.generate();
  }

  setMode(m: MisMode): void {
    this.mode = m;
    this.generate();
  }

  generate(): void {
    const { from, to } = this.computeRange();
    this.loading = true;
    this.error = null;

    this.mis.getMis(from.toISOString(), to.toISOString()).subscribe({
      next: (rows) => {
        this.rows = rows || [];
        this.loading = false;
        this.generated = true;
      },
      error: () => {
        this.error = 'Failed to load MIS data. Check that the API is reachable.';
        this.rows = [];
        this.loading = false;
        this.generated = true;
      },
    });
  }

  exportExcel(): void {
    if (!this.rows.length) return;
    exportMisToExcel(this.rows, this.fileName());
  }

  // ── Cell formatting ──────────────────────────────────────────────
  cell(row: MisRow, key: keyof MisRow): string {
    const v = row[key];
    if (v === null || v === undefined || v === '') return BLANK;
    if ((key === 'valuationPrice' || key === 'paymentAmount') && typeof v === 'number') {
      return '₹' + v.toLocaleString('en-IN');
    }
    return String(v);
  }

  isBlank(row: MisRow, key: keyof MisRow): boolean {
    return this.cell(row, key) === BLANK;
  }

  /** CSS modifier for the PAYMENT STATUS cell (completed / pending / other). */
  payClass(row: MisRow): string {
    const s = (row.paymentStatus || '').trim().toLowerCase();
    if (!s) return '';
    if (s === 'completed' || s === 'paid') return 'pay-done';
    if (s === 'pending') return 'pay-pending';
    return 'pay-other';
  }

  // ── Date range for the selected period ───────────────────────────
  private computeRange(): { from: Date; to: Date } {
    if (this.mode === 'custom') {
      return {
        from: this.startOfDay(new Date(this.fromDate)),
        to: this.endOfDay(new Date(this.toDate)),
      };
    }

    const d = new Date(this.refDate);

    if (this.mode === 'daily') {
      return { from: this.startOfDay(d), to: this.endOfDay(d) };
    }

    if (this.mode === 'weekly') {
      const day = d.getDay();                 // 0 Sun … 6 Sat
      const backToMon = (day + 6) % 7;
      const mon = new Date(d); mon.setDate(d.getDate() - backToMon);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: this.startOfDay(mon), to: this.endOfDay(sun) };
    }

    // monthly
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: this.startOfDay(first), to: this.endOfDay(last) };
  }

  private fileName(): string {
    const { from, to } = this.computeRange();
    const f = this.stamp(from), t = this.stamp(to);
    switch (this.mode) {
      case 'daily':   return `MIS_Daily_${f}.xlsx`;
      case 'weekly':  return `MIS_Weekly_${f}_to_${t}.xlsx`;
      case 'monthly': return `MIS_Monthly_${from.getFullYear()}-${this.pad(from.getMonth() + 1)}.xlsx`;
      default:        return `MIS_${f}_to_${t}.xlsx`;
    }
  }

  /** Human label for the current selection (shown above the table). */
  get periodLabel(): string {
    const { from, to } = this.computeRange();
    if (this.mode === 'daily') return this.stamp(from);
    if (this.mode === 'monthly') {
      return from.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    return `${this.stamp(from)} → ${this.stamp(to)}`;
  }

  private startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  private endOfDay(d: Date): Date { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
  private pad(n: number): string { return n < 10 ? '0' + n : '' + n; }
  private stamp(d: Date): string { return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`; }
  private toInput(d: Date): string { return this.stamp(d); }

  trackByCol = (_: number, c: { key: keyof MisRow }) => c.key;
}
