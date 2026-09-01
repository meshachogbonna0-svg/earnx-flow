
-- ============ PLATFORM SETTINGS ============
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS tapping_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS battery_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cooldown_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tap_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weekend_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weekend_multiplier_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS event_multiplier_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_tap_reward numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_tap_reward numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlimited_taps boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_bonus_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS daily_bonus_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_bonus_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_commission numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_conditions text NOT NULL DEFAULT 'Your referral reward is paid once your invited friend activates their account.',
  ADD COLUMN IF NOT EXISTS tasks_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS videos_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS questionnaires_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS promotions_enabled boolean NOT NULL DEFAULT true;

-- ============ LEVELS ============
ALTER TABLE public.levels
  ADD COLUMN IF NOT EXISTS cooldown_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS recharge_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_recharge_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlimited_taps boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tap_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_withdrawal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_withdrawal numeric NOT NULL DEFAULT 0;

UPDATE public.levels SET recharge_amount = battery_capacity WHERE recharge_amount = 0;

-- ============ PROFILES ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cooldown_until timestamptz,
  ADD COLUMN IF NOT EXISTS recharges_today integer NOT NULL DEFAULT 0;

-- ============ QUESTIONNAIRES ============
CREATE TABLE IF NOT EXISTS public.questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  reward numeric NOT NULL DEFAULT 0,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questionnaires TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaires TO authenticated;
GRANT ALL ON public.questionnaires TO service_role;
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "questionnaires are public" ON public.questionnaires;
CREATE POLICY "questionnaires are public" ON public.questionnaires FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admins manage questionnaires" ON public.questionnaires;
CREATE POLICY "admins manage questionnaires" ON public.questionnaires FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER questionnaires_updated_at BEFORE UPDATE ON public.questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.questionnaire_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questionnaire_id uuid NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, questionnaire_id)
);
GRANT SELECT ON public.questionnaire_completions TO authenticated;
GRANT ALL ON public.questionnaire_completions TO service_role;
ALTER TABLE public.questionnaire_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own or admin questionnaire completions" ON public.questionnaire_completions;
CREATE POLICY "own or admin questionnaire completions" ON public.questionnaire_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ VIDEOS ============
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text NOT NULL,
  thumbnail_url text,
  watch_seconds integer NOT NULL DEFAULT 30,
  reward numeric NOT NULL DEFAULT 0,
  daily_repeat boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "videos are public" ON public.videos;
CREATE POLICY "videos are public" ON public.videos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admins manage videos" ON public.videos;
CREATE POLICY "admins manage videos" ON public.videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER videos_updated_at BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.video_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  reward numeric NOT NULL DEFAULT 0,
  completed_on date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id, completed_on)
);
GRANT SELECT ON public.video_completions TO authenticated;
GRANT ALL ON public.video_completions TO service_role;
ALTER TABLE public.video_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own or admin video completions" ON public.video_completions;
CREATE POLICY "own or admin video completions" ON public.video_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ TESTIMONIALS ============
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  avatar_url text,
  quote text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonials are public" ON public.testimonials;
CREATE POLICY "testimonials are public" ON public.testimonials FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admins manage testimonials" ON public.testimonials;
CREATE POLICY "admins manage testimonials" ON public.testimonials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER testimonials_updated_at BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.testimonials (name, role, quote, rating, sort_order)
SELECT * FROM (VALUES
  ('Chidera Okoye','Lagos · Level 4','I cashed out ₦48,000 in my first month just from tapping and daily tasks. Payouts always land the same day.',5,1),
  ('Aisha Bello','Abuja · Level 5','The referral system is the real deal. My WhatsApp group alone earns me steady weekly income.',5,2),
  ('Tunde Adeyemi','Ibadan · Level 3','Clean app, no hidden charges, and support replies fast. EarnX-Finance is the most serious platform I have used.',5,3)
) v WHERE NOT EXISTS (SELECT 1 FROM public.testimonials);

