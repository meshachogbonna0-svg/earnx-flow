
-- COMPLETE TASK
CREATE OR REPLACE FUNCTION public.complete_task(_task_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  t public.tasks%ROWTYPE;
  today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  SELECT * INTO t FROM public.tasks WHERE id = _task_id AND active;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'task_unavailable'); END IF;
  IF t.expires_at IS NOT NULL AND t.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'task_expired'); END IF;
  IF t.requires_activation AND p.activation <> 'activated' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_activated'); END IF;
  IF p.level < t.min_level THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'level_too_low'); END IF;
  IF EXISTS (SELECT 1 FROM public.task_completions WHERE user_id = uid AND task_id = _task_id AND completed_on = today) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed'); END IF;

  INSERT INTO public.task_completions (user_id, task_id, reward, completed_on)
  VALUES (uid, _task_id, t.reward, today);

  UPDATE public.profiles SET
    balance = balance + t.reward,
    total_earned = total_earned + t.reward,
    earned_today = CASE WHEN tap_day = today THEN earned_today + t.reward ELSE t.reward END,
    tap_day = today,
    updated_at = now()
  WHERE id = uid;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (uid, 'task', t.reward, 'Task reward: ' || t.title, 'completed');

  RETURN jsonb_build_object('ok', true, 'reward', t.reward);
END; $$;

-- WELCOME BONUS
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  bonus numeric;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  IF p.welcome_bonus_claimed THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed'); END IF;
  SELECT welcome_bonus INTO bonus FROM public.platform_settings WHERE id;
  bonus := coalesce(bonus, 0);
  UPDATE public.profiles SET
    balance = balance + bonus,
    total_earned = total_earned + bonus,
    welcome_bonus_claimed = true,
    updated_at = now()
  WHERE id = uid;
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (uid, 'welcome_bonus', bonus, 'Welcome bonus', 'completed');
  RETURN jsonb_build_object('ok', true, 'amount', bonus);
END; $$;

