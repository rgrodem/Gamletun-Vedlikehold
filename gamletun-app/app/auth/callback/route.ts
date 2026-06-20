import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const otpType = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const error = requestUrl.searchParams.get('error');
  const origin = requestUrl.origin;

  if (error) {
    const errorDescription = requestUrl.searchParams.get('error_description') ?? '';
    console.error('Auth error:', error, errorDescription);
    return NextResponse.redirect(`${origin}/login?error=oauth_cancelled`);
  }

  if (!code && !tokenHash) {
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

  // Two supported magic-link formats:
  //  - token_hash + type  -> verifyOtp (robust: works even if the link is opened
  //    in a different browser/in-app webview than the one that requested it)
  //  - code               -> exchangeCodeForSession (PKCE; requires same browser)
  const { data, error: authError } = tokenHash
    ? await supabase.auth.verifyOtp({ type: otpType ?? 'email', token_hash: tokenHash })
    : await supabase.auth.exchangeCodeForSession(code!);

  if (authError || !data.user) {
    console.error('Auth verification failed:', authError?.message);
    return NextResponse.redirect(`${origin}/login?error=expired`);
  }

  const email = data.user.email?.toLowerCase() ?? '';

  // Inviterte brukere og passord-tilbakestilling er allerede legitime: tokenet
  // ble kun sendt til adressen en admin inviterte / som ba om reset. Da gjelder
  // ikke domenesperren (ellers ville eksterne pilotbrukere blitt avvist).
  const isPrivilegedFlow = otpType === 'invite' || otpType === 'recovery';

  // Ellers: tilgang for et tillatt domene + eksplisitt unntaksliste fra env.
  const allowedDomain = (process.env.AUTH_ALLOW_DOMAIN ?? '@gamletun.no').toLowerCase();
  const extraAllowed = (process.env.AUTH_ALLOW_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const hasAccess =
    isPrivilegedFlow || email.endsWith(allowedDomain) || extraAllowed.includes(email);

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

  // Send brukeren videre dit lenken ba om (f.eks. /sett-passord for invitasjon),
  // men kun interne stier for å unngå open redirect.
  const next = requestUrl.searchParams.get('next');
  const dest = next && next.startsWith('/') ? next : '/';
  return NextResponse.redirect(`${origin}${dest}`);
}
