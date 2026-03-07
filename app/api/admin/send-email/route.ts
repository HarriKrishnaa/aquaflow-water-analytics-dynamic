import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { flatId, nightFlow } = await request.json();

    // In AWS Learners Lab environment, we'll simulate email sending
    // In production, this would use AWS SES
    console.log(`Sending email alert for Flat ${flatId} with night flow ${nightFlow}L`);

    // Simulate email sending
    const emailData = {
      to: 'harrikrishnaa@gmail.com',
      subject: `🚨 Water Leak Alert - Flat ${flatId}`,
      body: `
        Alert: Potential water leak detected!
        
        Flat ID: ${flatId}
        Night Flow (2-4 AM): ${nightFlow} Liters
        Threshold: 50 Liters
        
        This exceeds the normal nighttime water usage.
        Please check for possible leaks or running fixtures.
        
        Best regards,
        AquaFlow AI System
      `
    };

    // Log the email details (in production, this would send via AWS SES)
    console.log('Email details:', emailData);

    return NextResponse.json({
      success: true,
      message: `Email alert sent successfully for Flat ${flatId}`,
      emailSent: emailData
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send email' },
      { status: 500 }
    );
  }
}
