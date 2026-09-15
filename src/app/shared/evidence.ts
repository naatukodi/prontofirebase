// evidence.ts
// Splits a checklist evidence line into the cause and the rest of the explanation.
//
// Every QC card carries a sentence saying what was compared and what to do about
// it. They run to 190 characters, which turned a checklist of twenty cards into a
// wall of prose nobody reads. The cause is what belongs on the card; the reasoning
// belongs behind the ⓘ.
//
// This splits rather than rewrites, because the sentences already have the shape:
// the codebase's own convention puts the finding first and the advice after an
// em dash or a full stop ("Permit valid to 12-03-2027 — still valid on the
// inspection date."). That means it works on the strings the browser derives AND
// on the ones QcVisionAuditService sends back, with no change to either.

/** Longest lead we will show on a card before trimming it at a word boundary. */
const MAX_LEAD = 90;

export interface Evidence {
  /** The cause, for the face of the card. */
  lead: string;
  /** The complete sentence, or null when the lead already is it. */
  full: string | null;
}

export function splitEvidence(text: string | null | undefined): Evidence {
  const full = (text ?? '').trim();
  if (!full) return { lead: '', full: null };

  // The first natural break: an em dash between clauses, or the end of the first
  // sentence. Whichever comes first is where the finding stops and the advice starts.
  const candidates = [full.indexOf(' — '), full.indexOf('. ')].filter(i => i > 0);
  const breakAt = candidates.length ? Math.min(...candidates) : -1;

  if (breakAt > 0 && breakAt <= MAX_LEAD) {
    return { lead: full.slice(0, breakAt).trim(), full };
  }

  if (full.length <= MAX_LEAD) return { lead: full, full: null };

  // No usable break and too long to show whole: cut at the last word boundary.
  const cut = full.lastIndexOf(' ', MAX_LEAD);
  const lead = full.slice(0, cut > 40 ? cut : MAX_LEAD).trim();
  return { lead: lead.replace(/[,;:.—-]$/, '') + '…', full };
}
