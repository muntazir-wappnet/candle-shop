import { OTP_EXPIRY_MINUTES } from '../../constants/notification.constants';

export const getResendOtpSmsTemplate = (otp: string): string => {
  return `Here is your new Candle Shop verification code: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
};
