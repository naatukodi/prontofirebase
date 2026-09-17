// inspection-field-registry.ts
// Single source of truth for inspection form fields across all vehicle types.
// Matches the VEHGA VEHICLE INSPECTION CHECKLIST Excel
// (VEHGA_REPORT_ALL_SEGMENTS_UPDATED, all 7 sheets, 2026-09). Sections run down the
// sheet's MECHANICAL column, then STRUCTURAL, then FUNCTIONALITY and OTHER SYSTEMS.
// Both Angular and Flutter reference the same structure — keep in sync with
// inspection_field_registry.dart in prontomoto_app/lib/.

export type FieldType = 'condition' | 'yes-no' | 'text' | 'date' | 'number';
export type VehicleTypeKey = 'cv' | '4w' | '2w' | '3w' | 'ce' | 'bus' | 'fe';

/**
 * How a field's answer turns into points (see answerPoints in inspection-score.ts).
 * - 'condition' (the default): GOOD 8.5, AVERAGE 5.5 … NO 1.0.
 * - 'no-is-good': the question asks about a fault, so NO is the good answer —
 *   Fluid Leaks: NO scores 8.5 and YES scores 1.0. Other answers score as usual.
 * - 'zero-is-good': a count of faults — Missing Tyres: 0 scores 8.5, 1 or more 1.0.
 */
export type FieldScoring = 'condition' | 'no-is-good' | 'zero-is-good';

export interface InspectionField {
  key: string;       // camelCase — matches Inspection model property
  label: string;     // display label shown in form and PDF
  type: FieldType;   // 'condition' → the CONDITION_OPTIONS dropdown  |  'number' → a whole-number box
  default?: string;  // prefilled by "Set Default Values"; a field without one is left for the inspector
  scoring?: FieldScoring;
  /**
   * Whether this field contributes to its section's score. Defaults to true.
   *
   * Distinct from answering N/A, which excludes a single vehicle's field at the
   * point of inspection. This excludes the field for every vehicle, because the
   * answer is a fact about the vehicle rather than a judgement of its condition
   * — ABS being fitted or not is not something to mark a vehicle down for.
   * Keep in sync with FieldDef.Scored in ProntoPDFGeneration's PdfReportService.
   */
  scored?: boolean;
}

export interface InspectionSection {
  section: string;
  fields: InspectionField[];
  /**
   * Whether this section contributes to the overall vehicle score. Defaults to
   * true. Keep in sync with SectionDef.Scored in ProntoPDFGeneration.
   */
  scored?: boolean;
}

// ─── Options ─────────────────────────────────────────────────────────────────
// Every non-boolean inspection dropdown offers the same list, so an inspector can
// record a part as damaged / missing / not applicable instead of forcing a
// GOOD-AVERAGE-POOR verdict onto it. Keep in sync with conditionOptions in
// inspection_field_registry.dart and with MapVerdict in ProntoPDFGeneration's
// PdfReportService — the PDF scores and colours these exact strings.
export const CONDITION_OPTIONS = [
  'GOOD',
  'AVERAGE',
  'POOR',
  'DAMAGED',
  'MISSING / NOT PRESENT',
  'N/A',
  'YES',
  'NO',
] as const;
export const YES_NO_OPTIONS    = ['YES', 'NO'] as const;

/** Gearbox type, recorded by the AVO in General Condition. VAHAN does not
 *  return this, so it is observed rather than looked up. Keep in sync with
 *  TransmissionType on InspectionDetails in both API projects. */
export const TRANSMISSION_OPTIONS = ['MANUAL', 'AUTOMATIC', 'AMT', 'CVT', 'DCT'] as const;

// ─── Normalise stored valuationType → registry key ───────────────────────────
export function normalizeVehicleType(raw: string | null | undefined): VehicleTypeKey | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.includes('commercial') || s === 'cv') return 'cv';
  if (s.includes('four') || s === '4w')       return '4w';
  if (s.includes('two')  || s === '2w')       return '2w';
  if (s.includes('three')|| s === '3w')       return '3w';
  if (s.includes('construction') || s === 'ce') return 'ce';
  if (s.includes('bus')  || s === 'bus')      return 'bus';
  if (s.includes('tractor') || s.includes('farm') || s === 'fe') return 'fe';
  return null;
}

