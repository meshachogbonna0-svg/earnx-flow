CREATE OR REPLACE FUNCTION public.perform_tap()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  lv public.levels%ROWTYPE;
  regen integer;
  today date := (now() AT TIME ZONE 'UTC')::date;
  new_battery integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_profile');
  END IF;

  SELECT * INTO lv FROM public.levels WHERE level = p.level;
  IF NOT FOUND THEN
    SELECT * INTO lv FROM public.levels ORDER BY level LIMIT 1;
  END IF;

  -- daily reset
  IF p.tap_day <> today THEN
    p.tap_day := today;
    p.taps_today := 0;
    p.earned_today := 0;
  END IF;

  -- battery regeneration
  IF lv.unlimited_battery THEN
    new_battery := lv.battery_capacity;
  ELSE
    regen := 0;
    IF lv.recharge_minutes > 0 THEN
      regen := floor(EXTRACT(EPOCH FROM (now() - p.battery_updated_at)) / (lv.recharge_minutes * 60))::int;
    END IF;
    new_battery := LEAST(lv.battery_capacity, p.battery + GREATEST(regen, 0));
  END IF;

  IF p.activation <> 'activated' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_activated', 'battery', new_battery, 'capacity', lv.battery_capacity);
  END IF;

  IF lv.daily_tap_limit > 0 AND p.taps_today >= lv.daily_tap_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'daily_limit', 'battery', new_battery, 'capacity', lv.battery_capacity);
  END IF;

  IF lv.daily_earnings_limit > 0 AND p.earned_today >= lv.daily_earnings_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'earnings_limit', 'battery', new_battery, 'capacity', lv.battery_capacity);
  END IF;

  IF NOT lv.unlimited_battery AND new_battery <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_battery', 'battery', 0, 'capacity', lv.battery_capacity);
  END IF;

  IF NOT lv.unlimited_battery THEN
    new_battery := new_battery - 1;
  END IF;

  UPDATE public.profiles SET
    balance = balance + lv.reward_per_tap,
    total_earned = total_earned + lv.reward_per_tap,
    earned_today = p.earned_today + lv.reward_per_tap,
    taps_today = p.taps_today + 1,
    total_taps = total_taps + 1,
    tap_day = p.tap_day,
    battery = new_battery,
    battery_updated_at = now(),
    updated_at = now()
  WHERE id = uid;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (uid, 'tap', lv.reward_per_tap, 'Tap reward', 'completed');

  RETURN jsonb_build_object(
    'ok', true,
    'reward', lv.reward_per_tap,
    'battery', new_battery,
    'capacity', lv.battery_capacity,
    'taps_today', p.taps_today + 1,
    'earned_today', p.earned_today + lv.reward_per_tap,
    'balance', p.balance + lv.reward_per_tap
  );
END;
$$;

REVOKE ALL ON FUNCTION public.perform_tap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perform_tap() TO authenticated;