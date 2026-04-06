import nodemailer from 'nodemailer';

export interface IntakeHandoffEmailParams {
  taskId: string;
  selectedCarriers: string[];
  userData: Record<string, unknown>;
  zipCode?: string;
  insuranceType?: string;
}

interface EmailSendResult {
  success: boolean;
  message: string;
}

type TemplateVariant = 'minimal' | 'detailed';
type PriorityLevel = 'P0' | 'P1' | 'P2';
type FieldSection =
  | 'Contact'
  | 'Location'
  | 'Vehicle'
  | 'Driver'
  | 'Coverage'
  | 'Additional Intake Data';
type FieldDisplayFormat = 'text' | 'email' | 'phone' | 'date' | 'boolean' | 'id';

interface FieldConfig {
  label: string;
  section: FieldSection;
  format: FieldDisplayFormat;
  order: number;
}

interface FormattedField {
  key: string;
  label: string;
  section: FieldSection;
  formattedValue: string;
  isProvided: boolean;
}

interface PriorityFlag {
  label: string;
  severity: 'high' | 'medium' | 'low';
  detail: string;
}

interface LeadAssessment {
  priority: PriorityLevel;
  flags: PriorityFlag[];
  summaryLine: string;
  recommendedAction: string;
}

interface EmailTemplateContent {
  subject: string;
  preheader: string;
  html: string;
  text: string;
  assessment: LeadAssessment;
}

const DEFAULT_HANDOFF_RECIPIENT = 'Megan.wwicke@farmersagency.com';
const MISSING_VALUE_LABEL = 'Not provided';
const EMAIL_OUTER_BG = '#F3F4F6';
const EMAIL_TEXT = '#111827';
const EMAIL_MUTED_TEXT = '#4B5563';
const EMAIL_BORDER = '#D1D5DB';
const BRAND_PRIMARY = '#7A0019';
const BRAND_ACCENT = '#FFCC33';
const PRIORITY_COLORS = {
  high: '#B91C1C',
  medium: '#B45309',
  low: '#166534',
} as const;

const USER_DATA_FIELD_CONFIG: Record<string, FieldConfig> = {
  // Contact
  firstName: { label: 'First Name', section: 'Contact', format: 'text', order: 10 },
  lastName: { label: 'Last Name', section: 'Contact', format: 'text', order: 20 },
  dateOfBirth: { label: 'Date of Birth', section: 'Contact', format: 'date', order: 30 },
  email: { label: 'Email', section: 'Contact', format: 'email', order: 40 },
  phone: { label: 'Phone', section: 'Contact', format: 'phone', order: 50 },
  maritalStatus: { label: 'Marital Status', section: 'Contact', format: 'text', order: 60 },
  gender: { label: 'Gender', section: 'Contact', format: 'text', order: 70 },

  // Location
  streetAddress: { label: 'Street Address', section: 'Location', format: 'text', order: 110 },
  apt: { label: 'Unit / Apt', section: 'Location', format: 'text', order: 120 },
  city: { label: 'City', section: 'Location', format: 'text', order: 130 },
  state: { label: 'State', section: 'Location', format: 'text', order: 140 },
  zipCode: { label: 'ZIP Code', section: 'Location', format: 'text', order: 150 },
  housingType: { label: 'Housing Type', section: 'Location', format: 'text', order: 160 },

  // Vehicle
  vehicleYear: { label: 'Vehicle Year', section: 'Vehicle', format: 'text', order: 210 },
  vehicleMake: { label: 'Vehicle Make', section: 'Vehicle', format: 'text', order: 220 },
  vehicleModel: { label: 'Vehicle Model', section: 'Vehicle', format: 'text', order: 230 },
  vehicleTrim: { label: 'Vehicle Trim', section: 'Vehicle', format: 'text', order: 240 },
  ownership: { label: 'Vehicle Ownership', section: 'Vehicle', format: 'text', order: 250 },
  primaryUse: { label: 'Primary Use', section: 'Vehicle', format: 'text', order: 260 },
  annualMileage: { label: 'Annual Mileage', section: 'Vehicle', format: 'text', order: 270 },
  commuteMiles: { label: 'Commute Miles (One-way)', section: 'Vehicle', format: 'text', order: 280 },
  antiTheftDevice: { label: 'Anti-Theft Device', section: 'Vehicle', format: 'boolean', order: 290 },

  // Driver
  education: { label: 'Education Level', section: 'Driver', format: 'text', order: 310 },
  employmentStatus: { label: 'Employment Status', section: 'Driver', format: 'text', order: 320 },
  occupation: { label: 'Occupation', section: 'Driver', format: 'text', order: 330 },
  licenseAge: { label: 'Age First Licensed', section: 'Driver', format: 'text', order: 340 },
  accidents: { label: 'At-Fault Accidents (5 yrs)', section: 'Driver', format: 'text', order: 350 },
  violations: { label: 'Moving Violations (5 yrs)', section: 'Driver', format: 'text', order: 360 },
  continuousCoverage: { label: 'Continuous Coverage', section: 'Driver', format: 'text', order: 370 },

  // Coverage
  liabilityLimit: { label: 'Liability Coverage', section: 'Coverage', format: 'text', order: 410 },
  collisionDeductible: { label: 'Collision Deductible', section: 'Coverage', format: 'text', order: 420 },
  comprehensiveDeductible: {
    label: 'Comprehensive Deductible',
    section: 'Coverage',
    format: 'text',
    order: 430,
  },
  medicalPayments: { label: 'Medical Payments', section: 'Coverage', format: 'text', order: 440 },
  roadsideAssistance: { label: 'Roadside Assistance', section: 'Coverage', format: 'boolean', order: 450 },
};

