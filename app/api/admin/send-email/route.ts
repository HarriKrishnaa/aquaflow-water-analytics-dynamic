import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface EmailRequest {
  flatId: string;
  nightflow: number;
  ownerEmail: string;
  leakType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { flatId, nightflow, ownerEmail, leakType } = (await request.json()) as EmailRequest;

    // Validate environment variables
    const emailUser = process.env.GMAIL_EMAIL;
    const emailPass = process.env.GMAIL_APP_PASSWORD;
    const defaultAlertEmail = process.env.DEFAULT_ALERT_EMAIL || 'harrikrishnaa@gmail.com';

    if (!emailUser || !emailPass) {
      console.error('Gmail credentials not configured in environment variables');
      return NextResponse.json(
        { ok: false, error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Create Gmail SMTP transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Email content
    const subject = `🚨 CRITICAL: Water Leak Detected - Flat ${flatId}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; color: white; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🚨 WATER LEAK ALERT</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">IMMEDIATE ACTION REQUIRED</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-bottom: 5px solid #ff6b6b;">
          <h2 style="color: #ff6b6b; margin-top: 0;">Critical Alert for Flat: ${flatId}</h2>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            A <strong>WATER LEAK</strong> has been detected in your apartment <strong>${flatId}</strong>.
          </p>
          <div style="background: white; border-left: 4px solid #ff6b6b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p><strong>⚠️ Detection Details:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Night Flow Rate:</strong> ${nightflow}L (abnormally high)</li>
              <li><strong>Leak Type:</strong> ${leakType || 'High night-time consumption'}</li>
              <li><strong>Detected At:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</li>
              <li><strong>Status:</strong> <span style="color: #ff6b6b; font-weight: bold;">ACTIVE</span></li>
            </ul>
          </div>
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚡ Immediate Actions Required:</strong></p>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Check your water pipes and fixtures immediately</li>
              <li>Look for signs of water leakage in bathrooms, kitchen, and under sinks</li>
              <li>Turn off the main water valve if leak is found</li>
              <li>Contact a plumber immediately</li>
              <li>Notify building management: support@aquaflow.io</li>
            </ol>
          </div>
          <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
            <strong>💡 Tip:</strong> Monitor your consumption through the AquaFlow dashboard for real-time updates.
          </p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;">
            This is an automated alert from <strong>AquaFlow AI Water Analytics</strong>.
          </p>
          <p style="margin: 5px 0 0 0;">
            For support, contact: <strong>support@aquaflow.io</strong>
          </p>
        </div>
      </div>
    `;

    // Send email to the provided owner email
    const mailOptions = {
      from: `"AquaFlow Alerts" <${emailUser}>`,
      to: ownerEmail || defaultAlertEmail,
      subject: subject,
      html: htmlContent,
    };

    console.log(`Sending email to ${ownerEmail || defaultAlertEmail} for flat ${flatId}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);

    // Also send to building manager
    const managerMailOptions = {
      from: `"AquaFlow Alerts" <${emailUser}>`,
      to: defaultAlertEmail,
      subject: `[ADMIN] Water Leak Alert - Flat ${flatId}`,
      html: htmlContent,
    };

    await transporter.sendMail(managerMailOptions);
    console.log('Admin email sent successfully');

    return NextResponse.json(
      {
        ok: true,
        message: `Email alert sent for leak in flat ${flatId}`,
        recipient: ownerEmail || defaultAlertEmail,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Email sending failed:', errorMessage);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to send email alert',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
