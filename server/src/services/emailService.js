// Transactional email via Resend (https://resend.com) - a plain REST call, no SDK dependency.
// If RESEND_API_KEY is not set (e.g. local development), sending is skipped and callers fall
// back to their own dev-mode behavior (see authController.requestPasswordReset).
const RESEND_API_URL = 'https://api.resend.com/emails';

function isConfigured() {
  return !!process.env.RESEND_API_KEY;
}

async function sendEmail({ to, subject, html }) {
  if (!isConfigured()) {
    console.warn(`[email] RESEND_API_KEY not set - skipped sending "${subject}" to ${to}`); // eslint-disable-line no-console
    return { sent: false };
  }

  const from = process.env.EMAIL_FROM || 'IMS + POS <onboarding@resend.dev>';

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    // Never throw out to the caller for a public-facing flow like password reset - log for
    // operator visibility and let the caller decide what (generic) response the user sees.
    console.error(`[email] Resend API error ${response.status} sending "${subject}" to ${to}: ${body}`); // eslint-disable-line no-console
    return { sent: false, error: body };
  }

  return { sent: true };
}

function sendPasswordResetEmail(user, resetToken) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2F5233;">Reset your password</h2>
      <p>Hi ${user.name},</p>
      <p>We received a request to reset the password on your account. Click the button below to choose a new one - this link expires in 1 hour.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background: #4f46e5; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Reset Password
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">If you didn't request this, you can safely ignore this email - your password will not be changed.</p>
      <p style="color: #999; font-size: 12px;">If the button doesn't work, copy this link into your browser:<br>${resetUrl}</p>
    </div>
  `;

  return sendEmail({ to: user.email, subject: 'Reset your password', html });
}

module.exports = { isConfigured, sendEmail, sendPasswordResetEmail };
