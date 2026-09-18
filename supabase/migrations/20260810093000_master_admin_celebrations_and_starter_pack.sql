-- EARNX master completion: admin-configurable starter pack and live celebration copy.
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS activated_starter_pack_reward numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activation_processing_message text NOT NULL DEFAULT 'Your activation request is being reviewed. We will notify you as soon as a decision is made.',
  ADD COLUMN IF NOT EXISTS activation_success_message text NOT NULL DEFAULT 'Congratulations! Your account is now activated and ready to earn.',
  ADD COLUMN IF NOT EXISTS activation_rejection_message text NOT NULL DEFAULT 'Your activation request was not approved. Please review the reason and submit a new request.',
  ADD COLUMN IF NOT EXISTS upgrade_processing_message text NOT NULL DEFAULT 'Your upgrade request is being reviewed. Please wait for Admin approval.',
  ADD COLUMN IF NOT EXISTS upgrade_success_message text NOT NULL DEFAULT 'Congratulations! Your upgrade has been approved.',
  ADD COLUMN IF NOT EXISTS upgrade_rejection_message text NOT NULL DEFAULT 'Your upgrade request was not approved. Please review the reason.',
  ADD COLUMN IF NOT EXISTS withdrawal_processing_message text NOT NULL DEFAULT 'Your withdrawal request is being processed. You will be notified when it is completed.',
  ADD COLUMN IF NOT EXISTS withdrawal_success_message text NOT NULL DEFAULT 'Congratulations! Your withdrawal has been completed successfully.',
  ADD COLUMN IF NOT EXISTS withdrawal_rejection_message text NOT NULL DEFAULT 'Your withdrawal request was not approved. Please review the reason.';

