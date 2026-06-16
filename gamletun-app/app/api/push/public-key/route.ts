// Eksponerer VAPID public key til klienten for push-abonnement.
import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Push er ikke konfigurert' }, { status: 503 });
  }
  return NextResponse.json({ key });
}
