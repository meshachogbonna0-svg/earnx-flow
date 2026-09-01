-- ============================================================
-- EarnX-Finance :: core schema
-- ============================================================

-- ---------- roles ----------
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- shared updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- levels ----------
CREATE TABLE public.levels (
  level int PRIMARY KEY,
  name text NOT NULL,
  upgrade_price numeric(14,2) NOT NULL DEFAULT 0,
  reward_per_tap numeric(14,2) NOT NULL DEFAULT 15,
  battery_capacity int NOT NULL DEFAULT 100,
  daily_tap_limit int NOT NULL DEFAULT 100,
  recharge_minutes int NOT NULL DEFAULT 240,
  daily_earnings_limit numeric(14,2) NOT NULL DEFAULT 1500,
  unlimited_battery boolean NOT NULL DEFAULT false,
  benefits text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.levels TO anon, authenticated;
GRANT ALL ON public.levels TO service_role;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "levels are public" ON public.levels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage levels" ON public.levels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER levels_updated_at BEFORE UPDATE ON public.levels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.levels (level, name, upgrade_price, reward_per_tap, battery_capacity, daily_tap_limit, recharge_minutes, daily_earnings_limit, benefits) VALUES
  (0, 'Starter',  0,        15,  60,  60,  360, 900,   ARRAY['Tap-to-Earn access','Daily tasks','Referral rewards']),
  (1, 'Bronze',   13500.00, 35,  120, 120, 300, 4200,  ARRAY['Withdrawals unlocked','Higher reward per tap','Faster recharge']),
  (2, 'Premier',  17500.00, 55,  160, 160, 260, 8800,  ARRAY['Priority withdrawals','Bigger battery','Bonus daily tasks']),
  (3, 'Silver',   21500.00, 80,  200, 200, 220, 16000, ARRAY['Premium task pool','Higher daily cap','Faster recharge']),
  (4, 'Gold',     25500.00, 110, 240, 240, 180, 26400, ARRAY['Gold task pool','Referral boost','Priority support']),
  (5, 'Platinum', 29500.00, 145, 300, 300, 150, 43500, ARRAY['Platinum rewards','Extended daily cap','VIP support']),
  (6, 'Diamond',  33500.00, 185, 360, 360, 120, 66600, ARRAY['Diamond rewards','Fastest recharge','Dedicated manager']),
  (7, 'Infinite', 37500.00, 240, 500, 500, 90,  120000, ARRAY['Unlimited battery','Highest reward per tap','Top payout priority']);

UPDATE public.levels SET unlimited_battery = true WHERE level = 7;

-- ---------- platform settings (single row) ----------
CREATE TABLE public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  logo_url text,
  activation_required boolean NOT NULL DEFAULT true,
  withdrawal_requires_activation boolean NOT NULL DEFAULT true,
  upgrade_requires_activation boolean NOT NULL DEFAULT true,
  activation_fee numeric(14,2) NOT NULL DEFAULT 10999,
  activation_instructions text NOT NULL DEFAULT 'Transfer the activation fee to the account below, then upload your proof of payment. Approval usually takes less than 24 hours.',
  activation_auto_approve boolean NOT NULL DEFAULT false,
  bank_name text NOT NULL DEFAULT 'Access Bank',
  account_name text NOT NULL DEFAULT 'EarnX-Finance Limited',
  account_number text NOT NULL DEFAULT '0000000000',
  welcome_bonus numeric(14,2) NOT NULL DEFAULT 1500,
  referral_reward numeric(14,2) NOT NULL DEFAULT 500,
  default_reward_per_tap numeric(14,2) NOT NULL DEFAULT 15,
  min_withdrawal numeric(14,2) NOT NULL DEFAULT 5000,
  max_withdrawal numeric(14,2) NOT NULL DEFAULT 500000,
  withdrawals_enabled boolean NOT NULL DEFAULT true,
  withdrawal_processing_time text NOT NULL DEFAULT 'Within 24 hours',
  withdrawal_instructions text NOT NULL DEFAULT 'Withdrawals are reviewed and paid to your bank account within 24 hours.',
  supported_banks text[] NOT NULL DEFAULT ARRAY['Access Bank','Zenith Bank','GTBank','First Bank','UBA','Opay','Kuda','Moniepoint','PalmPay','Fidelity Bank','Union Bank','Sterling Bank','Wema Bank','Stanbic IBTC','Polaris Bank','FCMB','Ecobank','Keystone Bank'],
  support_email text NOT NULL DEFAULT 'support@earnx-finance.com',
  whatsapp_number text NOT NULL DEFAULT '+2348000000000',
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  announcement text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings are public" ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage settings" ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER platform_settings_updated_at BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.platform_settings (id) VALUES (true);

-- ---------- profiles ----------
CREATE TYPE public.activation_status AS ENUM ('not_activated','pending','activated','rejected');
CREATE TYPE public.account_status AS ENUM ('active','suspended','banned');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  other_names text NOT NULL DEFAULT '',
  username text NOT NULL UNIQUE,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  avatar_url text,
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  balance numeric(14,2) NOT NULL DEFAULT 0,
  total_earned numeric(14,2) NOT NULL DEFAULT 0,
  pending_balance numeric(14,2) NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 0 REFERENCES public.levels(level),
  activation public.activation_status NOT NULL DEFAULT 'not_activated',
  account_status public.account_status NOT NULL DEFAULT 'active',
  welcome_bonus_claimed boolean NOT NULL DEFAULT false,
  survey_completed boolean NOT NULL DEFAULT false,
  survey_skipped boolean NOT NULL DEFAULT false,
  battery int NOT NULL DEFAULT 60,
  battery_updated_at timestamptz NOT NULL DEFAULT now(),
  taps_today int NOT NULL DEFAULT 0,
  earned_today numeric(14,2) NOT NULL DEFAULT 0,
  total_taps bigint NOT NULL DEFAULT 0,
  tap_day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  withdrawal_pin_hash text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_referral_code_idx ON public.profiles (referral_code);
CREATE INDEX profiles_referred_by_idx ON public.profiles (referred_by);
CREATE INDEX profiles_username_idx ON public.profiles (lower(username));
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- users may edit only their own non-financial fields
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.balance := OLD.balance;
  NEW.total_earned := OLD.total_earned;
  NEW.pending_balance := OLD.pending_balance;
  NEW.level := OLD.level;
  NEW.activation := OLD.activation;
  NEW.account_status := OLD.account_status;
  NEW.welcome_bonus_claimed := OLD.welcome_bonus_claimed;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by := OLD.referred_by;
  NEW.battery := OLD.battery;
  NEW.taps_today := OLD.taps_today;
  NEW.earned_today := OLD.earned_today;
  NEW.total_taps := OLD.total_taps;
  NEW.email := OLD.email;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_guard BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------- auto-create profile on signup ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- welcome surveys ----------
CREATE TABLE public.welcome_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  age text NOT NULL,
  country text NOT NULL,
  state text NOT NULL,
  postal_code text,
  employment_status text NOT NULL,
  income_range text NOT NULL,
  heard_from text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.welcome_surveys TO authenticated;
GRANT ALL ON public.welcome_surveys TO service_role;
ALTER TABLE public.welcome_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own survey" ON public.welcome_surveys FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "insert own survey" ON public.welcome_surveys FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ---------- transactions ----------
CREATE TYPE public.transaction_type AS ENUM
  ('tap','task','referral','welcome_bonus','promotion','upgrade','activation','withdrawal','admin_adjustment','loyalty');
CREATE TYPE public.transaction_status AS ENUM ('pending','completed','failed','reversed');

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount numeric(14,2) NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'completed',
  description text NOT NULL DEFAULT '',
  reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_user_created_idx ON public.transactions (user_id, created_at DESC);
CREATE INDEX transactions_type_idx ON public.transactions (type);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage transactions" ON public.transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- notifications ----------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own notifications" ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "admins manage notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- tasks ----------
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  reward numeric(14,2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'daily',
  action_url text,
  duration_seconds int NOT NULL DEFAULT 0,
  min_level int NOT NULL DEFAULT 0,
  requires_activation boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active tasks are public" ON public.tasks FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "admins manage tasks" ON public.tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.tasks (title, description, reward, category, duration_seconds, sort_order) VALUES
  ('Daily Login', 'Open EarnX-Finance today and claim your daily login reward.', 100, 'daily', 0, 1),
  ('Watch a Sponsored Video', 'Watch the featured sponsor video all the way through.', 150, 'daily', 30, 2),
  ('Complete a Quick Survey', 'Answer a short partner survey about your spending habits.', 250, 'daily', 45, 3),
  ('Read a Sponsored Article', 'Read the featured partner article and claim your reward.', 120, 'daily', 30, 4),
  ('Visit Promotions', 'Check the promotions page for this week''s active campaigns.', 80, 'daily', 10, 5),
  ('Invite a Friend', 'Share your referral link with at least one friend today.', 200, 'social', 0, 6);

CREATE TABLE public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reward numeric(14,2) NOT NULL DEFAULT 0,
  completed_on date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id, completed_on)
);
CREATE INDEX task_completions_user_idx ON public.task_completions (user_id, completed_on DESC);
GRANT SELECT ON public.task_completions TO authenticated;
GRANT ALL ON public.task_completions TO service_role;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own completions" ON public.task_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ---------- referrals ----------
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  reward numeric(14,2) NOT NULL DEFAULT 0,
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX referrals_referrer_idx ON public.referrals (referrer_id, created_at DESC);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage referrals" ON public.referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- activation requests ----------
CREATE TABLE public.activation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  proof_url text,
  payer_name text,
  reference text,
  status public.activation_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activation_requests_user_idx ON public.activation_requests (user_id, created_at DESC);
