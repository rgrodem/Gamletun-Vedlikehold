// Lagrer (eller oppdaterer) et web-push-abonnement for innlogget bruker.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });

  let sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    sub = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
  }

  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'Mangler abonnementsdata' }, { status: 400 });
  }

  // upsert på endpoint (unik) så samme enhet ikke dupliseres.
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: request.headers.get('user-agent') || null,
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('Kunne ikke lagre push-abonnement:', error);
    return NextResponse.json({ error: 'Kunne ikke lagre abonnement' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
