import { OTP_EXPIRY_MINUTES } from '../../constants/notification.constants';

export const getRegistrationOtpSmsTemplate = (otp: string): string => {
  return `Welcome to Candle Shop! Your registration verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Please do not share this code.`;
};