// ─── Page-1 Condition Verdict labels per vehicle type ────────────────────────
// The summary boxes shown on the cover page.
//
// NOTE: nothing in the portal reads this today — the cover is composed by
// ProntoPDFGeneration's ResolveCoverVerdicts. It is kept as the written record of
// which sections the cover speaks for, and must be changed alongside that method.
// OTHER SYSTEMS was dropped from both when it stopped being scored: a band printed
// on the cover is a score, and the section no longer has one.
export const VERDICT_SECTIONS: Record<VehicleTypeKey, string[]> = {
  cv:  ['ENGINE',   'CABIN',    'LOAD BODY'],
  '4w':['ENGINE',   'EXTERIOR', 'INTERIOR'],
  '2w':['ENGINE',   'EXTERIOR', 'BODY'],
  '3w':['ENGINE',   'CABIN',    'LOAD BODY'],
  ce:  ['ENGINE',   'CABIN',    'ATTACHMENTS'],
  bus: ['ENGINE',   'COACH',    'BODY ASSY'],
  fe:  ['ENGINE',   'CABIN',    'BODY ASSY'],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const FIELD_REGISTRY: Record<VehicleTypeKey, InspectionSection[]> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // CV — Commercial Vehicle
  // ═══════════════════════════════════════════════════════════════════════════
  cv: [
    {
      section: 'ENGINE CONDITION',
      fields: [
        { key: 'engineCondition', label: 'Engine Condition', type: 'condition', default: 'GOOD' },
        { key: 'fluidLeaks',      label: 'Fluid Leaks',      type: 'condition', default: 'NO', scoring: 'no-is-good' },
        { key: 'radiator',        label: 'Radiator',         type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes',    label: 'All Hose Pipes',   type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',      label: 'Fuel System',      type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',     label: 'Gearbox Assy',      type: 'condition', default: 'GOOD' },
        { key: 'clutchSystem',    label: 'Clutch System',     type: 'condition', default: 'GOOD' },
        { key: 'differentialAssy',label: 'Differential Assy', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'frontBrakes',  label: 'Front Brakes',  type: 'condition', default: 'GOOD' },
        { key: 'rearBrakes',   label: 'Rear Brakes',   type: 'condition', default: 'GOOD' },
        { key: 'parkingBrake', label: 'Parking Brake', type: 'condition', default: 'GOOD' },
        { key: 'abs',          label: 'ABS',           type: 'condition', default: 'YES', scored: false },
      ],
    },
    {
      section: 'STEERING SYSTEM',
      fields: [
        { key: 'steeringWheel',  label: 'Steering Wheel',  type: 'condition', default: 'GOOD' },
        { key: 'steeringColumn', label: 'Steering Column', type: 'condition', default: 'GOOD' },
        { key: 'steeringBox',    label: 'Steering Box',    type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'SUSPENSION SYSTEM',
      fields: [
        { key: 'frontSuspension', label: 'Front Suspension',   type: 'condition', default: 'GOOD' },
        { key: 'rearSuspension',  label: 'Rear Suspension',    type: 'condition', default: 'GOOD' },
        { key: 'axles',           label: 'Front & Rear Axles', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'CABIN ASSEMBLY',
      fields: [
        { key: 'cabin',     label: 'Cabin',       type: 'condition', default: 'GOOD' },
        { key: 'dashboard', label: 'Dashboard',   type: 'condition', default: 'GOOD' },
        { key: 'doors',     label: 'Doors',       type: 'condition', default: 'GOOD' },
        { key: 'allGlasses',label: 'All Glasses', type: 'condition', default: 'GOOD' },
        { key: 'seats',     label: 'Seats',       type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'LOAD BODY',
      fields: [
        { key: 'bodyCondition',    label: 'Body Condition',          type: 'condition', default: 'GOOD' },
        { key: 'rightSideGate',    label: 'Right Side Gate',         type: 'condition', default: 'GOOD' },
        { key: 'leftSideGate',     label: 'Left Side Gate',          type: 'condition', default: 'GOOD' },
        { key: 'tailGate',         label: 'Tail Gate',               type: 'condition', default: 'GOOD' },
        { key: 'loadFloor',        label: 'Load Floor',              type: 'condition', default: 'GOOD' },
        { key: 'chassisCondition', label: 'Chassis / Vehicle Frame', type: 'condition', default: 'GOOD' },
        { key: 'paintWork',        label: 'Paint Work',              type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',          label: 'Head Lights',              type: 'condition', default: 'GOOD' },
        { key: 'tailLightsIndicators',label: 'Tail Lights / Indicators', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',    label: 'Battery',                  type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',          label: 'Wiring Assy',              type: 'condition', default: 'GOOD' },
        { key: 'clusterUnit',         label: 'Cluster Unit',             type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TIRES',
      fields: [
        { key: 'tyreCondition', label: 'Tyre Condition',  type: 'condition', default: 'AVERAGE' },
        // How many tyres the vehicle has is a fact, not a finding — shown, never scored,
        // and left blank by "Set Default Values" for the inspector to count.
        { key: 'numberOfTyres', label: 'Number of Tyres', type: 'number', scored: false },
        { key: 'missingTyres',  label: 'Missing Tyres',   type: 'number', default: '0', scoring: 'zero-is-good' },
      ],
    },
    {
      section: 'FUNCTIONALITY',
      fields: [
        { key: 'engineStarted', label: 'Engine Started', type: 'condition', default: 'YES' },
        { key: 'testDrive',     label: 'Test Drive',     type: 'condition', default: 'YES' },
        { key: 'vehicleMoved',  label: 'Vehicle Moved',  type: 'condition', default: 'YES' },
        { key: 'warningLights', label: 'Warning Lights', type: 'condition', default: 'YES' },
      ],
    },
    {
      section: 'OTHER SYSTEMS',
      // Accessories and fitments, not condition findings — recorded and printed,
      // but they no longer pull the vehicle's score around.
      scored: false,
      fields: [
        { key: 'audio',                  label: 'Audio',                     type: 'condition', default: 'NO' },
        { key: 'upholstery',             label: 'Upholstery',                type: 'condition', default: 'GOOD' },
        { key: 'hydraulicLift',          label: 'Hydraulic Lift',            type: 'condition', default: 'YES' },
        { key: 'frontCrashGuard',        label: 'Front Crash Guard',         type: 'condition', default: 'NO' },
        { key: 'rearCrashGuard',         label: 'Rear Crash Guard',          type: 'condition', default: 'NO' },
        { key: 'sideUnderRunProtection', label: 'Side Under Run Protection', type: 'condition', default: 'NO' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 4W — Four Wheeler
  // ═══════════════════════════════════════════════════════════════════════════
  '4w': [
    {
      section: 'ENGINE CONDITION',
      fields: [
        { key: 'engineCondition', label: 'Engine Condition', type: 'condition', default: 'GOOD' },
        { key: 'fluidLeaks',      label: 'Fluid Leaks',      type: 'condition', default: 'NO', scoring: 'no-is-good' },
        { key: 'radiator',        label: 'Radiator',         type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes',    label: 'All Hose Pipes',   type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',      label: 'Fuel System',      type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',  label: 'Gearbox Assy',  type: 'condition', default: 'GOOD' },
        { key: 'clutchSystem', label: 'Clutch System', type: 'condition', default: 'GOOD' },
        { key: 'driveShafts',  label: 'Drive Shafts',  type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'frontBrakes',  label: 'Front Brakes',  type: 'condition', default: 'GOOD' },
        { key: 'rearBrakes',   label: 'Rear Brakes',   type: 'condition', default: 'GOOD' },
        { key: 'parkingBrake', label: 'Parking Brake', type: 'condition', default: 'GOOD' },
        { key: 'abs',          label: 'ABS',           type: 'condition', default: 'NO', scored: false },
      ],
    },
    {
      section: 'STEERING SYSTEM',
      fields: [
        { key: 'steeringWheel',  label: 'Steering Wheel',  type: 'condition', default: 'GOOD' },
        { key: 'steeringColumn', label: 'Steering Column', type: 'condition', default: 'GOOD' },
        { key: 'steeringBox',    label: 'Steering Box',    type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'SUSPENSION SYSTEM',
      fields: [
        { key: 'frontSuspension', label: 'Front Suspension',   type: 'condition', default: 'GOOD' },
        { key: 'rearSuspension',  label: 'Rear Suspension',    type: 'condition', default: 'GOOD' },
        { key: 'axles',           label: 'Front & Rear Axles', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'EXTERIOR',
      fields: [
        { key: 'bonnet',      label: 'Bonnet Assy',  type: 'condition', default: 'GOOD' },
        { key: 'bumpers',     label: 'Bumpers',      type: 'condition', default: 'GOOD' },
        { key: 'doors',       label: 'Doors',        type: 'condition', default: 'GOOD' },
        { key: 'allGlasses',  label: 'All Glasses',  type: 'condition', default: 'GOOD' },
        { key: 'sideFenders', label: 'Side Fenders', type: 'condition', default: 'GOOD' },
        // Not on the 4W sheet, but kept on request (2026-09-17); scored with the other panels.
        { key: 'paintWork',   label: 'Paint Work',   type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'INTERIOR',
      fields: [
        { key: 'dashboard',    label: 'Dash Board',     type: 'condition', default: 'GOOD' },
        { key: 'seats',        label: 'Seats & Mats',   type: 'condition', default: 'GOOD' },
        { key: 'interiorTrims',label: 'Interior Trims', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',           label: 'Head Lights',              type: 'condition', default: 'GOOD' },
        { key: 'tailLightsIndicators', label: 'Tail Lights / Indicators', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',     label: 'Battery',                  type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',           label: 'Wiring Assy',              type: 'condition', default: 'GOOD' },
        { key: 'clusterUnit',          label: 'Cluster Unit',             type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TIRES',
      fields: [
        { key: 'tyreCondition', label: 'Tyre Condition',  type: 'condition', default: 'AVERAGE' },
        { key: 'numberOfTyres', label: 'Number of Tyres', type: 'number', scored: false },
        { key: 'missingTyres',  label: 'Missing Tyres',   type: 'number', default: '0', scoring: 'zero-is-good' },
      ],
    },
    {
      section: 'FUNCTIONALITY',
      fields: [
        { key: 'engineStarted', label: 'Engine Started', type: 'condition', default: 'YES' },
        { key: 'testDrive',     label: 'Test Drive',     type: 'condition', default: 'YES' },
        { key: 'vehicleMoved',  label: 'Vehicle Moved',  type: 'condition', default: 'YES' },
        { key: 'warningLights', label: 'Warning Lights', type: 'condition', default: 'YES' },
      ],
    },
    {
      section: 'OTHER SYSTEMS',
      // Accessories and fitments, not condition findings — recorded and printed,
      // but they no longer pull the vehicle's score around.
      scored: false,
      fields: [
        { key: 'audio',           label: 'Audio',             type: 'condition', default: 'NO' },
        { key: 'airConditioner',  label: 'Air Conditioner',   type: 'condition', default: 'NO' },
        { key: 'upholstery',      label: 'Upholstery',        type: 'condition', default: 'GOOD' },
        { key: 'sunRoof',         label: 'Sun Roof',          type: 'condition', default: 'NO' },
        { key: 'rearCrashGuard',  label: 'Rear Crash Guard',  type: 'condition', default: 'NO' },
        { key: 'frontCrashGuard', label: 'Front Crash Guard', type: 'condition', default: 'NO' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 2W — Two Wheeler
  // ═══════════════════════════════════════════════════════════════════════════
  '2w': [
    {
      section: 'ENGINE CONDITION',
      fields: [
        { key: 'engineCondition', label: 'Engine Condition', type: 'condition', default: 'GOOD' },
        { key: 'fluidLeaks',      label: 'Fluid Leaks',      type: 'condition', default: 'NO', scoring: 'no-is-good' },
        { key: 'radiator',        label: 'Radiator',         type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes',    label: 'All Hose Pipes',   type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',      label: 'Fuel System',      type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',  label: 'Gearbox Assy',        type: 'condition', default: 'GOOD' },
        { key: 'clutchSystem', label: 'Clutch System',       type: 'condition', default: 'GOOD' },
        // The same part CE records as Final Drive, so it shares that key.
        { key: 'finalDrive',   label: 'Final Drive / Chain', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'frontBrakes',      label: 'Front Brake',          type: 'condition', default: 'GOOD' },
        { key: 'rearBrakes',       label: 'Rear Brake',           type: 'condition', default: 'GOOD' },
        { key: 'brakeLeversFluid', label: 'Brake Levers / Fluid', type: 'condition', default: 'GOOD' },
        { key: 'abs',              label: 'ABS',                  type: 'condition', default: 'NO', scored: false },
      ],
    },
    {
      section: 'STEERING SYSTEM',
      fields: [
        { key: 'handleBar',    label: 'Handle Bar',   type: 'condition', default: 'GOOD' },
        { key: 'steeringStem', label: 'Steering Stem',type: 'condition', default: 'GOOD' },
        { key: 'frontForkAssy',label: 'Front Fork',   type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'SUSPENSION SYSTEM',
      fields: [
        { key: 'frontShockAbsorber', label: 'Front Shock Absorber', type: 'condition', default: 'GOOD' },
        { key: 'rearShockAbsorber',  label: 'Rear Shock Absorber',  type: 'condition', default: 'GOOD' },
        { key: 'alloyWheelRim',      label: 'Alloy / Wheel Rim',    type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'EXTERIOR',
      fields: [
        { key: 'fuelTankCondition', label: 'Fuel Tank Assy', type: 'condition', default: 'GOOD' },
        { key: 'frontScoop',        label: 'Front Scoop',    type: 'condition', default: 'GOOD' },
        { key: 'seatCondition',     label: 'Seat',           type: 'condition', default: 'GOOD' },
        { key: 'rvMirrors',         label: 'R/V Mirrors',    type: 'condition', default: 'GOOD' },
        { key: 'lockSet',           label: 'Lock Set',       type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BODY',
      fields: [
        { key: 'frontMudGuard', label: 'Mudguard - Front',     type: 'condition', default: 'GOOD' },
        { key: 'rearMudGuard',  label: 'Mudguard - Rear',      type: 'condition', default: 'GOOD' },
        { key: 'sideCovers',    label: 'Side Covers (LH, RH)', type: 'condition', default: 'GOOD' },
        { key: 'bellyPanels',   label: 'Belly / Floor Panels', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',           label: 'Head Lights',              type: 'condition', default: 'GOOD' },
        { key: 'tailLightsIndicators', label: 'Tail Lights / Indicators', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',     label: 'Battery',                  type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',           label: 'Wiring Assy',              type: 'condition', default: 'GOOD' },
        { key: 'switches',             label: 'Switches',                 type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TIRES',
      fields: [
        { key: 'tyreCondition', label: 'Tyre Condition',  type: 'condition', default: 'AVERAGE' },
        { key: 'numberOfTyres', label: 'Number of Tyres', type: 'number', scored: false },
        { key: 'missingTyres',  label: 'Missing Tyres',   type: 'number', default: '0', scoring: 'zero-is-good' },
      ],
    },
    {
      section: 'FUNCTIONALITY',
      fields: [
        { key: 'engineStarted', label: 'Engine Started', type: 'condition', default: 'YES' },
        { key: 'testDrive',     label: 'Test Ride',      type: 'condition', default: 'YES' },
        { key: 'vehicleMoved',  label: 'Vehicle Moved',  type: 'condition', default: 'YES' },
        { key: 'warningLights', label: 'Warning Lights', type: 'condition', default: 'YES' },
      ],
    },
    {
      section: 'OTHER SYSTEMS',
      // Accessories and fitments, not condition findings — recorded and printed,
      // but they no longer pull the vehicle's score around.
      scored: false,
      fields: [
        { key: 'mainStand',        label: 'Main Stand',             type: 'condition', default: 'NO' },
        { key: 'sideStand',        label: 'Side Stand',             type: 'condition', default: 'NO' },
        { key: 'horn',             label: 'Horn',                   type: 'condition', default: 'NO' },
        { key: 'kickPedalFootRest',label: 'Kick Pedal / Foot Rest', type: 'condition', default: 'NO' },
        { key: 'chainGuard',       label: 'Chain Guard',            type: 'condition', default: 'NO' },
        { key: 'selfStart',        label: 'Self Start',             type: 'condition', default: 'NO' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 3W — Three Wheeler
  // ═══════════════════════════════════════════════════════════════════════════
  '3w': [
    {
      section: 'ENGINE CONDITION',
      fields: [
        { key: 'engineCondition', label: 'Engine Condition', type: 'condition', default: 'GOOD' },
        { key: 'fluidLeaks',      label: 'Fluid Leaks',      type: 'condition', default: 'NO', scoring: 'no-is-good' },
        { key: 'radiator',        label: 'Radiator',         type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes',    label: 'All Hose Pipes',   type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',      label: 'Fuel System',      type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',     label: 'Gearbox Assy',      type: 'condition', default: 'GOOD' },
        { key: 'clutchSystem',    label: 'Clutch System',     type: 'condition', default: 'GOOD' },
        { key: 'differentialAssy',label: 'Differential Assy', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'frontBrakes',  label: 'Front Brakes',  type: 'condition', default: 'GOOD' },
        { key: 'rearBrakes',   label: 'Rear Brakes',   type: 'condition', default: 'GOOD' },
        { key: 'parkingBrake', label: 'Parking Brake', type: 'condition', default: 'GOOD' },
        { key: 'abs',          label: 'ABS',           type: 'condition', default: 'NO', scored: false },
      ],
    },
    {
      section: 'STEERING SYSTEM',
      fields: [
        { key: 'steeringHandle',   label: 'Steering Handle',   type: 'condition', default: 'GOOD' },
        { key: 'steeringColumn',   label: 'Steering Column',   type: 'condition', default: 'GOOD' },
        { key: 'steeringLinkages', label: 'Steering Linkages', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'SUSPENSION SYSTEM',
      fields: [
        { key: 'frontSuspension', label: 'Front Suspension',   type: 'condition', default: 'GOOD' },
        { key: 'rearSuspension',  label: 'Rear Suspension',    type: 'condition', default: 'GOOD' },
        { key: 'axles',           label: 'Front & Rear Axles', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'CABIN ASSEMBLY',
      fields: [
        { key: 'frontPanel',      label: 'Front Panel',    type: 'condition', default: 'GOOD' },
        { key: 'frontGlassFrame', label: 'Fr Glass Frame', type: 'condition', default: 'GOOD' },
        { key: 'dashboard',       label: 'Dash Board',     type: 'condition', default: 'GOOD' },
        { key: 'seats',           label: 'Seats & Mats',   type: 'condition', default: 'GOOD' },
        { key: 'mudguards',       label: 'Mudguards',      type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'LOAD BODY',
      fields: [
        { key: 'rightSideGate',    label: 'Right Side Gate',         type: 'condition', default: 'GOOD' },
        { key: 'leftSideGate',     label: 'Left Side Gate',          type: 'condition', default: 'GOOD' },
        { key: 'tailGate',         label: 'Tail Gate',               type: 'condition', default: 'GOOD' },
        { key: 'loadFloor',        label: 'Load Floor',              type: 'condition', default: 'GOOD' },
        { key: 'chassisCondition', label: 'Chassis / Vehicle Frame', type: 'condition', default: 'GOOD' },
        { key: 'paintWork',        label: 'Paint Work',              type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',           label: 'Lights',                   type: 'condition', default: 'GOOD' },
        { key: 'tailLightsIndicators', label: 'Tail Lights / Indicators', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',     label: 'Battery',                  type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',           label: 'Wiring Assy',              type: 'condition', default: 'GOOD' },
        { key: 'switches',             label: 'Switches',                 type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TIRES',
      fields: [
        { key: 'tyreCondition', label: 'Tyre Condition',  type: 'condition', default: 'AVERAGE' },
        { key: 'numberOfTyres', label: 'Number of Tyres', type: 'number', scored: false },
        { key: 'missingTyres',  label: 'Missing Tyres',   type: 'number', default: '0', scoring: 'zero-is-good' },
      ],
    },
    {
      section: 'FUNCTIONALITY',
      fields: [
        { key: 'engineStarted', label: 'Engine Started', type: 'condition', default: 'YES' },
        { key: 'testDrive',     label: 'Test Drive',     type: 'condition', default: 'YES' },
        { key: 'vehicleMoved',  label: 'Vehicle Moved',  type: 'condition', default: 'YES' },
        { key: 'warningLights', label: 'Warning Lights', type: 'condition', default: 'YES' },
      ],
    },
    {
      section: 'OTHER SYSTEMS',
      // Accessories and fitments, not condition findings — recorded and printed,
      // but they no longer pull the vehicle's score around.
      scored: false,
      fields: [
        { key: 'audio',           label: 'Audio',             type: 'condition', default: 'NO' },
        { key: 'upholstery',      label: 'Upholstery',        type: 'condition', default: 'GOOD' },
        { key: 'loadCarrier',     label: 'Load Carrier',      type: 'condition', default: 'YES' },
        { key: 'frontCrashGuard', label: 'Front Crash Guard', type: 'condition', default: 'NO' },
        { key: 'rearCrashGuard',  label: 'Rear Crash Guard',  type: 'condition', default: 'NO' },
        { key: 'sideMirrors',     label: 'Side Mirrors',      type: 'condition', default: 'NO' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CE — Construction Equipment
  // ═══════════════════════════════════════════════════════════════════════════
  ce: [
    {
      section: 'ENGINE CONDITION',
      fields: [
        { key: 'engineCondition',   label: 'Engine Condition',     type: 'condition', default: 'GOOD' },
        { key: 'fluidLeaks',        label: 'Fluid Leaks',          type: 'condition', default: 'NO', scoring: 'no-is-good' },
        { key: 'radiator',          label: 'Radiator',             type: 'condition', default: 'GOOD' },
        { key: 'hydraulicOilCooler',label: 'Hydraulic Oil Cooler', type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',        label: 'Fuel System',          type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',    label: 'Gearbox Assy',     type: 'condition', default: 'GOOD' },
        { key: 'torqueConverter',label: 'Torque Converter', type: 'condition', default: 'GOOD' },
        { key: 'finalDrive',     label: 'Final Drive',      type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'serviceBrake',  label: 'Service Brake',  type: 'condition', default: 'GOOD' },
        { key: 'retarder',      label: 'Retarder',       type: 'condition', default: 'GOOD' },
        { key: 'parkingBrake',  label: 'Parking Brake',  type: 'condition', default: 'GOOD' },
        { key: 'emergencyStop', label: 'Emergency Stop', type: 'condition', default: 'NO' },
      ],
    },
    {
      section: 'STEERING SYSTEM',
      fields: [
        { key: 'steeringControlLevers', label: 'Steering / Control Levers', type: 'condition', default: 'GOOD' },
        { key: 'hydraulicSteeringPump', label: 'Hydraulic Steering Pump',   type: 'condition', default: 'GOOD' },
        { key: 'swivelJoints',          label: 'Swivel Joints',             type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'HYDRAULIC SYSTEM',
      fields: [
        { key: 'hydraulicPump',     label: 'Hydraulic Pump',   type: 'condition', default: 'GOOD' },
        { key: 'hydraulicCylinders',label: 'Cylinders',        type: 'condition', default: 'GOOD' },
        { key: 'hosesAndFittings',  label: 'Hoses & Fittings', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'CABIN ASSEMBLY',
      fields: [
        { key: 'cabinStructure',   label: 'Cabin Structure',       type: 'condition', default: 'GOOD' },
        { key: 'dashboardControls',label: 'Dash Board & Controls', type: 'condition', default: 'GOOD' },
        { key: 'doors',            label: 'Doors',                 type: 'condition', default: 'GOOD' },
        { key: 'glassPanels',      label: 'Glass Panels',          type: 'condition', default: 'GOOD' },
        { key: 'seats',            label: 'Seat',                  type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'ATTACHMENTS',
      fields: [
        { key: 'boomArm',      label: 'Boom / Arm',     type: 'condition', default: 'GOOD' },
        { key: 'bucketBlade',  label: 'Bucket / Blade', type: 'condition', default: 'GOOD' },
        { key: 'counterWeight',label: 'Counter Weight', type: 'condition', default: 'GOOD' },
        { key: 'paintWork',    label: 'Paint Work',     type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',             label: 'Lights',                     type: 'condition', default: 'GOOD' },
        { key: 'warningIndicatorLights', label: 'Warning / Indicator Lights', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',       label: 'Battery',                    type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',             label: 'Wiring Assy',                type: 'condition', default: 'GOOD' },
        { key: 'sensors',                label: 'Sensors',                    type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TIRE / TRACK',
      fields: [
        { key: 'tyreCondition', label: 'Tyre / Track Condition',   type: 'condition', default: 'AVERAGE' },
        { key: 'numberOfTyres', label: 'Number of Tyres / Tracks', type: 'number', scored: false },
        { key: 'missingTyres',  label: 'Missing / Damaged',        type: 'number', default: '0', scoring: 'zero-is-good' },
      ],
    },
    {
      section: 'FUNCTIONALITY',
      fields: [
        { key: 'engineStarted', label: 'Engine Started',  type: 'condition', default: 'YES' },
        { key: 'testDrive',     label: 'Functional Test', type: 'condition', default: 'YES' },
        { key: 'vehicleMoved',  label: 'Machine Moved',   type: 'condition', default: 'YES' },
        { key: 'warningLights', label: 'Warning Lights',  type: 'condition', default: 'YES' },
      ],
    },
    {
      section: 'OTHER SYSTEMS',
      // Accessories and fitments, not condition findings — recorded and printed,
      // but they no longer pull the vehicle's score around.
      scored: false,
      fields: [
        { key: 'swingMechanism', label: 'Swing Mechanism', type: 'condition', default: 'NO' },
        { key: 'trackChains',    label: 'Track Chains',    type: 'condition', default: 'NO' },
        { key: 'sprockets',      label: 'Sprockets',       type: 'condition', default: 'GOOD' },
        { key: 'rollers',        label: 'Rollers',         type: 'condition', default: 'GOOD' },
        { key: 'hourMeter',      label: 'Hour Meter',      type: 'condition', default: 'NO' },
        { key: 'rockBreaker',    label: 'Rock Breaker',    type: 'condition', default: 'NO' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // BUS
  // ═══════════════════════════════════════════════════════════════════════════
  bus: [
    {
      section: 'ENGINE CONDITION',
      fields: [
        { key: 'engineCondition', label: 'Engine Condition', type: 'condition', default: 'GOOD' },
        { key: 'fluidLeaks',      label: 'Fluid Leaks',      type: 'condition', default: 'NO', scoring: 'no-is-good' },
        { key: 'radiator',        label: 'Radiator',         type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes',    label: 'All Hose Pipes',   type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',      label: 'Fuel System',      type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',     label: 'Gearbox Assy',      type: 'condition', default: 'GOOD' },
        { key: 'clutchSystem',    label: 'Clutch System',     type: 'condition', default: 'GOOD' },
        { key: 'differentialAssy',label: 'Differential Assy', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'frontBrakes',  label: 'Front Brakes',  type: 'condition', default: 'GOOD' },
        { key: 'rearBrakes',   label: 'Rear Brakes',   type: 'condition', default: 'GOOD' },
        { key: 'parkingBrake', label: 'Parking Brake', type: 'condition', default: 'GOOD' },
        { key: 'abs',          label: 'ABS',           type: 'condition', default: 'YES', scored: false },
      ],
    },
    {
      section: 'STEERING SYSTEM',
      fields: [
        { key: 'steeringWheel',  label: 'Steering Wheel',  type: 'condition', default: 'GOOD' },
        { key: 'steeringColumn', label: 'Steering Column', type: 'condition', default: 'GOOD' },
        { key: 'steeringBox',    label: 'Steering Box',    type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'SUSPENSION SYSTEM',
      fields: [
        { key: 'frontSuspension', label: 'Front Suspension',   type: 'condition', default: 'GOOD' },
        { key: 'rearSuspension',  label: 'Rear Suspension',    type: 'condition', default: 'GOOD' },
        { key: 'axles',           label: 'Front & Rear Axles', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'COACH ASSEMBLY',
      fields: [
        { key: 'driverCabin',      label: 'Driver Cabin',      type: 'condition', default: 'GOOD' },
        { key: 'dashboard',        label: 'Dashboard',         type: 'condition', default: 'GOOD' },
        { key: 'doors',            label: 'Doors',             type: 'condition', default: 'GOOD' },
        { key: 'allGlasses',       label: 'All Glasses',       type: 'condition', default: 'GOOD' },
        { key: 'bumpersAndGrilles',label: 'Bumpers & Grilles', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BODY ASSEMBLY',
      fields: [
        { key: 'seatsAndBerths',   label: 'Seats & Berths',       type: 'condition', default: 'GOOD' },
        { key: 'interiorTrims',    label: 'Interior Trims',       type: 'condition', default: 'GOOD' },
        { key: 'sideBodyPanels',   label: 'Side Body Panels',     type: 'condition', default: 'GOOD' },
        { key: 'rearBodyPanels',   label: 'Rear Body Panels',     type: 'condition', default: 'GOOD' },
        { key: 'chassisCondition', label: 'Chassis / Body Frame', type: 'condition', default: 'GOOD' },
        { key: 'paintWork',        label: 'Paint Work',           type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',           label: 'Head Lights',              type: 'condition', default: 'GOOD' },
        { key: 'tailLightsIndicators', label: 'Tail Lights / Indicators', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',     label: 'Battery',                  type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',           label: 'Wiring Assy',              type: 'condition', default: 'GOOD' },
        { key: 'clusterUnit',          label: 'Cluster Unit',             type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TIRES',
      fields: [
        { key: 'tyreCondition', label: 'Tyre Condition',  type: 'condition', default: 'AVERAGE' },
        { key: 'numberOfTyres', label: 'Number of Tyres', type: 'number', scored: false },
        { key: 'missingTyres',  label: 'Missing Tyres',   type: 'number', default: '0', scoring: 'zero-is-good' },
      ],
    },
    {
      section: 'FUNCTIONALITY',
      fields: [
        { key: 'engineStarted', label: 'Engine Started', type: 'condition', default: 'YES' },
        { key: 'testDrive',     label: 'Test Drive',     type: 'condition', default: 'YES' },
        { key: 'vehicleMoved',  label: 'Vehicle Moved',  type: 'condition', default: 'YES' },
        { key: 'warningLights', label: 'Warning Lights', type: 'condition', default: 'YES' },
      ],
    },
    {
      section: 'OTHER SYSTEMS',
      // Accessories and fitments, not condition findings — recorded and printed,
      // but they no longer pull the vehicle's score around.
      scored: false,
      fields: [
        { key: 'airConditioner',  label: 'Air Conditioner',   type: 'condition', default: 'NO' },
        { key: 'audio',           label: 'Audio',             type: 'condition', default: 'NO' },
        { key: 'upholstery',      label: 'Upholstery',        type: 'condition', default: 'GOOD' },
        { key: 'loadCarrier',     label: 'Load Carrier',      type: 'condition', default: 'YES' },
        { key: 'frontCrashGuard', label: 'Front Crash Guard', type: 'condition', default: 'NO' },
        { key: 'rearCrashGuard',  label: 'Rear Crash Guard',  type: 'condition', default: 'NO' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // FE — Farm Equipment / Tractor
  // ═══════════════════════════════════════════════════════════════════════════
  fe: [
    {
      section: 'ENGINE CONDITION',
      fields: [
        { key: 'engineCondition', label: 'Engine Condition', type: 'condition', default: 'GOOD' },
        { key: 'fluidLeaks',      label: 'Fluid Leaks',      type: 'condition', default: 'NO', scoring: 'no-is-good' },
        { key: 'radiator',        label: 'Radiator',         type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes',    label: 'All Hose Pipes',   type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',      label: 'Fuel System',      type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',     label: 'Gearbox Assy',      type: 'condition', default: 'GOOD' },
        { key: 'clutchSystem',    label: 'Clutch System',     type: 'condition', default: 'GOOD' },
        { key: 'differentialAssy',label: 'Differential Assy', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'rightIndividualBrakes',label: 'Right Individual Brakes',type: 'condition', default: 'GOOD' },
        { key: 'leftIndividualBrakes', label: 'Left Individual Brakes', type: 'condition', default: 'GOOD' },
        { key: 'parkingBrake',         label: 'Parking Brake',          type: 'condition', default: 'GOOD' },
        { key: 'brakeEqualization',    label: 'Brake Equalization',     type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'STEERING SYSTEM',
      fields: [
        { key: 'steeringWheel',  label: 'Steering Wheel',  type: 'condition', default: 'GOOD' },
        { key: 'steeringColumn', label: 'Steering Column', type: 'condition', default: 'GOOD' },
        { key: 'steeringBox',    label: 'Steering Box',    type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'SUSPENSION SYSTEM',
      fields: [
        { key: 'frontAxleFe',  label: 'Front Axle',        type: 'condition', default: 'GOOD' },
        { key: 'rearAxleFe',   label: 'Rear Axle',         type: 'condition', default: 'GOOD' },
        { key: 'tieRodsJoints',label: 'Tie Rods & Joints', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'CABIN ASSEMBLY',
      fields: [
        { key: 'operatorStation', label: 'Operator Station', type: 'condition', default: 'GOOD' },
        { key: 'dashboard',       label: 'Dash Board',       type: 'condition', default: 'GOOD' },
        { key: 'canopy',          label: 'Canopy',           type: 'condition', default: 'GOOD' },
        { key: 'lockSet',         label: 'Lock Set',         type: 'condition', default: 'GOOD' },
        { key: 'seats',           label: 'Seat',             type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BODY ASSEMBLY',
      fields: [
        { key: 'bonnet',           label: 'Bonnet',            type: 'condition', default: 'GOOD' },
        { key: 'frontGrilles',     label: 'Front Grilles',     type: 'condition', default: 'GOOD' },
        { key: 'sideFenders',      label: 'Side Fenders',      type: 'condition', default: 'GOOD' },
        { key: 'fuelTankFe',       label: 'Fuel Tank',         type: 'condition', default: 'GOOD' },
        { key: 'operatorPlatform', label: 'Operator Platform', type: 'condition', default: 'GOOD' },
        { key: 'paintWork',        label: 'Paint Work',        type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',           label: 'Head Lights',              type: 'condition', default: 'GOOD' },
        { key: 'tailLightsIndicators', label: 'Tail Lights / Indicators', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',     label: 'Battery',                  type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',           label: 'Wiring Assy',              type: 'condition', default: 'GOOD' },
        { key: 'switches',             label: 'Switches',                 type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TIRES',
      fields: [
        { key: 'tyreCondition', label: 'Tyre Condition',  type: 'condition', default: 'AVERAGE' },
        { key: 'numberOfTyres', label: 'Number of Tyres', type: 'number', scored: false },
        { key: 'missingTyres',  label: 'Missing Tyres',   type: 'number', default: '0', scoring: 'zero-is-good' },
      ],
    },
    {
      section: 'FUNCTIONALITY',
      fields: [
        { key: 'engineStarted', label: 'Engine Started',      type: 'condition', default: 'YES' },
        { key: 'testDrive',     label: 'Field Function Test', type: 'condition', default: 'YES' },
        { key: 'vehicleMoved',  label: 'Vehicle Moved',       type: 'condition', default: 'YES' },
        { key: 'warningLights', label: 'Warning Lights',      type: 'condition', default: 'YES' },
      ],
    },
    {
      section: 'OTHER SYSTEMS',
      // Accessories and fitments, not condition findings — recorded and printed,
      // but they no longer pull the vehicle's score around.
      scored: false,
      fields: [
        { key: 'muffler',        label: 'Muffler',            type: 'condition', default: 'NO' },
        { key: 'airFilter',      label: 'Air Filter',         type: 'condition', default: 'NO' },
        { key: 'attachmentHitch',label: 'Attachment Hitch',   type: 'condition', default: 'GOOD' },
        { key: 'hydraulicLiftFe',label: 'Hydraulic Lift Arm', type: 'condition', default: 'YES' },
        { key: 'dropArm',        label: 'Drop Arm',           type: 'condition', default: 'NO' },
        { key: 'rearDrawbar',    label: 'Rear Drawbar',       type: 'condition', default: 'NO' },
      ],
    },
  ],
};

export function getFieldRegistry(vehicleType: VehicleTypeKey): InspectionSection[] {
  return FIELD_REGISTRY[vehicleType] ?? [];
}

export function getAllFieldKeys(vehicleType: VehicleTypeKey): string[] {
  return getFieldRegistry(vehicleType).flatMap(s => s.fields.map(f => f.key));
}

export function getFieldMeta(vehicleType: VehicleTypeKey, key: string): InspectionField | undefined {
  for (const section of getFieldRegistry(vehicleType)) {
    const f = section.fields.find(f => f.key === key);
    if (f) return f;
  }
  return undefined;
}
