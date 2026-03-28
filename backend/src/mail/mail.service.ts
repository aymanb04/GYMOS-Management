import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
    private readonly apiKey = process.env.RESEND_API_KEY!;
    private readonly from = 'GymOS <noreply@gymos.io>';

    private async send(to: string, subject: string, html: string, gymName?: string) {
        const from = gymName ? `${gymName} <noreply@gymos.io>` : this.from;

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from, to, subject, html }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('Resend error:', err);
        }
    }

    // Notificatie: lid is van wachtlijst af en heeft een spot
    async sendWaitlistPromotion(params: {
        to: string;
        memberName: string;
        gymName: string;
        lessonTitle: string;
        lessonTime: string;
        date: string;
    }) {
        const { to, memberName, gymName, lessonTitle, lessonTime, date } = params;

        const formattedDate = new Date(date).toLocaleDateString('nl-BE', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:28px 40px;">
              <p style="margin:0;font-family:'Barlow Condensed',Arial,sans-serif;font-weight:900;font-size:20px;letter-spacing:0.15em;text-transform:uppercase;color:#CAFF00;">
                ${gymName}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#888;">Goed nieuws</p>
              <h1 style="margin:0 0 24px;font-size:32px;font-weight:800;color:#111;line-height:1.2;">
                Je hebt een spot! 🎉
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#444;line-height:1.6;">
                Hallo ${memberName},<br><br>
                Je stond op de wachtlijst voor <strong>${lessonTitle}</strong> en er is een plaats vrijgekomen. Je bent automatisch ingeboekt!
              </p>

              <!-- Booking details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:28px;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;">
                    <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Les</span><br>
                    <span style="font-size:16px;font-weight:700;color:#111;">${lessonTitle}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;">
                    <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Datum</span><br>
                    <span style="font-size:16px;font-weight:700;color:#111;">${formattedDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Tijdstip</span><br>
                    <span style="font-size:16px;font-weight:700;color:#111;">${lessonTime}</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#888;">
                Kan je toch niet komen? Annuleer je boeking in het member portal zodat anderen ook de kans krijgen.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">
                ${gymName} · Powered by GymOS
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        await this.send(to, `✅ Je bent ingeboekt voor ${lessonTitle} — ${formattedDate}`, html, gymName);
    }
}