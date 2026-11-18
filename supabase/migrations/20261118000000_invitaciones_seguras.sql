-- =====================================================================
-- Invitaciones más seguras (auditoría de seguridad 2026-11-18)
--   * Códigos de 12 caracteres hexadecimales (48 bits) en lugar de 8 (32 bits).
--   * Límite de 10 intentos fallidos por hora y usuario en join_household,
--     para que nadie pueda probar códigos por fuerza bruta.
-- Los códigos ya existentes siguen funcionando.
-- =====================================================================

alter table public.households
  alter column invite_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

create table if not exists public.join_attempts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists join_attempts_user_time on public.join_attempts(user_id, created_at);

-- Solo la función (security definer) lee y escribe esta tabla.
alter table public.join_attempts enable row level security;
revoke all on public.join_attempts from anon, authenticated;

create or replace function public.join_household(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_household uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'Ya perteneces a un hogar';
  end if;
  if (select count(*) from join_attempts
        where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Demasiados intentos. Espera una hora e inténtalo de nuevo.';
  end if;
  select id into v_household from households where invite_code = upper(trim(p_code));
  if v_household is null then
    insert into join_attempts(user_id) values (auth.uid());
    -- El intento fallido debe quedar guardado: se devuelve null en vez de lanzar
    -- una excepción, que desharía el insert.
    return null;
  end if;
  -- Producto pensado para una pareja: máximo dos miembros por hogar.
  if (select count(*) from members where household_id = v_household) >= 2 then
    raise exception 'Este hogar ya tiene dos miembros';
  end if;
  insert into members(household_id, user_id, display_name, color)
    values (v_household, auth.uid(), p_display_name, '#ec4899');
  delete from join_attempts where user_id = auth.uid();
  return v_household;
end $$;

grant execute on function public.join_household(text, text) to authenticated;
