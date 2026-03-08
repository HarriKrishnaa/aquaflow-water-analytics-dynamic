import { NextRequest, NextResponse } from 'next/server';

interface EmailRequest {
  flatId: string;
  nightFlow: number;
  ownerEmail?: string;
  leakType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { flatId, nightFlow, ownerEmail, leakType } = (await request.json()) as EmailRequest;

    // Prepare email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff4444;">🚨 Water Leak Alert - AquaFlow AI</h2>
        <p>Dear Flat Owner,</p>
        <p style="font-size: 16px; color: #333;">A potential water leak has been detected in your apartment.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Flat ID:</strong> ${flatId}</p>
          <p><strong>Night Flow (2-4 AM):</strong> ${nightFlow} Liters</p>
          <p><strong>Alert Type:</strong> ${leakType || 'Abnormal Usage'}</p>
          <p><strong>Threshold:</strong> 50 Liters (Normal)</p>
        </div>
        
        <p style="color: #666;">This exceeds the normal nighttime water usage. Please:</p>
        <ul style="color: #666;">
          <li>Check for running taps or leaking fixtures</li>
          <li>Inspect bathroom and kitchen pipes</li>
          <li>Contact maintenance if needed</li>
          <li>Log into your dashboard for detailed metrics</li>
        </ul>
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
          Best regards,<br>
          <strong>AquaFlow AI System</strong><br>
          Real-Time Water Analytics & Leak Detection
        </p>
      </div>
    `;

    const recipientEmail = ownerEmail || 'admin@aquaflow.local';

    // Check if SendGrid API key is available
    const sendgridApiKey = process.env.SENDGRID_API_KEY;

    if (sendgridApiKey) {
      // Use SendGrid for actual email sending
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: recipientEmail }],
                subject: `🚨 Water Leak Alert - Flat ${flatId}`
              }
            ],
            from: { email: 'alerts@aquaflow.io', name: 'AquaFlow Alerts' },
            content: [
              {
                type: 'text/html',
                value: htmlContent
              }
            ],
            reply_to: { email: 'support@aquaflow.io' }
          })
        });

        if (response.ok) {
          console.log(`✅ Email sent via SendGrid for Flat ${flatId}`);
          return NextResponse.json({
            success: true,
            message: `Email alert sent successfully to ${recipientEmail}`,
            provider: 'SendGrid'
          });
        } else {
          const error = await response.text();
          console.error('SendGrid error:', error);
          throw new Error('SendGrid API error');
        }
      } catch (sendgridError) {
        console.error('SendGrid sending failed:', sendgridError);
        // Fall back to mock if SendGrid fails
        console.log(`⚠️ Falling back to mock email for Flat ${flatId}`);
      }
    }

    // Fallback: Mock email sending (for development/testing)
    const emailData = {
      to: recipientEmail,
      subject: `🚨 Water Leak Alert - Flat ${flatId}`,
      flatId,
      nightFlow,
      htmlContent,
      timestamp: new Date().toISOString()
    };

    console.log(`📧 Mock Email Log for Flat ${flatId}:`, emailData);

    return NextResponse.json({
      success: true,
      message: `Email alert processed for Flat ${flatId}`,
      provider: 'MockEmail',
      details: emailData
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
