/**
 * Canonical identifiers for each delivery channel.
 * Used as a per-call allowlist in NotificationService.sendOtp()
 * to restrict which channels fire for a specific operation.
 *
 * The global env-var toggles (OTP_EMAIL_ENABLED / OTP_SMS_ENABLED) act as
 * master on/off switches. The channels array is an additional, narrower filter
 * applied at the call-site.
 *
 * Example:
 *   // OTP delivery — SMS only (blocks temp-email abuse)
 *   notificationService.sendOtp(email, phone, otp, [NotificationChannel.SMS])
 *
 *   // Password reset — both channels required
 *   notificationService.sendOtp(email, phone, otp, [NotificationChannel.EMAIL, NotificationChannel.SMS])
 *
 *   // No restriction — respect global toggles only
 *   notificationService.sendOtp(email, phone, otp)
 */
export enum NotificationChannel {
    EMAIL = 'email',
    SMS = 'sms',
}

export const OTP_EMAIL_SUBJECT = 'Your Candle Shop Verification Code';

export const OTP_EXPIRY_MINUTES = 3;
