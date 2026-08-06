import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth/userAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, waNumber } = body;

    const user = await registerUser(email, password, name, waNumber);
    return NextResponse.json({
      success: true,
      message: 'Pendaftaran berhasil! Silakan login untuk melanjutkan.',
      user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Pendaftaran gagal.' },
      { status: 400 }
    );
  }
}
