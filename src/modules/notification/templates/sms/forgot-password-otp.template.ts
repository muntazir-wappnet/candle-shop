import { OTP_EXPIRY_MINUTES } from '../../constants/notification.constants';

export const getForgotPasswordOtpSmsTemplate = (otp: string): string => {
  return `Your Candle Shop password reset code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
};