-- ============ TAP LOGIC ============
CREATE OR REPLACE FUNCTION public.perform_tap()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  lv public.levels%ROWTYPE;
  s public.platform_settings%ROWTYPE;
  today date := (now() AT TIME ZONE 'UTC')::date;
  new_battery integer;
  cd timestamptz;
  recharges integer;
  regen integer;
  mult numeric := 1;
  rw numeric;
  cap_battery integer;
  unlimited_batt boolean;
  unlimited_tap boolean;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  SELECT * INTO lv FROM public.levels WHERE level = p.level;
  IF NOT FOUND THEN SELECT * INTO lv FROM public.levels ORDER BY level LIMIT 1; END IF;

  unlimited_batt := lv.unlimited_battery OR NOT coalesce(s.battery_enabled, true);
  unlimited_tap  := lv.unlimited_taps OR coalesce(s.unlimited_taps, false);
  cap_battery := lv.battery_capacity;
  cd := p.cooldown_until;
  recharges := p.recharges_today;

  IF p.tap_day <> today THEN
    p.tap_day := today; p.taps_today := 0; p.earned_today := 0; recharges := 0;
  END IF;

  -- battery state
  IF unlimited_batt THEN
    new_battery := cap_battery; cd := NULL;
  ELSE
    new_battery := p.battery;
    IF cd IS NOT NULL AND coalesce(s.cooldown_enabled, true) THEN
      IF now() >= cd THEN
        IF lv.daily_recharge_limit = 0 OR recharges < lv.daily_recharge_limit THEN
          new_battery := LEAST(cap_battery, new_battery + GREATEST(lv.recharge_amount, 1));
          recharges := recharges + 1;
          cd := NULL;
        END IF;
      END IF;
    ELSIF lv.recharge_minutes > 0 AND new_battery < cap_battery THEN
      regen := floor(EXTRACT(EPOCH FROM (now() - p.battery_updated_at)) / (lv.recharge_minutes * 60))::int;
      IF regen > 0 THEN
        new_battery := LEAST(cap_battery, new_battery + regen * GREATEST(lv.recharge_amount, 1));
      END IF;
    END IF;
  END IF;

  IF NOT coalesce(s.tapping_enabled, true) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'tapping_disabled', 'battery', new_battery, 'capacity', cap_battery);
  END IF;
  IF p.account_status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'account_restricted', 'battery', new_battery, 'capacity', cap_battery);
  END IF;
  IF p.activation <> 'activated' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_activated', 'battery', new_battery, 'capacity', cap_battery);
  END IF;
  IF NOT unlimited_tap AND lv.daily_tap_limit > 0 AND p.taps_today >= lv.daily_tap_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'daily_limit', 'battery', new_battery, 'capacity', cap_battery);
  END IF;
  IF lv.daily_earnings_limit > 0 AND p.earned_today >= lv.daily_earnings_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'earnings_limit', 'battery', new_battery, 'capacity', cap_battery);
  END IF;
  IF NOT unlimited_batt AND new_battery <= 0 THEN
    UPDATE public.profiles SET battery = 0, cooldown_until = coalesce(cd, now() + make_interval(mins => GREATEST(lv.cooldown_minutes,1))),
      recharges_today = recharges, tap_day = p.tap_day, taps_today = p.taps_today, earned_today = p.earned_today, updated_at = now()
      WHERE id = uid;
    RETURN jsonb_build_object('ok', false, 'reason', 'no_battery', 'battery', 0, 'capacity', cap_battery,
      'cooldown_until', coalesce(cd, now() + make_interval(mins => GREATEST(lv.cooldown_minutes,1))));
  END IF;

  -- reward with multipliers
  mult := coalesce(lv.tap_multiplier,1) * coalesce(s.tap_multiplier,1);
  IF coalesce(s.weekend_multiplier_enabled,false) AND EXTRACT(DOW FROM now()) IN (0,6) THEN
    mult := mult * coalesce(s.weekend_multiplier,1);
  END IF;
  IF coalesce(s.event_multiplier_enabled,false) THEN
    mult := mult * coalesce(s.event_multiplier,1);
  END IF;
  rw := round(lv.reward_per_tap * mult, 2);
  IF coalesce(s.min_tap_reward,0) > 0 THEN rw := GREATEST(rw, s.min_tap_reward); END IF;
  IF coalesce(s.max_tap_reward,0) > 0 THEN rw := LEAST(rw, s.max_tap_reward); END IF;
  IF lv.daily_earnings_limit > 0 THEN
    rw := LEAST(rw, lv.daily_earnings_limit - p.earned_today);
  END IF;

  IF NOT unlimited_batt THEN
    new_battery := new_battery - 1;
    IF new_battery = 0 THEN cd := now() + make_interval(mins => GREATEST(lv.cooldown_minutes,1)); END IF;
  END IF;

  UPDATE public.profiles SET
    balance = balance + rw,
    total_earned = total_earned + rw,
    earned_today = p.earned_today + rw,
    taps_today = p.taps_today + 1,
    total_taps = total_taps + 1,
    tap_day = p.tap_day,
    battery = new_battery,
    battery_updated_at = now(),
    cooldown_until = cd,
    recharges_today = recharges,
    updated_at = now()
  WHERE id = uid;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (uid, 'tap', rw, 'Tap reward', 'completed');

  RETURN jsonb_build_object('ok', true, 'reward', rw, 'battery', new_battery, 'capacity', cap_battery,
    'taps_today', p.taps_today + 1, 'earned_today', p.earned_today + rw, 'balance', p.balance + rw,
    'cooldown_until', cd, 'multiplier', mult);
