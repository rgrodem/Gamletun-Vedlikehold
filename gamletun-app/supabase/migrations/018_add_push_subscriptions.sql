-- Web-push-abonnementer (PWA-varsler). Hver enhet/nettleser lagrer sitt
-- push-endepunkt + nøkler. Sending skjer server-side med VAPID.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Brukere administrerer kun sine egne abonnementer. Server-side sending bruker
-- service-rollen og omgår RLS.
CREATE POLICY "Users manage own push subscriptions (select)"
  ON public.push_subscriptions FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users manage own push subscriptions (insert)"
  ON public.push_subscriptions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own push subscriptions (delete)"
  ON public.push_subscriptions FOR DELETE
  TO authenticated USING (user_id = auth.uid());

COMMENT ON TABLE public.push_subscriptions IS 'Web-push-abonnementer per bruker/enhet (VAPID)';
