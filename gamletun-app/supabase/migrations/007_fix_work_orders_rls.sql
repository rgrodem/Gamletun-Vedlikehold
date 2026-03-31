-- Migration: Fix RLS SELECT policies to require authentication
-- Prevents anonymous (unauthenticated) users from reading work order data

DROP POLICY IF EXISTS "Anyone can view work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Anyone can view work order comments" ON public.work_order_comments;

CREATE POLICY "Authenticated users can view work orders"
  ON public.work_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view work order comments"
  ON public.work_order_comments FOR SELECT
  TO authenticated
  USING (tr