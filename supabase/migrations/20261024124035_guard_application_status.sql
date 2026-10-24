-- Volunteers may only withdraw; associations may only accept, decline or reset to pending.
create or replace function private.guard_application_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or new.status = old.status then
    return new;
  end if;
  if caller = old.volunteer_id then
    if new.status <> 'withdrawn' then
      raise exception 'Volunteers can only withdraw an application' using errcode = '42501';
    end if;
  elsif new.status not in ('pending', 'accepted', 'declined') then
    raise exception 'Associations can only accept or decline an application' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger applications_guard_status before update on public.applications
  for each row execute function private.guard_application_status();
