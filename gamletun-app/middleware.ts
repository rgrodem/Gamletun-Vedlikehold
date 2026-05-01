import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page, OAuth callback, public assets and PWA-files
  if (
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon-') ||
    pathname.startsWith('/logo') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getSession() instead of getUser() — reads from cookie locally,
  // no roundtrip to Supabase auth server. The actual user identity is
  // re-verified by getUser() inside server components / RLS that need it.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If not authenticated, redirect to login
  if (!session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // Lazy refresh: if the access token is within 5 minutes of expiry,
  // force a getUser() which will refresh the session via the auth server.
  // This keeps tokens fresh without paying the roundtrip on every request.
  const expiresAt = session.expires_at;
  if (expiresAt) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;
    if (expiresAt - nowSeconds < fiveMinutes) {
      await supabase.auth.getUser();
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
