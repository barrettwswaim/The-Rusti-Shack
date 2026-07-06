-- Security hardening found during full security review (2026-07-06):
-- 1. Both ID-generator functions had a mutable search_path (Supabase
--    advisor WARN: function_search_path_mutable) - pin it so the
--    function can't be tricked into resolving objects from an
--    attacker-controlled schema earlier in a caller's search_path.
-- 2. Both functions had EXECUTE granted to PUBLIC/anon/authenticated,
--    meaning anyone holding only the public anon key could call
--    next_web_customer_id()/next_web_order_id() directly from a browser
--    console - bypassing the app entirely and burning through the
--    reserved ID sequences. These are only ever meant to be called by
--    the webhook via the service-role admin client, so drop public
--    execute rights entirely.

create or replace function public.next_web_customer_id()
returns text
language sql
set search_path = ''
as $function$
  select 'C' || lpad(nextval('public.web_customer_id_seq')::text, 5, '0');
$function$;

create or replace function public.next_web_order_id()
returns text
language sql
set search_path = ''
as $function$
  select 'ORD' || lpad(nextval('public.web_order_id_seq')::text, 6, '0');
$function$;

revoke execute on function public.next_web_customer_id() from public, anon, authenticated;
revoke execute on function public.next_web_order_id() from public, anon, authenticated;
