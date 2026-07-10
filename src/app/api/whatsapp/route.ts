import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { phone, message, mediaUrl } = await req.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER; // Usually in format 'whatsapp:+14155238886'

    if (!accountSid || !authToken || !twilioNumber) {
      return NextResponse.json({ error: 'Twilio credentials are not configured in environment variables' }, { status: 500 });
    }

    // Format phone number to WhatsApp format if not already
    const toPhone = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone.startsWith('+') ? phone : '+' + phone}`;
    const fromPhone = twilioNumber.startsWith('whatsapp:') ? twilioNumber : `whatsapp:${twilioNumber}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    // Create form data (Twilio API uses x-www-form-urlencoded)
    const formData = new URLSearchParams();
    formData.append('To', toPhone);
    formData.append('From', fromPhone);
    formData.append('Body', message);
    if (mediaUrl) {
      formData.append('MediaUrl', mediaUrl);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twilio] Error:', data);
      return NextResponse.json({ error: data.message || 'Failed to send WhatsApp message' }, { status: response.status });
    }

    return NextResponse.json({ success: true, messageId: data.sid });

  } catch (error: any) {
    console.error('WhatsApp Bot Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
