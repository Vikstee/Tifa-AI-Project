import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { targetNumber, message, fileUrl, fileName } = await req.json();

    if (!targetNumber) {
      return NextResponse.json({ error: 'Nomor tujuan wajib diisi' }, { status: 400 });
    }

    const WA_TOKEN = process.env.WA_ACCESS_TOKEN;
    const WA_PHONE_ID = process.env.WA_PHONE_NUMBER_ID;

    if (!WA_TOKEN || !WA_PHONE_ID) {
      return NextResponse.json({ error: 'WhatsApp API belum dikonfigurasi di server' }, { status: 500 });
    }

    // Pastikan nomor diawali dengan kode negara tanpa +
    let formattedNumber = targetNumber.replace(/\D/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '62' + formattedNumber.substring(1);
    }

    // 1. Send the file if exists
    if (fileUrl) {
      const documentPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedNumber,
        type: 'document',
        document: {
          link: fileUrl,
          caption: message || 'Berikut adalah dokumen laporan Anda.',
          filename: fileName || 'Laporan_TIFA.pdf'
        }
      };

      const docRes = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentPayload)
      });

      const docData = await docRes.json();
      if (!docRes.ok) {
        throw new Error(docData.error?.message || 'Gagal mengirim dokumen');
      }
      
      return NextResponse.json({ success: true, message: 'Pesan dan dokumen berhasil dikirim!' });
    }

    // 2. Send text only if no file
    if (message) {
      const textPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedNumber,
        type: 'text',
        text: { body: message }
      };

      const textRes = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textPayload)
      });

      const textData = await textRes.json();
      if (!textRes.ok) {
        throw new Error(textData.error?.message || 'Gagal mengirim pesan');
      }

      return NextResponse.json({ success: true, message: 'Pesan berhasil dikirim!' });
    }

    return NextResponse.json({ error: 'Tidak ada pesan atau dokumen yang dikirim' }, { status: 400 });

  } catch (error: any) {
    console.error('WhatsApp API Error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
