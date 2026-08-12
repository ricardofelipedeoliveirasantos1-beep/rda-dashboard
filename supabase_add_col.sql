alter table "public"."assistant_permissions" add column if not exists "manage_expenses" boolean default false;
