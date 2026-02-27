import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Backend: Ultra-robust env loading
const possiblePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(path.dirname(process.execPath), '.env'),
  path.resolve(process.env.SOUNDVZN_USER_DATA || '', '.env'),
  '.env'
];

let envLoaded = false;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    console.log('[Mailer] Environment loaded from:', p);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('[Mailer] WARNING: No .env file found in any expected location.');
}

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.office365.com';
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

console.log('[Mailer] SMTP Diagnostic:', {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  user: SMTP_USER ? `${SMTP_USER.substring(0, 3)}...` : 'MISSING',
  hasPass: !!SMTP_PASS,
  from: SMTP_FROM
});

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // Soportar certificados auto-firmados o dominios locales
  }
});

if (SMTP_USER && SMTP_PASS) {
  transporter.verify((error) => {
    if (error) {
      console.error('[Mailer] Connection verification failed:', error.message);
    } else {
      console.log(`[Mailer] SMTP ready host=${SMTP_HOST} port=${SMTP_PORT} secure=${SMTP_SECURE}`);
    }
  });
}

export const mailer = {
  transporter,
  sendVerificationEmail: async (toEmail: string, code: string) => {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('[Mailer] Missing SMTP_USER or SMTP_PASS in .env. Skipping verification email.');
      return false;
    }

    const html = `
      <div style="background: #050508; color: white; font-family: sans-serif; padding: 40px; border-radius: 20px;">
        <h1 style="color: #0ea5e9; font-size: 32px; letter-spacing: -2px;">SOUNDVIZION</h1>
        <p style="font-size: 18px; color: rgba(255,255,255,0.8);">Your verification code:</p>
        <div style="margin: 24px 0; padding: 18px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
          <span style="font-size: 28px; letter-spacing: 6px; font-weight: 900;">${code}</span>
        </div>
        <p style="color: rgba(255,255,255,0.5); font-size: 13px;">This code expires in 15 minutes.</p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"SoundVizion" <${SMTP_FROM}>`,
        to: toEmail,
        subject: 'Your verification code - SoundVizion',
        html,
      });
      console.log(`[Mailer] Verification email sent to ${toEmail}. ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[Mailer] Failed to send verification email:', error.message);
      return false;
    }
  },

  sendWelcomeEmail: async (toEmail: string, _userName: string) => {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('[Mailer] Missing SMTP_USER or SMTP_PASS in .env. Skipping welcome email.');
      return false;
    }

    const html = `
      <div style="background: #050508; color: white; font-family: sans-serif; padding: 40px; border-radius: 20px;">
        <h1 style="color: #0ea5e9; font-size: 32px; letter-spacing: -2px;">SOUNDVIZION</h1>
        <p style="font-size: 18px; color: rgba(255,255,255,0.8);">Welcome to SoundVizion.</p>
        <p>Your account is now active.</p>
        <div style="margin: 30px 0; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
          <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 12px; font-weight: bold; text-transform: uppercase;">Current Plan</p>
          <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 900; color: white;">STANDARD</p>
        </div>
        <p style="color: rgba(255,255,255,0.4); font-size: 14px;">Explore your library, sync your playlists, and enjoy the best sound.</p>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;">
        <p style="font-size: 12px; color: rgba(255,255,255,0.3);">(c) 2026 SoundVizion Team. Made for high-fidelity lovers.</p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"SoundVizion" <${SMTP_FROM}>`,
        to: toEmail,
        subject: 'Welcome to SoundVizion',
        html,
      });
      console.log(`[Mailer] Welcome email sent successfully to ${toEmail}. ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[Mailer] Failed to send welcome email:', error.message);
      return false;
    }
  },

  sendProActivationEmail: async (toEmail: string, userName: string) => {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('[Mailer] Missing SMTP_USER or SMTP_PASS in .env. Skipping pro activation email.');
      return false;
    }

    const html = `
      <div style="background: #050508; color: white; font-family: sans-serif; padding: 40px; border-radius: 20px; border: 1px solid #f59e0b;">
        <h1 style="color: #f59e0b; font-size: 32px; letter-spacing: -2px;">SOUNDVIZION PRO</h1>
        <p style="font-size: 18px; color: rgba(255,255,255,0.8);">Congrats <b>${userName}</b>!</p>
        <p>Your Pro subscription is active. Your free trial has started.</p>
        <div style="margin: 30px 0; padding: 20px; background: rgba(245, 158, 11, 0.1); border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.3);">
          <ul style="margin: 0; padding: 0; list-style: none;">
            <li style="margin-bottom: 10px; color: #fde68a;">- Unlimited downloads</li>
            <li style="margin-bottom: 10px; color: #fde68a;">- High fidelity crossfade</li>
            <li style="margin-bottom: 10px; color: #fde68a;">- Hi-Res audio</li>
          </ul>
        </div>
        <p style="color: rgba(255,255,255,0.6); font-size: 14px;">You can manage or cancel anytime from your profile.</p>
        <p style="color: rgba(255,255,255,0.4); font-size: 13px;">Thanks for supporting SoundVizion.</p>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;">
        <p style="font-size: 12px; color: rgba(255,255,255,0.3);">(c) 2026 SoundVizion Team. Premium Audio Experience.</p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"SoundVizion Pro" <${SMTP_FROM}>`,
        to: toEmail,
        subject: 'Welcome to SoundVizion Pro',
        html,
      });
      console.log(`[Mailer] Pro activation email sent successfully to ${toEmail}. ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[Mailer] Failed to send pro activation email:', error.message);
      return false;
    }
  },

  sendResetEmail: async (toEmail: string, code: string) => {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('[Mailer] Missing SMTP_USER or SMTP_PASS in .env. Skipping reset email.');
      return false;
    }

    const html = `
      <div style="background: #050508; color: white; font-family: sans-serif; padding: 40px; border-radius: 20px;">
        <h1 style="color: #0ea5e9; font-size: 32px; letter-spacing: -2px;">SOUNDVIZION</h1>
        <p style="font-size: 18px; color: rgba(255,255,255,0.8);">Reset your password with this code:</p>
        <div style="margin: 24px 0; padding: 18px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
          <span style="font-size: 28px; letter-spacing: 6px; font-weight: 900;">${code}</span>
        </div>
        <p style="color: rgba(255,255,255,0.5); font-size: 13px;">This code expires in 15 minutes.</p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"SoundVizion" <${SMTP_FROM}>`,
        to: toEmail,
        subject: 'Reset your password - SoundVizion',
        html,
      });
      console.log(`[Mailer] Reset email sent to ${toEmail}. ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[Mailer] Failed to send reset email:', error.message);
      return false;
    }
  },
};
