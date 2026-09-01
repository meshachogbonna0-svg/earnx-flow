-- EarnX: make tap/reward/level settings persist through audited SECURITY DEFINER RPCs.

ALTER TABLE public.levels
  ADD COLUMN IF NOT EXISTS daily_recharge_reset_hours integer NOT NULL DEFAULT 7;
-- The Admin UI uses these functions so a UI toast is never shown for a failed save.

CREATE OR REPLACE FUNCTION public.admin_update_level_settings(_level integer, _settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.levels%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  UPDATE public.levels
  SET
    name = CASE WHEN _settings ? 'name' THEN trim(_settings->>'name') ELSE name END,
    upgrade_price = CASE WHEN _settings ? 'upgrade_price' THEN GREATEST(((_settings->>'upgrade_price')::numeric), 0) ELSE upgrade_price END,
    reward_per_tap = CASE WHEN _settings ? 'reward_per_tap' THEN GREATEST(((_settings->>'reward_per_tap')::numeric), 0) ELSE reward_per_tap END,
    tap_multiplier = CASE WHEN _settings ? 'tap_multiplier' THEN GREATEST(((_settings->>'tap_multiplier')::numeric), 0) ELSE tap_multiplier END,
    battery_capacity = CASE WHEN _settings ? 'battery_capacity' THEN GREATEST(((_settings->>'battery_capacity')::integer), 0) ELSE battery_capacity END,
    recharge_minutes = CASE WHEN _settings ? 'recharge_minutes' THEN GREATEST(((_settings->>'recharge_minutes')::integer), 0) ELSE recharge_minutes END,
    recharge_amount = CASE WHEN _settings ? 'recharge_amount' THEN GREATEST(((_settings->>'recharge_amount')::integer), 0) ELSE recharge_amount END,
    cooldown_minutes = CASE WHEN _settings ? 'cooldown_minutes' THEN GREATEST(((_settings->>'cooldown_minutes')::integer), 0) ELSE cooldown_minutes END,
    daily_recharge_reset_hours = CASE WHEN _settings ? 'daily_recharge_reset_hours' THEN GREATEST(((_settings->>'daily_recharge_reset_hours')::integer), 1) ELSE daily_recharge_reset_hours END,
    daily_recharge_limit = CASE WHEN _settings ? 'daily_recharge_limit' THEN GREATEST(((_settings->>'daily_recharge_limit')::integer), 0) ELSE daily_recharge_limit END,
    daily_tap_limit = CASE WHEN _settings ? 'daily_tap_limit' THEN GREATEST(((_settings->>'daily_tap_limit')::integer), 0) ELSE daily_tap_limit END,
    daily_earnings_limit = CASE WHEN _settings ? 'daily_earnings_limit' THEN GREATEST(((_settings->>'daily_earnings_limit')::numeric), 0) ELSE daily_earnings_limit END,
    min_withdrawal = CASE WHEN _settings ? 'min_withdrawal' THEN GREATEST(((_settings->>'min_withdrawal')::numeric), 0) ELSE min_withdrawal END,
    max_withdrawal = CASE WHEN _settings ? 'max_withdrawal' THEN GREATEST(((_settings->>'max_withdrawal')::numeric), 0) ELSE max_withdrawal END,
    unlimited_battery = CASE WHEN _settings ? 'unlimited_battery' THEN (_settings->>'unlimited_battery')::boolean ELSE unlimited_battery END,
    unlimited_taps = CASE WHEN _settings ? 'unlimited_taps' THEN (_settings->>'unlimited_taps')::boolean ELSE unlimited_taps END,
    enabled = CASE WHEN _settings ? 'enabled' THEN (_settings->>'enabled')::boolean ELSE enabled END,
    benefits = CASE WHEN _settings ? 'benefits' THEN ARRAY(SELECT jsonb_array_elements_text(_settings->'benefits')) ELSE benefits END,
    updated_at = now()
  WHERE level = _level
  RETURNING * INTO r;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'level_not_found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'level', to_jsonb(r));
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('ok', false, 'reason', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_level_settings(integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_level_settings(integer, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_platform_settings(_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.platform_settings%ROWTYPE;
  k text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  UPDATE public.platform_settings
  SET
    welcome_bonus = CASE WHEN _settings ? 'welcome_bonus' THEN GREATEST(((_settings->>'welcome_bonus')::numeric), 0) ELSE welcome_bonus END,
    daily_bonus_amount = CASE WHEN _settings ? 'daily_bonus_amount' THEN GREATEST(((_settings->>'daily_bonus_amount')::numeric), 0) ELSE daily_bonus_amount END,
    daily_bonus_cooldown_hours = CASE WHEN _settings ? 'daily_bonus_cooldown_hours' THEN GREATEST(((_settings->>'daily_bonus_cooldown_hours')::integer), 0) ELSE daily_bonus_cooldown_hours END,
    referral_reward = CASE WHEN _settings ? 'referral_reward' THEN GREATEST(((_settings->>'referral_reward')::numeric), 0) ELSE referral_reward END,
    referral_commission = CASE WHEN _settings ? 'referral_commission' THEN GREATEST(((_settings->>'referral_commission')::numeric), 0) ELSE referral_commission END,
    tap_multiplier = CASE WHEN _settings ? 'tap_multiplier' THEN GREATEST(((_settings->>'tap_multiplier')::numeric), 0) ELSE tap_multiplier END,
    weekend_multiplier = CASE WHEN _settings ? 'weekend_multiplier' THEN GREATEST(((_settings->>'weekend_multiplier')::numeric), 0) ELSE weekend_multiplier END,
    event_multiplier = CASE WHEN _settings ? 'event_multiplier' THEN GREATEST(((_settings->>'event_multiplier')::numeric), 0) ELSE event_multiplier END,
    min_tap_reward = CASE WHEN _settings ? 'min_tap_reward' THEN GREATEST(((_settings->>'min_tap_reward')::numeric), 0) ELSE min_tap_reward END,
    max_tap_reward = CASE WHEN _settings ? 'max_tap_reward' THEN GREATEST(((_settings->>'max_tap_reward')::numeric), 0) ELSE max_tap_reward END,
    default_reward_per_tap = CASE WHEN _settings ? 'default_reward_per_tap' THEN GREATEST(((_settings->>'default_reward_per_tap')::numeric), 0) ELSE default_reward_per_tap END,
    tapping_enabled = CASE WHEN _settings ? 'tapping_enabled' THEN (_settings->>'tapping_enabled')::boolean ELSE tapping_enabled END,
    battery_enabled = CASE WHEN _settings ? 'battery_enabled' THEN (_settings->>'battery_enabled')::boolean ELSE battery_enabled END,
    cooldown_enabled = CASE WHEN _settings ? 'cooldown_enabled' THEN (_settings->>'cooldown_enabled')::boolean ELSE cooldown_enabled END,
    unlimited_taps = CASE WHEN _settings ? 'unlimited_taps' THEN (_settings->>'unlimited_taps')::boolean ELSE unlimited_taps END,
    weekend_multiplier_enabled = CASE WHEN _settings ? 'weekend_multiplier_enabled' THEN (_settings->>'weekend_multiplier_enabled')::boolean ELSE weekend_multiplier_enabled END,
    event_multiplier_enabled = CASE WHEN _settings ? 'event_multiplier_enabled' THEN (_settings->>'event_multiplier_enabled')::boolean ELSE event_multiplier_enabled END,
    welcome_bonus_enabled = CASE WHEN _settings ? 'welcome_bonus_enabled' THEN (_settings->>'welcome_bonus_enabled')::boolean ELSE welcome_bonus_enabled END,
    daily_bonus_enabled = CASE WHEN _settings ? 'daily_bonus_enabled' THEN (_settings->>'daily_bonus_enabled')::boolean ELSE daily_bonus_enabled END,
    tasks_enabled = CASE WHEN _settings ? 'tasks_enabled' THEN (_settings->>'tasks_enabled')::boolean ELSE tasks_enabled END,
    videos_enabled = CASE WHEN _settings ? 'videos_enabled' THEN (_settings->>'videos_enabled')::boolean ELSE videos_enabled END,
    questionnaires_enabled = CASE WHEN _settings ? 'questionnaires_enabled' THEN (_settings->>'questionnaires_enabled')::boolean ELSE questionnaires_enabled END,
    promotions_enabled = CASE WHEN _settings ? 'promotions_enabled' THEN (_settings->>'promotions_enabled')::boolean ELSE promotions_enabled END,
    announcement = CASE WHEN _settings ? 'announcement' THEN _settings->>'announcement' ELSE announcement END,
    referral_conditions = CASE WHEN _settings ? 'referral_conditions' THEN _settings->>'referral_conditions' ELSE referral_conditions END,
    updated_at = now()
  WHERE id = true
  RETURNING * INTO r;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'settings_not_found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'settings', to_jsonb(r));
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('ok', false, 'reason', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_platform_settings(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_platform_settings(jsonb) TO authenticated;


-- Tap engine: when the configured daily recharge count is exhausted, the next
-- empty battery starts a separate reset lock (default 7 hours). At the end of
-- that lock, the recharge counter resets and a normal recharge is granted.
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
  reset_hours integer;
  reset_lock boolean := false;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  SELECT * INTO lv FROM public.levels WHERE level = p.level;
  IF NOT FOUND THEN SELECT * INTO lv FROM public.levels ORDER BY level LIMIT 1; END IF;

  unlimited_batt := lv.unlimited_battery OR NOT coalesce(s.battery_enabled, true);
  unlimited_tap := lv.unlimited_taps OR coalesce(s.unlimited_taps, false);
  cap_battery := lv.battery_capacity;
  reset_hours := GREATEST(coalesce(lv.daily_recharge_reset_hours, 7), 1);
  cd := p.cooldown_until;
  recharges := p.recharges_today;

  IF p.tap_day <> today THEN
    p.tap_day := today; p.taps_today := 0; p.earned_today := 0; recharges := 0; cd := NULL;
  END IF;

  IF unlimited_batt THEN
    new_battery := cap_battery; cd := NULL; recharges := 0;
  ELSE
    new_battery := p.battery;
    IF cd IS NOT NULL AND coalesce(s.cooldown_enabled, true) THEN
      IF now() >= cd THEN
        IF lv.daily_recharge_limit = 0 OR recharges < lv.daily_recharge_limit THEN
          new_battery := LEAST(cap_battery, new_battery + GREATEST(lv.recharge_amount, 1));
          recharges := recharges + 1;
          cd := NULL;
        ELSE
          -- The 7-hour-style reset lock has completed: start a fresh cycle.
          new_battery := LEAST(cap_battery, new_battery + GREATEST(lv.recharge_amount, 1));
          recharges := 1;
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

  IF NOT coalesce(s.tapping_enabled, true) THEN RETURN jsonb_build_object('ok', false, 'reason', 'tapping_disabled', 'battery', new_battery, 'capacity', cap_battery); END IF;
  IF p.account_status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'reason', 'account_restricted', 'battery', new_battery, 'capacity', cap_battery); END IF;
  IF p.activation <> 'activated' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_activated', 'battery', new_battery, 'capacity', cap_battery); END IF;
  IF NOT unlimited_tap AND lv.daily_tap_limit > 0 AND p.taps_today >= lv.daily_tap_limit THEN RETURN jsonb_build_object('ok', false, 'reason', 'daily_limit', 'battery', new_battery, 'capacity', cap_battery); END IF;
  IF lv.daily_earnings_limit > 0 AND p.earned_today >= lv.daily_earnings_limit THEN RETURN jsonb_build_object('ok', false, 'reason', 'earnings_limit', 'battery', new_battery, 'capacity', cap_battery); END IF;
  IF NOT unlimited_batt AND new_battery <= 0 THEN
    reset_lock := lv.daily_recharge_limit > 0 AND recharges >= lv.daily_recharge_limit;
    cd := now() + make_interval(mins => CASE WHEN reset_lock THEN reset_hours * 60 ELSE GREATEST(lv.cooldown_minutes,1) END);
    UPDATE public.profiles SET battery = 0, cooldown_until = cd, recharges_today = recharges, tap_day = p.tap_day,
      taps_today = p.taps_today, earned_today = p.earned_today, updated_at = now() WHERE id = uid;
    RETURN jsonb_build_object('ok', false, 'reason', 'no_battery', 'battery', 0, 'capacity', cap_battery,
      'cooldown_until', cd, 'reset_lock', reset_lock, 'reset_hours', reset_hours);
  END IF;

  mult := coalesce(lv.tap_multiplier,1) * coalesce(s.tap_multiplier,1);
  IF coalesce(s.weekend_multiplier_enabled,false) AND EXTRACT(DOW FROM now()) IN (0,6) THEN mult := mult * coalesce(s.weekend_multiplier,1); END IF;
  IF coalesce(s.event_multiplier_enabled,false) THEN mult := mult * coalesce(s.event_multiplier,1); END IF;
  rw := round(lv.reward_per_tap * mult, 2);
  IF coalesce(s.min_tap_reward,0) > 0 THEN rw := GREATEST(rw, s.min_tap_reward); END IF;
  IF coalesce(s.max_tap_reward,0) > 0 THEN rw := LEAST(rw, s.max_tap_reward); END IF;
  IF lv.daily_earnings_limit > 0 THEN rw := LEAST(rw, lv.daily_earnings_limit - p.earned_today); END IF;

  IF NOT unlimited_batt THEN
    new_battery := new_battery - 1;
    IF new_battery = 0 THEN
      reset_lock := lv.daily_recharge_limit > 0 AND recharges >= lv.daily_recharge_limit;
      cd := now() + make_interval(mins => CASE WHEN reset_lock THEN reset_hours * 60 ELSE GREATEST(lv.cooldown_minutes,1) END);
    END IF;
  END IF;

  UPDATE public.profiles SET balance = balance + rw, total_earned = total_earned + rw,
    earned_today = p.earned_today + rw, taps_today = p.taps_today + 1, total_taps = total_taps + 1,
    tap_day = p.tap_day, battery = new_battery, battery_updated_at = now(), cooldown_until = cd,
    recharges_today = recharges, updated_at = now() WHERE id = uid;
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (uid, 'tap', rw, 'Tap reward', 'completed');
  RETURN jsonb_build_object('ok', true, 'reward', rw, 'battery', new_battery, 'capacity', cap_battery,
    'taps_today', p.taps_today + 1, 'earned_today', p.earned_today + rw, 'balance', p.balance + rw,
    'cooldown_until', cd, 'multiplier', mult, 'recharges_today', recharges);
END; $function$;

REVOKE ALL ON FUNCTION public.perform_tap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perform_tap() TO authenticated;

CREATE OR REPLACE FUNCTION public.tap_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); p public.profiles%ROWTYPE; lv public.levels%ROWTYPE; s public.platform_settings%ROWTYPE;
  today date := (now() AT TIME ZONE 'UTC')::date; mult numeric := 1;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  SELECT * INTO p FROM public.profiles WHERE id = uid;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  SELECT * INTO lv FROM public.levels WHERE level = p.level;
  IF NOT FOUND THEN SELECT * INTO lv FROM public.levels ORDER BY level LIMIT 1; END IF;
  mult := coalesce(lv.tap_multiplier,1) * coalesce(s.tap_multiplier,1);
  IF coalesce(s.weekend_multiplier_enabled,false) AND EXTRACT(DOW FROM now()) IN (0,6) THEN mult := mult * coalesce(s.weekend_multiplier,1); END IF;
  IF coalesce(s.event_multiplier_enabled,false) THEN mult := mult * coalesce(s.event_multiplier,1); END IF;
  RETURN jsonb_build_object('ok', true, 'level', p.level, 'level_name', lv.name, 'activation', p.activation,
    'balance', p.balance, 'total_earned', p.total_earned,
    'battery', CASE WHEN lv.unlimited_battery OR NOT coalesce(s.battery_enabled,true) THEN lv.battery_capacity ELSE p.battery END,
    'capacity', lv.battery_capacity, 'unlimited_battery', lv.unlimited_battery OR NOT coalesce(s.battery_enabled,true),
    'unlimited_taps', lv.unlimited_taps OR coalesce(s.unlimited_taps,false),
    'cooldown_until', CASE WHEN coalesce(s.cooldown_enabled,true) THEN p.cooldown_until ELSE NULL END,
    'cooldown_minutes', lv.cooldown_minutes, 'recharge_minutes', lv.recharge_minutes, 'recharge_amount', lv.recharge_amount,
    'daily_recharge_limit', lv.daily_recharge_limit, 'daily_recharge_reset_hours', lv.daily_recharge_reset_hours,
    'recharges_today', p.recharges_today,
    'taps_today', CASE WHEN p.tap_day = today THEN p.taps_today ELSE 0 END,
    'earned_today', CASE WHEN p.tap_day = today THEN p.earned_today ELSE 0 END,
    'total_taps', p.total_taps, 'daily_tap_limit', lv.daily_tap_limit, 'daily_earnings_limit', lv.daily_earnings_limit,
    'reward_per_tap', round(lv.reward_per_tap * mult, 2), 'multiplier', mult, 'tapping_enabled', coalesce(s.tapping_enabled,true));
END; $function$;

REVOKE ALL ON FUNCTION public.tap_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tap_state() TO authenticated;
