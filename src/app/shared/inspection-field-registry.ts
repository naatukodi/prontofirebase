// inspection-field-registry.ts
// Single source of truth for inspection form fields across all vehicle types.
// Matches the VEHGA VEHICLE INSPECTION CHECKLIST Excel (all 7 sheets).
// Both Angular and Flutter reference the same structure — keep in sync with
// inspection_field_registry.dart in prontomoto_app/lib/.

export type FieldType = 'condition' | 'yes-no' | 'text' | 'date' | 'number';
export type VehicleTypeKey = 'cv' | '4w' | '2w' | '3w' | 'ce' | 'bus' | 'fe';

export interface InspectionField {
  key: string;       // camelCase — matches Inspection model property
  label: string;     // display label shown in form and PDF
  type: FieldType;   // 'condition' → GOOD/AVERAGE/POOR  |  'yes-no' → YES/NO
  default?: string;  // default value from Excel checklist
}

export interface InspectionSection {
  section: string;
  fields: InspectionField[];
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
// These are the 4 summary boxes shown on the cover page.
export const VERDICT_SECTIONS: Record<VehicleTypeKey, string[]> = {
  cv:  ['ENGINE',   'CABIN',    'LOAD BODY', 'OTHER SYSTEMS'],
  '4w':['ENGINE',   'EXTERIOR', 'INTERIOR',  'OTHER SYSTEMS'],
  '2w':['ENGINE',   'EXTERIOR', 'BODY',      'OTHER SYSTEMS'],
  '3w':['ENGINE',   'CABIN',    'LOAD BODY', 'OTHER SYSTEMS'],
  ce:  ['ENGINE',   'CABIN',    'ATTACHMENTS','OTHER SYSTEMS'],
  bus: ['ENGINE',   'COACH',    'BODY ASSY', 'OTHER SYSTEMS'],
  fe:  ['ENGINE',   'CABIN',    'BODY ASSY', 'OTHER SYSTEMS'],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const FIELD_REGISTRY: Record<VehicleTypeKey, InspectionSection[]> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // CV — Commercial Vehicle
  // ═══════════════════════════════════════════════════════════════════════════
  cv: [
    {
      section: 'BASIC SYSTEMS',
      fields: [
        { key: 'engineCondition',  label: 'Engine Condition',  type: 'condition', default: 'GOOD' },
        { key: 'chassisCondition', label: 'Chassis Condition', type: 'condition', default: 'GOOD' },
        { key: 'cabinAssy',        label: 'Cabin Assy',        type: 'condition', default: 'GOOD' },
        { key: 'loadBodyAssy',     label: 'Load Body Assy',    type: 'condition', default: 'GOOD' },
        { key: 'steeringSystem',   label: 'Steering System',   type: 'condition', default: 'GOOD' },
        { key: 'brakeSystem',      label: 'Brake System',      type: 'condition', default: 'GOOD' },
        { key: 'electricalSystem', label: 'Electrical System', type: 'condition', default: 'GOOD' },
        { key: 'suspensionSystem', label: 'Suspension System', type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',       label: 'Fuel System',       type: 'condition', default: 'GOOD' },
        { key: 'tyreCondition',    label: 'Tyre Condition',    type: 'condition', default: 'AVERAGE' },
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
        { key: 'rightSideGate', label: 'Right Side Gate', type: 'condition', default: 'GOOD' },
        { key: 'leftSideGate',  label: 'Left Side Gate',  type: 'condition', default: 'GOOD' },
        { key: 'tailGate',      label: 'Tail Gate',       type: 'condition', default: 'GOOD' },
        { key: 'loadFloor',     label: 'Load Floor',      type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'frontBrakes',  label: 'Front Brakes',  type: 'condition', default: 'GOOD' },
        { key: 'rearBrakes',   label: 'Rear Brakes',   type: 'condition', default: 'GOOD' },
        { key: 'parkingBrake', label: 'Parking Brake', type: 'condition', default: 'GOOD' },
        { key: 'abs',          label: 'ABS',           type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',          label: 'Head Lights',           type: 'condition', default: 'GOOD' },
        { key: 'tailLightsIndicators',label: 'Tail Lights / Indicators', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',    label: 'Battery',               type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',          label: 'Wiring Assy',           type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'COOLING SYSTEM',
      fields: [
        { key: 'radiator',    label: 'Radiator',     type: 'condition', default: 'GOOD' },
        { key: 'intercooler', label: 'Inter Cooler', type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes',label: 'All Hose Pipes',type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',    label: 'Gearbox Assy',    type: 'condition', default: 'GOOD' },
        { key: 'clutchSystem',   label: 'Clutch System',   type: 'condition', default: 'GOOD' },
        { key: 'differentialAssy',label: 'Differential Assy',type: 'condition', default: 'GOOD' },
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
      section: 'OTHER SYSTEMS',
      fields: [
        { key: 'airConditioner',        label: 'Air Conditioner',          type: 'yes-no', default: 'NO' },
        { key: 'audio',                  label: 'Audio',                    type: 'yes-no', default: 'NO' },
        { key: 'upholstery',             label: 'Upholstery',               type: 'condition', default: 'GOOD' },
        { key: 'hydraulicLift',          label: 'Hydraulic Lift',           type: 'yes-no', default: 'YES' },
        { key: 'frontCrashGuard',        label: 'Front Crash Guard',        type: 'yes-no', default: 'NO' },
        { key: 'rearCrashGuard',         label: 'Rear Crash Guard',         type: 'yes-no', default: 'NO' },
        { key: 'sideUnderRunProtection', label: 'Side Under Run Protection',type: 'yes-no', default: 'NO' },
        { key: 'paintWork',              label: 'Paint Work',               type: 'condition', default: 'GOOD' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 4W — Four Wheeler
  // ═══════════════════════════════════════════════════════════════════════════
  '4w': [
    {
      section: 'BASIC SYSTEMS',
      fields: [
        { key: 'engineCondition',  label: 'Engine Condition',  type: 'condition', default: 'GOOD' },
        { key: 'chassisCondition', label: 'Chassis Condition', type: 'condition', default: 'GOOD' },
        { key: 'cabinAssy',        label: 'Cabin Assy',        type: 'condition', default: 'GOOD' },
        { key: 'bodyAssy',         label: 'Body Assy',         type: 'condition', default: 'GOOD' },
        { key: 'steeringSystem',   label: 'Steering System',   type: 'condition', default: 'GOOD' },
        { key: 'brakeSystem',      label: 'Brake System',      type: 'condition', default: 'GOOD' },
        { key: 'electricalSystem', label: 'Electrical System', type: 'condition', default: 'GOOD' },
        { key: 'suspensionSystem', label: 'Suspension System', type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',       label: 'Fuel System',       type: 'condition', default: 'GOOD' },
        { key: 'tyreCondition',    label: 'Tyre Condition',    type: 'condition', default: 'AVERAGE' },
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
      ],
    },
    {
      section: 'INTERIOR',
      fields: [
        { key: 'dashboard',    label: 'Dash Board',      type: 'condition', default: 'GOOD' },
        { key: 'seats',        label: 'Seats & Mats',    type: 'condition', default: 'GOOD' },
        { key: 'upholstery',   label: 'Upholstery',      type: 'condition', default: 'GOOD' },
        { key: 'interiorTrims',label: 'Interior Trims',  type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'frontBrakes',  label: 'Front Brakes',  type: 'condition', default: 'GOOD' },
        { key: 'rearBrakes',   label: 'Rear Brakes',   type: 'condition', default: 'GOOD' },
        { key: 'parkingBrake', label: 'Parking Brake', type: 'condition', default: 'GOOD' },
        { key: 'abs',          label: 'ABS',           type: 'yes-no',    default: 'NO' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',           label: 'Head Lights',            type: 'condition', default: 'GOOD' },
        { key: 'tailLightsIndicators', label: 'Tail Lights / Indicators', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',     label: 'Battery',                type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',           label: 'Wiring Assy',            type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'COOLING SYSTEM',
      fields: [
        { key: 'radiator',     label: 'Radiator',      type: 'condition', default: 'GOOD' },
        { key: 'intercooler',  label: 'Inter Cooler',  type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes', label: 'All Hose Pipes',type: 'condition', default: 'GOOD' },
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
      section: 'OTHER SYSTEMS',
      fields: [
        { key: 'airConditioner', label: 'Air Conditioner', type: 'yes-no',    default: 'NO' },
        { key: 'audio',          label: 'Audio',           type: 'yes-no',    default: 'NO' },
        { key: 'airBags',        label: 'Air Bags',        type: 'condition', default: 'GOOD' },
        { key: 'frontCrashGuard',label: 'Front Crash Guard',type: 'yes-no',   default: 'NO' },
        { key: 'rearCrashGuard', label: 'Rear Crash Guard', type: 'yes-no',   default: 'NO' },
        { key: 'sunRoof',        label: 'Sun Roof',        type: 'yes-no',    default: 'NO' },
        { key: 'paintWork',      label: 'Paint Work',      type: 'condition', default: 'GOOD' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 2W — Two Wheeler
  // ═══════════════════════════════════════════════════════════════════════════
  '2w': [
    {
      section: 'BASIC SYSTEMS',
      fields: [
        { key: 'engineCondition',  label: 'Engine Condition',  type: 'condition', default: 'GOOD' },
        { key: 'chassisCondition', label: 'Chassis Condition', type: 'condition', default: 'GOOD' },
        { key: 'cabinAssy',        label: 'Cabin Assy',        type: 'condition', default: 'GOOD' },
        { key: 'bodyCondition',    label: 'Body Condition',    type: 'condition', default: 'GOOD' },
        { key: 'steeringSystem',   label: 'Steering System',   type: 'condition', default: 'GOOD' },
        { key: 'brakeSystem',      label: 'Brake System',      type: 'condition', default: 'GOOD' },
        { key: 'electricalSystem', label: 'Electrical System', type: 'condition', default: 'GOOD' },
        { key: 'suspensionSystem', label: 'Suspension System', type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',       label: 'Fuel System',       type: 'condition', default: 'GOOD' },
        { key: 'tyreCondition',    label: 'Tyre Condition',    type: 'condition', default: 'AVERAGE' },
      ],
    },
    {
      section: 'EXTERIOR',
      fields: [
        { key: 'fuelTankCondition', label: 'Fuel Tank Assy',     type: 'condition', default: 'GOOD' },
        { key: 'frontScoop',        label: 'Front Scoop',        type: 'condition', default: 'GOOD' },
        { key: 'seatCondition',     label: 'Seat',               type: 'condition', default: 'GOOD' },
        { key: 'rvMirrors',         label: 'R/V Mirrors',        type: 'condition', default: 'GOOD' },
        { key: 'lockSet',           label: 'Lock Set',           type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BODY',
      fields: [
        { key: 'frontMudGuard', label: 'Mud Guard - Front',     type: 'condition', default: 'GOOD' },
        { key: 'rearMudGuard',  label: 'Mud Guard - Rear',      type: 'condition', default: 'GOOD' },
        { key: 'sideCovers',    label: 'Side Covers (LH, RH)',  type: 'condition', default: 'GOOD' },
        { key: 'bellyPanels',   label: 'Belly / Floor Panels',  type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'frontBrakes',      label: 'Front Brakes',        type: 'condition', default: 'GOOD' },
        { key: 'rearBrakes',       label: 'Rear Brakes',         type: 'condition', default: 'GOOD' },
        { key: 'brakeLeversFluid', label: 'Brake Levers / Fluid',type: 'condition', default: 'GOOD' },
        { key: 'abs',              label: 'ABS',                 type: 'yes-no',    default: 'NO' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',           label: 'Head Lights',            type: 'condition', default: 'GOOD' },
        { key: 'tailLightsIndicators', label: 'Tail Lights / Indicators', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',     label: 'Battery',                type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',           label: 'Wiring Assy',            type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'COOLING SYSTEM',
      fields: [
        { key: 'radiator',      label: 'Radiator',       type: 'condition', default: 'GOOD' },
        { key: 'silencer',      label: 'Silencer',       type: 'condition', default: 'GOOD' },
        { key: 'silencerCover', label: 'Silencer Cover', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',  label: 'Gearbox Assy',  type: 'condition', default: 'GOOD' },
        { key: 'clutchSystem', label: 'Clutch System', type: 'condition', default: 'GOOD' },
        { key: 'accelerator',  label: 'Accelerator',   type: 'condition', default: 'GOOD' },
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
      section: 'OTHER SYSTEMS',
      fields: [
        { key: 'mainStand',       label: 'Main Stand',          type: 'yes-no', default: 'NO' },
        { key: 'sideStand',       label: 'Side Stand',          type: 'yes-no', default: 'NO' },
        { key: 'legGuard',        label: 'Leg Guard',           type: 'condition', default: 'GOOD' },
        { key: 'sareeGuard',      label: 'Saree Guard',         type: 'yes-no', default: 'YES' },
        { key: 'horn',            label: 'Horn',                type: 'yes-no', default: 'NO' },
        { key: 'kickPedalFootRest',label: 'Kick Pedal / Foot Rest',type: 'yes-no', default: 'NO' },
        { key: 'chainGuard',      label: 'Chain Guard',         type: 'yes-no', default: 'NO' },
        { key: 'selfStart',       label: 'Self Start',          type: 'yes-no', default: 'NO' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // 3W — Three Wheeler
  // ═══════════════════════════════════════════════════════════════════════════
  '3w': [
    {
      section: 'BASIC SYSTEMS',
      fields: [
        { key: 'engineCondition',  label: 'Engine Condition',  type: 'condition', default: 'GOOD' },
        { key: 'chassisCondition', label: 'Chassis Condition', type: 'condition', default: 'GOOD' },
        { key: 'cabinAssy',        label: 'Cabin Assy',        type: 'condition', default: 'GOOD' },
        { key: 'loadBodyAssy',     label: 'Load Body Assy',    type: 'condition', default: 'GOOD' },
        { key: 'steeringSystem',   label: 'Steering System',   type: 'condition', default: 'GOOD' },
        { key: 'brakeSystem',      label: 'Brake System',      type: 'condition', default: 'GOOD' },
        { key: 'electricalSystem', label: 'Electrical System', type: 'condition', default: 'GOOD' },
        { key: 'suspensionSystem', label: 'Suspension System', type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',       label: 'Fuel System',       type: 'condition', default: 'GOOD' },
        { key: 'tyreCondition',    label: 'Tyre Condition',    type: 'condition', default: 'AVERAGE' },
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
        { key: 'rightSideGate', label: 'Right Side Gate', type: 'condition', default: 'GOOD' },
        { key: 'leftSideGate',  label: 'Left Side Gate',  type: 'condition', default: 'GOOD' },
        { key: 'tailGate',      label: 'Tail Gate',       type: 'condition', default: 'GOOD' },
        { key: 'loadFloor',     label: 'Load Floor',      type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'frontBrakes',  label: 'Front Brakes',  type: 'condition', default: 'GOOD' },
        { key: 'rearBrakes',   label: 'Rear Brakes',   type: 'condition', default: 'GOOD' },
        { key: 'parkingBrake', label: 'Parking Brake', type: 'condition', default: 'GOOD' },
        { key: 'abs',          label: 'ABS',           type: 'yes-no',    default: 'NO' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',      label: 'Lights',      type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',label: 'Battery',     type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',      label: 'Wiring Assy', type: 'condition', default: 'GOOD' },
        { key: 'switches',        label: 'Switches',    type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'COOLING SYSTEM',
      fields: [
        { key: 'radiator',    label: 'Radiator',     type: 'condition', default: 'GOOD' },
        { key: 'intercooler', label: 'Inter Cooler', type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes',label: 'All Hose Pipes',type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',    label: 'Gearbox Assy',    type: 'condition', default: 'GOOD' },
        { key: 'clutchSystem',   label: 'Clutch System',   type: 'condition', default: 'GOOD' },
        { key: 'differentialAssy',label: 'Differential Assy',type: 'condition', default: 'GOOD' },
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
      section: 'OTHER SYSTEMS',
      fields: [
        { key: 'airConditioner', label: 'Air Conditioner', type: 'yes-no',    default: 'NO' },
        { key: 'audio',          label: 'Audio',           type: 'yes-no',    default: 'NO' },
        { key: 'upholstery',     label: 'Upholstery',      type: 'condition', default: 'GOOD' },
        { key: 'loadCarrier',    label: 'Load Carrier',    type: 'yes-no',    default: 'YES' },
        { key: 'frontCrashGuard',label: 'Front Crash Guard',type: 'yes-no',   default: 'NO' },
        { key: 'rearCrashGuard', label: 'Rear Crash Guard', type: 'yes-no',   default: 'NO' },
        { key: 'sideMirrors',    label: 'Side Mirrors',    type: 'yes-no',    default: 'NO' },
        { key: 'paintWork',      label: 'Paint Work',      type: 'condition', default: 'GOOD' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CE — Construction Equipment
  // ═══════════════════════════════════════════════════════════════════════════
  ce: [
    {
      section: 'BASIC SYSTEMS',
      fields: [
        { key: 'engineCondition',      label: 'Engine Condition',         type: 'condition', default: 'GOOD' },
        { key: 'chassisCondition',     label: 'Chassis / Frame Condition',type: 'condition', default: 'GOOD' },
        { key: 'cabinAssy',            label: 'Cabin Assy',               type: 'condition', default: 'GOOD' },
        { key: 'hydraulicSystem',      label: 'Hydraulic System',         type: 'condition', default: 'GOOD' },
        { key: 'steeringControlSystem',label: 'Steering / Control System',type: 'condition', default: 'GOOD' },
        { key: 'brakeSystem',          label: 'Brake System',             type: 'condition', default: 'GOOD' },
        { key: 'electricalSystem',     label: 'Electrical System',        type: 'condition', default: 'GOOD' },
        { key: 'suspensionSystem',     label: 'Suspension System',        type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',           label: 'Fuel System',              type: 'condition', default: 'GOOD' },
        { key: 'tyreCondition',        label: 'Tyre / Track Condition',   type: 'condition', default: 'AVERAGE' },
      ],
    },
    {
      section: 'CABIN ASSY',
      fields: [
        { key: 'cabinStructure',   label: 'Cabin Structure',       type: 'condition', default: 'GOOD' },
        { key: 'dashboardControls',label: 'Dashboard & Controls',  type: 'condition', default: 'GOOD' },
        { key: 'doors',            label: 'Doors',                 type: 'condition', default: 'GOOD' },
        { key: 'glassPanels',      label: 'Glass Panels',          type: 'condition', default: 'GOOD' },
        { key: 'seats',            label: 'Seat',                  type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'ATTACHMENTS',
      fields: [
        { key: 'boomArm',      label: 'Boom / Arm',      type: 'condition', default: 'GOOD' },
        { key: 'bucketBlade',  label: 'Bucket / Blade',  type: 'condition', default: 'GOOD' },
        { key: 'counterWeight',label: 'Counter Weight',  type: 'condition', default: 'GOOD' },
        { key: 'pinsAndBushes',label: 'Pins & Bushes',   type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'serviceBrake',  label: 'Service Brake',  type: 'condition', default: 'GOOD' },
        { key: 'retarder',      label: 'Retarder',       type: 'condition', default: 'GOOD' },
        { key: 'parkingBrake',  label: 'Parking Brake',  type: 'condition', default: 'GOOD' },
        { key: 'emergencyStop', label: 'Emergency Stop', type: 'yes-no',    default: 'NO' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',      label: 'Lights',      type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',label: 'Battery',     type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',      label: 'Wiring Assy', type: 'condition', default: 'GOOD' },
        { key: 'sensors',         label: 'Sensors',     type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'COOLING SYSTEM',
      fields: [
        { key: 'radiator',         label: 'Radiator',           type: 'condition', default: 'GOOD' },
        { key: 'hydraulicOilCooler',label: 'Hydraulic Oil Cooler',type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes',     label: 'All Hose Pipes',     type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',    label: 'Gearbox Assy',    type: 'condition', default: 'GOOD' },
        { key: 'torqueConverter',label: 'Torque Converter',type: 'condition', default: 'GOOD' },
        { key: 'finalDrive',     label: 'Final Drive',     type: 'condition', default: 'GOOD' },
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
        { key: 'hydraulicPump',   label: 'Hydraulic Pump',   type: 'condition', default: 'GOOD' },
        { key: 'hydraulicCylinders',label: 'Cylinders',      type: 'condition', default: 'GOOD' },
        { key: 'hosesAndFittings',label: 'Hoses & Fittings', type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'OTHER SYSTEMS',
      fields: [
        { key: 'swingMechanism', label: 'Swing Mechanism', type: 'yes-no',    default: 'NO' },
        { key: 'trackChains',    label: 'Track Chains',    type: 'yes-no',    default: 'NO' },
        { key: 'sprockets',      label: 'Sprockets',       type: 'condition', default: 'GOOD' },
        { key: 'rollers',        label: 'Rollers',         type: 'condition', default: 'GOOD' },
        { key: 'hourMeter',      label: 'Hour Meter',      type: 'yes-no',    default: 'NO' },
        { key: 'bonnetGuard',    label: 'Bonnet / Guard',  type: 'yes-no',    default: 'NO' },
        { key: 'rockBreaker',    label: 'Rock Breaker',    type: 'yes-no',    default: 'NO' },
        { key: 'paintWork',      label: 'Paint Work',      type: 'condition', default: 'GOOD' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // BUS
  // ═══════════════════════════════════════════════════════════════════════════
  bus: [
    {
      section: 'BASIC SYSTEMS',
      fields: [
        { key: 'engineCondition',  label: 'Engine Condition',  type: 'condition', default: 'GOOD' },
        { key: 'chassisCondition', label: 'Chassis Condition', type: 'condition', default: 'GOOD' },
        { key: 'coachCondition',   label: 'Coach Condition',   type: 'condition', default: 'GOOD' },
        { key: 'bodyStructure',    label: 'Body Structure',    type: 'condition', default: 'GOOD' },
        { key: 'steeringSystem',   label: 'Steering System',   type: 'condition', default: 'GOOD' },
        { key: 'brakeSystem',      label: 'Brake System',      type: 'condition', default: 'GOOD' },
        { key: 'electricalSystem', label: 'Electrical System', type: 'condition', default: 'GOOD' },
        { key: 'suspensionSystem', label: 'Suspension System', type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',       label: 'Fuel System',       type: 'condition', default: 'GOOD' },
        { key: 'tyreCondition',    label: 'Tyre Condition',    type: 'condition', default: 'AVERAGE' },
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
      section: 'BODY ASSY',
      fields: [
        { key: 'seatsAndBerths',label: 'Seats & Berths',    type: 'condition', default: 'GOOD' },
        { key: 'interiorTrims', label: 'Interior Trims',    type: 'condition', default: 'GOOD' },
        { key: 'sideBodyPanels',label: 'Side Body Panels',  type: 'condition', default: 'GOOD' },
        { key: 'rearBodyPanels',label: 'Rear Body Panels',  type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'BRAKES',
      fields: [
        { key: 'frontBrakes',  label: 'Front Brakes',  type: 'condition', default: 'GOOD' },
        { key: 'rearBrakes',   label: 'Rear Brakes',   type: 'condition', default: 'GOOD' },
        { key: 'parkingBrake', label: 'Parking Brake', type: 'condition', default: 'GOOD' },
        { key: 'abs',          label: 'ABS',           type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',           label: 'Head Lights',            type: 'condition', default: 'GOOD' },
        { key: 'tailLightsIndicators', label: 'Tail Lights / Indicators', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',     label: 'Battery',                type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',           label: 'Wiring Assy',            type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'COOLING SYSTEM',
      fields: [
        { key: 'radiator',    label: 'Radiator',     type: 'condition', default: 'GOOD' },
        { key: 'intercooler', label: 'Inter Cooler', type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes',label: 'All Hose Pipes',type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',    label: 'Gearbox Assy',    type: 'condition', default: 'GOOD' },
        { key: 'clutchSystem',   label: 'Clutch System',   type: 'condition', default: 'GOOD' },
        { key: 'differentialAssy',label: 'Differential Assy',type: 'condition', default: 'GOOD' },
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
      section: 'OTHER SYSTEMS',
      fields: [
        { key: 'airConditioner', label: 'Air Conditioner', type: 'yes-no',    default: 'NO' },
        { key: 'audio',          label: 'Audio',           type: 'yes-no',    default: 'NO' },
        { key: 'upholstery',     label: 'Upholstery',      type: 'condition', default: 'GOOD' },
        { key: 'loadCarrier',    label: 'Load Carrier',    type: 'yes-no',    default: 'YES' },
        { key: 'frontCrashGuard',label: 'Front Crash Guard',type: 'yes-no',   default: 'NO' },
        { key: 'rearCrashGuard', label: 'Rear Crash Guard', type: 'yes-no',   default: 'NO' },
        { key: 'sideMirrors',    label: 'Side Mirrors',    type: 'yes-no',    default: 'NO' },
        { key: 'paintWork',      label: 'Paint Work',      type: 'condition', default: 'GOOD' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // FE — Farm Equipment / Tractor
  // ═══════════════════════════════════════════════════════════════════════════
  fe: [
    {
      section: 'BASIC SYSTEMS',
      fields: [
        { key: 'engineCondition',  label: 'Engine Condition',  type: 'condition', default: 'GOOD' },
        { key: 'chassisCondition', label: 'Chassis Condition', type: 'condition', default: 'GOOD' },
        { key: 'operatorPlatform', label: 'Operator Platform', type: 'condition', default: 'GOOD' },
        { key: 'bodyAssy',         label: 'Body Assy',         type: 'condition', default: 'GOOD' },
        { key: 'steeringSystem',   label: 'Steering System',   type: 'condition', default: 'GOOD' },
        { key: 'brakeSystem',      label: 'Brake System',      type: 'condition', default: 'GOOD' },
        { key: 'electricalSystem', label: 'Electrical System', type: 'condition', default: 'GOOD' },
        { key: 'suspensionSystem', label: 'Suspension System', type: 'condition', default: 'GOOD' },
        { key: 'fuelSystem',       label: 'Fuel System',       type: 'condition', default: 'GOOD' },
        { key: 'tyreCondition',    label: 'Tyre Condition',    type: 'condition', default: 'AVERAGE' },
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
      section: 'BODY ASSY',
      fields: [
        { key: 'bonnet',      label: 'Bonnet',       type: 'condition', default: 'GOOD' },
        { key: 'frontGrilles',label: 'Front Grilles',type: 'condition', default: 'GOOD' },
        { key: 'sideFenders', label: 'Side Fenders', type: 'condition', default: 'GOOD' },
        { key: 'fuelTankFe',  label: 'Fuel Tank',    type: 'condition', default: 'GOOD' },
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
      section: 'ELECTRICAL SYSTEM',
      fields: [
        { key: 'headLights',           label: 'Head Lights',            type: 'condition', default: 'GOOD' },
        { key: 'tailLightsIndicators', label: 'Tail Lights / Indicators', type: 'condition', default: 'GOOD' },
        { key: 'batteryCondition',     label: 'Battery',                type: 'condition', default: 'GOOD' },
        { key: 'wiringAssy',           label: 'Wiring Assy',            type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'COOLING SYSTEM',
      fields: [
        { key: 'radiator',     label: 'Radiator',      type: 'condition', default: 'GOOD' },
        { key: 'fanAssy',      label: 'Fan Assy',      type: 'condition', default: 'GOOD' },
        { key: 'allHosePipes', label: 'All Hose Pipes',type: 'condition', default: 'GOOD' },
      ],
    },
    {
      section: 'TRANSMISSION SYSTEM',
      fields: [
        { key: 'gearBoxAssy',    label: 'Gearbox Assy',    type: 'condition', default: 'GOOD' },
        { key: 'clutchSystem',   label: 'Clutch System',   type: 'condition', default: 'GOOD' },
        { key: 'differentialAssy',label: 'Differential Assy',type: 'condition', default: 'GOOD' },
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
      section: 'OTHER SYSTEMS',
      fields: [
        { key: 'muffler',        label: 'Muffler',         type: 'yes-no',    default: 'NO' },
        { key: 'airFilter',      label: 'Air Filter',      type: 'yes-no',    default: 'NO' },
        { key: 'attachmentHitch',label: 'Attachment Hitch',type: 'condition', default: 'GOOD' },
        { key: 'hydraulicLiftFe',label: 'Hydraulic Lift Arm',type: 'yes-no',  default: 'YES' },
        { key: 'frontCrashGuard',label: 'Front Crash Guard',type: 'yes-no',   default: 'NO' },
        { key: 'dropArm',        label: 'Drop Arm',        type: 'yes-no',    default: 'NO' },
        { key: 'rearDrawbar',    label: 'Rear Drawbar',    type: 'yes-no',    default: 'NO' },
        { key: 'paintWork',      label: 'Paint Work',      type: 'condition', default: 'GOOD' },
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
