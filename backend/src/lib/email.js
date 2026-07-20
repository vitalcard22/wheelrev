// Sends order notification emails via Resend.
// If RESEND_API_KEY isn't set, this quietly does nothing — order submission
// still succeeds, it just won't send emails. This mirrors the same
// fail-gracefully pattern used for the database connection.

let resendClient = null;
if (process.env.RESEND_API_KEY) {
  try {
    const { Resend } = require('resend');
    resendClient = new Resend(process.env.RESEND_API_KEY);
  } catch (err) {
    console.warn('WheelRev backend: resend package not available —', err.message);
  }
} else {
  console.warn('WheelRev backend: RESEND_API_KEY not set — order emails are disabled.');
}

const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const DEALER_EMAIL = process.env.DEALER_EMAIL; // where new-reservation alerts go

function fmtPrice(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

async function sendOrderEmails({ items, name, email, phone, financing, message }) {
  if (!resendClient) return { sent: false, reason: 'not-configured' };

  const total = items.reduce((sum, i) => sum + Number(i.price || 0), 0);
  const itemsHtml = items
    .map(i => `<tr><td style="padding:6px 0;">${i.brand} ${i.model}</td><td style="padding:6px 0; text-align:right;">${fmtPrice(i.price)}</td></tr>`)
    .join('');

  const results = { sent: true, customerEmailError: null, dealerEmailError: null };

  // Confirmation to the customer
  try {
    const { error } = await resendClient.emails.send({
      from: FROM,
      to: email,
      subject: 'We received your WheelRev reservation request',
      html: `
        <div style="font-family:sans-serif; max-width:520px; margin:0 auto;">
          <h2>Thanks, ${name}.</h2>
          <p>We've received your reservation request. No payment has been taken — someone from our team will reach out shortly to complete the details.</p>
          <table style="width:100%; border-collapse:collapse; margin:20px 0;">
            ${itemsHtml}
            <tr><td style="padding-top:10px; font-weight:bold;">Total</td><td style="padding-top:10px; text-align:right; font-weight:bold;">${fmtPrice(total)}</td></tr>
          </table>
          ${financing ? `<p><b>Financing preference:</b> ${financing}</p>` : ''}
          ${message ? `<p><b>Your message:</b> ${message}</p>` : ''}
          <p style="color:#888; font-size:12px;">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });
    if (error) { results.customerEmailError = error.message; results.sent = false; }
  } catch (err) {
    results.customerEmailError = err.message;
    results.sent = false;
  }

  // Alert to the dealer, only if a dealer email is configured
  if (DEALER_EMAIL) {
    try {
      const { error } = await resendClient.emails.send({
        from: FROM,
        to: DEALER_EMAIL,
        subject: `New reservation request — ${name}`,
        html: `
          <div style="font-family:sans-serif; max-width:520px; margin:0 auto;">
            <h2>New reservation request</h2>
            <p><b>${name}</b> — ${email}${phone ? ' — ' + phone : ''}</p>
            <table style="width:100%; border-collapse:collapse; margin:20px 0;">
              ${itemsHtml}
              <tr><td style="padding-top:10px; font-weight:bold;">Total</td><td style="padding-top:10px; text-align:right; font-weight:bold;">${fmtPrice(total)}</td></tr>
            </table>
            ${financing ? `<p><b>Financing preference:</b> ${financing}</p>` : ''}
            ${message ? `<p><b>Message:</b> ${message}</p>` : ''}
            <p>Check the admin panel for full details and to update the status.</p>
          </div>
        `,
      });
      if (error) {
        results.dealerEmailError = error.message;
        if (results.customerEmailError) results.sent = false;
      }
    } catch (err) {
      results.dealerEmailError = err.message;
      if (results.customerEmailError) results.sent = false;
    }
  }

  return results;
}

module.exports = { sendOrderEmails };