const QUICK_TRIAGE_FIELD_KEYS = new Set<string>([
  'firstName',
  'lastName',
  'email',
  'phone',
  'zipCode',
  'vehicleYear',
  'vehicleMake',
  'vehicleModel',
  'accidents',
  'violations',
  'continuousCoverage',
  'liabilityLimit',
]);

const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;

function isSmtpConfigured(): boolean {
  return requiredEnvVars.every((envVar) => !!process.env[envVar]);
}

function sanitizeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    return value.replace(/[\r\n]+/g, ' ').trim();
  }
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return sanitizeValue(value) !== '';
}

function humanizeKey(key: string): string {
  if (!key) return 'Field';
  const withSpaces = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return withSpaces
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateValue(value: string): string {
  const trimmed = sanitizeValue(value);
  if (!trimmed) return MISSING_VALUE_LABEL;

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return trimmed;

  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

function formatPhoneValue(value: string): string {
  const trimmed = sanitizeValue(value);
  if (!trimmed) return MISSING_VALUE_LABEL;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return trimmed;
}

function formatBooleanValue(value: string): string {
  const normalized = sanitizeValue(value).toLowerCase();
  if (!normalized) return MISSING_VALUE_LABEL;
  if (['yes', 'true', 'y', '1'].includes(normalized)) return 'Yes';
  if (['no', 'false', 'n', '0'].includes(normalized)) return 'No';
  return sanitizeValue(value);
}

function formatDisplayValue(value: unknown, format: FieldDisplayFormat): string {
  if (!hasMeaningfulValue(value)) return MISSING_VALUE_LABEL;
  const sanitized = sanitizeValue(value);

  switch (format) {
    case 'date':
      return formatDateValue(sanitized);
    case 'phone':
      return formatPhoneValue(sanitized);
    case 'boolean':
      return formatBooleanValue(sanitized);
    case 'email':
    case 'id':
    case 'text':
    default:
      return sanitized;
  }
}

function toFormattedFields(userData: Record<string, unknown>): FormattedField[] {
  const entries = Object.entries(userData) as Array<[string, unknown]>;
  const known: FormattedField[] = [];
  const unknown: FormattedField[] = [];

  for (const [key, rawValue] of entries) {
    const config = USER_DATA_FIELD_CONFIG[key];
    if (config) {
      known.push({
        key,
        label: config.label,
        section: config.section,
        formattedValue: formatDisplayValue(rawValue, config.format),
        isProvided: hasMeaningfulValue(rawValue),
      });
      continue;
    }

    unknown.push({
      key,
      label: humanizeKey(key),
      section: 'Additional Intake Data',
      formattedValue: formatDisplayValue(rawValue, 'text'),
      isProvided: hasMeaningfulValue(rawValue),
    });
  }

  known.sort((a, b) => {
    const configA = USER_DATA_FIELD_CONFIG[a.key];
    const configB = USER_DATA_FIELD_CONFIG[b.key];
    return configA.order - configB.order;
  });
  unknown.sort((a, b) => a.label.localeCompare(b.label));

  return [...known, ...unknown];
}

function groupFieldsBySection(fields: FormattedField[]): Record<FieldSection, FormattedField[]> {
  const grouped: Record<FieldSection, FormattedField[]> = {
    Contact: [],
    Location: [],
    Vehicle: [],
    Driver: [],
    Coverage: [],
    'Additional Intake Data': [],
  };

  for (const field of fields) {
    grouped[field.section].push(field);
  }

  return grouped;
}

function parseCountLikeValue(value: unknown): number {
  const sanitized = sanitizeValue(value).toLowerCase();
  if (!sanitized) return 0;
  if (sanitized.includes('never')) return 99;
  const matched = sanitized.match(/\d+/);
  return matched ? Number(matched[0]) : 0;
}

function isCoverageLapsed(value: unknown): boolean {
  const normalized = sanitizeValue(value).toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('lapsed') ||
    normalized.includes('never insured') ||
    normalized.includes('never')
  );
}

function computeLeadAssessment(params: IntakeHandoffEmailParams, userData: Record<string, unknown>): LeadAssessment {
  const accidents = parseCountLikeValue(userData.accidents);
  const violations = parseCountLikeValue(userData.violations);
  const coverageLapsed = isCoverageLapsed(userData.continuousCoverage);
  const carriersCount = params.selectedCarriers.length;

  const flags: PriorityFlag[] = [];
  let score = 2; // 0: P0, 1: P1, 2: P2

  if (coverageLapsed) {
    score = Math.min(score, 0);
    flags.push({
      label: 'Coverage Gap',
      severity: 'high',
      detail: 'Continuous coverage appears lapsed or never insured.',
    });
  }

  if (accidents >= 2 || violations >= 2) {
    score = Math.min(score, 1);
    flags.push({
      label: 'Higher Driver Risk',
      severity: 'medium',
      detail: `Reported history includes ${accidents} accident(s) and ${violations} violation(s).`,
    });
  } else if (accidents > 0 || violations > 0) {
    score = Math.min(score, 1);
    flags.push({
      label: 'Driver Incident History',
      severity: 'medium',
      detail: `Reported ${accidents} accident(s) and ${violations} violation(s).`,
    });
  }

  if (carriersCount === 0) {
    score = Math.min(score, 1);
    flags.push({
      label: 'Carrier Follow-up Needed',
      severity: 'medium',
      detail: 'No carrier was selected in intake; agent routing needed.',
    });
  }

  if (flags.length === 0) {
    flags.push({
      label: 'Standard Lead',
      severity: 'low',
      detail: 'No immediate risk markers from intake responses.',
    });
  }

  const priority: PriorityLevel = score === 0 ? 'P0' : score === 1 ? 'P1' : 'P2';
  const summaryLine =
    priority === 'P0'
      ? 'Fast follow-up recommended: high-priority lead markers detected.'
      : priority === 'P1'
        ? 'Prompt same-day follow-up recommended.'
        : 'Normal queue follow-up is acceptable.';

  const recommendedAction =
    priority === 'P0'
      ? 'Call immediately, verify continuous coverage details, and confirm risk context.'
      : priority === 'P1'
        ? 'Call within 2 business hours and confirm underwriting-relevant details.'
        : 'Call within 1 business day and proceed with standard quote workflow.';

  return { priority, flags, summaryLine, recommendedAction };
}

function resolveTemplateVariant(): TemplateVariant {
  const candidate = sanitizeValue(process.env.HANDOFF_EMAIL_VARIANT || '').toLowerCase();
  return candidate === 'detailed' ? 'detailed' : 'minimal';
}

function getLeadName(userData: Record<string, unknown>): string {
  const firstName = sanitizeValue(userData.firstName);
  const lastName = sanitizeValue(userData.lastName);
  const full = `${firstName} ${lastName}`.trim();
  return full || 'Unknown Applicant';
}

function getSubjectLine(
  priority: PriorityLevel,
  leadName: string,
  zipCode?: string,
): string {
  const zip = sanitizeValue(zipCode || 'N/A');
  return `GoldyQuote Lead ${priority} | ${leadName} | ZIP ${zip}`;
}

function buildHtmlRows(fields: FormattedField[]): string {
  return fields
    .map((field) => {
      const label = escapeHtml(field.label);
      const value = escapeHtml(field.formattedValue);
      return (
        `<tr>` +
        `<td style="padding:6px 10px; width:42%; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:${EMAIL_MUTED_TEXT}; border-bottom:1px solid ${EMAIL_BORDER}; vertical-align:top;">${label}</td>` +
        `<td style="padding:6px 10px; width:58%; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:${EMAIL_TEXT}; border-bottom:1px solid ${EMAIL_BORDER}; vertical-align:top;"><strong>${value}</strong></td>` +
        `</tr>`
      );
    })
    .join('');
}

function buildSectionBlock(title: string, rowsHtml: string): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0; border:1px solid ${EMAIL_BORDER}; border-radius:0;">` +
    `<tr>` +
    `<td style="padding:7px 10px; background-color:${BRAND_PRIMARY}; font-family:Arial, Helvetica, sans-serif; font-size:12px; font-weight:700; color:#FFFFFF; text-transform:uppercase; letter-spacing:0.4px;">${escapeHtml(title)}</td>` +
    `</tr>` +
    `<tr>` +
    `<td style="padding:0;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table>` +
    `</td>` +
    `</tr>` +
    `</table>`
  );
}

