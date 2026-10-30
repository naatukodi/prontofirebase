// stage-labels.ts
// What the portal calls each workflow stage and job role on screen.

/**
 * Only the wording changes: "FinalReport" stays the step and role id that the
 * backend, the workflow table and existing users carry, so nothing stored has
 * to move.
 */
const DISPLAY: Record<string, string> = {
  FinalReport: 'Approver',
};

export function stageLabel(key: string | null | undefined): string {
  if (!key) return '';
  return DISPLAY[key] ?? key;
}
