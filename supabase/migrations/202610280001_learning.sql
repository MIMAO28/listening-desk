-- Run once in the owner's Supabase SQL Editor. No database password is used
-- by the website. Users can SELECT only their own rows; writes use RPCs.
create table if not exists public.learning_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) <= 120),
  language text not null check (language in ('en-US','ja-JP')),
  study_day date not null default ((now() at time zone 'Asia/Shanghai')::date),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  sentence_count integer not null default 0,
  points integer not null default 0,
  correct_words integer not null default 0,
  total_words integer not null default 0,
  completed boolean not null default false
);
create index if not exists learning_sessions_owner on public.learning_sessions(user_id, study_day desc);
create table if not exists public.sentence_results (
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sentence_index integer not null check (sentence_index between 0 and 9999),
  correct_words integer not null check (correct_words >= 0),
  total_words integer not null check (total_words between 1 and 2000),
  primary key (session_id, sentence_index),
  check (correct_words <= total_words)
);
alter table public.learning_sessions enable row level security;
alter table public.sentence_results enable row level security;
drop policy if exists own_learning_sessions on public.learning_sessions;
create policy own_learning_sessions on public.learning_sessions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists own_sentence_results on public.sentence_results;
create policy own_sentence_results on public.sentence_results for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.learning_sessions, public.sentence_results from anon, authenticated;
grant select on public.learning_sessions, public.sentence_results to authenticated;

create or replace function public.save_learning_session(p_id uuid, p_title text, p_language text, p_seconds integer, p_completed boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); started timestamptz;
begin
  if owner is null then raise exception 'Authentication required'; end if;
  if p_seconds < 0 or p_seconds > 86400 then raise exception 'Invalid duration'; end if;
  insert into public.learning_sessions(id,user_id,title,language) values(p_id,owner,left(p_title,120),p_language) on conflict(id) do nothing;
  select started_at into started from public.learning_sessions where id=p_id and user_id=owner for update;
  if not found then raise exception 'Permission denied'; end if;
  update public.learning_sessions set duration_seconds=greatest(duration_seconds,least(p_seconds,ceil(extract(epoch from now()-started))::integer+60)),
    completed=completed or p_completed, updated_at=now() where id=p_id and user_id=owner;
end $$;

create or replace function public.submit_learning_sentence(p_session uuid, p_index integer, p_correct integer, p_total integer)
returns void language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid();
begin
  if owner is null then raise exception 'Authentication required'; end if;
  perform 1 from public.learning_sessions where id=p_session and user_id=owner for update;
  if not found then raise exception 'Permission denied'; end if;
  if p_total < 1 or p_total > 2000 or p_correct < 0 or p_correct > p_total or p_index < 0 or p_index > 9999 then raise exception 'Invalid result'; end if;
  insert into public.sentence_results values(p_session,owner,p_index,p_correct,p_total)
    on conflict(session_id,sentence_index) do update set
      correct_words=greatest(public.sentence_results.correct_words,excluded.correct_words)
    where public.sentence_results.total_words=excluded.total_words;
  update public.learning_sessions set
    sentence_count=(select count(*) from public.sentence_results where session_id=p_session),
    points=(select coalesce(sum(correct_words),0) from public.sentence_results where session_id=p_session),
    correct_words=(select coalesce(sum(correct_words),0) from public.sentence_results where session_id=p_session),
    total_words=(select coalesce(sum(total_words),0) from public.sentence_results where session_id=p_session),
    updated_at=now() where id=p_session and user_id=owner;
end $$;
revoke all on function public.save_learning_session(uuid,text,text,integer,boolean) from public, anon;
revoke all on function public.submit_learning_sentence(uuid,integer,integer,integer) from public, anon;
grant execute on function public.save_learning_session(uuid,text,text,integer,boolean) to authenticated;
grant execute on function public.submit_learning_sentence(uuid,integer,integer,integer) to authenticated;
