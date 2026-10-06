-- EarnX: Add session-based Tap & Earn fields to the levels table
-- This migration introduces the new session model fields required by the admin Tap & Earn settings UI
-- Old battery/energy fields remain untouched for backward compatibility

ALTER TABLE public.levels
  ADD COLUMN IF NOT EXISTS session_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS session_cooldown_seconds integer,
  ADD COLUMN IF NOT EXISTS session_max_taps integer,
  ADD COLUMN IF NOT EXISTS sessions_per_day integer,
  ADD COLUMN IF NOT EXISTS daily_sessions integer;

-- Populate default values for all levels 0-7
-- Based on spec: Level N gets N*1000 max_taps, N*10 reward_per_tap
UPDATE public.levels
SET
  session_duration_seconds = COALESCE(session_duration_seconds, 180),
  session_cooldown_seconds = COALESCE(session_cooldown_seconds, 21600),
  session_max_taps = COALESCE(session_max_taps, 1000 + (level * 1000)),
  sessions_per_day = COALESCE(sessions_per_day, 0),
  daily_sessions = COALESCE(daily_sessions, 0),
  reward_per_tap = COALESCE(reward_per_tap, 10 + (level * 10))
WHERE level >= 0 AND level <= 7;

-- Ensure reward_per_tap has the correct tier values
UPDATE public.levels SET reward_per_tap = 10 WHERE level = 0;
UPDATE public.levels SET reward_per_tap = 20 WHERE level = 1;
UPDATE public.levels SET reward_per_tap = 30 WHERE level = 2;
UPDATE public.levels SET reward_per_tap = 40 WHERE level = 3;
UPDATE public.levels SET reward_per_tap = 50 WHERE level = 4;
UPDATE public.levels SET reward_per_tap = 60 WHERE level = 5;
UPDATE public.levels SET reward_per_tap = 70 WHERE level = 6;
UPDATE public.levels SET reward_per_tap = 80 WHERE level = 7;

-- Ensure session_max_taps has the correct tier values
UPDATE public.levels SET session_max_taps = 1000 WHERE level = 0;
UPDATE public.levels SET session_max_taps = 2000 WHERE level = 1;
UPDATE public.levels SET session_max_taps = 3000 WHERE level = 2;
UPDATE public.levels SET session_max_taps = 4000 WHERE level = 3;
UPDATE public.levels SET session_max_taps = 5000 WHERE level = 4;
UPDATE public.levels SET session_max_taps = 6000 WHERE level = 5;
UPDATE public.levels SET session_max_taps = 7000 WHERE level = 6;
UPDATE public.levels SET session_max_taps = 8000 WHERE level = 7;

-- Update the admin_update_level_settings RPC to support the new session fields
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
    session_duration_seconds = CASE WHEN _settings ? 'session_duration_seconds' THEN GREATEST(((_settings->>'session_duration_seconds')::integer), 1) ELSE session_duration_seconds END,
    session_cooldown_seconds = CASE WHEN _settings ? 'session_cooldown_seconds' THEN GREATEST(((_settings->>'session_cooldown_seconds')::integer), 0) ELSE session_cooldown_seconds END,
    session_max_taps = CASE WHEN _settings ? 'session_max_taps' THEN GREATEST(((_settings->>'session_max_taps')::integer), 1) ELSE session_max_taps END,
    sessions_per_day = CASE WHEN _settings ? 'sessions_per_day' THEN GREATEST(((_settings->>'sessions_per_day')::integer), 0) ELSE sessions_per_day END,
    daily_sessions = CASE WHEN _settings ? 'daily_sessions' THEN GREATEST(((_settings->>'daily_sessions')::integer), 0) ELSE daily_sessions END,
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

-- Notify PostgREST to reload the schema so the new columns are exposed
NOTIFY pgrst, 'reload schema';
