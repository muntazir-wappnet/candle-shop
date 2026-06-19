export const getSellerRejectedSmsTemplate = (data: {
  storeName: string;
  rejectionReason: string;
}): string =>
  `[Candle Shop] Your seller application for "${data.storeName}" was not approved. ` +
  `Reason: ${data.rejectionReason}. You may resubmit after addressing the concerns.`;
