
create policy "users upload own receipts" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own receipts" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));
create policy "users delete own receipts" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.platform_settings
  add column if not exists maintenance_enabled boolean not null default false,
  add column if not exists maintenance_message text not null default 'EarnX-Finance is undergoing scheduled maintenance. We will be back shortly.',
  add column if not exists maintenance_eta text not null default 'Within 1 hour',
  add column if not exists payment_instructions text not null default 'Transfer the exact amount to the official account below, then upload your payment receipt for review.',
  add column if not exists copy_button_text text not null default 'Copy account number',
  add column if not exists telegram_url text not null default '',
  add column if not exists facebook_url text not null default '',
  add column if not exists instagram_url text not null default '',
  add column if not exists twitter_url text not null default '',
  add column if not exists office_address text not null default '',
  add column if not exists hero_title text not null default 'Tap. Earn. Withdraw.',
  add column if not exists hero_subtitle text not null default 'Nigeria''s premium earning platform. Earn real Naira daily from taps, tasks, surveys and referrals.',
  add column if not exists landing_stats jsonb not null default '[]'::jsonb,
  add column if not exists landing_faq jsonb not null default '[]'::jsonb,
  add column if not exists landing_features jsonb not null default '[]'::jsonb,
  add column if not exists footer_text text not null default 'EarnX-Finance — earn smarter every day.',
  add column if not exists daily_bonus_cooldown_hours integer not null default 24,
  add column if not exists upgrade_requires_receipt boolean not null default true,
  add column if not exists withdrawal_daily_limit numeric not null default 0,
  add column if not exists max_withdrawals_per_day integer not null default 1;

alter table public.levels
  add column if not exists daily_withdrawal_limit numeric not null default 0,
  add column if not exists max_withdrawals_per_day integer not null default 1,
  add column if not exists referral_reward numeric not null default 0,
  add column if not exists processing_time text not null default '24 hours';

alter table public.profiles
  add column if not exists admin_notes text;

create table if not exists public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_level integer not null,
  to_level integer not null,
  amount numeric not null,
  proof_url text,
  payer_name text,
  reference text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert on public.upgrade_requests to authenticated;
grant all on public.upgrade_requests to service_role;
alter table public.upgrade_requests enable row level security;
do $$ begin
  create policy "own upgrade requests" on public.upgrade_requests for select to authenticated
    using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "create own upgrade requests" on public.upgrade_requests for insert to authenticated
    with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

create table if not exists public.daily_bonus_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  claimed_on date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  unique (user_id, claimed_on)
);
grant select on public.daily_bonus_claims to authenticated;
grant all on public.daily_bonus_claims to service_role;
alter table public.daily_bonus_claims enable row level security;
do $$ begin
  create policy "own daily bonus claims" on public.daily_bonus_claims for select to authenticated
    using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;

create or replace function public.claim_daily_bonus()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.platform_settings%rowtype; today date := (now() at time zone 'utc')::date;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason','unauthenticated'); end if;
  select * into s from public.platform_settings where id;
  if not coalesce(s.daily_bonus_enabled, false) then return jsonb_build_object('ok', false, 'reason','disabled'); end if;
  if exists (select 1 from public.daily_bonus_claims where user_id = uid and claimed_on = today) then
    return jsonb_build_object('ok', false, 'reason','already_claimed');
  end if;
  insert into public.daily_bonus_claims (user_id, amount) values (uid, s.daily_bonus_amount);
  update public.profiles set balance = balance + s.daily_bonus_amount,
    total_earned = total_earned + s.daily_bonus_amount, updated_at = now() where id = uid;
  insert into public.transactions (user_id, type, amount, description, status)
    values (uid, 'loyalty', s.daily_bonus_amount, 'Daily bonus', 'completed');
  insert into public.notifications (user_id, title, body, category)
    values (uid, 'Daily bonus claimed', 'Your daily bonus has been credited.', 'reward');
  return jsonb_build_object('ok', true, 'amount', s.daily_bonus_amount);
end; $$;

