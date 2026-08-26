import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../../environments/environment';

export type BrandKey = 'vehga' | 'pronto';

export interface BrandProfile {
  key: BrandKey;
  /** Shown in the picker and the browser title. */
  name: string;
  /** Legal entity — used in the login footer and anywhere the full name is needed. */
  legalName: string;
  logo: string;
  /** Single letter in the login hero's badge. */
  initial: string;
  /** Wordmark beside that badge. */
  wordmark: string;
  /** Login headline, split so the two halves can be coloured differently. */
  titleLead: string;
  titleTail: string;
  tagline: string;
}

export const BRANDS: Record<BrandKey, BrandProfile> = {
  vehga: {
    key: 'vehga',
    name: 'Vehga',
    legalName: 'Vehga Inspections Private Limited',
    logo: 'assets/images/vehga-01.png',
    initial: 'V',
    wordmark: 'VEHGA',
    titleLead: 'VEHGA',
    titleTail: 'INSPECTIONS',
    tagline: "India's trusted vehicle inspection & valuation network",
  },
  pronto: {
    key: 'pronto',
    name: 'Pronto Moto',
    legalName: 'Pronto Moto Services',
    logo: 'assets/images/prontomoto.png',
    initial: 'P',
    wordmark: 'PRONTO',
    titleLead: 'PRONTO',
    titleTail: 'MOTO',
    tagline: "India's trusted vehicle inspection & valuation network",
  },
};

const STORAGE_KEY = 'pronto_active_brand';

/**
 * The company the signed-in user is currently working for.
 *
 * Deliberately the ONLY place brand is read from. Components must never touch
 * localStorage directly — that is what keeps the deployment shape a config choice:
 *
 *   - today, one site: no build-time default, so the user picks at login
 *   - later, one site per brand: set `defaultBrand` in that site's environment file
 *     and the picker disappears, with no other code change
 *
 * Resolution order: build-time default → the user's login choice → Vehga.
 */
@Injectable({ providedIn: 'root' })
export class BrandService {
  /** Set per deployment when a site serves exactly one brand; null means "ask the user". */
  private readonly buildDefault = (environment as { defaultBrand?: BrandKey | null }).defaultBrand ?? null;

  private readonly _active = signal<BrandKey>(this.resolveInitial());

  readonly active = this._active.asReadonly();
  readonly profile = computed(() => BRANDS[this._active()]);

  /** True when this deployment pins a brand, so no picker should be shown. */
  get isPinned(): boolean {
    return this.buildDefault !== null;
  }

  private resolveInitial(): BrandKey {
    if (this.buildDefault && BRANDS[this.buildDefault]) return this.buildDefault;
    const stored = localStorage.getItem(STORAGE_KEY) as BrandKey | null;
    return stored && BRANDS[stored] ? stored : 'vehga';
  }

  /** Called by the login picker. Ignored when the deployment pins a brand. */
  select(key: BrandKey): void {
    if (this.isPinned || !BRANDS[key]) return;
    localStorage.setItem(STORAGE_KEY, key);
    this._active.set(key);
    this.apply();
  }

  /**
   * Paints the brand onto the document. `data-brand` drives the CSS custom
   * properties, so every themed rule follows from this one attribute.
   */
  apply(): void {
    const p = this.profile();
    document.documentElement.setAttribute('data-brand', p.key);
    document.title = p.name;
  }

  /** Cleared on logout alongside the cached roles. */
  clear(): void {
    if (!this.isPinned) localStorage.removeItem(STORAGE_KEY);
  }
}
