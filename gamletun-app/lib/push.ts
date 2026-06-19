// Server-side web-push (VAPID). KUN server-side.
//
// Miljøvariabler (generer med: npx web-push generate-vapid-keys):
//  - VAPID_PUBLIC_KEY
//  - VAPID_PRIVATE_KEY
//  - VAPID_SUBJECT  (f.eks. "mailto:post@gamletun.no")
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:post@gamletun.no';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface PushSubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Sender et payload til en liste abonnementer og rydder bort utløpte (404/410).
 * Feiler aldri "høyt". Returnerer antall vellykkede.
 */
async function deliver(
  admin: ReturnType<typeof createAdminClient>,
  subs: PushSubRow[],
  payload: PushPayload
): Promise<number> {
  const body = JSON.stringify(payload);
  let sent = 0;
  const expired: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expired.push(sub.id);
        } else {
          console.error('Push-sending feilet:', err);
        }
      }
    })
  );

  if (expired.length) {
    await admin.from('push_subscriptions').delete().in('id', expired);
  }
  return sent;
}

/**
 * Send et push-varsel til alle abonnementer (lite team).
 * Rydder bort abonnementer som er utløpt (404/410). Feiler aldri "høyt".
 */
export async function sendPushToAll(payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) {
    console.warn('VAPID-nøkler mangler – push ikke sendt:', payload.title);
    return 0;
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return 0;
  }

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');
  if (error || !subs?.length) return 0;

  return deliver(admin, subs as PushSubRow[], payload);
}

/**
 * Send et push-varsel kun til administratorer (abonnementer som tilhører en
 * profil med role = 'admin'). Brukes til reservasjons- og alvorlige feilvarsler.
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) {
    console.warn('VAPID-nøkler mangler – push ikke sendt:', payload.title);
    return 0;
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return 0;
  }

  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
  const adminIds = (admins || []).map((a) => a.id as string);
  if (!adminIds.length) return 0;

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', adminIds);
  if (error || !subs?.length) return 0;

  return deliver(admin, subs as PushSubRow[], payload);
}
