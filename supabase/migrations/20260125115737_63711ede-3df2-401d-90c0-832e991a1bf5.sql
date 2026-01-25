-- Fix QR token generation: ensure pgcrypto functions resolve (installed in schema "extensions")
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions, pg_catalog
AS $$
DECLARE
  token TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
    token := substring(token FROM 1 FOR 32);

    SELECT EXISTS(
      SELECT 1 FROM public.tables WHERE qr_token = token
    ) INTO exists_check;

    EXIT WHEN NOT exists_check;
  END LOOP;

  RETURN token;
END;
$$;

-- Ensure trigger exists so qr_token is set on insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'set_table_qr_token_before_insert'
      AND n.nspname = 'public'
      AND c.relname = 'tables'
  ) THEN
    CREATE TRIGGER set_table_qr_token_before_insert
    BEFORE INSERT ON public.tables
    FOR EACH ROW
    EXECUTE FUNCTION public.set_table_qr_token();
  END IF;
END;
$$;