GRANT SELECT ON public.activation_requests TO authenticated;
GRANT ALL ON public.activation_requests TO service_role;
ALTER TABLE public.activation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activation requests" ON public.activation_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage activation requests" ON public.activation_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- withdrawals ----------
CREATE TYPE public.withdrawal_status AS ENUM ('processing','approved','completed','rejected');

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  amount numeric(14,2) NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'processing',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX withdrawals_user_idx ON public.withdrawals (user_id, created_at DESC);
CREATE INDEX withdrawals_status_idx ON public.withdrawals (status);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage withdrawals" ON public.withdrawals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- promotions ----------
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  banner_url text,
  reward_details text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions are public" ON public.promotions FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "admins manage promotions" ON public.promotions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER promotions_updated_at BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.promotions (title, description, reward_details, ends_at) VALUES
  ('Weekend Double Rewards', 'Every tap pays double from Friday evening until Sunday midnight.', '2x reward per tap all weekend', now() + interval '5 days'),
  ('Referral Sprint', 'Invite 5 friends this week and receive an extra bonus on top of your normal referral rewards.', 'Extra ₦2,500 after 5 verified referrals', now() + interval '10 days');

-- ---------- support tickets ----------
CREATE TYPE public.ticket_status AS ENUM ('open','pending','closed');

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  screenshot_url text,
  status public.ticket_status NOT NULL DEFAULT 'open',
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_tickets_user_idx ON public.support_tickets (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "create own tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- admin activity log ----------
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  target_user uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_logs_created_idx ON public.admin_logs (created_at DESC);
GRANT SELECT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read logs" ON public.admin_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));