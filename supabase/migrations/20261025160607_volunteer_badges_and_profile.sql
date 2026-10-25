-- Volunteers earn badges for missions the association confirms as done, and their profile keeps
-- what the AI understood about them (causes, interests, skills) plus an optional LinkedIn link.

-- Completed missions ----------------------------------------------------------------
alter table public.applications drop constraint applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('pending', 'accepted', 'declined', 'withdrawn', 'completed'));
alter table public.applications add column completed_at timestamptz;
comment on column public.applications.completed_at is 'Set by trigger when the association confirms the mission was done. Drives volunteer badges.';
create index applications_completed_idx on public.applications (volunteer_id) where status = 'completed';

-- Volunteers may only withdraw; associations accept, decline, reset, or confirm an accepted mission as done.
create or replace function private.guard_application_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
begin
  if new.status = old.status then
    return new;
  end if;
  new.completed_at := case when new.status = 'completed' then now() else null end;
  if caller is null then
    return new;
  end if;
  if caller = old.volunteer_id then
    if new.status <> 'withdrawn' then
      raise exception 'Volunteers can only withdraw an application' using errcode = '42501';
    end if;
  elsif new.status not in ('pending', 'accepted', 'declined', 'completed') then
    raise exception 'Associations can only accept, decline or complete an application' using errcode = '42501';
  elsif new.status = 'completed' and old.status <> 'accepted' then
    raise exception 'Only an accepted volunteer can complete a mission' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Volunteer profile -----------------------------------------------------------------
alter table public.volunteer_profiles
  add column causes text[] not null default '{}' check (cardinality(causes) <= 14),
  add column interests text[] not null default '{}' check (cardinality(interests) <= 12),
  add column skills text[] not null default '{}' check (cardinality(skills) <= 12),
  add column linkedin_url text check (char_length(linkedin_url) <= 300);
comment on column public.volunteer_profiles.interests is 'Learned from the matching chat, editable by the volunteer.';
comment on column public.volunteer_profiles.linkedin_url is 'Optional, shown to associations the volunteer applied to.';
