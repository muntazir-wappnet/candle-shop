// ─── Login Info Shape ─────────────────────────────────────────────────────────

export interface NewLoginSmsData {
  deviceName: string | null;
  ipAddress: string | null;
  time: string;
}

// ─── Template ─────────────────────────────────────────────────────────────────

/**
 * SMS template for new login notification.
 *
 * NOTE: This template is ready but the SMS channel is intentionally NOT
 * enabled for new login alerts. To enable it, pass NotificationChannel.SMS
 * in the sendLoginNotification() call inside NotificationService.
 *
 * Kept concise to fit within a single SMS segment (160 chars).
 */
export const getNewLoginSmsTemplate = (data: NewLoginSmsData): string => {
  const device = data.deviceName ?? 'Unknown Device';
  const ip = data.ipAddress ?? 'Unknown IP';
  return (
    `Candle Shop: New login detected on your account.\n` +
    `Device: ${device} | IP: ${ip} | Time: ${data.time}.\n` +
    `Not you? Change your password immediately.`
  );
};
