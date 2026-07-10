import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { phone, message, mediaUrl } = await req.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    const fonnteToken = process.env.FONNTE_TOKEN;

    if (!fonnteToken) {
      return NextResponse.json({ error: 'Fonnte token is not configured in environment variables' }, { status: 500 });
    }

    // Format phone number to standard format
    let processedPhone = phone.trim();
    if (processedPhone.startsWith('0')) {
      processedPhone = '62' + processedPhone.substring(1);
    } else if (processedPhone.startsWith('+')) {
      processedPhone = processedPhone.substring(1);
    }
    // Remove non-numeric characters just in case, but keep basic numbers
    processedPhone = processedPhone.replace(/[^0-9]/g, '');

    const url = 'https://api.fonnte.com/send';
    
    // Create form data
    const formData = new URLSearchParams();
    formData.append('target', processedPhone);
    formData.append('message', message);
    if (mediaUrl) {
      formData.append('url', mediaUrl);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': fonnteToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('[Fonnte] Error:', data);
      return NextResponse.json({ error: data.reason || 'Failed to send WhatsApp message' }, { status: response.status === 200 ? 400 : response.status });
    }

    return NextResponse.json({ success: true, messageId: data.id || 'sent' });

  } catch (error: any) {
    console.error('WhatsApp Bot Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