END; $function$;

-- tap state (read only, no mutation)
CREATE OR REPLACE FUNCTION public.tap_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  lv public.levels%ROWTYPE;
  s public.platform_settings%ROWTYPE;
  today date := (now() AT TIME ZONE 'UTC')::date;
  mult numeric := 1;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  SELECT * INTO p FROM public.profiles WHERE id = uid;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  SELECT * INTO lv FROM public.levels WHERE level = p.level;
  IF NOT FOUND THEN SELECT * INTO lv FROM public.levels ORDER BY level LIMIT 1; END IF;

  mult := coalesce(lv.tap_multiplier,1) * coalesce(s.tap_multiplier,1);
  IF coalesce(s.weekend_multiplier_enabled,false) AND EXTRACT(DOW FROM now()) IN (0,6) THEN
    mult := mult * coalesce(s.weekend_multiplier,1); END IF;
  IF coalesce(s.event_multiplier_enabled,false) THEN mult := mult * coalesce(s.event_multiplier,1); END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'level', p.level,
    'level_name', lv.name,
    'activation', p.activation,
    'balance', p.balance,
    'total_earned', p.total_earned,
    'battery', CASE WHEN lv.unlimited_battery OR NOT coalesce(s.battery_enabled,true) THEN lv.battery_capacity ELSE p.battery END,
    'capacity', lv.battery_capacity,
    'unlimited_battery', lv.unlimited_battery OR NOT coalesce(s.battery_enabled,true),
    'unlimited_taps', lv.unlimited_taps OR coalesce(s.unlimited_taps,false),
    'cooldown_until', CASE WHEN coalesce(s.cooldown_enabled,true) THEN p.cooldown_until ELSE NULL END,
    'cooldown_minutes', lv.cooldown_minutes,
    'recharge_minutes', lv.recharge_minutes,
    'recharge_amount', lv.recharge_amount,
    'taps_today', CASE WHEN p.tap_day = today THEN p.taps_today ELSE 0 END,
    'earned_today', CASE WHEN p.tap_day = today THEN p.earned_today ELSE 0 END,
    'total_taps', p.total_taps,
    'daily_tap_limit', lv.daily_tap_limit,
    'daily_earnings_limit', lv.daily_earnings_limit,
    'reward_per_tap', round(lv.reward_per_tap * mult, 2),
    'multiplier', mult,
    'tapping_enabled', coalesce(s.tapping_enabled, true)
  );
