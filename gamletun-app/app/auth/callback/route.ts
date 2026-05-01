import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const origin = requestUrl.origin;

  if (error) {
    const errorDescription = requestUrl.searchParams.get('error_description') ?? '';
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(`${origin}/login?error=oauth_cancelled`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`);
  }

  const email = data.user.email?.toLowerCase() ?? '';

  // Sjekk allowlist i Supabase-tabellen
  const { data: allowed } = await supabase
    .from('allowed_users')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=unauthorized`);
  }

  // Opprett eller oppdater profil
  await supabase.from('profiles').upsert(
    {
      id: data.user.id,
      full_name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? email,
      role: 'admin',
    },
    { onConflict: 'id', ignoreDuplicates: false }
  );

  return NextResponse.redirect(`${origin}/`);
}
