import { NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth/userAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const result = await loginUser(email, password);
    return NextResponse.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Login gagal.' },
      { status: 400 }
    );
  }
}
