-- EarnX final master bug fixes
-- Safe overrides only: no duplicate tables, no duplicate business systems.

-- 1) Bank-transfer activation is ALWAYS pending until Admin approves.
CREATE OR REPLACE FUNCTION public.submit_activation(_payer_name text, _reference text, _proof_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
  VALUES (uid, coalesce(s.activation_fee, 0), nullif(_proof_url,''), nullif(_payer_name,''), nullif(_reference,''), 'pending'::activation_status)
  RETURNING id INTO req_id;

  UPDATE public.profiles SET activation = 'pending', updated_at = now() WHERE id = uid;
  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (uid, 'Activation request received', 'Your bank-transfer receipt is being reviewed by Admin. You will be notified after a decision.', 'activation');

  RETURN jsonb_build_object('ok', true, 'id', req_id, 'auto', false);
END; $$;

-- 2) Legacy wallet-funded upgrade function can no longer bypass the bank-transfer review flow.
CREATE OR REPLACE FUNCTION public.upgrade_level(_level integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN jsonb_build_object('ok', false, 'reason', 'bank_transfer_review_required');
END; $$;

-- 3) Level-aware withdrawal limits: level values override platform defaults when non-zero.
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _bank_name text, _account_number text, _account_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  s public.platform_settings%ROWTYPE;
  lv public.levels%ROWTYPE;
  ref text; wid uuid;
  min_amt numeric; max_amt numeric; day_limit numeric; day_count_limit integer;
  used_today numeric; count_today integer;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  IF NOT coalesce(s.withdrawals_enabled, true) THEN RETURN jsonb_build_object('ok', false, 'reason', 'disabled'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  IF p.account_status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'reason', 'account_restricted'); END IF;
  IF coalesce(s.withdrawal_requires_activation, true) AND p.activation <> 'activated' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_activated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount'); END IF;

  SELECT * INTO lv FROM public.levels WHERE level = p.level;
  min_amt := coalesce(nullif(lv.min_withdrawal, 0), s.min_withdrawal, 5000);
  max_amt := coalesce(nullif(lv.max_withdrawal, 0), nullif(s.max_withdrawal, 0), 0);
  day_limit := coalesce(nullif(lv.daily_withdrawal_limit, 0), nullif(s.withdrawal_daily_limit, 0), 0);
  day_count_limit := coalesce(nullif(lv.max_withdrawals_per_day, 0), nullif(s.max_withdrawals_per_day, 0), 0);

  IF _amount < min_amt THEN RETURN jsonb_build_object('ok', false, 'reason', 'below_minimum', 'min', min_amt); END IF;
  IF max_amt > 0 AND _amount > max_amt THEN RETURN jsonb_build_object('ok', false, 'reason', 'above_maximum', 'max', max_amt); END IF;
  IF p.balance < _amount THEN RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance', 'balance', p.balance); END IF;

  SELECT coalesce(sum(amount), 0), count(*) INTO used_today, count_today
  FROM public.withdrawals
  WHERE user_id = uid AND created_at >= date_trunc('day', now()) AND status <> 'rejected';
  IF day_count_limit > 0 AND count_today >= day_count_limit THEN RETURN jsonb_build_object('ok', false, 'reason', 'daily_count_limit', 'limit', day_count_limit); END IF;
  IF day_limit > 0 AND used_today + _amount > day_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'daily_limit', 'limit', day_limit, 'used', used_today, 'remaining', GREATEST(day_limit - used_today, 0));
  END IF;
  IF coalesce(nullif(trim(_bank_name),''), '') = '' OR coalesce(nullif(trim(_account_number),''),'') = '' OR coalesce(nullif(trim(_account_name),''),'') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_bank_details');
  END IF;

  ref := 'WD' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  UPDATE public.profiles SET balance = balance - _amount, pending_balance = pending_balance + _amount,
    bank_name = trim(_bank_name), bank_account_number = trim(_account_number), bank_account_name = trim(_account_name), updated_at = now()
  WHERE id = uid;
  INSERT INTO public.withdrawals (user_id, reference, amount, bank_name, account_number, account_name, status)
  VALUES (uid, ref, _amount, trim(_bank_name), trim(_account_number), trim(_account_name), 'processing') RETURNING id INTO wid;
  INSERT INTO public.transactions (user_id, type, amount, description, status, reference)
  VALUES (uid, 'withdrawal', _amount, 'Withdrawal request', 'pending', ref);
  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (uid, 'Withdrawal request received', 'Your withdrawal is now being processed. Track the request for updates.', 'withdrawal');
  RETURN jsonb_build_object('ok', true, 'reference', ref, 'id', wid, 'processing_time', coalesce(nullif(lv.processing_time,''), s.withdrawal_processing_time), 'min', min_amt, 'max', max_amt);
END; $$;

-- 4) Admin balance adjustment must return the actual persisted balance and fail if user doesn't exist.
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user_id uuid, _amount numeric, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  admin_id uuid := auth.uid();
  new_balance numeric;
BEGIN
  IF NOT public.has_role(admin_id, 'admin') THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF _amount IS NULL OR _amount = 0 OR _amount <> _amount THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount'); END IF;
  UPDATE public.profiles SET balance = GREATEST(balance + _amount, 0),
    total_earned = CASE WHEN _amount > 0 THEN total_earned + _amount ELSE total_earned END, updated_at = now()
  WHERE id = _user_id RETURNING balance INTO new_balance;
  IF new_balance IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'user_not_found'); END IF;
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (_user_id, 'admin_adjustment', _amount, coalesce(nullif(trim(_reason),''), 'Admin adjustment'), 'completed');
  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (_user_id, 'Balance adjusted', 'Your account balance was adjusted by Admin. Check your transaction history for details.', 'account');
  INSERT INTO public.admin_logs (admin_id, admin_name, action, target_user, details)
  VALUES (admin_id, coalesce((SELECT username FROM public.profiles WHERE id = admin_id), 'admin'), 'adjust_balance', _user_id,
    jsonb_build_object('amount', _amount, 'reason', _reason, 'new_balance', new_balance));
  RETURN jsonb_build_object('ok', true, 'new_balance', new_balance);
END; $$;

-- 5) Users MUST see admin balance adjustments in their own transaction history.
DROP POLICY IF EXISTS "own transactions" ON public.transactions;
CREATE POLICY "own transactions" ON public.transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 6) Never expose activation/upgrade bank-transfer submissions as wallet transactions.
DELETE FROM public.transactions WHERE type IN ('activation', 'upgrade');

-- 7) Activation auto-approval is disabled for the current platform configuration.
UPDATE public.platform_settings SET activation_auto_approve = false WHERE id;
