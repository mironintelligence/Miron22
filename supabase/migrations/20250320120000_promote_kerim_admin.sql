-- Run in Supabase SQL Editor (or via CLI) against your project database.
-- App uses public.users for Miron accounts (see backend/stores/pg_users_store.py).

-- 1) Add role column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users ADD COLUMN role text DEFAULT 'user';
  END IF;
END $$;

-- 2) Promote Kerim Aydemir to admin
UPDATE public.users
SET role = 'admin'
WHERE lower(trim(email)) = lower(trim('cdtmiron@gmail.com'));

-- Optional: verify
-- SELECT id, email, role FROM public.users WHERE lower(email) = 'cdtmiron@gmail.com';
