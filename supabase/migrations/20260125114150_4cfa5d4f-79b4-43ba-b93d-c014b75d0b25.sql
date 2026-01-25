-- Create a function to generate a secure random token
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a 32-character random token using gen_random_uuid
    token := encode(gen_random_bytes(24), 'base64');
    -- Replace URL-unsafe characters
    token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
    -- Take first 32 characters
    token := substring(token FROM 1 FOR 32);
    
    SELECT EXISTS(SELECT 1 FROM public.tables WHERE qr_token = token) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN token;
END;
$$;

-- Create trigger function to auto-set qr_token on insert
CREATE OR REPLACE FUNCTION public.set_table_qr_token()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qr_token IS NULL OR NEW.qr_token = '' THEN
    NEW.qr_token := public.generate_qr_token();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_table_qr_token_trigger ON public.tables;
CREATE TRIGGER set_table_qr_token_trigger
  BEFORE INSERT ON public.tables
  FOR EACH ROW
  EXECUTE FUNCTION public.set_table_qr_token();