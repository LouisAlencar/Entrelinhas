-- Execute uma vez no SQL Editor do Supabase. Não guarda PDFs, textos ou IPs brutos.
create table if not exists public.ai_usage (
  bucket text primary key,
  used integer not null default 0,
  expires_at timestamptz not null
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

create or replace function public.reserve_ai_generation(p_client_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  today text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
  minute_slot text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD-HH24-MI');
  keys text[];
  caps integer[] := array[20, 3, 2]; -- total/dia, conexão/dia, total/minuto
  i integer;
begin
  if p_client_hash !~ '^[a-f0-9]{64}$' or p_client_hash is null then
    raise exception 'Invalid client identifier';
  end if;
  -- Uma trava transacional compartilhada torna a reserva atômica entre instâncias.
  perform pg_advisory_xact_lock(74321986);
  delete from public.ai_usage where expires_at < now();
  keys := array['global:' || today, 'client:' || today || ':' || p_client_hash, 'minute:' || minute_slot];
  for i in 1..3 loop
    if coalesce((select used from public.ai_usage where bucket = keys[i]), 0) >= caps[i] then return false; end if;
  end loop;
  for i in 1..3 loop
    insert into public.ai_usage(bucket, used, expires_at) values(keys[i], 1, now() + interval '2 days')
    on conflict (bucket) do update set used = public.ai_usage.used + 1;
  end loop;
  return true;
end;
$$;
revoke all on function public.reserve_ai_generation(text) from public, anon, authenticated;
grant execute on function public.reserve_ai_generation(text) to service_role;
