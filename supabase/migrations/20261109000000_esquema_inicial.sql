-- =====================================================================
-- Nuestro Hogar · Esquema inicial
-- Convenciones:
--   * Todos los importes en CÉNTIMOS de euro (integer). Nunca float.
--   * Toda tabla de datos lleva household_id y RLS por hogar.
--   * household_id se rellena solo con current_household_id().
--   * "member" = persona del hogar (fila en members), distinto de auth.users.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Hogar y miembros
-- ---------------------------------------------------------------------
create table public.households (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) between 1 and 80),
  invite_code  text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  timezone     text not null default 'Europe/Madrid',
  created_at   timestamptz not null default now()
);

create table public.members (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references public.households(id) on delete cascade,
  user_id             uuid not null unique references auth.users(id) on delete cascade,
  display_name        text not null check (length(trim(display_name)) between 1 and 40),
  color               text not null default '#6366f1',
  weekly_workout_goal smallint not null default 3 check (weekly_workout_goal between 0 and 21),
  created_at          timestamptz not null default now()
);
create index on public.members(household_id);

-- Hogar del usuario autenticado (un usuario pertenece a un único hogar).
create or replace function public.current_household_id()
returns uuid language sql stable security definer set search_path = public as $$
  select household_id from public.members where user_id = auth.uid()
$$;

create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- Categorías (editables, con subcategorías mediante parent_id)
-- ---------------------------------------------------------------------
create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  parent_id     uuid references public.categories(id) on delete cascade,
  name          text not null check (length(trim(name)) between 1 and 60),
  color         text not null default '#94a3b8',
  sort_order    smallint not null default 0,
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  unique nulls not distinct (household_id, parent_id, name)
);
create index on public.categories(household_id);

-- ---------------------------------------------------------------------
-- Establecimientos (supermercados y descuentos)
-- ---------------------------------------------------------------------
create table public.stores (
  id                     uuid primary key default gen_random_uuid(),
  household_id           uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  name                   text not null,
  is_supermarket         boolean not null default true,
  employee_discount_pct  numeric(5,2) not null default 0 check (employee_discount_pct between 0 and 100),
  -- El descuento NO se aplica a nada hasta que se confirme qué es elegible.
  discount_confirmed     boolean not null default false,
  discount_stacks_with_promos boolean,          -- null = desconocido
  discount_monthly_cap_cents integer check (discount_monthly_cap_cents >= 0),
  discount_notes         text,
  travel_note            text,
  created_at             timestamptz not null default now(),
  unique (household_id, name)
);

