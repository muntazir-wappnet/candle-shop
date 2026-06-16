// ─── Login Info Shape ─────────────────────────────────────────────────────────

export interface NewLoginEmailData {
  deviceName: string | null;
  deviceType: string;
  ipAddress: string | null;
  time: string; // pre-formatted ISO or locale string
}

// ─── Template ─────────────────────────────────────────────────────────────────

export const getNewLoginEmailTemplate = (data: NewLoginEmailData) => {
  const subject = 'New Login to Your Candle Shop Account';

  const deviceLabel = data.deviceName ?? 'Unknown Device';
  const deviceTypeLabel =
    data.deviceType.charAt(0).toUpperCase() + data.deviceType.slice(1).toLowerCase();
  const ipLabel = data.ipAddress ?? 'Unknown';

  const text =
    `A new login was detected on your Candle Shop account.\n\n` +
    `Device: ${deviceLabel} (${deviceTypeLabel})\n` +
    `IP Address: ${ipLabel}\n` +
    `Time: ${data.time}\n\n` +
    `If this was you, no action is needed. ` +
    `If you do not recognize this login, please change your password immediately and contact support.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Login Detected</title>
</head>
<body style="margin:0;padding:0;background-color:#f9f5f0;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f5f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center"
              style="background:linear-gradient(135deg,#c8956c 0%,#8b5e3c 100%);padding:36px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">
                🕯️ Candle Shop
              </h1>
              <p style="margin:8px 0 0;color:#f5e6d8;font-size:14px;">
                New Login Detected
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#4a3728;font-size:16px;line-height:1.6;">
                Hello,
              </p>
              <p style="margin:0 0 24px;color:#4a3728;font-size:16px;line-height:1.6;">
                We noticed a <strong>new login</strong> to your Candle Shop account. Here are the details:
              </p>

              <!-- Device Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background-color:#fdfaf7;border:1px solid #e8dec9;border-radius:10px;
                       margin-bottom:28px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #ede8e3;">
                    <span style="font-size:12px;font-weight:700;color:#8b5e3c;
                                 text-transform:uppercase;letter-spacing:0.5px;">
                      Login Details
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr style="margin-bottom:12px;">
                        <td style="padding:6px 0;width:140px;">
                          <span style="font-size:13px;color:#a89890;font-weight:600;">🖥️ Device</span>
                        </td>
                        <td style="padding:6px 0;">
                          <span style="font-size:14px;color:#4a3728;font-weight:500;">
                            ${deviceLabel}
                          </span>
                          <span style="font-size:12px;color:#a89890;margin-left:6px;">
                            (${deviceTypeLabel})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;width:140px;">
                          <span style="font-size:13px;color:#a89890;font-weight:600;">🌐 IP Address</span>
                        </td>
                        <td style="padding:6px 0;">
                          <span style="font-size:14px;color:#4a3728;font-weight:500;">
                            ${ipLabel}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;width:140px;">
                          <span style="font-size:13px;color:#a89890;font-weight:600;">🕐 Time</span>
                        </td>
                        <td style="padding:6px 0;">
                          <span style="font-size:14px;color:#4a3728;font-weight:500;">
                            ${data.time}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Was this you? -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="background-color:#fff8f0;border-left:4px solid #c8956c;
                              border-radius:4px;padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#8b5e3c;">
                      ✅ If this was you
                    </p>
                    <p style="margin:0;font-size:13px;color:#7a6a5e;line-height:1.5;">
                      No action is needed. You can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#fff5f5;border-left:4px solid #c0392b;
                              border-radius:4px;padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#c0392b;">
                      ⚠️ If you don't recognize this login
                    </p>
                    <p style="margin:0;font-size:13px;color:#7a6a5e;line-height:1.5;">
                      Your account may be compromised. Please change your password immediately and contact our support team.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
              style="background-color:#f9f5f0;padding:24px 40px;border-top:1px solid #ede8e3;">
              <p style="margin:0;color:#a89890;font-size:12px;">
                © ${new Date().getFullYear()} Candle Shop. All rights reserved.
              </p>
              <p style="margin:6px 0 0;color:#a89890;font-size:11px;">
                This is an automated security notification. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, text, html };
};
