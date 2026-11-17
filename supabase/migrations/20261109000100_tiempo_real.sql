-- La lista de la compra se sincroniza en vivo entre los dos móviles (Supabase Realtime respeta RLS).
alter publication supabase_realtime add table public.shopping_items;