-- ACTIVATION REQUEST
CREATE OR REPLACE FUNCTION public.submit_activation(_payer_name text, _reference text, _proof_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  s public.platform_settings%ROWTYPE;
  req_id uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  IF p.activation = 'activated' THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_activated'); END IF;
  IF p.activation = 'pending' THEN RETURN jsonb_build_object('ok', false, 'reason', 'pending'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;

  INSERT INTO public.activation_requests (user_id, amount, proof_url, payer_name, reference, status)
  VALUES (uid, coalesce(s.activation_fee, 0), nullif(_proof_url,''), nullif(_payer_name,''), nullif(_reference,''),
          CASE WHEN coalesce(s.activation_auto_approve,false) THEN 'activated'::activation_status ELSE 'pending'::activation_status END)
  RETURNING id INTO req_id;

  IF coalesce(s.activation_auto_approve, false) THEN
    UPDATE public.profiles SET activation = 'activated', updated_at = now() WHERE id = uid;
    PERFORM public.settle_referral(uid);
  ELSE
    UPDATE public.profiles SET activation = 'pending', updated_at = now() WHERE id = uid;
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (uid, 'activation', coalesce(s.activation_fee,0), 'Account activation payment',
          CASE WHEN coalesce(s.activation_auto_approve,false) THEN 'completed'::transaction_status ELSE 'pending'::transaction_status END);

  RETURN jsonb_build_object('ok', true, 'id', req_id, 'auto', coalesce(s.activation_auto_approve,false));
END; $$;

-- REFERRAL SETTLEMENT (internal)
CREATE OR REPLACE FUNCTION public.settle_referral(_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inviter uuid;
  reward numeric;
BEGIN
  SELECT referred_by INTO inviter FROM public.profiles WHERE id = _user;
  IF inviter IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referrer_id = inviter AND referred_id = _user AND status = 'rewarded') THEN
    RETURN;
  END IF;
  SELECT referral_reward INTO reward FROM public.platform_settings WHERE id;
  reward := coalesce(reward, 0);

  INSERT INTO public.referrals (referrer_id, referred_id, status, reward, rewarded_at)
  VALUES (inviter, _user, 'rewarded', reward, now())
  ON CONFLICT DO NOTHING;
  UPDATE public.referrals SET status = 'rewarded', reward = reward, rewarded_at = now()
    WHERE referrer_id = inviter AND referred_id = _user;

  UPDATE public.profiles SET balance = balance + reward, total_earned = total_earned + reward, updated_at = now()
    WHERE id = inviter;
  INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (inviter, 'referral', reward, 'Referral reward', 'completed');
  INSERT INTO public.notifications (user_id, title, body, category)
    VALUES (inviter, 'Referral rewarded', 'You earned a referral bonus.', 'referral');
END; $$;

-- WITHDRAWAL REQUEST
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _bank_name text, _account_number text, _account_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  s public.platform_settings%ROWTYPE;
  ref text;
  wid uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  IF NOT coalesce(s.withdrawals_enabled, true) THEN RETURN jsonb_build_object('ok', false, 'reason', 'disabled'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  IF coalesce(s.withdrawal_requires_activation, true) AND p.activation <> 'activated' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_activated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount'); END IF;
  IF _amount < coalesce(s.min_withdrawal, 0) THEN RETURN jsonb_build_object('ok', false, 'reason', 'below_minimum'); END IF;
  IF s.max_withdrawal IS NOT NULL AND s.max_withdrawal > 0 AND _amount > s.max_withdrawal THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'above_maximum'); END IF;
  IF p.balance < _amount THEN RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance'); END IF;
  IF coalesce(nullif(trim(_bank_name),''), '') = '' OR coalesce(nullif(trim(_account_number),''),'') = ''
     OR coalesce(nullif(trim(_account_name),''),'') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_bank_details'); END IF;

  ref := 'WD' || upper(substr(md5(gen_random_uuid()::text), 1, 8));

  UPDATE public.profiles SET
    balance = balance - _amount,
    pending_balance = pending_balance + _amount,
    bank_name = trim(_bank_name),
    bank_account_number = trim(_account_number),
    bank_account_name = trim(_account_name),
    updated_at = now()
  WHERE id = uid;

  INSERT INTO public.withdrawals (user_id, reference, amount, bank_name, account_number, account_name, status)
  VALUES (uid, ref, _amount, trim(_bank_name), trim(_account_number), trim(_account_name), 'processing')
  RETURNING id INTO wid;

  INSERT INTO public.transactions (user_id, type, amount, description, status, reference)
  VALUES (uid, 'withdrawal', _amount, 'Withdrawal request', 'pending', ref);

  RETURN jsonb_build_object('ok', true, 'reference', ref, 'id', wid);
END; $$;

-- UPGRADE LEVEL
CREATE OR REPLACE FUNCTION public.upgrade_level(_level integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  lv public.levels%ROWTYPE;
  s public.platform_settings%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  IF coalesce(s.upgrade_requires_activation, true) AND p.activation <> 'activated' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_activated'); END IF;
  SELECT * INTO lv FROM public.levels WHERE level = _level AND enabled;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'level_unavailable'); END IF;
  IF _level <= p.level THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_at_level'); END IF;
  IF p.balance < lv.upgrade_price THEN RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance'); END IF;

  UPDATE public.profiles SET
    balance = balance - lv.upgrade_price,
    level = _level,
    battery = lv.battery_capacity,
    battery_updated_at = now(),
    updated_at = now()
  WHERE id = uid;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (uid, 'upgrade', lv.upgrade_price, 'Upgrade to ' || lv.name, 'completed');

  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (uid, 'Plan upgraded', 'You are now on ' || lv.name || '.', 'upgrade');

  RETURN jsonb_build_object('ok', true, 'level', _level, 'name', lv.name);
END; $$;

-- ADMIN: review activation
CREATE OR REPLACE FUNCTION public.admin_review_activation(_request_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_id uuid := auth.uid();
  r public.activation_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(admin_id, 'admin') THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  SELECT * INTO r FROM public.activation_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  UPDATE public.activation_requests SET
    status = CASE WHEN _approve THEN 'activated'::activation_status ELSE 'rejected'::activation_status END,
    admin_note = _note, reviewed_by = admin_id, reviewed_at = now()
  WHERE id = _request_id;

  UPDATE public.profiles SET
    activation = CASE WHEN _approve THEN 'activated'::activation_status ELSE 'rejected'::activation_status END,
    updated_at = now()
  WHERE id = r.user_id;

  UPDATE public.transactions SET status = CASE WHEN _approve THEN 'completed'::transaction_status ELSE 'failed'::transaction_status END
    WHERE user_id = r.user_id AND type = 'activation' AND status = 'pending';

  IF _approve THEN PERFORM public.settle_referral(r.user_id); END IF;

  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (r.user_id,
    CASE WHEN _approve THEN 'Account activated' ELSE 'Activation rejected' END,
    coalesce(_note, CASE WHEN _approve THEN 'Your account is now active. Start earning!' ELSE 'Your activation request was rejected.' END),
    'activation');

  INSERT INTO public.admin_logs (admin_id, admin_name, action, target_user, details)
  VALUES (admin_id, coalesce((SELECT username FROM public.profiles WHERE id = admin_id), 'admin'),
          CASE WHEN _approve THEN 'approve_activation' ELSE 'reject_activation' END, r.user_id,
          jsonb_build_object('request_id', _request_id, 'note', _note));

  RETURN jsonb_build_object('ok', true);
END; $$;

-- ADMIN: review withdrawal
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_withdrawal_id uuid, _status withdrawal_status, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_id uuid := auth.uid();
  w public.withdrawals%ROWTYPE;
BEGIN
  IF NOT public.has_role(admin_id, 'admin') THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF w.status IN ('completed','rejected') THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_reviewed'); END IF;

  UPDATE public.withdrawals SET status = _status, admin_note = _note, reviewed_by = admin_id, reviewed_at = now()
  WHERE id = _withdrawal_id;

  IF _status = 'rejected' THEN
    UPDATE public.profiles SET balance = balance + w.amount, pending_balance = GREATEST(pending_balance - w.amount, 0), updated_at = now()
      WHERE id = w.user_id;
    UPDATE public.transactions SET status = 'reversed' WHERE reference = w.reference AND user_id = w.user_id;
  ELSIF _status = 'completed' THEN
    UPDATE public.profiles SET pending_balance = GREATEST(pending_balance - w.amount, 0), updated_at = now()
      WHERE id = w.user_id;
    UPDATE public.transactions SET status = 'completed' WHERE reference = w.reference AND user_id = w.user_id;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (w.user_id, 'Withdrawal ' || _status::text, coalesce(_note, 'Your withdrawal ' || w.reference || ' is now ' || _status::text || '.'), 'withdrawal');

  INSERT INTO public.admin_logs (admin_id, admin_name, action, target_user, details)
  VALUES (admin_id, coalesce((SELECT username FROM public.profiles WHERE id = admin_id), 'admin'),
          'review_withdrawal', w.user_id, jsonb_build_object('withdrawal_id', _withdrawal_id, 'status', _status, 'note', _note));

  RETURN jsonb_build_object('ok', true);
END; $$;

-- ADMIN: adjust balance
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user_id uuid, _amount numeric, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_id uuid := auth.uid();
BEGIN
  IF NOT public.has_role(admin_id, 'admin') THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF _amount IS NULL OR _amount = 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount'); END IF;

  UPDATE public.profiles SET
    balance = GREATEST(balance + _amount, 0),
    total_earned = CASE WHEN _amount > 0 THEN total_earned + _amount ELSE total_earned END,
    updated_at = now()
  WHERE id = _user_id;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (_user_id, 'admin_adjustment', _amount, coalesce(_reason, 'Admin adjustment'), 'completed');

  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (_user_id, 'Balance adjusted', coalesce(_reason, 'An admin adjusted your balance.'), 'account');

  INSERT INTO public.admin_logs (admin_id, admin_name, action, target_user, details)
  VALUES (admin_id, coalesce((SELECT username FROM public.profiles WHERE id = admin_id), 'admin'),
          'adjust_balance', _user_id, jsonb_build_object('amount', _amount, 'reason', _reason));

  RETURN jsonb_build_object('ok', true);
END; $$;

-- ADMIN: set account status
CREATE OR REPLACE FUNCTION public.admin_set_account_status(_user_id uuid, _status account_status)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_id uuid := auth.uid();
BEGIN
  IF NOT public.has_role(admin_id, 'admin') THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  UPDATE public.profiles SET account_status = _status, updated_at = now() WHERE id = _user_id;
  INSERT INTO public.admin_logs (admin_id, admin_name, action, target_user, details)
  VALUES (admin_id, coalesce((SELECT username FROM public.profiles WHERE id = admin_id), 'admin'),
          'set_account_status', _user_id, jsonb_build_object('status', _status));
  RETURN jsonb_build_object('ok', true);
END; $$;

REVOKE ALL ON FUNCTION public.settle_referral(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.complete_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_welcome_bonus() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_activation(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_level(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_activation(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_withdrawal(uuid, withdrawal_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, account_status) TO authenticated;
