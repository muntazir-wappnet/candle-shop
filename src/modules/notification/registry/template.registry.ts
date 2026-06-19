import { NotificationEvent } from '../enums/notification-event.enum';
import type { NotificationPayloads } from '../interfaces/notification-payloads.interface';

// Email templates
import { getRegistrationOtpEmailTemplate } from '../templates/email/registration-otp.template';
import { getResendOtpEmailTemplate } from '../templates/email/resend-otp.template';
import { getForgotPasswordOtpEmailTemplate } from '../templates/email/forgot-password-otp.template';
import { getPasswordChangedEmailTemplate } from '../templates/email/password-changed.template';
import { getPasswordResetEmailTemplate } from '../templates/email/password-reset.template';
import { getNewLoginEmailTemplate } from '../templates/email/new-login.template';
import { getSellerApplicationSubmittedEmailTemplate } from '../templates/email/seller-application-submitted.template';
import { getSellerApprovedEmailTemplate } from '../templates/email/seller-approved.template';
import { getSellerRejectedEmailTemplate } from '../templates/email/seller-rejected.template';

// SMS templates
import { getRegistrationOtpSmsTemplate } from '../templates/sms/registration-otp.template';
import { getResendOtpSmsTemplate } from '../templates/sms/resend-otp.template';
import { getForgotPasswordOtpSmsTemplate } from '../templates/sms/forgot-password-otp.template';
import { getPasswordChangedSmsTemplate } from '../templates/sms/password-changed.template';
import { getPasswordResetSmsTemplate } from '../templates/sms/password-reset.template';
import { getNewLoginSmsTemplate } from '../templates/sms/new-login.template';
import { getSellerApplicationSubmittedSmsTemplate } from '../templates/sms/seller-application-submitted.template';
import { getSellerApprovedSmsTemplate } from '../templates/sms/seller-approved.template';
import { getSellerRejectedSmsTemplate } from '../templates/sms/seller-rejected.template';

type EmailTemplateFn<T extends NotificationEvent> = (data: NotificationPayloads[T]) => { subject: string; html: string; text: string };
type SmsTemplateFn<T extends NotificationEvent> = (data: NotificationPayloads[T]) => string;

interface TemplateConfig<T extends NotificationEvent> {
    email?: EmailTemplateFn<T>;
    sms?: SmsTemplateFn<T>;
}

export const TEMPLATE_REGISTRY: { [K in NotificationEvent]: TemplateConfig<K> } = {
    [NotificationEvent.REGISTRATION_OTP]: {
        email: (data) => getRegistrationOtpEmailTemplate(data.otp),
        sms: (data) => getRegistrationOtpSmsTemplate(data.otp),
    },
    [NotificationEvent.RESEND_OTP]: {
        email: (data) => getResendOtpEmailTemplate(data.otp),
        sms: (data) => getResendOtpSmsTemplate(data.otp),
    },
    [NotificationEvent.FORGOT_PASSWORD_OTP]: {
        email: (data) => getForgotPasswordOtpEmailTemplate(data.otp),
        sms: (data) => getForgotPasswordOtpSmsTemplate(data.otp),
    },
    [NotificationEvent.PASSWORD_CHANGED]: {
        email: () => getPasswordChangedEmailTemplate(),
        sms: () => getPasswordChangedSmsTemplate(),
    },
    [NotificationEvent.PASSWORD_RESET]: {
        email: () => getPasswordResetEmailTemplate(),
        sms: () => getPasswordResetSmsTemplate(),
    },
    [NotificationEvent.NEW_LOGIN]: {
        email: (data) => getNewLoginEmailTemplate(data),
        sms: (data) => getNewLoginSmsTemplate(data), // Note: NewLoginEmailData has ipAddress and time, Sms expects same structure
    },
    [NotificationEvent.SELLER_APPLICATION_SUBMITTED]: {
        email: getSellerApplicationSubmittedEmailTemplate,
        sms: getSellerApplicationSubmittedSmsTemplate,
    },
    [NotificationEvent.SELLER_APPROVED]: {
        email: getSellerApprovedEmailTemplate,
        sms: getSellerApprovedSmsTemplate,
    },
    [NotificationEvent.SELLER_REJECTED]: {
        email: getSellerRejectedEmailTemplate,
        sms: getSellerRejectedSmsTemplate,
    },
};
