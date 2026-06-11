// E-postsending via Resend. KUN for server-side bruk (API-ruter) —
// nøkkelen må aldri nå klienten.

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Sender e-post via Resend sitt REST-API. Returnerer true/false i stedet for
 * å kaste, slik at varsling aldri velter hovedflyten (f.eks. feilmelding).
 *
 * Miljøvariabler:
 *  - RESEND_API_KEY  (påkrevd)
 *  - EMAIL_FROM      (valgfri, f.eks. 'Gamletun <varsel@gamletun.no>'.
 *                     Uten verifisert domene: bruk 'onboarding@resend.dev')
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY er ikke satt – e-post ble ikke sendt:', subject);
    return false;
  }

  const from = process.env.EMAIL_FROM || 'Gamletun <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Resend-feil (${response.status}):`, body);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Kunne ikke sende e-post:', error);
    return false;
  }
}
