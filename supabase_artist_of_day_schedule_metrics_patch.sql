-- ============================
-- Artist of the Day — Schedule + Metrics (Light) — Patch Único
-- ============================

-- 0) Tabela de agendamento (1 artista por dia UTC)
create table if not exists public.artist_of_day_schedule (
  day_utc date primary key,
  artist_id uuid not null,
  set_by uuid null,
  set_at timestamptz not null default now()
);

create index if not exists ix_artist_of_day_schedule_artist on public.artist_of_day_schedule (artist_id);

alter table public.artist_of_day_schedule enable row level security;

-- RLS: ninguém escreve via client; apenas admins via RPC (security definer)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'artist_of_day_schedule'
      and policyname = 'artist_of_day_schedule_select_auth'
  ) then
    create policy artist_of_day_schedule_select_auth
      on public.artist_of_day_schedule
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'artist_of_day_schedule'
      and policyname = 'artist_of_day_schedule_write_none'
  ) then
    create policy artist_of_day_schedule_write_none
      on public.artist_of_day_schedule
      for all
      to authenticated
      using (false)
      with check (false);
  end if;
end $$;

-- 1) RPC: Admin agenda artista do dia
create or replace function public.admin_schedule_artist_of_day(
  p_day_utc date,
  p_artist_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_day date;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas admins';
  end if;

  if p_day_utc is null then
    raise exception 'day_utc obrigatório';
  end if;

  if p_artist_id is null then
    raise exception 'artist_id obrigatório';
  end if;

  v_day := p_day_utc;

  insert into public.artist_of_day_schedule(day_utc, artist_id, set_by, set_at)
  values (v_day, p_artist_id, auth.uid(), now())
  on conflict (day_utc) do update
    set artist_id = excluded.artist_id,
        set_by = excluded.set_by,
        set_at = now();

  return jsonb_build_object(
    'success', true,
    'day_utc', v_day,
    'artist_id', p_artist_id
  );
end;
$function$;

-- 2) RPC: Admin remove agenda de um dia
create or replace function public.admin_clear_artist_of_day_schedule_day(
  p_day_utc date
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_day date;
  v_deleted boolean := false;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas admins';
  end if;

  if p_day_utc is null then
    raise exception 'day_utc obrigatório';
  end if;

  v_day := p_day_utc;

  delete from public.artist_of_day_schedule
  where day_utc = v_day;

  v_deleted := found;

  return jsonb_build_object(
    'success', true,
    'day_utc', v_day,
    'deleted', v_deleted
  );
end;
$function$;

-- 3) RPC: Admin lista agenda (range)
create or replace function public.admin_list_artist_of_day_schedule(
  p_from date,
  p_to date,
  p_limit int default 60
)
returns table (
  day_utc date,
  artist_id uuid,
  set_by uuid,
  set_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas admins';
  end if;

  if p_from is null or p_to is null then
    raise exception 'from/to obrigatórios';
  end if;

  return query
  select s.day_utc, s.artist_id, s.set_by, s.set_at
  from public.artist_of_day_schedule s
  where s.day_utc between p_from and p_to
  order by s.day_utc asc
  limit greatest(1, least(coalesce(p_limit, 60), 366));
end;
$function$;

-- 4) RPC: Métricas leves do dia (1 chamada)
create or replace function public.admin_get_artist_of_day_metrics(
  p_day_utc date default ((now() at time zone 'utc')::date)
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_day date := p_day_utc;
  v_artist uuid;
  v_total_clicks bigint := 0;
  v_unique_viewers bigint := 0;

  v_spotify_clicks bigint := 0;
  v_youtube_clicks bigint := 0;
  v_instagram_clicks bigint := 0;

  v_spotify_unique bigint := 0;
  v_youtube_unique bigint := 0;
  v_instagram_unique bigint := 0;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas admins';
  end if;

  -- resolve artista do dia (mesma ordem do get_artist_of_day)
  select a.artist_id into v_artist
  from public.artist_of_day a
  where a.day_utc = v_day;

  if v_artist is null then
    select s.artist_id into v_artist
    from public.artist_of_day_schedule s
    where s.day_utc = v_day;
  end if;

  if v_artist is null then
    select (value->>'id')::uuid into v_artist
    from public.event_settings
    where key = 'artist_of_day_user_id';
  end if;

  if v_artist is null then
    return jsonb_build_object(
      'success', true,
      'has_artist', false,
      'day_utc', v_day
    );
  end if;

  select
    count(*)::bigint,
    count(distinct viewer_id)::bigint
  into v_total_clicks, v_unique_viewers
  from public.artist_of_day_clicks
  where day_utc = v_day
    and artist_id = v_artist;

  -- clicks por plataforma
  select count(*)::bigint into v_spotify_clicks
  from public.artist_of_day_clicks
  where day_utc = v_day and artist_id = v_artist and platform = 'spotify';

  select count(*)::bigint into v_youtube_clicks
  from public.artist_of_day_clicks
  where day_utc = v_day and artist_id = v_artist and platform = 'youtube';

  select count(*)::bigint into v_instagram_clicks
  from public.artist_of_day_clicks
  where day_utc = v_day and artist_id = v_artist and platform = 'instagram';

  -- uniques por plataforma
  select count(distinct viewer_id)::bigint into v_spotify_unique
  from public.artist_of_day_clicks
  where day_utc = v_day and artist_id = v_artist and platform = 'spotify';

  select count(distinct viewer_id)::bigint into v_youtube_unique
  from public.artist_of_day_clicks
  where day_utc = v_day and artist_id = v_artist and platform = 'youtube';

  select count(distinct viewer_id)::bigint into v_instagram_unique
  from public.artist_of_day_clicks
  where day_utc = v_day and artist_id = v_artist and platform = 'instagram';

  return jsonb_build_object(
    'success', true,
    'has_artist', true,
    'day_utc', v_day,
    'artist_id', v_artist,
    'total_clicks', v_total_clicks,
    'unique_viewers', v_unique_viewers,
    'by_platform', jsonb_build_object(
      'spotify', jsonb_build_object('clicks', v_spotify_clicks, 'unique', v_spotify_unique),
      'youtube', jsonb_build_object('clicks', v_youtube_clicks, 'unique', v_youtube_unique),
      'instagram', jsonb_build_object('clicks', v_instagram_clicks, 'unique', v_instagram_unique)
    )
  );
end;
$function$;

-- 5) Update: get_artist_of_day agora considera agenda antes do fallback event_settings
create or replace function public.get_artist_of_day()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid;
  v_day date;
  v_artist uuid;
  v_artist_profile public.profiles;
  v_clicked jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_day := (now() at time zone 'utc')::date;

  -- 1) set manual do dia
  select a.artist_id into v_artist
  from public.artist_of_day a
  where a.day_utc = v_day;

  -- 2) agenda do dia
  if v_artist is null then
    select s.artist_id into v_artist
    from public.artist_of_day_schedule s
    where s.day_utc = v_day;
  end if;

  -- 3) fallback compat (event_settings)
  if v_artist is null then
    select (value->>'id')::uuid into v_artist
    from public.event_settings
    where key = 'artist_of_day_user_id';
  end if;

  if v_artist is null then
    return jsonb_build_object('success', true, 'has_artist', false);
  end if;

  select * into v_artist_profile
  from public.profiles
  where id = v_artist;

  select coalesce(
    jsonb_object_agg(platform, true),
    '{}'::jsonb
  ) into v_clicked
  from public.artist_of_day_clicks c
  where c.day_utc = v_day
    and c.viewer_id = v_uid
    and c.artist_id = v_artist;

  return jsonb_build_object(
    'success', true,
    'has_artist', true,
    'day_utc', v_day,
    'artist', jsonb_build_object(
      'id', v_artist_profile.id,
      'display_name', coalesce(v_artist_profile.display_name, v_artist_profile.name),
      'artistic_name', v_artist_profile.artistic_name,
      'avatar_url', v_artist_profile.avatar_url,
      'level', v_artist_profile.level,
      'spotify_url', v_artist_profile.spotify_url,
      'youtube_url', v_artist_profile.youtube_url,
      'instagram_url', v_artist_profile.instagram_url
    ),
    'clicked', v_clicked
  );
end;
$function$;
