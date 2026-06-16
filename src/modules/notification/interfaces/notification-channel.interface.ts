import { OtpTemplateType } from '../enums/otp-template-type.enum';

export interface INotificationChannel {
  sendOtp(
    recipient: string,
    otp: string,
    templateType: OtpTemplateType,
  ): Promise<void>;
}
