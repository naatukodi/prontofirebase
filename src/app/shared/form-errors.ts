// form-errors.ts
// Shared handling for "the form is invalid and nothing happened".
//
// Several pages gated their save on `if (form.invalid) { markAllAsTouched(); return; }`,
// which is silent: on a long form the offending field is usually off-screen, so the
// button simply appears dead. These helpers name the fields, scroll to the first one
// and give the caller a message to put in a snackbar.

import { FormGroup } from '@angular/forms';

/** "stakeholderExecutiveName" → "Stakeholder executive name" */
function humanise(controlName: string): string {
  const spaced = controlName
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Names of the invalid top-level controls, using `labels` where the control name
 * does not read like the on-screen label.
 */
export function invalidControlLabels(
  form: FormGroup,
  labels: Record<string, string> = {}
): string[] {
  return Object.keys(form.controls)
    .filter(name => form.get(name)?.invalid)
    .map(name => labels[name] ?? humanise(name));
}

/**
 * Scrolls the first invalid field into view and focuses it.
 *
 * Deferred a tick so it runs after `markAllAsTouched()` has let Angular Material
 * stamp `.ng-invalid` / `.mat-form-field-invalid` onto the DOM.
 */
export function scrollToFirstInvalid(): void {
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>(
      '.mat-form-field-invalid, mat-form-field.ng-invalid, .ng-invalid[formControlName]'
    );
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true });
  });
}

/**
 * Marks everything touched, scrolls to the first problem and returns a message
 * naming what is missing — ready to hand to a snackbar.
 */
export function reportInvalidForm(
  form: FormGroup,
  labels: Record<string, string> = {}
): string {
  form.markAllAsTouched();
  scrollToFirstInvalid();

  const fields = invalidControlLabels(form, labels);
  if (fields.length === 0) return 'Some fields still need attention.';
  if (fields.length <= 3) {
    return `Please complete: ${fields.join(', ')}.`;
  }
  return `${fields.length} fields still need attention, starting with ${fields.slice(0, 3).join(', ')}.`;
}
