REVOKE ALL ON FUNCTION public.email_for_username(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.email_for_username(text) TO service_role;