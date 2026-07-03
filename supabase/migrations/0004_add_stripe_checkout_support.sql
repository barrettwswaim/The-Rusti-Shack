alter table public."Orders"
  add column if not exists "StripeSessionID" text;

create unique index if not exists orders_stripe_session_id_unique_idx
  on public."Orders" ("StripeSessionID")
  where "StripeSessionID" is not null;

create sequence if not exists public.web_customer_id_seq
  start with 90001
  increment by 1;

create sequence if not exists public.web_order_id_seq
  start with 900001
  increment by 1;

comment on sequence public.web_customer_id_seq is
  'Generates web-created CustomerIDs as C90001, C90002, ... - clear of the historical C01001-C03500 range.';

comment on sequence public.web_order_id_seq is
  'Generates web-created OrderIDs as ORD900001, ORD900002, ... - clear of the historical ORD050006-ORD066198 range.';

comment on column public."Orders"."StripeSessionID" is
  'Stripe Checkout Session ID that produced this order (web orders only). Unique among non-null values.';

create or replace function public.next_web_customer_id()
returns text
language sql
as $function$
  select 'C' || lpad(nextval('web_customer_id_seq')::text, 5, '0');
$function$;

create or replace function public.next_web_order_id()
returns text
language sql
as $function$
  select 'ORD' || lpad(nextval('web_order_id_seq')::text, 6, '0');
$function$;

comment on function public.next_web_customer_id() is
  'Atomically returns the next web-reserved CustomerID (C90001, C90002, ...).';

comment on function public.next_web_order_id() is
  'Atomically returns the next web-reserved OrderID (ORD900001, ORD900002, ...).';
