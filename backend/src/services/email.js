import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendReminderEmail({ to, name, totalDebt, surplus, goalDate }) {
  const goalStr = goalDate
    ? new Date(goalDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'your goal date';

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #4f46e5;">Hi ${name} 👋</h2>
      <p>This is your regular reminder to log your income and expenses in your Budget Tracker.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Total Debt Remaining</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ef4444;">
            ₱${Number(totalDebt).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">This Month's Surplus</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #22c55e;">
            ₱${Number(surplus).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Goal Date</td>
          <td style="padding: 8px 0; text-align: right;">${goalStr}</td>
        </tr>
      </table>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <p style="color: #6b7280; font-size: 14px;">Keep it up — every payment counts. Open your Budget Tracker to log this week's activity.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: '📊 Budget Tracker — Time to log your finances',
    html,
  });
}
