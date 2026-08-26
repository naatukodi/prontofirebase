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

export interface QcChecklistInput {
  report: FinalReport | null | undefined;
  /** Overall rating as entered on the QC form ('GOOD' / 'AVERAGE' / 'POOR'). */
  overallRating?: string | null;
  /** Chassis punch as entered on the QC form ('Original' / 'Re-punched' / 'Tampered'). */
  chassisPunch?: string | null;
  valuationAmount?: number | null;
  lowRange?: number | null;
  highRange?: number | null;
  /** Keys of the photos actually uploaded for this valuation. */
  photoKeys?: string[];
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
  const overallRating = (input.overallRating || '').toUpperCase();
  const engineCond    = (ins?.engineCondition      || '').toUpperCase();
  const tyreCond      = (ins?.overallTyreCondition || '').toUpperCase();
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
      mark(key, null, `${label} expiry date not captured in Vehicle Details — verify from the uploaded document.`);
      return;
    }
    const d = new Date(validTo);
    if (isNaN(d.getTime())) {
      mark(key, null, `${label} expiry "${validTo}" could not be read — verify manually.`);
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
    mark('docRC', null, 'No registration number captured in Vehicle Details.');
  }

  checkExpiry('docIns',     'Insurance' + (vd?.insurer   ? ` (${vd.insurer})` : ''), vd?.insuranceValidUpTo);
  checkExpiry('docPermit',  'Permit'    + (vd?.permitNo  ? ` ${vd.permitNo}`  : ''), vd?.permitValidUpTo);
  checkExpiry('docFitness', 'Fitness'   + (vd?.fitnessNo ? ` ${vd.fitnessNo}` : ''), vd?.fitnessValidTo);
  checkExpiry('docTax',     'Road tax',                                              vd?.taxUpto);

  if (vd?.hypothecation) {
    mark('docHypo', null, vd.lender
      ? `RC shows hypothecation to ${vd.lender} — confirm it matches the financing bank.`
      : 'RC shows hypothecation but no lender name — confirm the bank from the RC copy.');
  } else {
    mark('docHypo', 'same', 'RC shows no hypothecation on record.');
  }

  if (chassisPunch === 'ORIGINAL')       mark('docChassis', 'original',  'Chassis punch recorded as Original on the QC form.');
  else if (chassisPunch === 'REPUNCHED') mark('docChassis', 'repunched', 'Chassis punch recorded as Re-punched on the QC form.');
  else if (chassisPunch === 'TAMPERED')  mark('docChassis', 'tampered',  'Chassis punch recorded as Tampered on the QC form.');
  else                                   mark('docChassis', null,        'Chassis punch not recorded on the QC form.');

  // ── Data Accuracy: vehicle identity ───────────────────────────────────────
  if (vd?.registrationNumber) {
    const plateShots = has('FrontViewGrille', 'RearViewTailgate');
    mark('accReg', plateShots ? 'pass' : null,
      `RC registration ${vd.registrationNumber}` + (plateShots
        ? ' — front/rear photos are on file; confirm the plate reads the same.'
        : ' — front/rear photos missing, so the plate cannot be compared.'));
  } else {
    mark('accReg', null, 'No registration number captured to compare against.');
  }

  if (vd?.chassisNumber) {
    const stencil = has('ChassisStencilTrace', 'ChassisImprint', 'ChassisVerification');
    mark('accChassis', stencil ? 'pass' : null,
      `RC chassis ${vd.chassisNumber}` + (stencil
        ? ' — stencil/imprint photo on file for comparison.'
        : ' — no stencil or imprint photo uploaded, so it cannot be cross-checked.'));
  } else {
    mark('accChassis', null, 'No chassis number captured in Vehicle Details.');
  }

  const odo = ins?.odometer ?? 0;
  if (odo > 0) {
    const odoShot = has('Odometer', 'InstrumentCluster');
    mark('accOdo', odoShot ? 'pass' : null,
      `AVO recorded ${inr(odo)} km` + (odoShot
        ? ' — odometer photo on file for comparison.'
        : ' — no odometer photo uploaded.'));
  } else {
    mark('accOdo', 'fail', 'AVO recorded no odometer reading.');
  }

  if (has('VinPlate')) {
    mark('accVIN', ins?.vinPlate ? 'pass' : 'fail', ins?.vinPlate
      ? 'VIN plate photo uploaded and AVO confirmed the plate is present.'
      : 'VIN plate photo uploaded but AVO marked the plate as not present.');
  } else {
    mark('accVIN', ins?.vinPlate === false ? 'fail' : null, ins?.vinPlate === false
      ? 'AVO marked the VIN plate as not present on the vehicle.'
      : 'No VIN plate photo uploaded to compare against the RC.');
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
    mark('accMfgReg', null, 'Manufacture year or registration date missing — the gap cannot be calculated.');
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
    mark('accVahan', null, 'VAHAN make/model not captured — nothing to compare with the inspection.');
  }

  // ── Data Accuracy: owner / applicant ──────────────────────────────────────
  const applicant = report?.stakeholder?.applicant?.name;
  if (applicant && vd?.ownerName) {
    const norm = (x: string) => x.trim().toUpperCase().replace(/\s+/g, ' ');
    const same = norm(applicant) === norm(vd.ownerName);
    mark('accOwner', same ? 'pass' : null,
      `Applicant "${applicant}" vs RC owner "${vd.ownerName}"` +
      (same ? ' — exact match.' : ' — names differ, confirm from the ID documents.'));
  } else {
    mark('accOwner', null, 'Applicant name or RC owner name missing — the two cannot be compared.');
  }

  if (vd?.ownerSerialNo) {
    mark('accSerial', 'pass', `RC shows owner serial number ${vd.ownerSerialNo}.`);
  } else {
    mark('accSerial', null, 'RC did not return an owner serial number.');
  }

  // ── Data Accuracy: technical specifications ───────────────────────────────
  mark('accTransmission', null,
    (vd?.makerVariant || vd?.classOfVehicle)
      ? `RC lists ${vd.makerVariant || vd.classOfVehicle} — VAHAN does not return transmission type, so confirm it from the variant and the interior photos.`
      : 'RC variant not captured — confirm the transmission from the vehicle photos.');

  if (vd?.fuel) {
    mark('accFuel', 'pass', `RC fuel type ${vd.fuel}` +
      (vd.engineCC  ? ` with a ${vd.engineCC}cc engine` : '') +
      (vd.normsType ? `, ${vd.normsType}` : '') + '.');
  } else {
    mark('accFuel', null, 'RC did not return a fuel type.');
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
    mark('accPhotoLoc', null,
      `${photoCount} photo(s) uploaded but none carry a capture location` +
      (ins?.inspectionLocation ? ` (declared: "${ins.inspectionLocation}")` : '') +
      ' — compare the backgrounds visually.');
  } else if (places.length === 1) {
    mark('accPhotoLoc', 'pass',
      `All ${metaEntries.length} stamped photo(s) captured at "${places[0]}".`);
  } else {
    mark('accPhotoLoc', 'fail',
      `Photos captured at ${places.length} different locations: ` +
      places.map(p => `"${p}"`).join(', ') + '.');
  }

  mark('accDaylight', null, 'Lighting cannot be judged automatically — open the photos to confirm.');

  mark('accPlate', has('FrontViewGrille', 'RearViewTailgate') ? null : 'fail',
    has('FrontViewGrille', 'RearViewTailgate')
      ? 'Front and rear photos are on file — confirm the plate is legible in both.'
      : 'Front or rear photo is missing, so the plate cannot be checked.');

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
    mark('accGPS', null, 'No inspection date declared by AVO to compare the photo timestamps against.');
  } else if (shotDates.length === 0) {
    mark('accGPS', null,
      `AVO declared ${fmtDate(ins.dateOfInspection)} but no photo carries a capture timestamp — compare manually.`);
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

  if (low > 0 && high > 0) {
    const inRange = valuationAmt >= low && valuationAmt <= high;
    mark('valInRange', inRange ? 'pass' : 'fail',
      `QC amount ₹${inr(valuationAmt)} against the AI estimate ₹${inr(low)}–₹${inr(high)}` +
      (inRange ? ' — inside the range.' : ' — outside the range.'));
  } else {
    mark('valInRange', null, 'No AI market estimate available to compare the amount against.');
  }

  if (vd?.backlistStatus) {
    mark('valDedupe', 'fail', 'VAHAN reports this vehicle as blacklisted.');
  } else if (vd?.registrationNumber) {
    mark('valDedupe', 'pass', `VAHAN reports no blacklist flag on ${vd.registrationNumber}.`);
  } else {
    mark('valDedupe', null, 'No registration number available to run the check against.');
  }

  if (mfgYear && odo > 0) {
    const age = new Date().getFullYear() - mfgYear;
    const avgKm = age > 0 ? odo / age : odo;
    const ok = avgKm < 60000;
    mark('valAgeOdo', ok ? 'pass' : 'fail',
      `${inr(Math.round(avgKm))} km/year over ${age || 1} year(s)` +
      (ok ? ' — within the usual range.' : ' — above the 60,000 km/year threshold.'));
  } else {
    mark('valAgeOdo', null, 'Manufacture year or odometer reading missing — usage cannot be derived.');
  }

  if (overallRating === 'GOOD')      mark('valScore', 'pass', 'Overall rating recorded as GOOD on the QC form.');
  else if (overallRating === 'POOR') mark('valScore', 'fail', 'Overall rating recorded as POOR on the QC form.');
  else                               mark('valScore', null,   'No overall rating recorded on the QC form.');

  // ── QC Recommendation ─────────────────────────────────────────────────────
  mark('recCondition', condMap(overallRating), overallRating
    ? `Taken from the Overall Rating on the QC form (${overallRating}).`
    : 'No overall rating recorded on the QC form.');

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

  mark('recDamage', null, 'Judge from the inspection remarks and the vehicle photos.');
  mark('recMissingParts', null, 'Judge from the inspection entries marked MISSING / NOT PRESENT or DAMAGED.');

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
  Object.entries(saved).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (result.cl[k] !== v) {
      result.why[k] = 'Saved by the reviewer' +
        (result.cl[k] ? `, overriding the automatic verdict — ${result.why[k] || ''}` : '.');
    }
    result.cl[k] = v;
  });
}
