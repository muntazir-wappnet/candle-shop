export interface SellerRejectedEmailData {
  applicantName: string | null;
  storeName: string;
  rejectionReason: string;
}

export const getSellerRejectedEmailTemplate = (data: SellerRejectedEmailData) => {
  const subject = 'Update on Your Seller Application';
  const text =
    `Dear ${data.applicantName ?? 'there'}, your seller application for "${data.storeName}" ` +
    `was not approved at this time. Reason: ${data.rejectionReason}. ` +
    `You may address the concerns and resubmit your application.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application Update</title>
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
              <p style="margin:8px 0 0;color:#f5e6d8;font-size:14px;">Seller Application Update</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#4a3728;font-size:18px;font-weight:600;">Application Not Approved</p>
              <p style="margin:0 0 24px;color:#4a3728;font-size:16px;line-height:1.6;">
                Dear ${data.applicantName ?? 'there'},<br/><br/>
                Thank you for your interest in becoming a seller on Candle Shop.
                After reviewing your application for <strong>${data.storeName}</strong>,
                we are unable to approve it at this time.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fff8f5;border-left:4px solid #c8956c;border-radius:4px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="color:#7a6a5e;font-size:13px;font-weight:600;margin-bottom:8px;">Reason for Rejection</td>
                </tr>
                <tr>
                  <td style="color:#4a3728;font-size:15px;line-height:1.6;padding-top:8px;">${data.rejectionReason}</td>
                </tr>
              </table>
              <p style="margin:0;color:#7a6a5e;font-size:14px;line-height:1.6;">
                You are welcome to address the concerns mentioned above and resubmit your application.
                If you have questions, please contact our support team.
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
