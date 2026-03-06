import nodemailer from 'nodemailer';
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} from './secrets';

// ——— Diagnostic (never logs actual secret values) ———
console.log('[Mailer] SMTP Diagnostic:', {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  user: SMTP_USER ? `${SMTP_USER.substring(0, 3)}…` : 'MISSING',
  hasPass: !!SMTP_PASS,
  from: SMTP_FROM,
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
    rejectUnauthorized: false,
  },
});

if (SMTP_USER && SMTP_PASS) {
  transporter.verify((error) => {
    if (error) {
      console.error('[Mailer] SMTP verification failed:', error.message);
    } else {
      console.log(`[Mailer] SMTP ready | host=${SMTP_HOST} port=${SMTP_PORT} secure=${SMTP_SECURE}`);
    }
  });
}

export const mailer = {
  transporter,

  sendVerificationEmail: async (toEmail: string, code: string): Promise<boolean> => {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('[Mailer] SMTP credentials missing — skipping verification email.');
      return false;
    }

    const html = `
      <div style="background:#050508;color:white;font-family:sans-serif;padding:40px;border-radius:20px;">
        <h1 style="color:#0ea5e9;font-size:32px;letter-spacing:-2px;">SOUNDVIZION</h1>
        <p style="font-size:18px;color:rgba(255,255,255,0.8);">Tu código de verificación:</p>
        <div style="margin:24px 0;padding:18px;background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.1);text-align:center;">
          <span style="font-size:28px;letter-spacing:6px;font-weight:900;">${code}</span>
        </div>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;">Este código expira en 15 minutos.</p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"SoundVizion" <${SMTP_FROM}>`,
        to: toEmail,
        subject: 'Tu código de verificación — SoundVizion',
        html,
      });
      console.log(`[Mailer] Verification email sent → ${toEmail} | ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[Mailer] Failed to send verification email:', error.message);
      return false;
    }
  },

  sendWelcomeEmail: async (toEmail: string, _userName: string): Promise<boolean> => {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('[Mailer] SMTP credentials missing — skipping welcome email.');
      return false;
    }

    const html = `
      <div style="background:#050508;color:white;font-family:sans-serif;padding:40px;border-radius:20px;">
        <h1 style="color:#0ea5e9;font-size:32px;letter-spacing:-2px;">SOUNDVIZION</h1>
        <p style="font-size:18px;color:rgba(255,255,255,0.8);">Bienvenido a SoundVizion.</p>
        <p>Tu cuenta ya está activa.</p>
        <div style="margin:30px 0;padding:20px;background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.1);">
          <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;font-weight:bold;text-transform:uppercase;">Plan Actual</p>
          <p style="margin:5px 0 0 0;font-size:20px;font-weight:900;color:white;">STANDARD</p>
        </div>
        <p style="color:rgba(255,255,255,0.4);font-size:14px;">Explora tu biblioteca, sincroniza tus playlists y disfruta del mejor sonido.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:30px 0;">
        <p style="font-size:12px;color:rgba(255,255,255,0.3);">&copy; 2026 SoundVizion Team. Made for high-fidelity lovers.</p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"SoundVizion" <${SMTP_FROM}>`,
        to: toEmail,
        subject: 'Bienvenido a SoundVizion',
        html,
      });
      console.log(`[Mailer] Welcome email sent → ${toEmail} | ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[Mailer] Failed to send welcome email:', error.message);
      return false;
    }
  },

  sendProActivationEmail: async (toEmail: string, userName: string): Promise<boolean> => {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('[Mailer] SMTP credentials missing — skipping pro activation email.');
      return false;
    }

    const html = `
      <div style="background:#050508;color:white;font-family:sans-serif;padding:40px;border-radius:20px;border:1px solid #f59e0b;">
        <h1 style="color:#f59e0b;font-size:32px;letter-spacing:-2px;">SOUNDVIZION PRO</h1>
        <p style="font-size:18px;color:rgba(255,255,255,0.8);">¡Felicidades <b>${userName}</b>!</p>
        <p>Tu suscripción Pro está activa. Tu prueba gratuita ha comenzado.</p>
        <div style="margin:30px 0;padding:20px;background:rgba(245,158,11,0.1);border-radius:12px;border:1px solid rgba(245,158,11,0.3);">
          <ul style="margin:0;padding:0;list-style:none;">
            <li style="margin-bottom:10px;color:#fde68a;">— Descargas ilimitadas</li>
            <li style="margin-bottom:10px;color:#fde68a;">— Crossfade de alta fidelidad</li>
            <li style="margin-bottom:10px;color:#fde68a;">— Audio Hi-Res</li>
          </ul>
        </div>
        <p style="color:rgba(255,255,255,0.6);font-size:14px;">Puedes gestionar o cancelar en cualquier momento desde tu perfil.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:30px 0;">
        <p style="font-size:12px;color:rgba(255,255,255,0.3);">&copy; 2026 SoundVizion Team. Premium Audio Experience.</p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"SoundVizion Pro" <${SMTP_FROM}>`,
        to: toEmail,
        subject: 'Bienvenido a SoundVizion Pro',
        html,
      });
      console.log(`[Mailer] Pro activation email sent → ${toEmail} | ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[Mailer] Failed to send pro activation email:', error.message);
      return false;
    }
  },

  sendResetEmail: async (toEmail: string, code: string): Promise<boolean> => {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('[Mailer] SMTP credentials missing — skipping reset email.');
      return false;
    }

    const html = `
      <div style="background:#050508;color:white;font-family:sans-serif;padding:40px;border-radius:20px;">
        <h1 style="color:#0ea5e9;font-size:32px;letter-spacing:-2px;">SOUNDVIZION</h1>
        <p style="font-size:18px;color:rgba(255,255,255,0.8);">Restablece tu contraseña con este código:</p>
        <div style="margin:24px 0;padding:18px;background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.1);text-align:center;">
          <span style="font-size:28px;letter-spacing:6px;font-weight:900;">${code}</span>
        </div>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;">Este código expira en 15 minutos.</p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"SoundVizion" <${SMTP_FROM}>`,
        to: toEmail,
        subject: 'Restablece tu contraseña — SoundVizion',
        html,
      });
      console.log(`[Mailer] Reset email sent → ${toEmail} | ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[Mailer] Failed to send reset email:', error.message);
      return false;
    }
  },
};
