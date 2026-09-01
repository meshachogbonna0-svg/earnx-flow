-- 1. Reading Center -------------------------------------------------------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  description text,
  cover_url text,
  file_url text not null,
  file_type text not null default 'pdf',
  reward numeric not null default 0,
  min_read_seconds integer not null default 60,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.books to anon, authenticated;
grant all on public.books to service_role;
alter table public.books enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='books' and policyname='books readable') then
    create policy "books readable" on public.books for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename='books' and policyname='books admin write') then
    create policy "books admin write" on public.books for all to authenticated
      using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
  end if;
end $$;

create table if not exists public.book_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  reward numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);
grant select, insert on public.book_completions to authenticated;
grant all on public.book_completions to service_role;
alter table public.book_completions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='book_completions' and policyname='own book completions') then
    create policy "own book completions" on public.book_completions for select to authenticated
      using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
  end if;
end $$;

alter table public.platform_settings add column if not exists reading_enabled boolean not null default true;
alter table public.platform_settings add column if not exists tour_enabled boolean not null default true;
alter table public.profiles add column if not exists tour_completed boolean not null default false;

create or replace function public.complete_book(_book_id uuid, _read_seconds integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare uid uuid := auth.uid(); b public.books%rowtype; s public.platform_settings%rowtype;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason','unauthenticated'); end if;
  select * into s from public.platform_settings where id;
  if not coalesce(s.reading_enabled, true) then return jsonb_build_object('ok', false, 'reason','disabled'); end if;
  select * into b from public.books where id = _book_id and active;
  if not found then return jsonb_build_object('ok', false, 'reason','unavailable'); end if;
  if coalesce(_read_seconds,0) < b.min_read_seconds then return jsonb_build_object('ok', false, 'reason','not_read'); end if;
  if exists (select 1 from public.book_completions where user_id = uid and book_id = b.id) then
    return jsonb_build_object('ok', false, 'reason','already_completed'); end if;
  insert into public.book_completions (user_id, book_id, reward) values (uid, b.id, b.reward);
  update public.profiles set balance = balance + b.reward, total_earned = total_earned + b.reward, updated_at = now() where id = uid;
  insert into public.transactions (user_id, type, amount, description, status)
    values (uid, 'task', b.reward, 'Reading reward: ' || b.title, 'completed');
  return jsonb_build_object('ok', true, 'reward', b.reward);
end $$;

-- 2. Support ticket threads ------------------------------------------------
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender text not null default 'user',
  body text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.support_messages to authenticated;
grant all on public.support_messages to service_role;
alter table public.support_messages enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='support_messages' and policyname='ticket participants read') then
    create policy "ticket participants read" on public.support_messages for select to authenticated
      using (public.has_role(auth.uid(),'admin')
        or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename='support_messages' and policyname='ticket owner writes') then
    create policy "ticket owner writes" on public.support_messages for insert to authenticated
      with check (sender = 'user' and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid()));
  end if;
end $$;

