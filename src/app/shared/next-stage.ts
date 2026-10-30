// next-stage.ts
// Where a user lands after submitting their stage of a case.

import { Router } from '@angular/router';
import { AuthorizationService } from '../services/authorization.service';

/** The permission each case page's route demands — must match app.routes.ts. */
const PAGE_PERMISSION: Record<string, string> = {
  'vehicle-details': 'CanViewVehicleDetails',
  'inspection': 'CanViewInspection',
  'quality-control': 'CanViewQualityControl',
  'final-report': 'CanViewFinalReport',
};

/**
 * Follows the case to `page` when this user may open it, and otherwise goes to
 * their dashboard.
 *
 * Every submit used to follow the case blindly, so anyone without access to the
 * next stage — a Stakeholder registering a new case, say — landed on the
 * "no access" page although their submit had worked.
 */
export async function followCaseOrGoHome(
  router: Router,
  authz: AuthorizationService,
  valuationId: string,
  page: string,
  queryParams: Record<string, unknown>
): Promise<void> {
  const perms = await authz.loadPermissions();
  if (perms.includes(PAGE_PERMISSION[page])) {
    await router.navigate(['/valuation', valuationId, page], { queryParams });
  } else {
    await router.navigate(['/dashboard']);
  }
}
