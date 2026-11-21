import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const recentEmailsLog = [];
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (config.email.host && config.email.user) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const mailTransporter = getTransporter();
  const mailOptions = {
    from: config.email.from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>?/gm, ''),
  };

  const logEntry = {
    id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    to,
    subject,
    sentAt: new Date().toISOString(),
    preview: (text || html.replace(/<[^>]*>?/gm, '')).slice(0, 180),
  };

  if (!mailTransporter) {
    console.log(`[email:mock] To: ${to} | Subject: "${subject}"`);
    logEntry.status = 'mock_delivered';
    recentEmailsLog.unshift(logEntry);
    if (recentEmailsLog.length > 50) recentEmailsLog.pop();
    return { success: true, mocked: true, messageId: logEntry.id };
  }

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    logEntry.status = 'delivered';
    logEntry.messageId = info.messageId;
    recentEmailsLog.unshift(logEntry);
    if (recentEmailsLog.length > 50) recentEmailsLog.pop();
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[email:error] Failed to send email to ${to}:`, error.message);
    logEntry.status = 'failed';
    logEntry.error = error.message;
    recentEmailsLog.unshift(logEntry);
    return { success: false, error: error.message };
  }
}

export function getRecentEmails() {
  return [...recentEmailsLog];
}

/* ─────────────────────────────────────────────────────────────
 * Heritage Email Layout Template
 * ───────────────────────────────────────────────────────────── */
function emailLayout({ title, preheader, content }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f7f4ed; font-family: 'Georgia', serif; color: #2a221b; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border: 1px solid #e5dcce; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: #1a1512; padding: 32px 24px; text-align: center; border-bottom: 2px solid #c89d56; }
    .brand-title { color: #f9f5ed; font-size: 24px; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 6px 0; font-weight: normal; }
    .brand-subtitle { color: #c89d56; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; margin: 0; }
    .body { padding: 36px 32px; line-height: 1.65; font-size: 15px; color: #3d332a; }
    .body h2 { color: #1a1512; font-size: 20px; font-weight: normal; margin-top: 0; border-bottom: 1px solid #ebdcc5; padding-bottom: 12px; }
    .detail-card { background: #faf8f5; border: 1px solid #ebdcc5; border-radius: 6px; padding: 20px; margin: 24px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e6dbcb; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; font-weight: bold; font-size: 16px; color: #1a1512; }
    .btn { display: inline-block; background: #c89d56; color: #1a1512 !important; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-weight: bold; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin: 20px 0; text-align: center; }
    .btn-whatsapp { background: #25D366; color: #ffffff !important; }
    .footer { background: #1a1512; color: #9c8e80; padding: 24px 32px; font-size: 12px; text-align: center; border-top: 1px solid #332822; }
    .footer a { color: #c89d56; text-decoration: none; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>
  <div class="wrapper">
    <div class="header">
      <h1 class="brand-title">Ancestral Abode</h1>
      <p class="brand-subtitle">A Boutique Homestay · Jaipur · Est. 1892</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0; color: #d5c8bb; font-weight: bold;">Ancestral Abode Homestay</p>
      <p style="margin: 0 0 8px 0;">34, Karnoth House, Ramganj Chopad, Jaipur, Rajasthan</p>
      <p style="margin: 0;">Phone: <a href="tel:+919660041516">(+91) 9660041516</a> &bull; Email: <a href="mailto:ancestralabodehomestay@gmail.com">ancestralabodehomestay@gmail.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────────
 * 1. Booking Confirmation Email (Guest)
 * ───────────────────────────────────────────────────────────── */
export async function sendBookingConfirmationEmail(booking) {
  const roomName = booking.room?.name || 'Heritage Suite';
  const amount = Number(booking.totalAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const content = `
    <h2>Booking Confirmed: We Look Forward to Welcoming You</h2>
    <p>Dear <strong>${escapeHtml(booking.guestName)}</strong>,</p>
    <p>We are delighted to confirm your reservation at Ancestral Abode. Your heritage chamber in our 1892 sanctuary is prepared for your stay.</p>
    
    <div class="detail-card">
      <div class="detail-row"><span>Booking Reference:</span> <strong>${booking.reference}</strong></div>
      <div class="detail-row"><span>Reserved Suite:</span> <strong>${escapeHtml(roomName)}</strong></div>
      <div class="detail-row"><span>Check-in:</span> <span>${booking.checkIn} (from 2:00 PM)</span></div>
      <div class="detail-row"><span>Check-out:</span> <span>${booking.checkOut} (until 11:00 AM)</span></div>
      <div class="detail-row"><span>Guests:</span> <span>${booking.guests} Guest(s)</span></div>
      <div class="detail-row"><span>Total Amount:</span> <span>${amount}</span></div>
    </div>

    <p><strong>Directions &amp; Arrival:</strong><br>
    Our haveli is located at <em>34, Karnoth House, Ramganj Chopad, Jaipur</em>. Upon your arrival at Ramganj Chopad, our team will receive you with traditional welcome refreshments in the central courtyard.</p>

    <p>If you require early check-in, private concierge transfers, or custom dietary requests, feel free to contact us directly:</p>

    <div style="text-align: center; margin: 24px 0;">
      <a class="btn btn-whatsapp" href="https://wa.me/919660041516?text=${encodeURIComponent(`Hello! My confirmed booking reference is ${booking.reference}. I am inquiring about arrival details.`)}">
        Message Host on WhatsApp
      </a>
    </div>

    <p style="font-size: 13px; color: #76695e;">Warm regards,<br>The Family &amp; Team at Ancestral Abode</p>
  `;

  return sendEmail({
    to: booking.guestEmail,
    subject: `Booking Confirmed: ${roomName} [Ref: ${booking.reference}] — Ancestral Abode, Jaipur`,
    html: emailLayout({
      title: `Booking Confirmed - ${booking.reference}`,
      preheader: `Your reservation at Ancestral Abode, Jaipur is confirmed for ${booking.checkIn}.`,
      content,
    }),
  });
}

/* ─────────────────────────────────────────────────────────────
 * 2. Send Payment Details & Hold Link Template (Guest)
 * ───────────────────────────────────────────────────────────── */
export async function sendPaymentDetailsEmail(booking, { paymentLink, customNotes } = {}) {
  const roomName = booking.room?.name || 'Heritage Suite';
  const amount = Number(booking.totalAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const content = `
    <h2>Payment Instructions for Reservation: ${booking.reference}</h2>
    <p>Dear <strong>${escapeHtml(booking.guestName)}</strong>,</p>
    <p>Thank you for choosing Ancestral Abode. We have placed a hold on <strong>${escapeHtml(roomName)}</strong> for your requested dates (<em>${booking.checkIn} to ${booking.checkOut}</em>).</p>

    ${customNotes ? `<div style="background:#eef6f0;border-left:4px solid #2d5a3f;padding:12px 16px;margin:16px 0;font-size:14px;color:#1c402b;">${escapeHtml(customNotes)}</div>` : ''}

    <div class="detail-card">
      <div class="detail-row"><span>Booking Reference:</span> <strong>${booking.reference}</strong></div>
      <div class="detail-row"><span>Suite:</span> <strong>${escapeHtml(roomName)}</strong></div>
      <div class="detail-row"><span>Dates:</span> <span>${booking.checkIn} — ${booking.checkOut}</span></div>
      <div class="detail-row"><span>Total Payable:</span> <span>${amount}</span></div>
    </div>

    <h3 style="color:#1a1512;font-size:16px;margin:20px 0 8px;">Direct UPI &amp; Bank Transfer Details:</h3>
    <div style="background:#f4efe6;border:1px solid #dfd3c1;border-radius:4px;padding:14px;font-size:14px;line-height:1.7;">
      &bull; <strong>UPI ID:</strong> <code>9660041516@upi</code><br>
      &bull; <strong>PhonePe / Google Pay / Paytm:</strong> <code>(+91) 9660041516</code><br>
      &bull; <strong>Account Name:</strong> Ancestral Abode Homestay<br>
      &bull; <strong>Bank:</strong> HDFC Bank, Ramganj Chopad Branch, Jaipur<br>
      &bull; <strong>Reference:</strong> Please mention <code>${booking.reference}</code> in the transfer remarks.
    </div>

    ${paymentLink ? `
      <div style="text-align: center; margin: 24px 0;">
        <a class="btn" href="${paymentLink}">Click to Pay Online</a>
      </div>
    ` : ''}

    <p style="margin-top:20px;">After making the payment, kindly share a screenshot or UTR number with us via WhatsApp to receive your instant confirmation voucher:</p>

    <div style="text-align: center; margin: 16px 0;">
      <a class="btn btn-whatsapp" href="https://wa.me/919660041516?text=${encodeURIComponent(`Hello Ancestral Abode, I have sent payment for booking reference ${booking.reference}. Here is my confirmation screenshot.`)}">
        Send Payment Screenshot via WhatsApp
      </a>
    </div>

    <p style="font-size: 13px; color: #76695e;">Warm regards,<br>Ancestral Abode Homestay Concierge</p>
  `;

  return sendEmail({
    to: booking.guestEmail,
    subject: `Payment Details for Reservation: ${booking.reference} — Ancestral Abode Jaipur`,
    html: emailLayout({
      title: `Payment Details - ${booking.reference}`,
      preheader: `Payment details & instructions for your stay in ${roomName}.`,
      content,
    }),
  });
}

/* ─────────────────────────────────────────────────────────────
 * 3. Notification to Admin for New Booking
 * ───────────────────────────────────────────────────────────── */
export async function sendAdminNewBookingNotification(booking) {
  const roomName = booking.room?.name || 'Heritage Suite';
  const amount = Number(booking.totalAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const content = `
    <h2>New Reservation Received</h2>
    <p>A new guest reservation has been placed on the website:</p>

    <div class="detail-card">
      <div class="detail-row"><span>Booking Reference:</span> <strong>${booking.reference}</strong></div>
      <div class="detail-row"><span>Suite:</span> <strong>${escapeHtml(roomName)}</strong></div>
      <div class="detail-row"><span>Guest Name:</span> <span>${escapeHtml(booking.guestName)}</span></div>
      <div class="detail-row"><span>Phone:</span> <span><a href="tel:${booking.guestPhone}">${booking.guestPhone}</a></span></div>
      <div class="detail-row"><span>Email:</span> <span><a href="mailto:${booking.guestEmail}">${booking.guestEmail}</a></span></div>
      <div class="detail-row"><span>Check-in:</span> <span>${booking.checkIn}</span></div>
      <div class="detail-row"><span>Check-out:</span> <span>${booking.checkOut} (${booking.totalNights || 1} nights)</span></div>
      <div class="detail-row"><span>Guests:</span> <span>${booking.guests}</span></div>
      <div class="detail-row"><span>Total Amount:</span> <span>${amount}</span></div>
    </div>

    ${booking.specialRequests ? `<p><strong>Special Requests:</strong> ${escapeHtml(booking.specialRequests)}</p>` : ''}

    <p>You can manage this reservation, send payment details, or confirm it in the <a href="/admin">Ancestral Abode Admin Portal</a>.</p>
  `;

  return sendEmail({
    to: config.email.adminEmail,
    subject: `[New Booking] ${booking.reference} - ${booking.guestName} (${roomName})`,
    html: emailLayout({
      title: `New Booking ${booking.reference}`,
      preheader: `New booking from ${booking.guestName} for ${roomName}.`,
      content,
    }),
  });
}

/* ─────────────────────────────────────────────────────────────
 * 4. Notification to Admin for New User Request / Enquiry
 * ───────────────────────────────────────────────────────────── */
export async function sendAdminNewEnquiryNotification(enquiry) {
  const content = `
    <h2>New Website Inquiry Received</h2>
    <div class="detail-card">
      <div class="detail-row"><span>Guest Name:</span> <strong>${escapeHtml(enquiry.name || enquiry.guestName || '')}</strong></div>
      <div class="detail-row"><span>Phone:</span> <span><a href="tel:${enquiry.phone || enquiry.guestPhone || ''}">${enquiry.phone || enquiry.guestPhone || 'Not provided'}</a></span></div>
      <div class="detail-row"><span>Email:</span> <span><a href="mailto:${enquiry.email || enquiry.guestEmail || ''}">${enquiry.email || enquiry.guestEmail || 'Not provided'}</a></span></div>
      ${enquiry.subject ? `<div class="detail-row"><span>Subject:</span> <span>${escapeHtml(enquiry.subject)}</span></div>` : ''}
      ${enquiry.serviceType ? `<div class="detail-row"><span>Service Type:</span> <span>${escapeHtml(enquiry.serviceType)}</span></div>` : ''}
      ${enquiry.requestedDate ? `<div class="detail-row"><span>Requested Date:</span> <span>${enquiry.requestedDate}</span></div>` : ''}
    </div>

    <p><strong>Message / Notes:</strong></p>
    <div style="background:#faf8f5;border:1px solid #ebdcc5;padding:12px;border-radius:4px;font-style:italic;">
      ${escapeHtml(enquiry.message || enquiry.notes || 'No message content.')}
    </div>

    <p>You can view and reply to this inquiry directly in the <a href="/admin">Admin Panel</a>.</p>
  `;

  return sendEmail({
    to: config.email.adminEmail,
    subject: `[New Website Inquiry] from ${enquiry.name || enquiry.guestName || 'Guest'}`,
    html: emailLayout({
      title: 'New Website Inquiry',
      preheader: `New inquiry from ${enquiry.name || enquiry.guestName}`,
      content,
    }),
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
