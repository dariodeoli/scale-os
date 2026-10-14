-- Consultas de la landing (formulario «¿Tenés alguna duda?») para el panel global.
-- Aditiva, idempotente y re-ejecutable. Nunca guarda la IP ni el user agent en
-- crudo: solo un hash con sal fija del servidor para detectar abuso.
create table if not exists platform_inquiries(
 id bigserial primary key,
 name text not null,
 company text not null,
 email text not null,
 whatsapp text,
 message text not null default '',
 consent boolean not null default false,
 source text not null default 'landing',
 source_url text,
 client_hash text,
 status text not null default 'new',
 note text,
 handled_by bigint references users(id) on delete set null,
 handled_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='platform_inquiries_status_check') then
  alter table platform_inquiries add constraint platform_inquiries_status_check check(status in('new','contacted','closed'));
 end if;
end $$;
create index if not exists platform_inquiries_created_idx on platform_inquiries(created_at desc,id desc);
create index if not exists platform_inquiries_status_idx on platform_inquiries(status,created_at desc);
