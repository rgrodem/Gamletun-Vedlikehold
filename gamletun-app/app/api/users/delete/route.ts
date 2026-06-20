// Slett en bruker (kun admin). Fjerner Auth-brukeren; profiles, reservasjoner
// og push-abonnement forsvinner via ON DELETE CASCADE. Andre referanser (f.eks.
// work_orders.created_by) settes til NULL.
//
// Unntak: maintenance_logs.performed_by er NOT NULL med ON DELETE SET NULL, så
// en sletting ville feilet hvis brukeren har registrert vedlikehold. Vi flytter
// derfor den historikken til admin-en som utfører slettingen, slik at loggene
// bevares og slettingen går gjennom.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  // 1) Bare innlogget admin kan slette.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
  }
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (me?.role !== 'admin') {
    return NextResponse.json({ error: 'Krever administrator' }, { status: 403 });
  }

  // 2) Les og valider input.
  let body: { id?: string } = {};
  try { body = await request.json(); } catch { /* tomt body håndteres under */ }
  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Mangler bruker-id' }, { status: 400 });
  }
  if (id === user.id) {
    return NextResponse.json({ error: 'Du kan ikke slette deg selv' }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Service-nøkkel mangler (SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 });
  }

  // 3) Bevar vedlikeholdshistorikk: flytt logger fra brukeren til admin-en.
  const { error: reassignError } = await admin
    .from('maintenance_logs')
    .update({ performed_by: user.id })
    .eq('performed_by', id);
  if (reassignError) {
    console.error('Kunne ikke flytte vedlikeholdslogger:', reassignError.message);
    return NextResponse.json({ error: 'Kunne ikke slette bruker (vedlikeholdslogger)' }, { status: 500 });
  }

  // 4) Slett Auth-brukeren. CASCADE rydder profil, reservasjoner og push-abonnement.
  const { error: deleteError } = await admin.auth.admin.deleteUser(id);
  if (deleteError) {
    console.error('Sletting feilet:', deleteError.message);
    return NextResponse.json({ error: 'Kunne ikke slette bruker' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
