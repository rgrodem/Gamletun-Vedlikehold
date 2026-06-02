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
    console.error('Auth exchange failed:', exchangeError?.message);
    return NextResponse.redirect(`${origin}/login?error=expired`);
  }

  const email = data.user.email?.toLowerCase() ?? '';

  // Tilgang: alle med @gamletun.no + en eksplisitt unntaksliste (eier o.l.) fra env.
  const allowedDomain = '@gamletun.no';
  const extraAllowed = (process.env.AUTH_ALLOW_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const hasAccess = email.endsWith(allowedDomain) || extraAllowed.includes(email);

  if (!hasAccess) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=unauthorized`);
  }

  // Opprett profil ved første innlogging. Ikke overskriv eksisterende rolle
  // (ellers degraderes en evt. admin til 'user' ved hver innlogging).
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!existing) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? email,
      role: 'user',
    });
    if (profileError) {
      console.error('Profile creation failed:', profileError.message);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