create or replace function public.submit_upgrade_request(_level integer, _payer_name text, _reference text, _proof_url text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p public.profiles%rowtype; lv public.levels%rowtype; s public.platform_settings%rowtype;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason','unauthenticated'); end if;
  select * into s from public.platform_settings where id;
  select * into p from public.profiles where id = uid;
  if not found then return jsonb_build_object('ok', false, 'reason','no_profile'); end if;
  if p.account_status <> 'active' then return jsonb_build_object('ok', false, 'reason','account_restricted'); end if;
  if coalesce(s.upgrade_requires_activation, true) and p.activation <> 'activated' then
    return jsonb_build_object('ok', false, 'reason','not_activated'); end if;
  select * into lv from public.levels where level = _level and enabled;
  if not found then return jsonb_build_object('ok', false, 'reason','level_unavailable'); end if;
  if _level <= p.level then return jsonb_build_object('ok', false, 'reason','already_at_level'); end if;
  if exists (select 1 from public.upgrade_requests where user_id = uid and status = 'pending') then
    return jsonb_build_object('ok', false, 'reason','pending_exists'); end if;
  insert into public.upgrade_requests (user_id, from_level, to_level, amount, proof_url, payer_name, reference)
    values (uid, p.level, _level, lv.upgrade_price, _proof_url, _payer_name, _reference);
  insert into public.notifications (user_id, title, body, category)
    values (uid, 'Upgrade request received', 'Your upgrade to ' || lv.name || ' is pending review.', 'upgrade');
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_review_upgrade(_request_id uuid, _approve boolean, _note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
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
    insert into public.transactions (user_id, type, amount, description, status)
      values (r.user_id, 'upgrade', r.amount, 'Upgrade to ' || lv.name, 'completed');
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
end; $$;

create or replace function public.admin_reset_user(_user_id uuid, _what text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare lv public.levels%rowtype;
begin
  if not public.has_role(auth.uid(),'admin') then return jsonb_build_object('ok', false, 'reason','forbidden'); end if;
  select l.* into lv from public.levels l join public.profiles p on p.level = l.level where p.id = _user_id;
  if _what = 'battery' then
    update public.profiles set battery = coalesce(lv.battery_capacity, 0), battery_updated_at = now(),
      cooldown_until = null, recharges_today = 0 where id = _user_id;
  elsif _what = 'taps' then
    update public.profiles set taps_today = 0 where id = _user_id;
  elsif _what = 'earnings' then
    update public.profiles set earned_today = 0 where id = _user_id;
  elsif _what = 'tasks' then
    delete from public.task_completions where user_id = _user_id and completed_on = (now() at time zone 'utc')::date;
  elsif _what = 'questionnaires' then
    delete from public.questionnaire_completions where user_id = _user_id;
  elsif _what = 'videos' then
    delete from public.video_completions where user_id = _user_id;
  elsif _what = 'welcome_bonus' then
    update public.profiles set welcome_bonus_claimed = false where id = _user_id;
  elsif _what = 'daily_bonus' then
    delete from public.daily_bonus_claims where user_id = _user_id;
  else
    return jsonb_build_object('ok', false, 'reason','unknown_target');
  end if;
  insert into public.admin_logs (admin_id, admin_name, action, target_user, details)
    values (auth.uid(), coalesce((select email from public.profiles where id = auth.uid()),'admin'),
      'reset_' || _what, _user_id, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_set_note(_user_id uuid, _note text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then return jsonb_build_object('ok', false, 'reason','forbidden'); end if;
  update public.profiles set admin_notes = _note where id = _user_id;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_send_notification(_audience text, _user_id uuid, _title text, _body text, _category text default 'system')
returns jsonb language plpgsql security definer set search_path = public as $$
declare n integer := 0;
begin
  if not public.has_role(auth.uid(),'admin') then return jsonb_build_object('ok', false, 'reason','forbidden'); end if;
  if _audience = 'one' then
    insert into public.notifications (user_id, title, body, category) values (_user_id, _title, _body, _category);
    n := 1;
  else
    insert into public.notifications (user_id, title, body, category)
    select p.id, _title, _body, _category from public.profiles p
    where (_audience = 'all')
       or (_audience = 'activated' and p.activation = 'activated')
       or (_audience = 'not_activated' and p.activation <> 'activated');
    get diagnostics n = row_count;
  end if;
  insert into public.admin_logs (admin_id, admin_name, action, target_user, details)
    values (auth.uid(), coalesce((select email from public.profiles where id = auth.uid()),'admin'),
      'send_notification', _user_id, jsonb_build_object('audience', _audience, 'count', n));
  return jsonb_build_object('ok', true, 'count', n);
end; $$;

create or replace function public.admin_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'utc')::date;
begin
  if not public.has_role(auth.uid(),'admin') then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object(
    'ok', true,
    'total_users', (select count(*) from public.profiles),
    'activated_users', (select count(*) from public.profiles where activation = 'activated'),
    'non_activated_users', (select count(*) from public.profiles where activation <> 'activated'),
    'pending_activations', (select count(*) from public.activation_requests where status = 'pending'),
    'pending_upgrades', (select count(*) from public.upgrade_requests where status = 'pending'),
    'pending_withdrawals', (select count(*) from public.withdrawals where status in ('processing','approved')),
    'today_registrations', (select count(*) from public.profiles where created_at::date = today),
    'today_earnings', (select coalesce(sum(earned_today),0) from public.profiles),
    'weekly_earnings', (select coalesce(sum(amount),0) from public.transactions where created_at > now() - interval '7 days' and status='completed' and amount > 0),
    'monthly_earnings', (select coalesce(sum(amount),0) from public.transactions where created_at > now() - interval '30 days' and status='completed' and amount > 0),
    'total_earnings', (select coalesce(sum(total_earned),0) from public.profiles),
    'total_taps_today', (select coalesce(sum(taps_today),0) from public.profiles),
    'questionnaires_completed', (select count(*) from public.questionnaire_completions),
    'tasks_completed', (select count(*) from public.task_completions),
    'videos_watched', (select count(*) from public.video_completions),
    'total_referrals', (select count(*) from public.referrals),
    'maintenance', (select maintenance_enabled from public.platform_settings where id)
  );
end; $$;
