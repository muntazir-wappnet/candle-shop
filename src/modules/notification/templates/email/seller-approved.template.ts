export interface SellerApprovedEmailData {
  applicantName: string | null;
  storeName: string;
}

export const getSellerApprovedEmailTemplate = (data: SellerApprovedEmailData) => {
  const subject = '🎉 Your Seller Application Has Been Approved!';
  const text =
    `Congratulations ${data.applicantName ?? 'there'}! ` +
    `Your seller application for "${data.storeName}" has been approved. ` +
    `You can now access your Seller Dashboard and start listing products.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application Approved</title>
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
              <p style="margin:8px 0 0;color:#f5e6d8;font-size:14px;">Seller Onboarding</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;color:#2e7d32;font-size:32px;text-align:center;">🎉</p>
              <p style="margin:0 0 16px;color:#4a3728;font-size:18px;font-weight:600;text-align:center;">
                Application Approved!
              </p>
              <p style="margin:0 0 24px;color:#4a3728;font-size:16px;line-height:1.6;">
                Dear ${data.applicantName ?? 'there'},<br/><br/>
                Congratulations! Your seller application for <strong>${data.storeName}</strong>
                has been <strong style="color:#2e7d32;">approved</strong>. You now have access
                to your Seller Dashboard where you can start listing your products and reaching
                customers across India.
              </p>
              <p style="margin:0;color:#7a6a5e;font-size:14px;line-height:1.6;">
                Welcome to the Candle Shop seller community. We're excited to have you on board!
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
