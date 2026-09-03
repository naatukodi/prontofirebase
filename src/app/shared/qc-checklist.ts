// qc-checklist.ts
// One verification engine shared by the QC update page and the QC view page.
//
// Every card on the QC checklist is derived here from the data captured in the
// earlier workflow steps (Stakeholder → Vehicle Details → AVO), together with a
// note explaining what was compared to reach that verdict. Both pages render the
// same verdicts and the same notes; the update page lets the reviewer override
// them, the view page shows them read-only.
//
// Keep the keys in step with the two templates — a key set here but absent from a
// template is dead code, and a key read by a template but never set here shows a
// permanent em-dash.

import { FinalReport } from '../models/final-report.model';
import { getFieldRegistry, normalizeVehicleType } from './inspection-field-registry';
import { mapVerdict } from './inspection-score';

export interface QcChecklistInput {
  report: FinalReport | null | undefined;
  /**
   * Overall vehicle score, as shown on the QC form — normally the derived
   * number ("8.5"). Older cases hold a word ('GOOD' / 'AVERAGE' / 'POOR');
   * both are accepted and banded the same way.
   */
  overallRating?: string | null;
  /** Chassis punch as entered on the QC form ('Original' / 'Re-punched' / 'Tampered'). */
  chassisPunch?: string | null;
  valuationAmount?: number | null;
  lowRange?: number | null;
  highRange?: number | null;
  /** Keys of the photos actually uploaded for this valuation. */
  photoKeys?: string[];
  /** Vehicle segment, so the damage and missing-parts counts read the right registry. */
  vehicleSegment?: string | null;
  /** Stakeholder valuation type, used when no segment was resolved. */
  valuationType?: string | null;
}

export interface QcChecklistResult {
  /** key → verdict, or null where the reviewer has to decide. */
  cl: Record<string, string | null>;
  /** key → what the system compared to reach the verdict. Always populated. */
  why: Record<string, string>;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN');
}

/**
 * Overall Rating is now the score derived from the AVO's section scores, so it
 * arrives as a number ("8.5") rather than a word. Everything below reasons in
 * GOOD / AVERAGE / POOR, so band it back — using the same thresholds the score
 * badges and the printed report use. Words still passed in still work, so cases
 * saved before this keep reading correctly.
 */
function bandRating(raw?: string | null): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  const n = Number(s);
  if (isNaN(n)) return s.toUpperCase();
  return n >= 7 ? 'GOOD' : n >= 4 ? 'AVERAGE' : 'POOR';
}

/**
 * Transmission implied by an RC variant string, or null when it says nothing.
 * Word boundaries matter — "AT" appears inside plenty of model names, so a bare
 * substring test would read a transmission out of "PLATINA".
 */
function transmissionFromVariant(variant?: string | null): string | null {
  const v = (variant || '').toUpperCase();
  if (!v) return null;
  const has = (token: string) => new RegExp(`(^|[^A-Z0-9])${token}([^A-Z0-9]|$)`).test(v);

  if (has('AMT')) return 'AMT';
  if (has('CVT')) return 'CVT';
  if (has('DCT') || has('DSG')) return 'DCT';
  if (has('AUTOMATIC') || has('AUTO') || has('AT')) return 'AUTOMATIC';
  if (has('MANUAL') || has('MT') || has('IMT')) return 'MANUAL';
  return null;
}

/** AMT, CVT and DCT are all automatics — comparing families avoids flagging
 *  "AVO said AUTOMATIC, variant says AMT" as a mismatch when it is not one. */
function isAutomatic(type: string): boolean {
  return type !== 'MANUAL';
}

