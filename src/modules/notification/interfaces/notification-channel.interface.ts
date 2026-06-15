export interface INotificationChannel {
    sendOtp(recipient: string, otp: string): Promise<void>;
}
