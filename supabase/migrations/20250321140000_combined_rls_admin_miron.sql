-- Birleşik: admin rolü + RLS + miron JWT uyumu (idempotent mümkün olduğunca)
-- Supabase SQL Editor veya: psql $DATABASE_URL -f bu dosya

-- ========== 1) Kullanıcı rolü ==========
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users ADD COLUMN role text DEFAULT 'user';
  END IF;
END $$;

UPDATE public.users
SET role = 'admin'
WHERE lower(trim(email)) = lower(trim('cdtmiron@gmail.com'));

-- ========== 2) RLS etkin + önceki politikalar ==========
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contract_templates ENABLE ROW LEVEL SECURITY;

-- ========== 3) Birleşik kimlik: Supabase auth.uid() VEYA özel JWT sub ==========
CREATE OR REPLACE FUNCTION public.miron_effective_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.uid(),
    NULLIF(trim(current_setting('request.jwt.claim.sub', true)), '')::uuid
  );
$$;

-- ========== 4) Politikalar ==========
DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own
ON notifications FOR SELECT
USING (user_id = public.miron_effective_user_id());

DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own
ON notifications FOR UPDATE
USING (user_id = public.miron_effective_user_id())
WITH CHECK (user_id = public.miron_effective_user_id());

DROP POLICY IF EXISTS user_contracts_select_own ON user_contracts;
CREATE POLICY user_contracts_select_own
ON user_contracts FOR SELECT
USING (user_id = public.miron_effective_user_id());

DROP POLICY IF EXISTS user_contracts_insert_own ON user_contracts;
CREATE POLICY user_contracts_insert_own
ON user_contracts FOR INSERT
WITH CHECK (user_id = public.miron_effective_user_id());

DROP POLICY IF EXISTS user_contracts_update_own ON user_contracts;
CREATE POLICY user_contracts_update_own
ON user_contracts FOR UPDATE
USING (user_id = public.miron_effective_user_id())
WITH CHECK (user_id = public.miron_effective_user_id());

DROP POLICY IF EXISTS user_contracts_delete_own ON user_contracts;
CREATE POLICY user_contracts_delete_own
ON user_contracts FOR DELETE
USING (user_id = public.miron_effective_user_id());

DROP POLICY IF EXISTS contract_templates_select_authed ON contract_templates;
CREATE POLICY contract_templates_select_authed
ON contract_templates FOR SELECT
USING (public.miron_effective_user_id() IS NOT NULL);
