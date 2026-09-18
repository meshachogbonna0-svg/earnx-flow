-- 1. Sequential upgrade enforcement -------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_upgrade_request(_level integer, _payer_name text, _reference text, _proof_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare uid uuid := auth.uid(); p public.profiles%rowtype; lv public.levels%rowtype; s public.platform_settings%rowtype; pend public.upgrade_requests%rowtype;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason','unauthenticated'); end if;
  select * into s from public.platform_settings where id;
  select * into p from public.profiles where id = uid;
  if not found then return jsonb_build_object('ok', false, 'reason','no_profile'); end if;
  if p.account_status <> 'active' then return jsonb_build_object('ok', false, 'reason','account_restricted'); end if;
  if coalesce(s.upgrade_requires_activation, true) and p.activation <> 'activated' then
    return jsonb_build_object('ok', false, 'reason','not_activated'); end if;

  select * into pend from public.upgrade_requests where user_id = uid and status = 'pending' order by created_at desc limit 1;
  if found then
    return jsonb_build_object('ok', false, 'reason','pending_exists', 'pending_level', pend.to_level, 'pending_since', pend.created_at);
  end if;

  select * into lv from public.levels where level = _level and enabled;
  if not found then return jsonb_build_object('ok', false, 'reason','level_unavailable'); end if;
  if _level <= p.level then return jsonb_build_object('ok', false, 'reason','already_at_level'); end if;
  if _level <> p.level + 1 then
    return jsonb_build_object('ok', false, 'reason','not_sequential', 'next_level', p.level + 1);
  end if;

  insert into public.upgrade_requests (user_id, from_level, to_level, amount, proof_url, payer_name, reference)
    values (uid, p.level, _level, lv.upgrade_price, _proof_url, _payer_name, _reference);
  insert into public.notifications (user_id, title, body, category)
    values (uid, 'Upgrade request received', 'Your upgrade to ' || lv.name || ' is pending review.', 'upgrade');
  return jsonb_build_object('ok', true);
end; $function$;

CREATE OR REPLACE FUNCTION public.upgrade_level(_level integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); p public.profiles%ROWTYPE; lv public.levels%ROWTYPE; s public.platform_settings%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  IF coalesce(s.upgrade_requires_activation, true) AND p.activation <> 'activated' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_activated'); END IF;
  IF EXISTS (SELECT 1 FROM public.upgrade_requests WHERE user_id = uid AND status = 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'pending_exists'); END IF;
  SELECT * INTO lv FROM public.levels WHERE level = _level AND enabled;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'level_unavailable'); END IF;
  IF _level <= p.level THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_at_level'); END IF;
  IF _level <> p.level + 1 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_sequential', 'next_level', p.level + 1); END IF;
  IF p.balance < lv.upgrade_price THEN RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance'); END IF;

  UPDATE public.profiles SET balance = balance - lv.upgrade_price, level = _level,
    battery = lv.battery_capacity, battery_updated_at = now(), updated_at = now() WHERE id = uid;
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (uid, 'upgrade', lv.upgrade_price, 'Upgrade to ' || lv.name, 'completed');
  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (uid, 'Plan upgraded', 'You are now on ' || lv.name || '.', 'upgrade');
  RETURN jsonb_build_object('ok', true, 'level', _level, 'name', lv.name);
END; $function$;

