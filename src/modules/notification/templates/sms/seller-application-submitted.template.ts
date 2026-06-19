export const getSellerApplicationSubmittedSmsTemplate = (data: {
  storeName: string;
  applicantName: string | null;
}): string =>
  `[Candle Shop] New seller application received for store "${data.storeName}" ` +
  `from ${data.applicantName ?? 'Unknown'}. Please review in the admin panel.`;
