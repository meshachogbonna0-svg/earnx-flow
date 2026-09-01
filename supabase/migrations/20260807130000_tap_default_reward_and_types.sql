-- EarnX: ensure the Admin "Default reward per tap" setting is actually used
-- whenever a level has no explicit reward_per_tap configured.
-- This preserves level-specific rewards while making the global fallback functional.

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
  rw := round((CASE WHEN coalesce(lv.reward_per_tap, 0) > 0 THEN lv.reward_per_tap ELSE coalesce(s.default_reward_per_tap, 0) END) * mult, 2);
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
    'reward_per_tap', round((CASE WHEN coalesce(lv.reward_per_tap, 0) > 0 THEN lv.reward_per_tap ELSE coalesce(s.default_reward_per_tap, 0) END) * mult, 2), 'multiplier', mult, 'tapping_enabled', coalesce(s.tapping_enabled,true));
END; $function$;

REVOKE ALL ON FUNCTION public.tap_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tap_state() TO authenticated;