-- 2. Withdrawal limits ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _bank_name text, _account_number text, _account_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
  IF coalesce(s.withdrawal_requires_activation, true) AND p.activation <> 'activated' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_activated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount'); END IF;

  SELECT * INTO lv FROM public.levels WHERE level = p.level;

  min_amt := coalesce(nullif(lv.min_withdrawal, 0), s.min_withdrawal, 0);
  max_amt := coalesce(nullif(lv.max_withdrawal, 0), nullif(s.max_withdrawal, 0), 0);
  day_limit := coalesce(nullif(lv.daily_withdrawal_limit, 0), nullif(s.withdrawal_daily_limit, 0), 0);
  day_count_limit := coalesce(nullif(lv.max_withdrawals_per_day, 0), nullif(s.max_withdrawals_per_day, 0), 0);

  IF _amount < min_amt THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'below_minimum', 'min', min_amt); END IF;
  IF max_amt > 0 AND _amount > max_amt THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'above_maximum', 'max', max_amt); END IF;
  IF p.balance < _amount THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance', 'balance', p.balance); END IF;

  SELECT coalesce(sum(amount), 0), count(*) INTO used_today, count_today
  FROM public.withdrawals
  WHERE user_id = uid AND created_at >= date_trunc('day', now()) AND status <> 'rejected';

  IF day_count_limit > 0 AND count_today >= day_count_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'daily_count_limit', 'limit', day_count_limit); END IF;
  IF day_limit > 0 AND used_today + _amount > day_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'daily_limit', 'limit', day_limit, 'used', used_today,
      'remaining', GREATEST(day_limit - used_today, 0)); END IF;

  IF coalesce(nullif(trim(_bank_name),''), '') = '' OR coalesce(nullif(trim(_account_number),''),'') = ''
     OR coalesce(nullif(trim(_account_name),''),'') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_bank_details'); END IF;

  ref := 'WD' || upper(substr(md5(gen_random_uuid()::text), 1, 8));

  UPDATE public.profiles SET balance = balance - _amount, pending_balance = pending_balance + _amount,
    bank_name = trim(_bank_name), bank_account_number = trim(_account_number),
    bank_account_name = trim(_account_name), updated_at = now() WHERE id = uid;

  INSERT INTO public.withdrawals (user_id, reference, amount, bank_name, account_number, account_name, status)
  VALUES (uid, ref, _amount, trim(_bank_name), trim(_account_number), trim(_account_name), 'processing')
  RETURNING id INTO wid;

  INSERT INTO public.transactions (user_id, type, amount, description, status, reference)
  VALUES (uid, 'withdrawal', _amount, 'Withdrawal request', 'pending', ref);

  RETURN jsonb_build_object('ok', true, 'reference', ref, 'id', wid,
    'processing_time', coalesce(nullif(lv.processing_time,''), s.withdrawal_processing_time));
END; $function$;

-- 3. Hide admin adjustments from the user's own transaction history -------------------
DROP POLICY IF EXISTS "own transactions" ON public.transactions;
CREATE POLICY "own transactions" ON public.transactions FOR SELECT TO authenticated
USING (
  (auth.uid() = user_id AND type <> 'admin_adjustment')
  OR public.has_role(auth.uid(), 'admin')
);

-- 4. Support ticket replies -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reply_ticket(_ticket_id uuid, _reply text, _status public.ticket_status)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare t public.support_tickets%rowtype;
begin
  if not public.has_role(auth.uid(),'admin') then return jsonb_build_object('ok', false, 'reason','forbidden'); end if;
  select * into t from public.support_tickets where id = _ticket_id;
  if not found then return jsonb_build_object('ok', false, 'reason','not_found'); end if;
  update public.support_tickets set admin_reply = coalesce(nullif(trim(_reply),''), admin_reply),
    status = coalesce(_status, status), updated_at = now() where id = _ticket_id;
  if coalesce(nullif(trim(_reply),''),'') <> '' then
    insert into public.notifications (user_id, title, body, category, link)
      values (t.user_id, 'Support replied to your ticket', _reply, 'support', '/support');
  end if;
  insert into public.admin_logs (admin_id, admin_name, action, target_user, details)
    values (auth.uid(), coalesce((select username from public.profiles where id = auth.uid()),'admin'),
      'reply_ticket', t.user_id, jsonb_build_object('ticket_id', _ticket_id, 'status', _status));
  return jsonb_build_object('ok', true);
end; $function$;

GRANT EXECUTE ON FUNCTION public.admin_reply_ticket(uuid, text, public.ticket_status) TO authenticated;

-- 5. Admin listing of upgrade requests with user details ------------------------------
CREATE OR REPLACE FUNCTION public.admin_upgrade_requests(_status text DEFAULT NULL, _search text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare result jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then return jsonb_build_object('ok', false, 'reason','forbidden'); end if;
  select coalesce(jsonb_agg(row_to_json(x) order by x.created_at desc), '[]'::jsonb) into result
  from (
    select r.id, r.user_id, r.from_level, r.to_level, r.amount, r.proof_url, r.payer_name,
           r.reference, r.status, r.admin_note, r.created_at, r.reviewed_at,
           p.username, p.email, p.first_name, p.phone
    from public.upgrade_requests r
    left join public.profiles p on p.id = r.user_id
    where (_status is null or _status = 'all' or r.status = _status)
      and (
        _search is null or _search = '' or
        p.username ilike '%' || _search || '%' or
        p.email ilike '%' || _search || '%' or
        r.reference ilike '%' || _search || '%' or
        r.id::text ilike '%' || _search || '%'
      )
    limit 300
  ) x;
  return jsonb_build_object('ok', true, 'rows', result);
end; $function$;

GRANT EXECUTE ON FUNCTION public.admin_upgrade_requests(text, text) TO authenticated;