export function buildQcChecklist(input: QcChecklistInput): QcChecklistResult {
  const cl: Record<string, string | null> = {};
  const why: Record<string, string> = {};

  /** Records a verdict together with the evidence used to reach it. */
  const mark = (key: string, verdict: string | null, reason: string) => {
    if (verdict !== null) cl[key] = verdict;
    why[key] = reason;
  };

  const report = input.report;
  const vd  = report?.vehicleDetails;
  const ins = report?.inspectionDetails;
  const photos = (report?.photoUrls || {}) as any;
  const has = (...keys: string[]) => keys.some(k => !!photos[k]);
  const inr = (n: number) => n.toLocaleString('en-IN');

  const chassisPunch  = (input.chassisPunch  || '').toUpperCase().replace(/[-\s]/g, '');
  const overallRating = bandRating(input.overallRating);
  /** What the reviewer actually sees on the form — shown in the notes verbatim. */
  const ratingShown   = (input.overallRating ?? '').toString().trim();
  const engineCond    = (ins?.engineCondition      || '').toUpperCase();
  // Tyre condition now comes from the registry field in BASIC SYSTEMS. The old
  // General Condition control was replaced by Transmission Type, so it is only
  // a fallback for cases inspected before that swap.
  const tyreCond      = (ins?.tyreCondition || ins?.overallTyreCondition || '').toUpperCase();
  const exteriorCond  = (ins?.exteriorCondition    || '').toUpperCase();
  const bodyCondition = (ins?.bodyCondition        || '').toUpperCase();
  const valuationAmt  = Number(input.valuationAmount ?? 0);
  const low           = Number(input.lowRange  ?? 0);
  const high          = Number(input.highRange ?? 0);
  const photoCount    = input.photoKeys?.length ?? 0;

  const inspectedOn = ins?.dateOfInspection ? new Date(ins.dateOfInspection) : new Date();
  const asOf = isNaN(inspectedOn.getTime()) ? new Date() : inspectedOn;

  const condMap = (v: string): string | null =>
    v === 'GOOD' ? 'good' : v === 'AVERAGE' ? 'average' : v === 'POOR' ? 'poor' : null;

  /** Checks a document's expiry against the inspection date. */
  const checkExpiry = (key: string, label: string, validTo: string | null | undefined) => {
    if (!validTo) {
      mark(key, 'flag', `${label} expiry date not captured in Vehicle Details — verify from the uploaded document before approving.`);
      return;
    }
    const d = new Date(validTo);
    if (isNaN(d.getTime())) {
      mark(key, 'flag', `${label} expiry "${validTo}" could not be read — verify manually before approving.`);
      return;
    }
    const shown = fmtDate(validTo);
    if (d >= asOf) mark(key, 'ok',   `${label} valid to ${shown} — still valid on the inspection date.`);
    else           mark(key, 'flag', `${label} expired on ${shown} — before the inspection date.`);
  };

  // ── Document Verification ─────────────────────────────────────────────────
  if (vd?.registrationNumber && vd?.rcStatus !== false) {
    mark('docRC', 'ok', `RC ${vd.registrationNumber} returned by VAHAN` +
      (vd.dateOfRegistration ? `, registered ${fmtDate(vd.dateOfRegistration)}` : '') + '.');
  } else if (vd?.registrationNumber) {
    mark('docRC', 'flag', `VAHAN reports RC status inactive for ${vd.registrationNumber}.`);
  } else {
    mark('docRC', 'flag', 'No registration number captured in Vehicle Details.');
  }

  checkExpiry('docIns',     'Insurance' + (vd?.insurer   ? ` (${vd.insurer})` : ''), vd?.insuranceValidUpTo);
  checkExpiry('docPermit',  'Permit'    + (vd?.permitNo  ? ` ${vd.permitNo}`  : ''), vd?.permitValidUpTo);
  checkExpiry('docFitness', 'Fitness'   + (vd?.fitnessNo ? ` ${vd.fitnessNo}` : ''), vd?.fitnessValidTo);
  checkExpiry('docTax',     'Road tax',                                              vd?.taxUpto);

  // Answers "is this vehicle hypothecated", which the RC states outright, rather
  // than "does the lender match the financing bank", which needs the loan file
  // the portal has no access to — that phrasing is why this card used to sit
  // unresolved on every hypothecated case.
  if (vd?.hypothecation) {
    mark('docHypo', 'yes', vd.lender
      ? `RC shows hypothecation to ${vd.lender}.`
      : 'RC shows hypothecation, though VAHAN returned no lender name.');
  } else {
    mark('docHypo', 'no', 'RC shows no hypothecation on record.');
  }

  if (chassisPunch === 'ORIGINAL')       mark('docChassis', 'original',  'Chassis punch recorded as Original on the QC form.');
  else if (chassisPunch === 'REPUNCHED') mark('docChassis', 'repunched', 'Chassis punch recorded as Re-punched on the QC form.');
  else if (chassisPunch === 'TAMPERED')  mark('docChassis', 'tampered',  'Chassis punch recorded as Tampered on the QC form.');
  else                                   mark('docChassis', null,        'Chassis punch not recorded on the QC form.');

  // ── Data Accuracy: vehicle identity ───────────────────────────────────────
  // These compare a recorded value against what the photo actually shows, which
  // the form data alone cannot do — a photo merely existing proves nothing. They
  // open as FAIL and the note says exactly which of the two sides is missing, so
  // an unread check never reads as a proven mismatch. The photo reader replaces
  // both the verdict and the note the moment it can read the field: PASS when it
  // matches the RC, FAIL naming both values when it does not.
  if (vd?.registrationNumber) {
    const plateShots = has('FrontViewGrille', 'RearViewTailgate');
    mark('accReg', 'fail', plateShots
      ? `Not compared yet: the plate has not been read from the photos. RC says ${vd.registrationNumber}, and the front/rear photos are on file — check the plate against them by eye.`
      : `Cannot be compared: no front or rear photo was uploaded to read the plate from. RC says ${vd.registrationNumber}.`);
  } else {
    mark('accReg', 'fail', 'Cannot be compared: no registration number was captured in Vehicle Details.');
  }

  if (vd?.chassisNumber) {
    const stencil = has('ChassisStencilTrace', 'ChassisImprint', 'ChassisVerification');
    mark('accChassis', 'fail', stencil
      ? `Not compared yet: the chassis number has not been read from the photos. RC says ${vd.chassisNumber}, and a stencil/imprint photo is on file — compare it against them by eye.`
      : `Cannot be compared: no stencil or imprint photo was uploaded to read the chassis number from. RC says ${vd.chassisNumber}.`);
  } else {
    mark('accChassis', 'fail', 'Cannot be compared: no chassis number was captured in Vehicle Details.');
  }

  const odo = ins?.odometer ?? 0;
  if (odo > 0) {
    const odoShot = has('Odometer', 'InstrumentCluster');
    mark('accOdo', 'fail', odoShot
      ? `Not compared yet: the dial has not been read from the photos. AVO recorded ${inr(odo)} km and an odometer photo is on file — read the dial off it by eye.`
      : `Cannot be compared: no odometer photo was uploaded to read the dial from. AVO recorded ${inr(odo)} km.`);
  } else {
    mark('accOdo', 'fail', 'Cannot be compared: AVO recorded no odometer reading.');
  }

  if (has('VinPlate')) {
    mark('accVIN', 'fail', ins?.vinPlate === false
      ? 'AVO marked the VIN plate as not present on the vehicle, even though a VIN plate photo was uploaded.'
      : 'Not compared yet: the VIN plate has not been read from the photos. The photo is on file — compare it to the RC by eye.');
  } else {
    mark('accVIN', 'fail', ins?.vinPlate === false
      ? 'AVO marked the VIN plate as not present on the vehicle.'
      : 'Cannot be compared: no VIN plate photo was uploaded to read the VIN from.');
  }

  const mfgYear = vd?.yearOfMfg ?? 0;
  if (mfgYear && vd?.dateOfRegistration) {
    const reg = new Date(vd.dateOfRegistration);
    const months = (reg.getFullYear() - mfgYear) * 12 + reg.getMonth() - ((vd.monthOfMfg ?? 1) - 1);
    const ok = months >= 0 && months <= 18;
    mark('accMfgReg', ok ? 'pass' : 'fail',
      `Manufactured ${mfgYear}, registered ${fmtDate(vd.dateOfRegistration)} — a gap of ${months} month(s), ` +
      (ok ? 'within the normal 18-month window.' : 'outside the normal 18-month window.'));
  } else {
    mark('accMfgReg', 'fail', `Cannot be compared: ${!mfgYear && !vd?.dateOfRegistration
      ? 'neither the manufacture year nor the registration date was captured'
      : !mfgYear ? 'no manufacture year was captured' : 'no registration date was captured'} in Vehicle Details, so the gap cannot be calculated.`);
  }

  if (vd?.make && vd?.model) {
    const rcBody  = (vd.bodyType   || '').trim().toUpperCase();
    const insBody = (ins?.bodyType || '').trim().toUpperCase();
    const bodyOk  = !rcBody || !insBody || rcBody === insBody;
    mark('accVahan', bodyOk ? 'pass' : 'fail',
      `VAHAN: ${vd.make} ${vd.model}` +
      (vd.colour   ? `, ${vd.colour}` : '') +
      (vd.engineCC ? `, ${vd.engineCC}cc` : '') +
      (rcBody      ? `, body ${rcBody}` : '') +
      (insBody
        ? (bodyOk ? ' — matches the body type recorded by AVO.' : ` — AVO recorded body type ${insBody} instead.`)
        : ' — AVO did not record a body type to compare.'));
  } else {
    mark('accVahan', 'fail', 'Cannot be compared: VAHAN returned no make/model, so there is nothing to check the inspection entry against.');
  }

  // ── Data Accuracy: owner / applicant ──────────────────────────────────────
  const applicant = report?.stakeholder?.applicant?.name;
  if (applicant && vd?.ownerName) {
    const norm = (x: string) => x.trim().toUpperCase().replace(/\s+/g, ' ');
    const same = norm(applicant) === norm(vd.ownerName);
    mark('accOwner', same ? 'pass' : 'fail',
      `Applicant "${applicant}" vs RC owner "${vd.ownerName}"` +
      (same ? ' — exact match.' : ' — the two names differ; confirm from the ID documents before approving.'));
  } else {
    mark('accOwner', 'fail', `Cannot be compared: ${!applicant && !vd?.ownerName
      ? 'neither the applicant name nor the RC owner name is on record'
      : !applicant ? 'no applicant name is on record' : 'VAHAN returned no owner name'}.`);
  }

  // ── Data Accuracy: technical specifications ───────────────────────────────
  // VAHAN has no transmission field, so there is no direct value to compare the
  // AVO's answer against. The variant string often carries one though — "SWIFT
  // VDI AMT", "CITY ZX CVT" — and where it does, that is a real comparison.
  // Where it does not, the recorded value is shown and the verdict is left to
  // the reviewer rather than invented.
  const recordedTx = (ins?.transmissionType || '').toUpperCase().trim();
  const rcVariant  = vd?.makerVariant || vd?.classOfVehicle || '';
  const rcTx       = transmissionFromVariant(rcVariant);

  if (!recordedTx) {
    mark('accTransmission', 'fail', rcVariant
      ? `AVO did not record a transmission type. RC lists ${rcVariant} — confirm from the variant and the interior photos.`
      : 'Cannot be compared: AVO did not record a transmission type, and the RC returned no variant to infer one from.');
  } else if (!rcTx) {
    // The AVO had the vehicle in front of them and VAHAN has no transmission
    // field at all, so their answer is the authoritative one. With nothing to
    // contradict it, this passes on the recorded value rather than making the
    // reviewer re-decide something already established at inspection.
    mark('accTransmission', 'pass',
      `AVO recorded ${recordedTx} at inspection.` +
      (rcVariant
        ? ` RC lists ${rcVariant}, which does not state a transmission, so there is nothing to contradict it.`
        : ' The RC variant was not captured, so there is nothing to contradict it.'));
  } else if (isAutomatic(rcTx) === isAutomatic(recordedTx)) {
    mark('accTransmission', 'pass',
      `AVO recorded ${recordedTx} and the RC variant ${rcVariant} indicates ${rcTx} — consistent.`);
  } else {
    mark('accTransmission', 'fail',
      `AVO recorded ${recordedTx} but the RC variant ${rcVariant} indicates ${rcTx} — check the interior photos before approving.`);
  }

  if (vd?.fuel) {
    mark('accFuel', 'pass', `RC fuel type ${vd.fuel}` +
      (vd.engineCC  ? ` with a ${vd.engineCC}cc engine` : '') +
      (vd.normsType ? `, ${vd.normsType}` : '') + '.');
  } else {
    mark('accFuel', 'fail', 'Cannot be compared: VAHAN returned no fuel type for this vehicle.');
  }

  // ── Data Accuracy: photo quality & completeness ───────────────────────────
  // GPS and EXIF are not carried on the final report, so these stay with the
  // reviewer — the note states which evidence is available to judge from.
  // Every photo carries the location the camera app stamped on it at capture, so
  // "all taken at the same place" is a data comparison, not something the reviewer
  // has to eyeball across a dozen backgrounds.
  const metaEntries = Object.entries(report?.photoMetadata || {})
    .filter(([k]) => !!photos[k]);                       // only slots actually filled

  const places = Array.from(new Set(
    metaEntries.map(([, m]) => (m?.locationText || '').trim()).filter(Boolean)));

  if (places.length === 0) {
    // No stored metadata is NOT the same as no location. The camera app burns the
    // place and coordinates into the pixels, and WhatsApp strips every EXIF tag on
    // the way through — so the stamp is usually sitting in the image while this
    // field is empty. Saying "none carry a location" would be a false negative.
    mark('accPhotoLoc', 'fail',
      `Not checked yet: the capture location is stamped into the image itself, not into ` +
      `the photo metadata, and the ${photoCount} uploaded photo(s) have not been read` +
      (ins?.inspectionLocation ? ` (declared: "${ins.inspectionLocation}")` : '') +
      ' — open the photos and read the stamp yourself.');
  } else if (places.length === 1) {
    mark('accPhotoLoc', 'pass',
      `All ${metaEntries.length} stamped photo(s) captured at "${places[0]}".`);
  } else {
    mark('accPhotoLoc', 'fail',
      `Photos captured at ${places.length} different locations: ` +
      places.map(p => `"${p}"`).join(', ') + '.');
  }

  mark('accDaylight', 'fail', 'Not checked: lighting cannot be judged from the form data. Open the photos and confirm the vehicle was shot in daylight.');

  mark('accPlate', 'fail',
    has('FrontViewGrille', 'RearViewTailgate')
      ? 'Not checked: legibility cannot be judged from the form data. Front and rear photos are on file — confirm the plate is readable in both.'
      : 'Cannot be checked: the front or rear photo is missing, so the plate is not visible.');

  // Same idea for the timestamp: compare the stamped capture dates against the date
  // AVO declared, by calendar day — the stamp carries a time, the declaration doesn't.
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const shotDates = metaEntries
    .map(([, m]) => m?.capturedDate)
    .filter((d): d is string => !!d)
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()));

  if (!ins?.dateOfInspection) {
    mark('accGPS', 'fail', 'Cannot be compared: AVO declared no inspection date to check the photo timestamps against.');
  } else if (shotDates.length === 0) {
    // Same false negative as the location above: the timestamp is in the pixels.
    mark('accGPS', 'fail',
      `Not checked yet: the capture date is stamped into the photos themselves, not into ` +
      `the photo metadata, and they have not been read. AVO declared ${fmtDate(ins.dateOfInspection)}` +
      ' — open the photos and read the stamp yourself.');
  } else {
    const declared = new Date(ins.dateOfInspection);
    const offDay = shotDates.filter(d => !sameDay(d, declared));
    if (offDay.length === 0) {
      mark('accGPS', 'pass',
        `All ${shotDates.length} stamped photo(s) captured on ${fmtDate(ins.dateOfInspection)}, matching the declared inspection date.`);
    } else {
      const shown = Array.from(new Set(offDay.map(d => d.toLocaleDateString('en-IN')))).join(', ');
      mark('accGPS', 'fail',
        `${offDay.length} of ${shotDates.length} photo(s) captured on ${shown}, not the declared inspection date ${fmtDate(ins.dateOfInspection)}.`);
    }
  }

  // ── Valuation Quality ─────────────────────────────────────────────────────
  if (photoCount >= 8) mark('valMinPhotos', 'pass', `${photoCount} photos uploaded — at or above the minimum of 8.`);
  else                 mark('valMinPhotos', 'fail', `${photoCount} photo(s) uploaded — below the minimum of 8.`);

  if (vd?.backlistStatus) {
    mark('valDedupe', 'fail', 'VAHAN reports this vehicle as blacklisted.');
  } else if (vd?.registrationNumber) {
    mark('valDedupe', 'pass', `VAHAN reports no blacklist flag on ${vd.registrationNumber}.`);
  } else {
    // The only checklist verdict the customer PDF prints. "fail" there renders
    // BLACKLIST: YES in red, so an unrun check must stay unset — the report then
    // prints PENDING, which is what actually happened.
    mark('valDedupe', null, 'No registration number available to run the blacklist check against.');
  }

  if (mfgYear && odo > 0) {
    const age = new Date().getFullYear() - mfgYear;
    const avgKm = age > 0 ? odo / age : odo;
    const ok = avgKm < 60000;
    mark('valAgeOdo', ok ? 'pass' : 'fail',
      `${inr(Math.round(avgKm))} km/year over ${age || 1} year(s)` +
      (ok ? ' — within the usual range.' : ' — above the 60,000 km/year threshold.'));
  } else {
    mark('valAgeOdo', 'fail', `Cannot be derived: ${!mfgYear && !odo
      ? 'neither the manufacture year nor an odometer reading was captured'
      : !mfgYear ? 'no manufacture year was captured' : 'AVO recorded no odometer reading'}, so usage per year cannot be calculated.`);
  }

  if (overallRating === 'GOOD')      mark('valScore', 'pass', `Overall vehicle score ${ratingShown} — in the GOOD band (7 and above).`);
  else if (overallRating === 'POOR') mark('valScore', 'fail', `Overall vehicle score ${ratingShown} — in the POOR band (below 4).`);
  else if (overallRating)            mark('valScore', 'fail', `Overall vehicle score ${ratingShown} — in the AVERAGE band (4 to 7); a judgement call.`);
  else                               mark('valScore', 'fail', 'No inspection sections have been scored yet, so there is no overall score.');

  // ── QC Recommendation ─────────────────────────────────────────────────────
  mark('recCondition', condMap(overallRating), overallRating
    ? `Derived from the overall vehicle score ${ratingShown} (${overallRating} band).`
    : 'No overall vehicle score available yet.');

  mark('recEngine', condMap(engineCond), engineCond
    ? `AVO recorded engine condition as ${engineCond}.`
    : 'AVO did not record an engine condition.');

  const extVal = exteriorCond || bodyCondition;
  const extVerdict =
    extVal === 'GOOD' ? 'good'
    : (extVal === 'AVERAGE' || extVal === 'FAIR') ? 'minor'
    : (extVal === 'POOR' || extVal === 'DAMAGED') ? 'major'
    : null;
  mark('recExterior', extVerdict, extVal
    ? `AVO recorded exterior/body condition as ${extVal}.`
    : 'AVO did not record an exterior or body condition.');

  const tyreVerdict =
    tyreCond === 'GOOD' ? 'good'
    : tyreCond === 'AVERAGE' ? 'average'
    : (tyreCond === 'POOR' || tyreCond === 'DAMAGED') ? 'replacement'
    : null;
  mark('recTyre', tyreVerdict, tyreCond
    ? `AVO recorded overall tyre condition as ${tyreCond}.`
    : 'AVO did not record an overall tyre condition.');

  // Damage and missing parts are already answered by the AVO's own entries — walk
  // the registry for this vehicle type and count them, rather than asking the
  // reviewer to re-read 300 fields. Cards the AVO left blank or marked N/A do not
  // count either way; the note names what was found so the verdict can be checked.
  const vk = normalizeVehicleType(input.vehicleSegment) ?? normalizeVehicleType(input.valuationType);
  const damaged: string[] = [];
  const missing: string[] = [];
  if (vk && ins) {
    for (const section of getFieldRegistry(vk)) {
      for (const f of section.fields) {
        const v = mapVerdict((ins as unknown as Record<string, unknown>)[f.key] as string);
        if (v === 'DAMAGED' || v === 'POOR' || v === 'BAD') damaged.push(f.label);
        else if (v === 'MISSING' || v === 'NO') missing.push(f.label);
      }
    }
  }
  const list = (xs: string[], cap = 6) =>
    xs.slice(0, cap).join(', ') + (xs.length > cap ? `, +${xs.length - cap} more` : '');

  if (!vk || !ins) {
    mark('recDamage', 'major', 'No inspection entries could be read for this vehicle type — check the photos before approving.');
  } else if (damaged.length === 0) {
    mark('recDamage', 'none', 'No inspection entry is marked DAMAGED or POOR.');
  } else if (damaged.length <= 2) {
    mark('recDamage', 'minor', `${damaged.length} entr(y/ies) marked DAMAGED or POOR: ${list(damaged)}.`);
  } else {
    mark('recDamage', 'major', `${damaged.length} entries marked DAMAGED or POOR: ${list(damaged)}.`);
  }

  if (!vk || !ins) {
    mark('recMissingParts', 'present', 'No inspection entries could be read for this vehicle type — check the photos before approving.');
  } else if (missing.length === 0) {
    mark('recMissingParts', 'none', 'No inspection entry is marked MISSING / NOT PRESENT or NO.');
  } else {
    mark('recMissingParts', 'present', `${missing.length} entr(y/ies) marked missing or not present: ${list(missing)}.`);
  }

  if (chassisPunch === 'TAMPERED' || overallRating === 'POOR') {
    mark('recFinal', 'not-recommended',
      chassisPunch === 'TAMPERED' ? 'Chassis punch is recorded as tampered.' : 'Overall rating is POOR.');
  } else if (overallRating === 'GOOD' && chassisPunch === 'ORIGINAL') {
    mark('recFinal', 'recommended', 'Overall rating GOOD and chassis punch Original.');
  } else {
    mark('recFinal', 'conditional',
      `Neither a clean pass nor a clear reject on rating (${overallRating || 'not set'}) ` +
      `and chassis punch (${chassisPunch || 'not set'}).`);
  }

  return { cl, why };
}

/**
 * Applies the QC officer's saved checklist over the automatic verdicts. Where the
 * two disagree the note says so, otherwise it would describe a check the reviewer
 * overruled.
 */
export function applySavedChecklist(
  result: QcChecklistResult,
  saved: Record<string, string | null> | null | undefined
): void {
  if (!saved) return;
  Object.entries(saved).forEach(([k, rawV]) => {
    if (rawV === null || rawV === undefined) return;
    // docHypo was same/different before it became yes/no.
    const v = k === 'docHypo'
      ? (rawV === 'same' ? 'no' : rawV === 'different' ? 'yes' : rawV)
      : rawV;
    if (result.cl[k] !== v) {
      result.why[k] = 'Saved by the reviewer' +
        (result.cl[k] ? `, overriding the automatic verdict — ${result.why[k] || ''}` : '.');
    }
    result.cl[k] = v;
  });
}
