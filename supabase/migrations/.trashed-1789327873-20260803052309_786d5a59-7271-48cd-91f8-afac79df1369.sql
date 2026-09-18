
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname not in ('has_role','set_updated_at','handle_new_user','guard_profile_update','is_official_admin_email')
  loop
    execute format('revoke execute on function %s from anon', f.sig);
  end loop;
end $$;
