-- Ensure authenticated users are not locked out by missing profile/role rows.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email, NEW.id::text),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'administrador') THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'administrador')
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'comercial')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, nome, email)
SELECT
  users.id,
  COALESCE(users.raw_user_meta_data->>'nome', users.email, users.id::text),
  users.email
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email;

WITH users_without_role AS (
  SELECT users.id, row_number() OVER (ORDER BY users.created_at, users.id) AS rn
  FROM auth.users AS users
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_roles AS roles
    WHERE roles.user_id = users.id
  )
)
INSERT INTO public.user_roles (user_id, role)
SELECT
  id,
  CASE
    WHEN rn = 1
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE role = 'administrador'
      )
    THEN 'administrador'::public.app_role
    ELSE 'comercial'::public.app_role
  END
FROM users_without_role
ON CONFLICT (user_id, role) DO NOTHING;
