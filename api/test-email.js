import { Resend } from 'resend';

// Temporary test endpoint — delete after confirming email looks right
export default async function handler(req, res) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.APP_URL || 'https://sunnystories.co';
  const magicLink = `${appUrl}/app?token=test-token-preview`;
  const childNames = 'Addie';
  const previewTitles = [
    { emoji: '🦘', title: 'The Morning the Kangaroo Remembered' },
    { emoji: '🌊', title: 'What the Tide Carried In' },
    { emoji: '🌿', title: 'The Secret at Gardners Falls' },
  ].map(s => `<li style="margin:6px 0;color:#4a6070;">${s.emoji} ${s.title}</li>`).join('');

  const { data, error } = await resend.emails.send({
    from: 'Sunny Stories <stories@sunnystories.co>',
    to: 'jeff@hextalent.com.au',
    subject: `✨ ${childNames}'s Sunny Stories collection is ready`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f5fbfd;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5fbfd">
<tr><td align="center" style="padding:40px 16px;">

  <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;">

    <tr>
      <td bgcolor="#306ca4" align="center" style="padding:36px 40px;">
        <div style="font-size:36px;line-height:1;margin-bottom:10px;">☀️</div>
        <div style="color:#ffffff;font-size:26px;font-weight:700;letter-spacing:1px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Sunny Stories</div>
        <div style="color:#c8e6f5;font-size:14px;margin-top:6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Personalised stories for Sunshine Coast families</div>
      </td>
    </tr>

    <tr>
      <td style="padding:36px 40px;">
        <h1 style="margin:0 0 12px;font-size:24px;color:#1a2e3a;font-weight:700;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Your stories are ready! 🎉</h1>
        <p style="margin:0 0 24px;color:#4a6070;font-size:16px;line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          We've written 10 original stories starring <strong style="color:#306ca4;">${childNames}</strong>,
          set in your favourite Sunshine Coast spots. Click the button below to read them any time.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td bgcolor="#f0f8fc" style="border-radius:12px;padding:16px 20px;margin-bottom:24px;">
              <div style="font-size:11px;font-weight:700;color:#38a2c2;letter-spacing:1px;margin-bottom:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">A PEEK AT YOUR COLLECTION</div>
              <ul style="margin:0;padding:0 0 0 18px;color:#4a6070;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.8;">
                ${previewTitles}
                <li style="margin:4px 0;">…and 7 more stories</li>
              </ul>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#38a2c2" style="border-radius:50px;padding:16px 40px;">
                    <a href="${magicLink}" style="color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;display:block;white-space:nowrap;">✨ Open my stories</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin:0;font-size:13px;color:#4a6070;line-height:1.7;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          This link opens your full collection instantly — no password needed.<br>
          <strong>Save this email</strong> so you can come back to read them any time.
        </p>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:20px 40px 28px;border-top:1px solid #eef6fa;">
        <p style="margin:0;font-size:12px;color:#4a6070;line-height:1.8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          Sunny Stories · Sunshine Coast, QLD<br>
          <a href="https://sunnystories.co" style="color:#38a2c2;text-decoration:none;">sunnystories.co</a>
          &nbsp;·&nbsp;
          <a href="https://www.instagram.com/sunnystoriesco/" style="color:#38a2c2;text-decoration:none;">@sunnystoriesco</a>
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`,
  });

  if (error) return res.status(500).json({ error });
  res.json({ ok: true, id: data?.id });
}
