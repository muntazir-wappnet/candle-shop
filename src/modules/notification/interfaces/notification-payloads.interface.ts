import { NotificationEvent } from '../enums/notification-event.enum';
import type { NewLoginEmailData } from '../templates/email/new-login.template';

export interface NotificationPayloads {
    [NotificationEvent.REGISTRATION_OTP]: { otp: string };
    [NotificationEvent.RESEND_OTP]: { otp: string };
    [NotificationEvent.FORGOT_PASSWORD_OTP]: { otp: string };
    [NotificationEvent.PASSWORD_CHANGED]: void; // No dynamic data needed
    [NotificationEvent.PASSWORD_RESET]: void;   // No dynamic data needed
    
    // Login alert data
    [NotificationEvent.NEW_LOGIN]: NewLoginEmailData;

    // Seller Application flows
    [NotificationEvent.SELLER_APPLICATION_SUBMITTED]: { storeName: string; applicantName: string | null };
    [NotificationEvent.SELLER_APPROVED]: { storeName: string; applicantName: string | null };
    [NotificationEvent.SELLER_REJECTED]: { storeName: string; applicantName: string | null; rejectionReason: string };
}
