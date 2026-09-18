drop function if exists public.admin_reply_ticket(uuid, text, ticket_status);
drop function if exists public.admin_reply_ticket(uuid, text, text);

create or replace function public.admin_reply_ticket(_ticket_id uuid, _reply text, _status text default 'resolved')
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare t public.support_tickets%rowtype;
begin
  if not public.has_role(auth.uid(),'admin') then return jsonb_build_object('ok', false, 'reason','forbidden'); end if;
  select * into t from public.support_tickets where id = _ticket_id;
  if not found then return jsonb_build_object('ok', false, 'reason','not_found'); end if;
  update public.support_tickets set admin_reply = _reply, status = _status::ticket_status, updated_at = now()
    where id = _ticket_id;
  insert into public.support_messages (ticket_id, sender, body) values (_ticket_id, 'admin', _reply);
  insert into public.notifications (user_id, title, body, category)
    values (t.user_id, 'Support replied: ' || t.subject, _reply, 'support');
  return jsonb_build_object('ok', true);
end $$;