CREATE OR REPLACE FUNCTION public.admin_update_platform_settings(_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.platform_settings%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  UPDATE public.platform_settings SET
    activation_fee = CASE WHEN _settings ? 'activation_fee' THEN GREATEST((_settings->>'activation_fee')::numeric,0) ELSE activation_fee END,
    welcome_bonus = CASE WHEN _settings ? 'welcome_bonus' THEN GREATEST((_settings->>'welcome_bonus')::numeric,0) ELSE welcome_bonus END,
    activated_starter_pack_reward = CASE WHEN _settings ? 'activated_starter_pack_reward' THEN GREATEST((_settings->>'activated_starter_pack_reward')::numeric,0) ELSE activated_starter_pack_reward END,
    default_reward_per_tap = CASE WHEN _settings ? 'default_reward_per_tap' THEN GREATEST((_settings->>'default_reward_per_tap')::numeric,0) ELSE default_reward_per_tap END,
    referral_reward = CASE WHEN _settings ? 'referral_reward' THEN GREATEST((_settings->>'referral_reward')::numeric,0) ELSE referral_reward END,
    daily_bonus_amount = CASE WHEN _settings ? 'daily_bonus_amount' THEN GREATEST((_settings->>'daily_bonus_amount')::numeric,0) ELSE daily_bonus_amount END,
    activation_processing_message = CASE WHEN _settings ? 'activation_processing_message' THEN COALESCE(NULLIF(trim(_settings->>'activation_processing_message'),''), activation_processing_message) ELSE activation_processing_message END,
    activation_success_message = CASE WHEN _settings ? 'activation_success_message' THEN COALESCE(NULLIF(trim(_settings->>'activation_success_message'),''), activation_success_message) ELSE activation_success_message END,
    activation_rejection_message = CASE WHEN _settings ? 'activation_rejection_message' THEN COALESCE(NULLIF(trim(_settings->>'activation_rejection_message'),''), activation_rejection_message) ELSE activation_rejection_message END,
    upgrade_processing_message = CASE WHEN _settings ? 'upgrade_processing_message' THEN COALESCE(NULLIF(trim(_settings->>'upgrade_processing_message'),''), upgrade_processing_message) ELSE upgrade_processing_message END,
    upgrade_success_message = CASE WHEN _settings ? 'upgrade_success_message' THEN COALESCE(NULLIF(trim(_settings->>'upgrade_success_message'),''), upgrade_success_message) ELSE upgrade_success_message END,
    upgrade_rejection_message = CASE WHEN _settings ? 'upgrade_rejection_message' THEN COALESCE(NULLIF(trim(_settings->>'upgrade_rejection_message'),''), upgrade_rejection_message) ELSE upgrade_rejection_message END,
    withdrawal_processing_message = CASE WHEN _settings ? 'withdrawal_processing_message' THEN COALESCE(NULLIF(trim(_settings->>'withdrawal_processing_message'),''), withdrawal_processing_message) ELSE withdrawal_processing_message END,
    withdrawal_success_message = CASE WHEN _settings ? 'withdrawal_success_message' THEN COALESCE(NULLIF(trim(_settings->>'withdrawal_success_message'),''), withdrawal_success_message) ELSE withdrawal_success_message END,
    withdrawal_rejection_message = CASE WHEN _settings ? 'withdrawal_rejection_message' THEN COALESCE(NULLIF(trim(_settings->>'withdrawal_rejection_message'),''), withdrawal_rejection_message) ELSE withdrawal_rejection_message END,
    updated_at = now()
  WHERE id = true
  RETURNING * INTO r;

  RETURN jsonb_build_object('ok', true, 'settings', to_jsonb(r));
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('ok', false, 'reason', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_platform_settings(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_platform_settings(jsonb) TO authenticated;

-- Award the admin-configured activated starter pack exactly once when activation is approved.
CREATE OR REPLACE FUNCTION public.award_activated_starter_pack(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE reward numeric := 0;
BEGIN
  SELECT activated_starter_pack_reward INTO reward FROM public.platform_settings WHERE id = true;
  reward := COALESCE(reward,0);
  IF reward <= 0 THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE user_id = _user_id
      AND type = 'welcome_bonus'
      AND description = 'Activated starter pack reward'
  ) THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET balance = balance + reward,
      total_earned = total_earned + reward,
      updated_at = now()
  WHERE id = _user_id AND activation = 'activated';

  INSERT INTO public.transactions(user_id,type,amount,description,status)
  VALUES(_user_id,'welcome_bonus'::transaction_type,reward,'Activated starter pack reward','completed');

  INSERT INTO public.notifications(user_id,title,body,category)
  VALUES(_user_id,'Starter pack credited','Your activated starter pack reward has been added to your balance.','activation');
END;
$$;

REVOKE ALL ON FUNCTION public.award_activated_starter_pack(uuid) FROM PUBLIC, anon, authenticated;

-- Ensure all approval paths award the configured starter pack.
CREATE OR REPLACE FUNCTION public.admin_review_activation(_request_id uuid, _approve boolean, _note text default null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE admin_id uuid := auth.uid(); r public.activation_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(admin_id, 'admin') THEN RETURN jsonb_build_object('ok',false,'reason','forbidden'); END IF;
  SELECT * INTO r FROM public.activation_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR r.status <> 'pending' THEN RETURN jsonb_build_object('ok',false,'reason','invalid_request'); END IF;

  UPDATE public.activation_requests
  SET status = CASE WHEN _approve THEN 'activated'::activation_status ELSE 'rejected'::activation_status END,
      admin_note = _note, reviewed_by = admin_id, reviewed_at = now()
  WHERE id = _request_id;

  UPDATE public.profiles
  SET activation = CASE WHEN _approve THEN 'activated'::activation_status ELSE 'rejected'::activation_status END,
      updated_at = now()
  WHERE id = r.user_id;

  IF _approve THEN
    PERFORM public.settle_referral(r.user_id);
    PERFORM public.award_activated_starter_pack(r.user_id);
  END IF;

  INSERT INTO public.notifications(user_id,title,body,category)
  VALUES(
    r.user_id,
    CASE WHEN _approve THEN 'Account activated' ELSE 'Activation rejected' END,
    COALESCE(_note, CASE WHEN _approve THEN 'Your account is now active. Start earning!' ELSE 'Your activation request was rejected. Please review the reason.' END),
    'activation'
  );

  INSERT INTO public.admin_logs(admin_id,admin_name,action,target_user,details)
  VALUES(admin_id,COALESCE((SELECT email FROM public.profiles WHERE id=admin_id),'admin'),
    CASE WHEN _approve THEN 'approve_activation' ELSE 'reject_activation' END,r.user_id,
    jsonb_build_object('request_id',_request_id,'starter_pack_reward',CASE WHEN _approve THEN (SELECT activated_starter_pack_reward FROM public.platform_settings WHERE id) ELSE 0 END));

  RETURN jsonb_build_object('ok',true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_activation(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_activation(uuid,boolean,text) TO authenticated;

-- Final robust platform-settings writer: every editable platform control has a DB-backed path.
CREATE OR REPLACE FUNCTION public.admin_update_platform_settings(_settings jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.platform_settings%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RETURN jsonb_build_object('ok',false,'reason','forbidden');
  END IF;

  UPDATE public.platform_settings SET
    activation_fee = CASE WHEN _settings ? 'activation_fee' THEN GREATEST((_settings->>'activation_fee')::numeric,0) ELSE activation_fee END,
    activation_required = CASE WHEN _settings ? 'activation_required' THEN (_settings->>'activation_required')::boolean ELSE activation_required END,
    withdrawal_requires_activation = CASE WHEN _settings ? 'withdrawal_requires_activation' THEN (_settings->>'withdrawal_requires_activation')::boolean ELSE withdrawal_requires_activation END,
    upgrade_requires_activation = CASE WHEN _settings ? 'upgrade_requires_activation' THEN (_settings->>'upgrade_requires_activation')::boolean ELSE upgrade_requires_activation END,
    upgrade_requires_receipt = CASE WHEN _settings ? 'upgrade_requires_receipt' THEN (_settings->>'upgrade_requires_receipt')::boolean ELSE upgrade_requires_receipt END,
    activation_auto_approve = CASE WHEN _settings ? 'activation_auto_approve' THEN (_settings->>'activation_auto_approve')::boolean ELSE activation_auto_approve END,
    activation_instructions = CASE WHEN _settings ? 'activation_instructions' THEN COALESCE(_settings->>'activation_instructions',activation_instructions) ELSE activation_instructions END,
    welcome_bonus = CASE WHEN _settings ? 'welcome_bonus' THEN GREATEST((_settings->>'welcome_bonus')::numeric,0) ELSE welcome_bonus END,
    activated_starter_pack_reward = CASE WHEN _settings ? 'activated_starter_pack_reward' THEN GREATEST((_settings->>'activated_starter_pack_reward')::numeric,0) ELSE activated_starter_pack_reward END,
    default_reward_per_tap = CASE WHEN _settings ? 'default_reward_per_tap' THEN GREATEST((_settings->>'default_reward_per_tap')::numeric,0) ELSE default_reward_per_tap END,
    daily_bonus_amount = CASE WHEN _settings ? 'daily_bonus_amount' THEN GREATEST((_settings->>'daily_bonus_amount')::numeric,0) ELSE daily_bonus_amount END,
    daily_bonus_cooldown_hours = CASE WHEN _settings ? 'daily_bonus_cooldown_hours' THEN GREATEST((_settings->>'daily_bonus_cooldown_hours')::integer,0) ELSE daily_bonus_cooldown_hours END,
    daily_bonus_enabled = CASE WHEN _settings ? 'daily_bonus_enabled' THEN (_settings->>'daily_bonus_enabled')::boolean ELSE daily_bonus_enabled END,
    referral_reward = CASE WHEN _settings ? 'referral_reward' THEN GREATEST((_settings->>'referral_reward')::numeric,0) ELSE referral_reward END,
    referral_commission = CASE WHEN _settings ? 'referral_commission' THEN GREATEST((_settings->>'referral_commission')::numeric,0) ELSE referral_commission END,
    referral_conditions = CASE WHEN _settings ? 'referral_conditions' THEN COALESCE(_settings->>'referral_conditions',referral_conditions) ELSE referral_conditions END,
    tap_multiplier = CASE WHEN _settings ? 'tap_multiplier' THEN GREATEST((_settings->>'tap_multiplier')::numeric,0) ELSE tap_multiplier END,
    weekend_multiplier = CASE WHEN _settings ? 'weekend_multiplier' THEN GREATEST((_settings->>'weekend_multiplier')::numeric,0) ELSE weekend_multiplier END,
    weekend_multiplier_enabled = CASE WHEN _settings ? 'weekend_multiplier_enabled' THEN (_settings->>'weekend_multiplier_enabled')::boolean ELSE weekend_multiplier_enabled END,
    event_multiplier = CASE WHEN _settings ? 'event_multiplier' THEN GREATEST((_settings->>'event_multiplier')::numeric,0) ELSE event_multiplier END,
    event_multiplier_enabled = CASE WHEN _settings ? 'event_multiplier_enabled' THEN (_settings->>'event_multiplier_enabled')::boolean ELSE event_multiplier_enabled END,
    min_tap_reward = CASE WHEN _settings ? 'min_tap_reward' THEN GREATEST((_settings->>'min_tap_reward')::numeric,0) ELSE min_tap_reward END,
    max_tap_reward = CASE WHEN _settings ? 'max_tap_reward' THEN GREATEST((_settings->>'max_tap_reward')::numeric,0) ELSE max_tap_reward END,
    tapping_enabled = CASE WHEN _settings ? 'tapping_enabled' THEN (_settings->>'tapping_enabled')::boolean ELSE tapping_enabled END,
    battery_enabled = CASE WHEN _settings ? 'battery_enabled' THEN (_settings->>'battery_enabled')::boolean ELSE battery_enabled END,
    cooldown_enabled = CASE WHEN _settings ? 'cooldown_enabled' THEN (_settings->>'cooldown_enabled')::boolean ELSE cooldown_enabled END,
    unlimited_taps = CASE WHEN _settings ? 'unlimited_taps' THEN (_settings->>'unlimited_taps')::boolean ELSE unlimited_taps END,
    tasks_enabled = CASE WHEN _settings ? 'tasks_enabled' THEN (_settings->>'tasks_enabled')::boolean ELSE tasks_enabled END,
    questionnaires_enabled = CASE WHEN _settings ? 'questionnaires_enabled' THEN (_settings->>'questionnaires_enabled')::boolean ELSE questionnaires_enabled END,
    videos_enabled = CASE WHEN _settings ? 'videos_enabled' THEN (_settings->>'videos_enabled')::boolean ELSE videos_enabled END,
    reading_enabled = CASE WHEN _settings ? 'reading_enabled' THEN (_settings->>'reading_enabled')::boolean ELSE reading_enabled END,
    promotions_enabled = CASE WHEN _settings ? 'promotions_enabled' THEN (_settings->>'promotions_enabled')::boolean ELSE promotions_enabled END,
    withdrawals_enabled = CASE WHEN _settings ? 'withdrawals_enabled' THEN (_settings->>'withdrawals_enabled')::boolean ELSE withdrawals_enabled END,
    min_withdrawal = CASE WHEN _settings ? 'min_withdrawal' THEN GREATEST((_settings->>'min_withdrawal')::numeric,0) ELSE min_withdrawal END,
    max_withdrawal = CASE WHEN _settings ? 'max_withdrawal' THEN GREATEST((_settings->>'max_withdrawal')::numeric,0) ELSE max_withdrawal END,
    withdrawal_daily_limit = CASE WHEN _settings ? 'withdrawal_daily_limit' THEN GREATEST((_settings->>'withdrawal_daily_limit')::numeric,0) ELSE withdrawal_daily_limit END,
    max_withdrawals_per_day = CASE WHEN _settings ? 'max_withdrawals_per_day' THEN GREATEST((_settings->>'max_withdrawals_per_day')::integer,0) ELSE max_withdrawals_per_day END,
    withdrawal_processing_time = CASE WHEN _settings ? 'withdrawal_processing_time' THEN COALESCE(_settings->>'withdrawal_processing_time',withdrawal_processing_time) ELSE withdrawal_processing_time END,
    withdrawal_instructions = CASE WHEN _settings ? 'withdrawal_instructions' THEN COALESCE(_settings->>'withdrawal_instructions',withdrawal_instructions) ELSE withdrawal_instructions END,
    support_email = CASE WHEN _settings ? 'support_email' THEN COALESCE(_settings->>'support_email',support_email) ELSE support_email END,
    support_phone = CASE WHEN _settings ? 'support_phone' THEN COALESCE(_settings->>'support_phone',support_phone) ELSE support_phone END,
    whatsapp_number = CASE WHEN _settings ? 'whatsapp_number' THEN COALESCE(_settings->>'whatsapp_number',whatsapp_number) ELSE whatsapp_number END,
    bank_name = CASE WHEN _settings ? 'bank_name' THEN COALESCE(_settings->>'bank_name',bank_name) ELSE bank_name END,
    account_name = CASE WHEN _settings ? 'account_name' THEN COALESCE(_settings->>'account_name',account_name) ELSE account_name END,
    account_number = CASE WHEN _settings ? 'account_number' THEN COALESCE(_settings->>'account_number',account_number) ELSE account_number END,
    payment_instructions = CASE WHEN _settings ? 'payment_instructions' THEN COALESCE(_settings->>'payment_instructions',payment_instructions) ELSE payment_instructions END,
    announcement = CASE WHEN _settings ? 'announcement' THEN _settings->>'announcement' ELSE announcement END,
    maintenance_enabled = CASE WHEN _settings ? 'maintenance_enabled' THEN (_settings->>'maintenance_enabled')::boolean ELSE maintenance_enabled END,
    maintenance_message = CASE WHEN _settings ? 'maintenance_message' THEN COALESCE(_settings->>'maintenance_message',maintenance_message) ELSE maintenance_message END,
    maintenance_eta = CASE WHEN _settings ? 'maintenance_eta' THEN COALESCE(_settings->>'maintenance_eta',maintenance_eta) ELSE maintenance_eta END,
    business_hours = CASE WHEN _settings ? 'business_hours' THEN COALESCE(_settings->>'business_hours',business_hours) ELSE business_hours END,
    office_address = CASE WHEN _settings ? 'office_address' THEN COALESCE(_settings->>'office_address',office_address) ELSE office_address END,
    hero_title = CASE WHEN _settings ? 'hero_title' THEN COALESCE(_settings->>'hero_title',hero_title) ELSE hero_title END,
    hero_subtitle = CASE WHEN _settings ? 'hero_subtitle' THEN COALESCE(_settings->>'hero_subtitle',hero_subtitle) ELSE hero_subtitle END,
    security_notice = CASE WHEN _settings ? 'security_notice' THEN COALESCE(_settings->>'security_notice',security_notice) ELSE security_notice END,
    anti_scam_reminder = CASE WHEN _settings ? 'anti_scam_reminder' THEN COALESCE(_settings->>'anti_scam_reminder',anti_scam_reminder) ELSE anti_scam_reminder END,
    activation_processing_message = CASE WHEN _settings ? 'activation_processing_message' THEN COALESCE(NULLIF(trim(_settings->>'activation_processing_message'),''),activation_processing_message) ELSE activation_processing_message END,
    activation_success_message = CASE WHEN _settings ? 'activation_success_message' THEN COALESCE(NULLIF(trim(_settings->>'activation_success_message'),''),activation_success_message) ELSE activation_success_message END,
    activation_rejection_message = CASE WHEN _settings ? 'activation_rejection_message' THEN COALESCE(NULLIF(trim(_settings->>'activation_rejection_message'),''),activation_rejection_message) ELSE activation_rejection_message END,
    upgrade_processing_message = CASE WHEN _settings ? 'upgrade_processing_message' THEN COALESCE(NULLIF(trim(_settings->>'upgrade_processing_message'),''),upgrade_processing_message) ELSE upgrade_processing_message END,
    upgrade_success_message = CASE WHEN _settings ? 'upgrade_success_message' THEN COALESCE(NULLIF(trim(_settings->>'upgrade_success_message'),''),upgrade_success_message) ELSE upgrade_success_message END,
    upgrade_rejection_message = CASE WHEN _settings ? 'upgrade_rejection_message' THEN COALESCE(NULLIF(trim(_settings->>'upgrade_rejection_message'),''),upgrade_rejection_message) ELSE upgrade_rejection_message END,
    withdrawal_processing_message = CASE WHEN _settings ? 'withdrawal_processing_message' THEN COALESCE(NULLIF(trim(_settings->>'withdrawal_processing_message'),''),withdrawal_processing_message) ELSE withdrawal_processing_message END,
    withdrawal_success_message = CASE WHEN _settings ? 'withdrawal_success_message' THEN COALESCE(NULLIF(trim(_settings->>'withdrawal_success_message'),''),withdrawal_success_message) ELSE withdrawal_success_message END,
    withdrawal_rejection_message = CASE WHEN _settings ? 'withdrawal_rejection_message' THEN COALESCE(NULLIF(trim(_settings->>'withdrawal_rejection_message'),''),withdrawal_rejection_message) ELSE withdrawal_rejection_message END,
    updated_at = now()
  WHERE id = true
  RETURNING * INTO r;

  RETURN jsonb_build_object('ok',true,'settings',to_jsonb(r));
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('ok',false,'reason',SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_platform_settings(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_platform_settings(jsonb) TO authenticated;