END; $function$;

-- ============ WELCOME BONUS (respect toggle) ============
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); p public.profiles%ROWTYPE; s public.platform_settings%ROWTYPE; bonus numeric;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  IF NOT coalesce(s.welcome_bonus_enabled, true) THEN RETURN jsonb_build_object('ok', false, 'reason', 'disabled'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  IF p.welcome_bonus_claimed THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed'); END IF;
  bonus := coalesce(s.welcome_bonus, 0);
  UPDATE public.profiles SET balance = balance + bonus, total_earned = total_earned + bonus,
    welcome_bonus_claimed = true, updated_at = now() WHERE id = uid;
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (uid, 'welcome_bonus', bonus, 'Welcome bonus', 'completed');
  RETURN jsonb_build_object('ok', true, 'amount', bonus);
END; $function$;

-- ============ QUESTIONNAIRE COMPLETION ============
CREATE OR REPLACE FUNCTION public.complete_questionnaire(_questionnaire_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); q public.questionnaires%ROWTYPE; s public.platform_settings%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  IF NOT coalesce(s.questionnaires_enabled, true) THEN RETURN jsonb_build_object('ok', false, 'reason', 'disabled'); END IF;
  SELECT * INTO q FROM public.questionnaires WHERE id = _questionnaire_id AND active;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'unavailable'); END IF;
  IF q.starts_at > now() OR (q.ends_at IS NOT NULL AND q.ends_at < now()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unavailable'); END IF;
  IF jsonb_array_length(coalesce(_answers, '[]'::jsonb)) < jsonb_array_length(coalesce(q.questions,'[]'::jsonb)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'incomplete'); END IF;
  IF EXISTS (SELECT 1 FROM public.questionnaire_completions WHERE user_id = uid AND questionnaire_id = q.id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed'); END IF;

  INSERT INTO public.questionnaire_completions (user_id, questionnaire_id, answers, reward)
  VALUES (uid, q.id, coalesce(_answers, '[]'::jsonb), q.reward);
  UPDATE public.profiles SET balance = balance + q.reward, total_earned = total_earned + q.reward,
    survey_completed = true, updated_at = now() WHERE id = uid;
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (uid, 'task', q.reward, 'Questionnaire: ' || q.title, 'completed');
  RETURN jsonb_build_object('ok', true, 'reward', q.reward);
END; $function$;

-- ============ VIDEO COMPLETION ============
CREATE OR REPLACE FUNCTION public.complete_video(_video_id uuid, _watched_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); v public.videos%ROWTYPE; s public.platform_settings%ROWTYPE;
  today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  IF NOT coalesce(s.videos_enabled, true) THEN RETURN jsonb_build_object('ok', false, 'reason', 'disabled'); END IF;
  SELECT * INTO v FROM public.videos WHERE id = _video_id AND active;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'unavailable'); END IF;
  IF coalesce(_watched_seconds,0) < v.watch_seconds THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_watched'); END IF;
  IF EXISTS (SELECT 1 FROM public.video_completions WHERE user_id = uid AND video_id = v.id
             AND (v.daily_repeat = false OR completed_on = today)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed'); END IF;

  INSERT INTO public.video_completions (user_id, video_id, reward, completed_on) VALUES (uid, v.id, v.reward, today);
  UPDATE public.profiles SET balance = balance + v.reward, total_earned = total_earned + v.reward, updated_at = now() WHERE id = uid;
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (uid, 'task', v.reward, 'Video reward: ' || v.title, 'completed');
  RETURN jsonb_build_object('ok', true, 'reward', v.reward);
END; $function$;