function buildPriorityFlagsHtml(flags: PriorityFlag[]): string {
  return flags
    .map((flag) => {
      const color = PRIORITY_COLORS[flag.severity];
      return (
        `<tr>` +
        `<td style="padding:0 0 8px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:${EMAIL_TEXT}; line-height:1.4;">` +
        `<span style="display:inline-block; background-color:${color}; color:#FFFFFF; font-size:11px; font-weight:700; padding:2px 6px; margin-right:8px;">${escapeHtml(flag.label)}</span>` +
        `${escapeHtml(flag.detail)}` +
        `</td>` +
        `</tr>`
      );
    })
    .join('');
}

function buildTextSection(title: string, fields: FormattedField[]): string {
  if (fields.length === 0) return '';
  const rows = fields.map((field) => `- ${field.label}: ${field.formattedValue}`).join('\n');
  return `${title}:\n${rows}`;
}

function buildEmailTemplate(params: IntakeHandoffEmailParams, variant: TemplateVariant): EmailTemplateContent {
  const preparedFields = toFormattedFields(params.userData);
  const grouped = groupFieldsBySection(preparedFields);
  const leadName = getLeadName(params.userData);
  const assessment = computeLeadAssessment(params, params.userData);
  const selectedCarriersText =
    params.selectedCarriers.length > 0
      ? params.selectedCarriers.map((carrier) => sanitizeValue(carrier)).join(', ')
      : 'None selected';
  const intakeType = sanitizeValue(params.insuranceType || 'Auto');
  const zip = sanitizeValue(params.zipCode || String(params.userData.zipCode || ''));

  const subject = getSubjectLine(assessment.priority, leadName, zip);
  const preheader = `${assessment.priority} lead from ${leadName} in ZIP ${zip || 'N/A'} - ${assessment.summaryLine}`;

  const triageFields: FormattedField[] = preparedFields.filter((field) =>
    QUICK_TRIAGE_FIELD_KEYS.has(field.key),
  );

  const detailSections: FieldSection[] = ['Contact', 'Location', 'Vehicle', 'Driver', 'Coverage'];
  const sectionDisplayLabels: Record<FieldSection, string> = {
    Contact: '1. Personal Info',
    Location: '2. Address',
    Vehicle: '3. Vehicle Info',
    Driver: '4. Driver Info',
    Coverage: '5. Insurance Info',
    'Additional Intake Data': 'Additional Intake Data',
  };

  const detailSectionHtml = detailSections
    .map((sectionName) => {
      const fieldsForSection = grouped[sectionName].filter((field) =>
        variant === 'detailed' ? true : QUICK_TRIAGE_FIELD_KEYS.has(field.key),
      );
      if (fieldsForSection.length === 0) return '';
      return buildSectionBlock(sectionDisplayLabels[sectionName], buildHtmlRows(fieldsForSection));
    })
    .join('');
  const additionalFields = grouped['Additional Intake Data'];
  const additionalSectionHtml =
    variant === 'detailed' && additionalFields.length > 0
      ? buildSectionBlock(sectionDisplayLabels['Additional Intake Data'], buildHtmlRows(additionalFields))
      : '';

  const priorityFlagsHtml = buildPriorityFlagsHtml(assessment.flags);

  const quickRowsHtml = buildHtmlRows(
    triageFields.length > 0
      ? triageFields
      : [
          {
            key: 'none',
            label: 'Submitted Data',
            section: 'Additional Intake Data',
            formattedValue: 'No structured fields provided',
            isProvided: false,
          },
        ],
  );

  const html = [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <meta name="x-apple-disable-message-reformatting" />`,
    `  <title>${escapeHtml(subject)}</title>`,
    `</head>`,
    `<body style="margin:0; padding:0; background-color:${EMAIL_OUTER_BG};">`,
    `  <div style="display:none; font-size:1px; color:${EMAIL_OUTER_BG}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${escapeHtml(preheader)}</div>`,
    `  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_OUTER_BG};">`,
    `    <tr>`,
    `      <td align="center" style="padding:20px 12px;">`,
    `        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px; background-color:#FFFFFF; border:1px solid ${EMAIL_BORDER};">`,
    `          <tr>`,
    `            <td style="padding:14px 16px; background-color:${BRAND_PRIMARY}; color:#FFFFFF; font-family:Arial, Helvetica, sans-serif;">`,
    `              <div style="font-size:16px; font-weight:700; line-height:1.2;">GoldyQuote Intake Handoff</div>`,
    `              <div style="font-size:12px; margin-top:4px; color:${BRAND_ACCENT};">Designed for 30-second agent triage</div>`,
    `            </td>`,
    `          </tr>`,
    `          <tr>`,
    `            <td style="padding:14px 16px;">`,
    buildSectionBlock(
      'Lead Summary',
      buildHtmlRows([
        {
          key: 'priority',
          label: 'Priority',
          section: 'Contact',
          formattedValue: assessment.priority,
          isProvided: true,
        },
        {
          key: 'leadName',
          label: 'Applicant',
          section: 'Contact',
          formattedValue: leadName,
          isProvided: true,
        },
        {
          key: 'insuranceType',
          label: 'Insurance Type',
          section: 'Contact',
          formattedValue: intakeType || MISSING_VALUE_LABEL,
          isProvided: Boolean(intakeType),
        },
        {
          key: 'zipCode',
          label: 'ZIP Code',
          section: 'Location',
          formattedValue: zip || MISSING_VALUE_LABEL,
          isProvided: Boolean(zip),
        },
        {
          key: 'selectedCarriers',
          label: 'Requested Carriers',
          section: 'Contact',
          formattedValue: selectedCarriersText,
          isProvided: params.selectedCarriers.length > 0,
        },
      ]),
    ),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0; border:1px solid ${EMAIL_BORDER};">`,
    `<tr><td style="padding:10px 12px; background-color:#F9FAFB; font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:700; color:${BRAND_PRIMARY}; text-transform:uppercase; letter-spacing:0.4px;">Priority Flags</td></tr>`,
    `<tr><td style="padding:10px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${priorityFlagsHtml}</table><div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:${EMAIL_MUTED_TEXT}; margin-top:4px;">${escapeHtml(assessment.summaryLine)}</div></td></tr>`,
    `</table>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0; border:1px solid ${EMAIL_BORDER};">`,
    `<tr><td style="padding:10px 12px; background-color:#F9FAFB; font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:700; color:${BRAND_PRIMARY}; text-transform:uppercase; letter-spacing:0.4px;">Action</td></tr>`,
    `<tr><td style="padding:10px 12px; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:${EMAIL_TEXT}; line-height:1.45;">`,
    `<div style="margin:0 0 8px 0;"><strong>Recommended next step:</strong> ${escapeHtml(assessment.recommendedAction)}</div>`,
    `<div style="margin:0 0 6px 0;"><strong>Call:</strong> ${escapeHtml(formatPhoneValue(String(params.userData.phone || '')))}</div>`,
    `<div style="margin:0;"><strong>Email:</strong> ${escapeHtml(formatDisplayValue(params.userData.email, 'email'))}</div>`,
    `</td></tr>`,
    `</table>`,
    buildSectionBlock(
      variant === 'detailed' ? 'Quick Triage Snapshot' : 'Quick Triage',
      quickRowsHtml,
    ),
    detailSectionHtml,
    additionalSectionHtml,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">`,
    `<tr><td style="padding:2px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:11px; color:${EMAIL_MUTED_TEXT};">Deterministic field order. Missing values are shown as "${MISSING_VALUE_LABEL}".</td></tr>`,
    `</table>`,
    `            </td>`,
    `          </tr>`,
    `        </table>`,
    `      </td>`,
    `    </tr>`,
    `  </table>`,
    `</body>`,
    `</html>`,
  ].join('');

  const lines: string[] = [];
  lines.push('GoldyQuote Intake Handoff');
  lines.push('');
  lines.push(`Priority: ${assessment.priority}`);
  lines.push(`Applicant: ${leadName}`);
  lines.push(`Insurance Type: ${intakeType || MISSING_VALUE_LABEL}`);
  lines.push(`ZIP Code: ${zip || MISSING_VALUE_LABEL}`);
  lines.push(`Requested Carriers: ${selectedCarriersText}`);
  lines.push('');
  lines.push('Priority Flags:');
  for (const flag of assessment.flags) {
    lines.push(`- [${flag.label}] ${flag.detail}`);
  }
  lines.push(`- ${assessment.summaryLine}`);
  lines.push('');
  lines.push('Action:');
  lines.push(`- ${assessment.recommendedAction}`);
  lines.push(`- Call: ${formatPhoneValue(String(params.userData.phone || ''))}`);
  lines.push(`- Email: ${formatDisplayValue(params.userData.email, 'email')}`);
  lines.push('');
  lines.push(
    buildTextSection(
      variant === 'detailed' ? 'Quick Triage Snapshot' : 'Quick Triage',
      triageFields.length > 0
        ? triageFields
        : [
            {
              key: 'none',
              label: 'Submitted Data',
              section: 'Additional Intake Data',
              formattedValue: 'No structured fields provided',
              isProvided: false,
            },
          ],
    ),
  );
  lines.push('');

  for (const sectionName of detailSections) {
    const sectionFields = grouped[sectionName].filter((field) =>
      variant === 'detailed' ? true : QUICK_TRIAGE_FIELD_KEYS.has(field.key),
    );
    const block = buildTextSection(sectionDisplayLabels[sectionName], sectionFields);
    if (block) {
      lines.push(block);
      lines.push('');
    }
  }

  if (variant === 'detailed') {
    const additionalBlock = buildTextSection(
      sectionDisplayLabels['Additional Intake Data'],
      grouped['Additional Intake Data'],
    );
    if (additionalBlock) {
      lines.push(additionalBlock);
      lines.push('');
    }
  }

  lines.push(`Missing values are shown as "${MISSING_VALUE_LABEL}".`);

  return {
    subject,
    preheader,
    html,
    text: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    assessment,
  };
}

