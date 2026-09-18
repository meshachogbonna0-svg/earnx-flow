-- EarnX: allow Admin to configure a separate activation fee for every level.

ALTER TABLE public.levels
  ADD COLUMN IF NOT EXISTS activation_fee numeric(14,2) NOT NULL DEFAULT 0;

-- Preserve the current platform-wide fee as the initial value for every level.
UPDATE public.levels
SET activation_fee = COALESCE(
  (SELECT activation_fee FROM public.platform_settings WHERE id),
  0
)
WHERE activation_fee = 0;

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
    upgrade_price = CASE WHEN _settings ? 'upgrade_price' THEN GREATEST((_settings->>'upgrade_price')::numeric, 0) ELSE upgrade_price END,
    activation_fee = CASE WHEN _settings ? 'activation_fee' THEN GREATEST((_settings->>'activation_fee')::numeric, 0) ELSE activation_fee END,
    reward_per_tap = CASE WHEN _settings ? 'reward_per_tap' THEN GREATEST((_settings->>'reward_per_tap')::numeric, 0) ELSE reward_per_tap END,
    tap_multiplier = CASE WHEN _settings ? 'tap_multiplier' THEN GREATEST((_settings->>'tap_multiplier')::numeric, 0) ELSE tap_multiplier END,
    battery_capacity = CASE WHEN _settings ? 'battery_capacity' THEN GREATEST((_settings->>'battery_capacity')::integer, 0) ELSE battery_capacity END,
    recharge_minutes = CASE WHEN _settings ? 'recharge_minutes' THEN GREATEST((_settings->>'recharge_minutes')::integer, 0) ELSE recharge_minutes END,
    recharge_amount = CASE WHEN _settings ? 'recharge_amount' THEN GREATEST((_settings->>'recharge_amount')::integer, 0) ELSE recharge_amount END,
    cooldown_minutes = CASE WHEN _settings ? 'cooldown_minutes' THEN GREATEST((_settings->>'cooldown_minutes')::integer, 0) ELSE cooldown_minutes END,
    daily_recharge_reset_hours = CASE WHEN _settings ? 'daily_recharge_reset_hours' THEN GREATEST((_settings->>'daily_recharge_reset_hours')::integer, 1) ELSE daily_recharge_reset_hours END,
    daily_recharge_limit = CASE WHEN _settings ? 'daily_recharge_limit' THEN GREATEST((_settings->>'daily_recharge_limit')::integer, 0) ELSE daily_recharge_limit END,
    daily_tap_limit = CASE WHEN _settings ? 'daily_tap_limit' THEN GREATEST((_settings->>'daily_tap_limit')::integer, 0) ELSE daily_tap_limit END,
    daily_earnings_limit = CASE WHEN _settings ? 'daily_earnings_limit' THEN GREATEST((_settings->>'daily_earnings_limit')::numeric, 0) ELSE daily_earnings_limit END,
    min_withdrawal = CASE WHEN _settings ? 'min_withdrawal' THEN GREATEST((_settings->>'min_withdrawal')::numeric, 0) ELSE min_withdrawal END,
    max_withdrawal = CASE WHEN _settings ? 'max_withdrawal' THEN GREATEST((_settings->>'max_withdrawal')::numeric, 0) ELSE max_withdrawal END,
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

CREATE OR REPLACE FUNCTION public.submit_activation(_payer_name text, _reference text, _proof_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  lv public.levels%ROWTYPE;
  req_id uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  IF p.activation = 'activated' THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_activated'); END IF;
  IF p.activation = 'pending' THEN RETURN jsonb_build_object('ok', false, 'reason', 'pending'); END IF;

  SELECT * INTO lv FROM public.levels WHERE level = p.level AND enabled;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'level_unavailable'); END IF;

  INSERT INTO public.activation_requests (user_id, amount, proof_url, payer_name, reference, status)
  VALUES (uid, COALESCE(lv.activation_fee, 0), nullif(_proof_url, ''), nullif(_payer_name, ''), nullif(_reference, ''), 'pending'::activation_status)
  RETURNING id INTO req_id;

  UPDATE public.profiles SET activation = 'pending', updated_at = now() WHERE id = uid;
  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (uid, 'Activation request received', 'Your bank-transfer receipt is being reviewed by Admin. You will be notified after a decision.', 'activation');

  RETURN jsonb_build_object('ok', true, 'id', req_id, 'amount', COALESCE(lv.activation_fee, 0), 'auto', false);
END;
$$;
