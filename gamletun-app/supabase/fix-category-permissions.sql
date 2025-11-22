-- Fix category permissions: Allow all authenticated users to manage categories
-- This is appropriate for a private farm maintenance system

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Only admins can modify categories" ON public.categories;

-- Create new policies for authenticated users
CREATE POLICY "Authenticated users can create categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (true);
