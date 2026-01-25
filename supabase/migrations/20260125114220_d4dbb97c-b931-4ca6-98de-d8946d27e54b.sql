-- Fix search_path for generate_qr_token
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
    token := substring(token FROM 1 FOR 32);
    
    SELECT EXISTS(SELECT 1 FROM public.tables WHERE qr_token = token) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN token;
END;
$$;

-- Fix search_path for set_table_qr_token
CREATE OR REPLACE FUNCTION public.set_table_qr_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.qr_token IS NULL OR NEW.qr_token = '' THEN
    NEW.qr_token := public.generate_qr_token();
  END IF;
  RETURN NEW;
END;
$$;