-- Elegibilidad del descuento por categoría (por defecto: NO elegible).
create table public.store_discount_rules (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  store_id      uuid not null references public.stores(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete cascade,
  product_id    uuid,
  eligible      boolean not null,
  source        text not null default 'manual' check (source in ('manual','ticket','documentacion')),
  note          text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Justificantes (tickets) — almacenamiento privado, control de duplicados
-- ---------------------------------------------------------------------
create table public.receipts (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  storage_path  text not null,
  mime_type     text not null,
  size_bytes    integer not null,
  sha256        text not null,
  status        text not null default 'subido' check (status in ('subido','extraido','revisado','descartado')),
  extraction    jsonb,                       -- resultado bruto de la IA (pendiente de revisión)
  uploaded_by   uuid references public.members(id) on delete set null default public.current_member_id(),
  created_at    timestamptz not null default now(),
  unique (household_id, sha256)
);

-- ---------------------------------------------------------------------
-- Gastos
-- ---------------------------------------------------------------------
create table public.expenses (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  spent_on        date not null,
  merchant        text not null check (length(trim(merchant)) between 1 and 120),
  store_id        uuid references public.stores(id) on delete set null,
  amount_cents    integer not null check (amount_cents > 0),     -- total final pagado
  discount_cents  integer not null default 0 check (discount_cents >= 0), -- informativo, ya restado
  category_id     uuid references public.categories(id) on delete set null,
  member_id       uuid references public.members(id) on delete set null default public.current_member_id(),
  scope           text not null default 'shared' check (scope in ('shared','personal')),
  payment_method  text,
  notes           text,
  receipt_id      uuid references public.receipts(id) on delete set null,
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.expenses(household_id, spent_on desc);

-- Líneas de un gasto (reparto de un ticket entre categorías).
-- Regla: si un gasto tiene líneas, su suma == amount_cents (se valida en la app
-- y en el trigger de abajo, para no duplicar nunca el total).
create table public.expense_lines (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  expense_id    uuid not null references public.expenses(id) on delete cascade,
  description   text not null,
  quantity      numeric(10,3),
  amount_cents  integer not null,             -- puede ser negativo (descuento de línea)
  category_id   uuid references public.categories(id) on delete set null,
  product_id    uuid,
  employee_discount_eligible boolean,
  sort_order    smallint not null default 0
);
create index on public.expense_lines(expense_id);

create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete cascade,  -- null = presupuesto total
  period        text not null default 'month' check (period in ('week','month')),
  amount_cents  integer not null check (amount_cents > 0),
  created_at    timestamptz not null default now(),
  unique nulls not distinct (household_id, category_id, period)
);

-- ---------------------------------------------------------------------
-- Ahorro (dinero realmente apartado). NO es un gasto: tabla independiente,
-- así una transferencia al ahorro nunca duplica los gastos.
-- ---------------------------------------------------------------------
create table public.savings_goals (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  name          text not null,
  kind          text not null check (kind in ('monthly','target')),
  target_cents  integer check (target_cents > 0),   -- para objetivos 'target'
  target_date   date,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Historial de metas mensuales: cambiar la meta no reescribe meses pasados.
create table public.savings_monthly_targets (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  goal_id       uuid not null references public.savings_goals(id) on delete cascade,
  valid_from    date not null check (extract(day from valid_from) = 1),
  min_cents     integer not null check (min_cents >= 0),
  max_cents     integer not null,
  check (max_cents >= min_cents),
  unique (goal_id, valid_from)
);

create table public.savings_movements (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  goal_id       uuid not null references public.savings_goals(id) on delete cascade,
  occurred_on   date not null,
  kind          text not null check (kind in ('deposit','withdrawal')),
  amount_cents  integer not null check (amount_cents > 0),
  concept       text,
  reason        text,
  member_id     uuid references public.members(id) on delete set null default public.current_member_id(),
  created_at    timestamptz not null default now(),
  check (kind = 'deposit' or (reason is not null and length(trim(reason)) > 0))
);
create index on public.savings_movements(household_id, occurred_on desc);

-- ---------------------------------------------------------------------
-- Productos, precios, inventario
-- ---------------------------------------------------------------------
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  name          text not null,
  category_id   uuid references public.categories(id) on delete set null,
  default_unit  text,
  is_habitual   boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (household_id, name)
);

-- Observaciones de precio REALES (ticket, manual o web con fecha y fuente).
create table public.price_observations (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  product_id         uuid not null references public.products(id) on delete cascade,
  store_id           uuid not null references public.stores(id) on delete cascade,
  observed_on        date not null,
  label_price_cents  integer not null check (label_price_cents > 0),
  promo_price_cents  integer check (promo_price_cents > 0),
  employee_discount_already_applied boolean not null default false,
  quantity           numeric(10,3),
  unit               text,
  source             text not null check (source in ('ticket','manual','web')),
  source_ref         text,
  receipt_id         uuid references public.receipts(id) on delete set null,
  created_at         timestamptz not null default now()
);

create table public.inventory_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  name          text not null,
  product_id    uuid references public.products(id) on delete set null,
  quantity      numeric(10,3),
  unit          text,
  location      text check (location in ('nevera','congelador','despensa','otro')),
  expires_on    date,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Recetas, menús y listas de compra
-- ---------------------------------------------------------------------
create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  name          text not null,
  servings      smallint not null default 2 check (servings > 0),
  instructions  text,
  tags          text[] not null default '{}',
  is_favorite   boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.recipe_ingredients (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  recipe_id     uuid not null references public.recipes(id) on delete cascade,
  name          text not null,
  quantity      numeric(10,3),
  unit          text,
  product_id    uuid references public.products(id) on delete set null,
  sort_order    smallint not null default 0
);
create index on public.recipe_ingredients(recipe_id);

create table public.meal_plan (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  plan_date     date not null,
  meal          text not null check (meal in ('desayuno','comida','cena')),
  recipe_id     uuid references public.recipes(id) on delete set null,
  title         text not null,
  servings      smallint not null default 2 check (servings > 0),
  notes         text,
  created_at    timestamptz not null default now()
);
create index on public.meal_plan(household_id, plan_date);

create table public.shopping_lists (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  name          text not null,
  week_start    date,
  status        text not null default 'activa' check (status in ('activa','cerrada')),
  created_at    timestamptz not null default now()
);

create table public.shopping_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  list_id       uuid not null references public.shopping_lists(id) on delete cascade,
  name          text not null check (length(trim(name)) between 1 and 120),
  quantity      numeric(10,3),
  unit          text,
  product_id    uuid references public.products(id) on delete set null,
  source        text not null default 'manual' check (source in ('manual','menu','habitual')),
  checked       boolean not null default false,
  checked_by    uuid references public.members(id) on delete set null,
  notes         text,
  created_by    uuid references public.members(id) on delete set null default public.current_member_id(),
  created_at    timestamptz not null default now()
);
create index on public.shopping_items(list_id);

-- ---------------------------------------------------------------------
-- Entrenamientos
-- ---------------------------------------------------------------------
create table public.workout_series (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  member_id     uuid not null references public.members(id) on delete cascade,
  activity      text not null,
  weekday       smallint not null check (weekday between 1 and 7),   -- ISO: 1 = lunes
  start_time    time not null,
  duration_min  smallint not null check (duration_min between 5 and 600),
  location      text,
  starts_on     date not null,
  ends_on       date,
  created_at    timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.workouts (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  member_id     uuid not null references public.members(id) on delete cascade,
  activity      text not null,
  session_date  date not null,
  start_time    time,
  duration_min  smallint check (duration_min between 5 and 600),
  location      text,
  status        text not null default 'planificado' check (status in ('planificado','realizado','cancelado')),
  notes         text,
  series_id     uuid references public.workout_series(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (series_id, session_date)
);
create index on public.workouts(household_id, session_date);

-- ---------------------------------------------------------------------
-- Tareas
-- ---------------------------------------------------------------------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  title         text not null check (length(trim(title)) between 1 and 140),
  description   text,
  assignee_id   uuid references public.members(id) on delete set null,  -- null = los dos
  due_date      date,
  priority      text not null default 'media' check (priority in ('baja','media','alta')),
  status        text not null default 'pendiente' check (status in ('pendiente','en_curso','hecha')),
  category      text,
  recurrence    text not null default 'none' check (recurrence in ('none','daily','weekly','monthly')),
  remind_at     timestamptz,
  completed_at  timestamptz,
  completed_by  uuid references public.members(id) on delete set null,
  created_by    uuid references public.members(id) on delete set null default public.current_member_id(),
  created_at    timestamptz not null default now()
);
create index on public.tasks(household_id, status, due_date);

-- ---------------------------------------------------------------------
-- Notificaciones / alertas (las generan jobs programados — 3ª entrega)
-- ---------------------------------------------------------------------
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id() references public.households(id) on delete cascade,
  member_id     uuid references public.members(id) on delete cascade,  -- null = para ambos
  kind          text not null,
  title         text not null,
  body          text,
  link          text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Integridad: la suma de líneas de un gasto debe igualar su total
-- ---------------------------------------------------------------------
create or replace function public.check_expense_lines_total()
returns trigger language plpgsql as $$
declare v_expense uuid; v_sum bigint; v_total integer; v_count integer;
begin
  v_expense := coalesce(new.expense_id, old.expense_id);
  select count(*), coalesce(sum(amount_cents), 0) into v_count, v_sum
    from public.expense_lines where expense_id = v_expense;
  select amount_cents into v_total from public.expenses where id = v_expense;
  if v_total is not null and v_count > 0 and v_sum <> v_total then
    raise exception 'La suma de las líneas (%) no coincide con el total del gasto (%)', v_sum, v_total;
  end if;
  return null;
end $$;

create constraint trigger expense_lines_total
  after insert or update or delete on public.expense_lines
  deferrable initially deferred
  for each row execute function public.check_expense_lines_total();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger expenses_touch before update on public.expenses
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security: cada fila solo es visible para su hogar
-- ---------------------------------------------------------------------
alter table public.households enable row level security;
alter table public.members    enable row level security;

create policy households_select on public.households for select to authenticated
  using (id = public.current_household_id());
create policy households_update on public.households for update to authenticated
  using (id = public.current_household_id()) with check (id = public.current_household_id());

create policy members_select on public.members for select to authenticated
  using (household_id = public.current_household_id());
create policy members_update_self on public.members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and household_id = public.current_household_id());

do $$
declare t text;
begin
  foreach t in array array[
    'categories','stores','store_discount_rules','receipts','expenses','expense_lines','budgets',
    'savings_goals','savings_monthly_targets','savings_movements','products','price_observations',
    'inventory_items','recipes','recipe_ingredients','meal_plan','shopping_lists','shopping_items',
    'workout_series','workouts','tasks','notifications'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (household_id = public.current_household_id())
         with check (household_id = public.current_household_id())',
      t || '_hogar', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Alta de hogar e invitación de la segunda persona
-- ---------------------------------------------------------------------
create or replace function public.seed_household(p_household uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_goal uuid;
  v_parent uuid;
  r record;
begin
  for r in select * from (values
      ('Alimentación', '#16a34a', 1, array['Supermercado','Fruta y verdura','Carne y pescado','Panadería']),
      ('Limpieza del hogar', '#0891b2', 2, array[]::text[]),
      ('Higiene personal', '#db2777', 3, array[]::text[]),
      ('Transporte y combustible', '#ea580c', 4, array['Combustible','Transporte público','Mantenimiento']),
      ('Restaurantes', '#d97706', 5, array[]::text[]),
      ('Ocio', '#7c3aed', 6, array[]::text[]),
      ('Salud y deporte', '#dc2626', 7, array['Farmacia','Clases y gimnasio']),
      ('Vivienda', '#2563eb', 8, array['Alquiler o hipoteca','Luz','Agua','Gas','Internet y teléfono']),
      ('Suscripciones', '#4f46e5', 9, array[]::text[]),
      ('Otros', '#64748b', 10, array[]::text[])
    ) as c(name, color, ord, subs)
  loop
    insert into categories(household_id, name, color, sort_order)
      values (p_household, r.name, r.color, r.ord) returning id into v_parent;
    insert into categories(household_id, parent_id, name, color, sort_order)
      select p_household, v_parent, s, r.color, i
      from unnest(r.subs) with ordinality as u(s, i);
  end loop;

  insert into stores(household_id, name, employee_discount_pct, discount_confirmed, discount_notes) values
    (p_household, 'Mercadona', 0, false, null),
    (p_household, 'Carrefour', 0, false, null);

  insert into savings_goals(household_id, name, kind)
    values (p_household, 'Ahorro mensual', 'monthly') returning id into v_goal;
  insert into savings_monthly_targets(household_id, goal_id, valid_from, min_cents, max_cents)
    values (p_household, v_goal, date_trunc('month', current_date)::date, 2000, 3000);

  insert into shopping_lists(household_id, name) values (p_household, 'Compra semanal');
end $$;

create or replace function public.create_household(p_name text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_household uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'Ya perteneces a un hogar';
  end if;
  insert into households(name) values (p_name) returning id into v_household;
  insert into members(household_id, user_id, display_name, color)
    values (v_household, auth.uid(), p_display_name, '#6366f1');
  perform seed_household(v_household);
  return v_household;
end $$;

create or replace function public.join_household(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_household uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'Ya perteneces a un hogar';
  end if;
  select id into v_household from households where invite_code = upper(trim(p_code));
  if v_household is null then raise exception 'Código de invitación no válido'; end if;
  -- Producto pensado para una pareja: máximo dos miembros por hogar.
  if (select count(*) from members where household_id = v_household) >= 2 then
    raise exception 'Este hogar ya tiene dos miembros';
  end if;
  insert into members(household_id, user_id, display_name, color)
    values (v_household, auth.uid(), p_display_name, '#ec4899');
  return v_household;
end $$;

revoke execute on function public.seed_household(uuid) from public, anon, authenticated;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Almacenamiento privado de tickets: receipts/<household_id>/<archivo>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760,
        array['image/jpeg','image/png','image/heic','image/heif','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy receipts_storage_hogar on storage.objects for all to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = public.current_household_id()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = public.current_household_id()::text);
