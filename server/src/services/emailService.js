// Transactional email via Resend (https://resend.com) - a plain REST call, no SDK dependency.
// If RESEND_API_KEY is not set (e.g. local development), sending is skipped and callers fall
// back to their own dev-mode behavior (see authController.requestPasswordReset).
const db = require('../models');

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

async function getBusinessName() {
  try {
    const row = await db.SystemSetting.findOne({ where: { key: 'business_name' } });
    return row?.value || 'SunZan';
  } catch {
    return 'SunZan';
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// Sent when a new user account is created (userController.create), using the plaintext
// password before it's hashed and discarded - this is the only point it's ever available.
async function sendWelcomeEmail(user, plainPassword) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const businessName = await getBusinessName();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2F5233;">Welcome, ${user.name}</h2>
      <p>An account has been created for you on the ${businessName} Inventory &amp; POS System.</p>
      <p>Your login details:</p>
      <table style="margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Email</td><td><strong>${user.email}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Temporary Password</td><td><strong>${plainPassword}</strong></td></tr>
      </table>
      <p style="margin: 24px 0;">
        <a href="${baseUrl}/login" style="background: #4f46e5; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Sign In
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">For security, please sign in and change your password as soon as possible (use the Change Password option in the top menu).</p>
    </div>
  `;

  return sendEmail({ to: user.email, subject: `Your ${businessName} account has been created`, html });
}

// Ad-hoc email to a customer, composed by staff from the Customers page.
async function sendCustomerEmail({ to, subject, message, senderName }) {
  const businessName = await getBusinessName();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      <p style="color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px;">
        Sent by ${senderName ? `${escapeHtml(senderName)} at ` : ''}${businessName}
      </p>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

// Sent automatically after a sale completes, when a customer with an email is on the sale.
async function sendReceiptEmail(sale) {
  if (!sale.customer?.email) return { sent: false };

  const businessName = await getBusinessName();
  const money = (n) => Number(n || 0).toFixed(2);

  const itemsHtml = (sale.items || []).map((i) => `
    <tr>
      <td style="padding: 2px 0;">${i.quantity} x ${escapeHtml(i.product?.name)}</td>
      <td style="padding: 2px 0; text-align: right;">${money(i.total)}</td>
    </tr>
  `).join('');

  const paymentsHtml = (sale.payments || []).map((p) => `
    <tr>
      <td style="padding: 2px 0; text-transform: capitalize;">${escapeHtml((p.method || '').replaceAll('_', ' '))}</td>
      <td style="padding: 2px 0; text-align: right;">${money(p.amount)}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: 'Courier New', monospace; max-width: 380px; margin: 0 auto; font-size: 13px; color: #222;">
      <p style="text-align: center; font-weight: 600; font-size: 15px; margin-bottom: 2px;">${businessName}</p>
      ${sale.location?.name ? `<p style="text-align: center; margin: 2px 0;">${escapeHtml(sale.location.name)}</p>` : ''}
      <hr style="border: none; border-top: 1px dashed #999;" />
      <p style="margin: 2px 0;">Receipt: ${sale.receipt_number}</p>
      <p style="margin: 2px 0;">Sale: ${sale.sale_number}</p>
      <p style="margin: 2px 0;">Date: ${new Date(sale.createdAt).toLocaleString()}</p>
      <p style="margin: 2px 0;">Cashier: ${escapeHtml(sale.cashier?.name)}</p>
      <p style="margin: 2px 0;">Customer: ${escapeHtml(sale.customer.name)}</p>
      <hr style="border: none; border-top: 1px dashed #999;" />
      <table style="width: 100%; border-collapse: collapse;">${itemsHtml}</table>
      <hr style="border: none; border-top: 1px dashed #999;" />
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 2px 0;">Subtotal</td><td style="padding: 2px 0; text-align: right;">${money(sale.subtotal)}</td></tr>
        <tr><td style="padding: 2px 0;">Discount</td><td style="padding: 2px 0; text-align: right;">-${money(sale.discount_total)}</td></tr>
        <tr><td style="padding: 2px 0;">Tax</td><td style="padding: 2px 0; text-align: right;">${money(sale.tax_total)}</td></tr>
        <tr style="font-weight: 600; font-size: 14px;"><td style="padding: 2px 0;">TOTAL</td><td style="padding: 2px 0; text-align: right;">${money(sale.total)}</td></tr>
      </table>
      <hr style="border: none; border-top: 1px dashed #999;" />
      <table style="width: 100%; border-collapse: collapse;">
        ${paymentsHtml}
        <tr><td style="padding: 2px 0;">Change</td><td style="padding: 2px 0; text-align: right;">${money(sale.change_due)}</td></tr>
      </table>
      <hr style="border: none; border-top: 1px dashed #999;" />
      <p style="text-align: center;">Thank you for your purchase!</p>
      <p style="text-align: center; color: #999; font-size: 10px;">Powered by Anknovate IT Services &middot; anknovate.com</p>
    </div>
  `;

  return sendEmail({ to: sale.customer.email, subject: `Your receipt from ${businessName} (${sale.receipt_number})`, html });
}

module.exports = { isConfigured, sendEmail, sendPasswordResetEmail, sendWelcomeEmail, sendCustomerEmail, sendReceiptEmail };
