export const getSellerApprovedSmsTemplate = (data: {
  storeName: string;
}): string =>
  `[Candle Shop] Congratulations! Your seller application for "${data.storeName}" has been approved. ` +
  `Log in to access your Seller Dashboard.`;
