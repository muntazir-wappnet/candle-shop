export interface INotificationChannel {
  /**
   * Send a generic notification.
   */
  send(
    recipient: string,
    content: any,
  ): Promise<void>;
}
