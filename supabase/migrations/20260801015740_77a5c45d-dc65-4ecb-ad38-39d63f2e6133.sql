
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS security_notice text NOT NULL DEFAULT 'For your security, ONLY make payments to the official EARNX-FINANCE bank account displayed on this page. Never send money to any individual claiming to represent EARNX-FINANCE through WhatsApp, Telegram, Facebook, Instagram, X (Twitter), email, SMS, phone calls, or any other third party. EARNX-FINANCE will NEVER ask you to pay into a personal account or any account different from the official payment account displayed on this page. Always verify the Account Name and Account Number before making payment. After payment, upload your receipt ONLY through this page. EARNX-FINANCE is NOT responsible for payments made to unofficial accounts, scammers, agents, or third parties.',
  ADD COLUMN IF NOT EXISTS anti_scam_reminder text NOT NULL DEFAULT 'Stay Safe: Never trust payment instructions received from individuals or unofficial social media accounts. Always use the payment details displayed on this page.',
  ADD COLUMN IF NOT EXISTS support_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_hours text NOT NULL DEFAULT 'Monday – Saturday, 9:00 AM – 8:00 PM (WAT)';

CREATE OR REPLACE FUNCTION public.is_official_admin_email(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(_email, '')) IN (
    'gojoakaza76@gmail.com',
    'meshachezekiel946@gmail.com',
    'meshachsopuru300@gmail.com',
    'meshachogbonna0@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  em text;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT email INTO em FROM auth.users WHERE id = uid;
  IF NOT public.is_official_admin_email(em) THEN
    RETURN public.has_role(uid, 'admin');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.ensure_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_admin_role() TO authenticated;

-- grant admin at signup for the official emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_username text;
  final_username text;
  code text;
  n int := 0;
  inviter uuid;
BEGIN
  base_username := lower(regexp_replace(
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    '[^a-z0-9_]', '', 'g'));
  IF base_username = '' THEN base_username := 'earner'; END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = final_username) LOOP
    n := n + 1;
    final_username := base_username || n::text;
  END LOOP;

  LOOP
    code := 'EX' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;

  IF coalesce(NEW.raw_user_meta_data->>'referral_code', '') <> '' THEN
    SELECT id INTO inviter FROM public.profiles
      WHERE referral_code = upper(NEW.raw_user_meta_data->>'referral_code');
  END IF;

  INSERT INTO public.profiles (id, first_name, other_names, username, email, phone, country, state, referral_code, referred_by, battery)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'first_name', ''),
    coalesce(NEW.raw_user_meta_data->>'other_names', ''),
    final_username,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'phone', ''),
    coalesce(NEW.raw_user_meta_data->>'country', ''),
    coalesce(NEW.raw_user_meta_data->>'state', ''),
    code,
    inviter,
    (SELECT battery_capacity FROM public.levels WHERE level = 0)
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  IF public.is_official_admin_email(NEW.email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $function$;

-- backfill for already-registered official admins
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE public.is_official_admin_email(email)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.fraud_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scammer_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  telegram text NOT NULL DEFAULT '',
  social_link text NOT NULL DEFAULT '',
  screenshot_url text,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.fraud_reports TO authenticated;
GRANT ALL ON public.fraud_reports TO service_role;
ALTER TABLE public.fraud_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can file fraud reports" ON public.fraud_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own fraud reports" ON public.fraud_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER fraud_reports_updated_at BEFORE UPDATE ON public.fraud_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.admin_set_fraud_status(_report_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  UPDATE public.fraud_reports SET status = _status, updated_at = now() WHERE id = _report_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

REVOKE ALL ON FUNCTION public.admin_set_fraud_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_fraud_status(uuid, text) TO authenticated;