function getHandoffRecipient(): string {
  const configuredRecipient = sanitizeValue(process.env.HANDOFF_EMAIL_TO || '');
  return configuredRecipient || DEFAULT_HANDOFF_RECIPIENT;
}

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  const candidate = match ? match[1] : value;
  return sanitizeValue(candidate).toLowerCase();
}

function validateBrevoSenderConfig(): string | null {
  const smtpHost = sanitizeValue(process.env.SMTP_HOST || '').toLowerCase();
  if (!smtpHost.includes('brevo.com')) {
    return null;
  }

  const smtpUser = extractEmailAddress(sanitizeValue(process.env.SMTP_USER || ''));
  const smtpFrom = extractEmailAddress(sanitizeValue(process.env.SMTP_FROM || ''));

  if (!smtpFrom) {
    return 'SMTP_FROM is required for Brevo.';
  }

  // Brevo rejects sends that use the relay login address as sender.
  if (smtpFrom.endsWith('@smtp-brevo.com') || smtpFrom === smtpUser) {
    return (
      'Brevo sender misconfigured: SMTP_FROM must be a validated Brevo sender or authenticated domain ' +
      '(not the @smtp-brevo.com relay login address).'
    );
  }

  return null;
}

export async function sendIntakeHandoffEmail(params: IntakeHandoffEmailParams): Promise<EmailSendResult> {
  if (!isSmtpConfigured()) {
    return {
      success: false,
      message:
        'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.',
    };
  }

  const smtpPort = Number(process.env.SMTP_PORT);
  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    return {
      success: false,
      message: 'SMTP_PORT is invalid. Set SMTP_PORT to a valid numeric port.',
    };
  }

  const brevoConfigError = validateBrevoSenderConfig();
  if (brevoConfigError) {
    return {
      success: false,
      message: brevoConfigError,
    };
  }

  const smtpSecure =
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || smtpPort === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const variant = resolveTemplateVariant();
  const template = buildEmailTemplate(params, variant);

  const sendInfo = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: getHandoffRecipient(),
    subject: template.subject,
    text: template.text,
    html: template.html,
  });

  const rejectedRecipients = Array.isArray(sendInfo.rejected)
    ? sendInfo.rejected.map((value) => sanitizeValue(value)).filter(Boolean)
    : [];

  if (rejectedRecipients.length > 0) {
    return {
      success: false,
      message: `SMTP rejected recipient(s): ${rejectedRecipients.join(', ')}`,
    };
  }

  return {
    success: true,
    message: `Intake handoff email sent successfully (${template.assessment.priority}, ${variant} template).`,
  };
}