-- 3. Bank-transfer payments must never appear in the wallet ledger ---------
create or replace function public.submit_activation(_payer_name text, _reference text, _proof_url text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
DECLARE uid uuid := auth.uid(); p public.profiles%ROWTYPE; s public.platform_settings%ROWTYPE; req_id uuid;
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
    INSERT INTO public.notifications (user_id, title, body, category)
    VALUES (uid, 'Activation request received', 'We are reviewing your payment receipt. You will be notified once it is approved.', 'activation');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', req_id, 'auto', coalesce(s.activation_auto_approve,false));
END $$;

create or replace function public.admin_review_upgrade(_request_id uuid, _approve boolean, _note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare r public.upgrade_requests%rowtype; lv public.levels%rowtype;
begin
  if not public.has_role(auth.uid(),'admin') then return jsonb_build_object('ok', false, 'reason','forbidden'); end if;
  select * into r from public.upgrade_requests where id = _request_id for update;
  if not found or r.status <> 'pending' then return jsonb_build_object('ok', false, 'reason','invalid_request'); end if;
  select * into lv from public.levels where level = r.to_level;
  update public.upgrade_requests set status = case when _approve then 'approved' else 'rejected' end,
    admin_note = _note, reviewed_by = auth.uid(), reviewed_at = now() where id = _request_id;
  if _approve then
    update public.profiles set level = r.to_level, battery = lv.battery_capacity,
      battery_updated_at = now(), updated_at = now() where id = r.user_id;
    insert into public.notifications (user_id, title, body, category)
      values (r.user_id, 'Upgrade approved', 'You are now on ' || lv.name || '.', 'upgrade');
  else
    insert into public.notifications (user_id, title, body, category)
      values (r.user_id, 'Upgrade rejected', coalesce(_note,'Your upgrade request was rejected.'), 'upgrade');
  end if;
  insert into public.admin_logs (admin_id, admin_name, action, target_user, details)
    values (auth.uid(), coalesce((select email from public.profiles where id = auth.uid()),'admin'),
      case when _approve then 'approve_upgrade' else 'reject_upgrade' end, r.user_id,
      jsonb_build_object('request_id', _request_id, 'level', r.to_level));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_review_activation(_request_id uuid, _approve boolean, _note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
DECLARE admin_id uuid := auth.uid(); r public.activation_requests%ROWTYPE;
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
END $$;

delete from public.transactions where type in ('activation','upgrade');

-- 4. Admin listing helpers with user context -------------------------------
create or replace function public.admin_requests(_kind text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare res jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then return jsonb_build_object('ok', false, 'reason','forbidden'); end if;
  if _kind = 'activation' then
    select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) into res from (
      select jsonb_build_object('id', a.id, 'user_id', a.user_id, 'username', p.username, 'email', p.email,
        'full_name', concat_ws(' ', p.first_name, p.other_names), 'amount', a.amount, 'payer_name', a.payer_name,
        'reference', a.reference, 'proof_url', a.proof_url, 'status', a.status, 'admin_note', a.admin_note,
        'created_at', a.created_at, 'reviewed_at', a.reviewed_at) x
      from public.activation_requests a left join public.profiles p on p.id = a.user_id) t;
  elsif _kind = 'upgrade' then
    select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) into res from (
      select jsonb_build_object('id', u.id, 'user_id', u.user_id, 'username', p.username, 'email', p.email,
        'full_name', concat_ws(' ', p.first_name, p.other_names), 'amount', u.amount, 'payer_name', u.payer_name,
        'reference', u.reference, 'proof_url', u.proof_url, 'status', u.status, 'admin_note', u.admin_note,
        'from_level', u.from_level, 'to_level', u.to_level,
        'created_at', u.created_at, 'reviewed_at', u.reviewed_at) x
      from public.upgrade_requests u left join public.profiles p on p.id = u.user_id) t;
  elsif _kind = 'withdrawal' then
    select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) into res from (
      select jsonb_build_object('id', w.id, 'user_id', w.user_id, 'username', p.username, 'email', p.email,
        'amount', w.amount, 'reference', w.reference, 'bank_name', w.bank_name, 'account_number', w.account_number,
        'account_name', w.account_name, 'status', w.status, 'admin_note', w.admin_note,
        'created_at', w.created_at, 'reviewed_at', w.reviewed_at) x
      from public.withdrawals w left join public.profiles p on p.id = w.user_id) t;
  elsif _kind = 'support' then
    select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) into res from (
      select jsonb_build_object('id', s.id, 'user_id', s.user_id, 'username', p.username, 'email', p.email,
        'subject', s.subject, 'description', s.description, 'screenshot_url', s.screenshot_url,
        'status', s.status, 'admin_reply', s.admin_reply, 'created_at', s.created_at) x
      from public.support_tickets s left join public.profiles p on p.id = s.user_id) t;
  elsif _kind = 'transaction' then
    select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) into res from (
      select jsonb_build_object('id', tr.id, 'user_id', tr.user_id, 'username', p.username, 'type', tr.type,
        'amount', tr.amount, 'description', tr.description, 'status', tr.status, 'created_at', tr.created_at) x
      from public.transactions tr left join public.profiles p on p.id = tr.user_id
      order by tr.created_at desc limit 300) t;
  else
    res := '[]'::jsonb;
  end if;
  return jsonb_build_object('ok', true, 'rows', res);
end $$;

create or replace function public.admin_reply_ticket(_ticket_id uuid, _reply text, _status text default 'resolved')
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare t public.support_tickets%rowtype;
begin
  if not public.has_role(auth.uid(),'admin') then return jsonb_build_object('ok', false, 'reason','forbidden'); end if;
  select * into t from public.support_tickets where id = _ticket_id;
  if not found then return jsonb_build_object('ok', false, 'reason','not_found'); end if;
  update public.support_tickets set admin_reply = _reply, status = _status::support_status, updated_at = now()
    where id = _ticket_id;
  insert into public.support_messages (ticket_id, sender, body) values (_ticket_id, 'admin', _reply);
  insert into public.notifications (user_id, title, body, category)
    values (t.user_id, 'Support replied: ' || t.subject, _reply, 'support');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.complete_tour()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  update public.profiles set tour_completed = true, updated_at = now() where id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.restart_tour()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  update public.profiles set tour_completed = false, updated_at = now() where id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- 5. Realtime for live balance / notification updates ----------------------
alter table public.profiles replica identity full;
alter table public.notifications replica identity full;
alter table public.transactions replica identity full;
do $$ begin
  begin execute 'alter publication supabase_realtime add table public.profiles'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.notifications'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.transactions'; exception when duplicate_object then null; end;
end $$;
