import { OTP_EXPIRY_MINUTES } from '../../constants/notification.constants';

export const getResendOtpEmailTemplate = (otp: string) => {
  const subject = 'Your Candle Shop Verification Code (Resent)';
  const text = `You requested a new verification code. Use the code below to complete your verification. Code: ${otp}. This code is valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Verification Code</title>
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
                Verification Code (Resent)
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
                You requested a new verification code.
                Use the new verification code below to complete your verification.
                This code is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:#f9f5f0;border:2px dashed #c8956c;
                                border-radius:12px;padding:20px 48px;">
                      <span style="font-size:40px;font-weight:700;letter-spacing:12px;
                                   color:#8b5e3c;font-family:monospace;">
                        ${otp}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#7a6a5e;font-size:14px;line-height:1.6;">
                ⚠️ <strong>Do not share this code with anyone.</strong>
                Our team will never ask for your OTP.
              </p>
              <p style="margin:0;color:#7a6a5e;font-size:14px;line-height:1.6;">
                If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
              style="background-color:#f9f5f0;padding:24px 40px;border-top:1px solid #ede8e3;">
              <p style="margin:0;color:#a89890;font-size:12px;">
                © ${new Date().getFullYear()} Candle Shop. All rights reserved.
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
