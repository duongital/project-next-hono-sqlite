import { Resend } from 'resend';

export interface SendOTPEmailParams {
  to: string;
  otpCode: string;
  resendApiKey: string;
}

/**
 * Send OTP email using Resend service
 * @param params - Email parameters including recipient, OTP code, and API key
 * @returns Promise resolving to the email ID if successful
 * @throws Error if email sending fails
 */
export async function sendOTPEmail({
  to,
  otpCode,
  resendApiKey,
}: SendOTPEmailParams): Promise<string> {
  const resend = new Resend(resendApiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: 'OTP Verification <noreply@duongital.com>', // Change this to your verified domain
      to: [to],
      subject: `Your OTP Code is ${otpCode}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin: 20px 0;">
              <h1 style="color: #2c3e50; margin-top: 0; font-size: 24px;">Your Verification Code</h1>
              <p style="font-size: 16px; color: #555; margin-bottom: 30px;">
                Use the following code to complete your verification. This code will expire in 10 minutes.
              </p>
              <div style="background-color: #fff; border: 2px solid #e0e0e0; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0;">
                <p style="margin: 0; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
                <p style="margin: 15px 0; font-size: 36px; font-weight: bold; color: #2c3e50; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otpCode}
                </p>
              </div>
              <p style="font-size: 14px; color: #888; margin-top: 30px;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </div>
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
              This is an automated message, please do not reply.
            </p>
          </body>
        </html>
      `,
    });

    if (error) {
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }

    if (!data) {
      throw new Error('No response data from Resend');
    }

    return data.id;
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Resend API error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while sending OTP email');
  }
}
