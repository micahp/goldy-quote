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

const MEGAN_EMAIL = 'Megan.wwicke@farmersagency.com';

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

function formatUserDataForText(userData: Record<string, unknown>): string {
  const entries = Object.entries(userData)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  if (entries.length === 0) {
    return 'No user data fields were submitted.';
  }

  return entries.map(([key, value]) => `- ${key}: ${sanitizeValue(value)}`).join('\n');
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

  const textBody = [
    'New GoldyQuote v1 intake handoff received.',
    '',
    `Task ID: ${sanitizeValue(params.taskId)}`,
    `Selected Carriers: ${params.selectedCarriers.join(', ') || 'N/A'}`,
    `Insurance Type: ${sanitizeValue(params.insuranceType || 'N/A')}`,
    `ZIP Code: ${sanitizeValue(params.zipCode || 'N/A')}`,
    '',
    'Submitted User Data:',
    formatUserDataForText(params.userData),
  ].join('\n');

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: MEGAN_EMAIL,
    subject: `GoldyQuote Intake Handoff - ${sanitizeValue(params.taskId)}`,
    text: textBody,
  });

  return {
    success: true,
    message: 'Intake handoff email sent successfully.',
  };
}

