export interface SellerApplicationSubmittedEmailData {
  applicantName: string | null;
  storeName: string;
}

export const getSellerApplicationSubmittedEmailTemplate = (
  data: SellerApplicationSubmittedEmailData,
) => {
  const subject = '🛍️ New Seller Application Received';
  const text =
    `A new seller application has been submitted. ` +
    `Store: "${data.storeName}". Applicant: ${data.applicantName ?? 'Unknown'}. ` +
    `Please review it in the admin panel.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Seller Application</title>
</head>
<body style="margin:0;padding:0;background-color:#f9f5f0;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f5f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#c8956c 0%,#8b5e3c 100%);padding:36px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">🕯️ Candle Shop</h1>
              <p style="margin:8px 0 0;color:#f5e6d8;font-size:14px;">Admin Notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#4a3728;font-size:18px;font-weight:600;">New Seller Application</p>
              <p style="margin:0 0 24px;color:#4a3728;font-size:16px;line-height:1.6;">
                A new seller application is awaiting your review.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9f5f0;border-radius:8px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 0;color:#7a6a5e;font-size:14px;width:40%;">Store Name</td>
                  <td style="padding:8px 0;color:#4a3728;font-size:14px;font-weight:600;">${data.storeName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#7a6a5e;font-size:14px;">Applicant</td>
                  <td style="padding:8px 0;color:#4a3728;font-size:14px;">${data.applicantName ?? 'Unknown'}</td>
                </tr>
              </table>
              <p style="margin:0;color:#7a6a5e;font-size:14px;">
                Please log in to the admin panel to review and take action on this application.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#f9f5f0;padding:24px 40px;border-top:1px solid #ede8e3;">
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
</html>`.trim();

  return { subject, text, html };
};
