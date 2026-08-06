import { NextResponse } from 'next/server';
import { updateUserProfile } from '@/lib/auth/userAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, name, waNumber, avatarUrl, llmModel, password } = body;

    const result = await updateUserProfile(userId, { name, waNumber, avatarUrl, llmModel, password });
    return NextResponse.json({ success: true, message: 'Profil berhasil diperbarui.', result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui profil.' },
      { status: 400 }
    );
  }
}
