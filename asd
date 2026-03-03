-- =====================================================
-- 1️⃣ EMPRESAS
-- =====================================================

create table public.empresas (
  id uuid not null default extensions.uuid_generate_v4 (),
  nombre text not null,
  cif text not null,
  email text null,
  telefono text null,
  direccion text null,
  estado text null default 'Activo'::text,
  notas text null,
  servicios jsonb null default '[]'::jsonb,
  contactos jsonb null default '[]'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint empresas_pkey primary key (id),
  constraint empresas_estado_check check (
    estado = any (
      array['Activo','En revisión','Suspendido']
    )
  )
) TABLESPACE pg_default;

create trigger trg_empresas_updated
before update on empresas
for each row
execute function update_updated_at();


-- =====================================================
-- 2️⃣ PROFILES
-- =====================================================

create table public.profiles (
  id uuid not null,
  nombre text not null default 'Usuario',
  rol text not null default 'trabajador',
  activo boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id)
    references auth.users (id) on delete cascade,
  constraint profiles_rol_check check (
    rol = any (array['admin','trabajador'])
  )
) TABLESPACE pg_default;


-- =====================================================
-- 3️⃣ DISPOSITIVOS
-- =====================================================

create table public.dispositivos (
  id uuid not null default extensions.uuid_generate_v4 (),
  empresa_id uuid not null,
  categoria text not null,
  tipo text null,
  nombre text not null,
  ip text null,
  numero_serie text null,
  usuario text null,
  password text null,
  anydesk_id text null,
  sistema_operativo text null,
  modelo text null,
  capacidad text null,
  campos_extra jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  nombre_cliente text null,
  correo_cliente text null,
  password_cliente text null,
  constraint dispositivos_pkey primary key (id),
  constraint dispositivos_empresa_id_fkey foreign key (empresa_id)
    references empresas (id) on delete cascade,
  constraint dispositivos_categoria_check check (
    categoria = any (
      array['equipo','servidor','nas','red','correo','otro']
    )
  )
) TABLESPACE pg_default;


-- =====================================================
-- 4️⃣ TICKETS_V2
-- =====================================================

create table public.tickets_v2 (
  id uuid not null default extensions.uuid_generate_v4 (),
  numero serial not null,
  empresa_id uuid not null,
  dispositivo_id uuid null,
  asunto text not null,
  descripcion text null,
  prioridad text null default 'Media',
  estado text null default 'Pendiente',
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  started_at timestamp with time zone null,
  completed_at timestamp with time zone null,
  invoiced_at timestamp with time zone null,
  created_by uuid null,
  notas text null,
  constraint tickets_v2_pkey primary key (id),
  constraint tickets_v2_numero_key unique (numero),
  constraint fk_tickets_created_by foreign key (created_by)
    references profiles (id) on delete set null,
  constraint tickets_v2_dispositivo_id_fkey foreign key (dispositivo_id)
    references dispositivos (id) on delete set null,
  constraint tickets_v2_empresa_id_fkey foreign key (empresa_id)
    references empresas (id) on delete cascade,
  constraint tickets_v2_created_by_fkey foreign key (created_by)
    references auth.users (id) on delete set null,
  constraint tickets_v2_prioridad_check check (
    prioridad = any (array['Baja','Media','Alta','Urgente'])
  ),
  constraint tickets_v2_estado_check check (
    estado = any (
      array[
        'Pendiente',
        'En curso',
        'Completado',
        'Pendiente de facturar',
        'Facturado'
      ]
    )
  )
) TABLESPACE pg_default;

create index if not exists idx_tickets_v2_empresa
on public.tickets_v2 using btree (empresa_id);

create index if not exists idx_tickets_v2_estado
on public.tickets_v2 using btree (estado);

create index if not exists idx_tickets_v2_prioridad
on public.tickets_v2 using btree (prioridad);

create index if not exists idx_tickets_v2_created_at
on public.tickets_v2 using btree (created_at desc);

create trigger trg_tickets_v2_updated
before update on tickets_v2
for each row
execute function update_updated_at();


-- =====================================================
-- 5️⃣ TICKET_MENSAJES
-- =====================================================

create table public.ticket_mensajes (
  id uuid not null default extensions.uuid_generate_v4 (),
  ticket_id uuid not null,
  user_id uuid not null,
  mensaje text null,
  tipo text null default 'mensaje',
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint ticket_mensajes_pkey primary key (id),
  constraint fk_mensajes_profile foreign key (user_id)
    references profiles (id) on delete cascade,
  constraint ticket_mensajes_ticket_id_fkey foreign key (ticket_id)
    references tickets_v2 (id) on delete cascade,
  constraint ticket_mensajes_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete cascade,
  constraint ticket_mensajes_tipo_check check (
    tipo = any (array['mensaje','nota_interna'])
  )
) TABLESPACE pg_default;

create index if not exists idx_mensajes_ticket
on public.ticket_mensajes using btree (ticket_id);

create trigger trg_ticket_mensajes_updated
before update on ticket_mensajes
for each row
execute function update_updated_at();


-- =====================================================
-- 6️⃣ TICKET_COMENTARIOS
-- =====================================================

create table public.ticket_comentarios (
  id uuid not null default gen_random_uuid (),
  ticket_id uuid not null,
  user_id uuid not null,
  contenido text not null,
  editado boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint ticket_comentarios_pkey primary key (id),
  constraint ticket_comentarios_ticket_id_fkey foreign key (ticket_id)
    references tickets_v2 (id) on delete cascade,
  constraint ticket_comentarios_user_id_fkey foreign key (user_id)
    references profiles (id) on delete cascade,
  constraint ticket_comentarios_contenido_check
    check (char_length(contenido) > 0)
) TABLESPACE pg_default;

create index if not exists idx_ticket_comentarios_ticket
on public.ticket_comentarios using btree (ticket_id, created_at);

create index if not exists idx_ticket_comentarios_user
on public.ticket_comentarios using btree (user_id);


-- =====================================================
-- 7️⃣ TICKET_HISTORIAL
-- =====================================================

create table public.ticket_historial (
  id uuid not null default extensions.uuid_generate_v4 (),
  ticket_id uuid not null,
  user_id uuid null,
  tipo text not null,
  descripcion text not null,
  datos jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint ticket_historial_pkey primary key (id),
  constraint fk_historial_profile foreign key (user_id)
    references profiles (id) on delete set null,
  constraint ticket_historial_ticket_id_fkey foreign key (ticket_id)
    references tickets_v2 (id) on delete cascade,
  constraint ticket_historial_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete set null,
  constraint ticket_historial_tipo_check check (
    tipo = any (
      array[
        'creacion','estado','asignacion','desasignacion',
        'prioridad','horas','archivo','nota_interna','comentario'
      ]
    )
  )
) TABLESPACE pg_default;

create index if not exists idx_historial_ticket
on public.ticket_historial using btree (ticket_id);


-- =====================================================
-- 8️⃣ TICKET_ASIGNACIONES
-- =====================================================

create table public.ticket_asignaciones (
  id uuid not null default extensions.uuid_generate_v4 (),
  ticket_id uuid not null,
  user_id uuid not null,
  asignado_at timestamp with time zone null default now(),
  asignado_by uuid null,
  constraint ticket_asignaciones_pkey primary key (id),
  constraint ticket_asignaciones_ticket_id_user_id_key
    unique (ticket_id, user_id),
  constraint fk_asignaciones_profile foreign key (user_id)
    references profiles (id) on delete cascade,
  constraint ticket_asignaciones_asignado_by_fkey foreign key (asignado_by)
    references auth.users (id) on delete set null,
  constraint fk_asignaciones_asignado_by foreign key (asignado_by)
    references profiles (id) on delete set null,
  constraint ticket_asignaciones_ticket_id_fkey foreign key (ticket_id)
    references tickets_v2 (id) on delete cascade,
  constraint ticket_asignaciones_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete cascade
) TABLESPACE pg_default;

create index if not exists idx_asignaciones_ticket
on public.ticket_asignaciones using btree (ticket_id);

create index if not exists idx_asignaciones_user
on public.ticket_asignaciones using btree (user_id);


-- =====================================================
-- 9️⃣ TICKET_HORAS
-- =====================================================

create table public.ticket_horas (
  id uuid not null default extensions.uuid_generate_v4 (),
  ticket_id uuid not null,
  user_id uuid not null,
  horas numeric(6,2) not null,
  descripcion text null,
  fecha date null default current_date,
  created_at timestamp with time zone null default now(),
  constraint ticket_horas_pkey primary key (id),
  constraint fk_horas_profile foreign key (user_id)
    references profiles (id) on delete cascade,
  constraint ticket_horas_ticket_id_fkey foreign key (ticket_id)
    references tickets_v2 (id) on delete cascade,
  constraint ticket_horas_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete cascade,
  constraint ticket_horas_horas_check check (horas > 0)
) TABLESPACE pg_default;

create index if not exists idx_horas_ticket
on public.ticket_horas using btree (ticket_id);

create index if not exists idx_horas_user
on public.ticket_horas using btree (user_id);


-- =====================================================
-- 🔟 TICKET_ARCHIVOS
-- =====================================================

create table public.ticket_archivos (
  id uuid not null default extensions.uuid_generate_v4 (),
  ticket_id uuid not null,
  mensaje_id uuid null,
  nombre_original text not null,
  storage_path text not null,
  mime_type text null,
  tamanio bigint null,
  subido_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint ticket_archivos_pkey primary key (id),
  constraint fk_archivos_profile foreign key (subido_by)
    references profiles (id) on delete set null,
  constraint ticket_archivos_mensaje_id_fkey foreign key (mensaje_id)
    references ticket_mensajes (id) on delete set null,
  constraint ticket_archivos_subido_by_fkey foreign key (subido_by)
    references auth.users (id) on delete set null,
  constraint ticket_archivos_ticket_id_fkey foreign key (ticket_id)
    references tickets_v2 (id) on delete cascade
) TABLESPACE pg_default;


-- =====================================================
-- 1️⃣1️⃣ TICKET_COMENTARIOS_ARCHIVOS
-- =====================================================

create table public.ticket_comentarios_archivos (
  id uuid not null default gen_random_uuid (),
  comentario_id uuid not null,
  nombre_original text not null,
  nombre_storage text not null,
  mime_type text null,
  tamanio integer null,
  subido_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint ticket_comentarios_archivos_pkey primary key (id),
  constraint ticket_comentarios_archivos_comentario_id_fkey
    foreign key (comentario_id)
    references ticket_comentarios (id) on delete cascade,
  constraint ticket_comentarios_archivos_subido_by_fkey
    foreign key (subido_by)
    references profiles (id)
) TABLESPACE pg_default;

create index if not exists idx_tc_archivos_comentario
on public.ticket_comentarios_archivos using btree (comentario_id);


-- =====================================================
-- 1️⃣2️⃣ CHAT_CANALES
-- =====================================================

create table public.chat_canales (
  id uuid not null default gen_random_uuid (),
  nombre text not null,
  descripcion text null,
  tipo text null default 'canal',
  creado_por uuid null,
  created_at timestamp with time zone null default now(),
  constraint chat_canales_pkey primary key (id),
  constraint chat_canales_creado_por_fkey
    foreign key (creado_por)
    references profiles (id),
  constraint chat_canales_tipo_check
    check (tipo = any (array['canal','directo']))
) TABLESPACE pg_default;


-- =====================================================
-- 1️⃣3️⃣ CHAT_MENSAJES
-- =====================================================

create table public.chat_mensajes (
  id uuid not null default gen_random_uuid (),
  canal_id uuid not null,
  user_id uuid not null,
  contenido text null,
  ticket_ref_id uuid null,
  comentario_ref_id uuid null,
  editado boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  anclado boolean not null default false,
  constraint chat_mensajes_pkey primary key (id),
  constraint chat_mensajes_canal_id_fkey
    foreign key (canal_id)
    references chat_canales (id) on delete cascade,
  constraint chat_mensajes_comentario_ref_id_fkey
    foreign key (comentario_ref_id)
    references ticket_comentarios (id) on delete set null,
  constraint chat_mensajes_ticket_ref_id_fkey
    foreign key (ticket_ref_id)
    references tickets_v2 (id) on delete set null,
  constraint chat_mensajes_user_id_fkey
    foreign key (user_id)
    references profiles (id) on delete cascade
) TABLESPACE pg_default;

create index if not exists idx_chat_mensajes_canal
on public.chat_mensajes using btree (canal_id, created_at);

create index if not exists idx_chat_mensajes_user
on public.chat_mensajes using btree (user_id);

create index if not exists idx_chat_mensajes_anclado
on public.chat_mensajes using btree (canal_id, anclado)
where anclado = true;


-- =====================================================
-- 1️⃣4️⃣ CHAT_CANALES_MIEMBROS
-- =====================================================

create table public.chat_canales_miembros (
  canal_id uuid not null,
  user_id uuid not null,
  rol text null default 'miembro',
  joined_at timestamp with time zone null default now(),
  constraint chat_canales_miembros_pkey primary key (canal_id, user_id),
  constraint chat_canales_miembros_canal_id_fkey
    foreign key (canal_id)
    references chat_canales (id) on delete cascade,
  constraint chat_canales_miembros_user_id_fkey
    foreign key (user_id)
    references profiles (id) on delete cascade,
  constraint chat_canales_miembros_rol_check
    check (rol = any (array['admin','miembro']))
) TABLESPACE pg_default;

create index if not exists idx_chat_miembros_user
on public.chat_canales_miembros using btree (user_id);


-- =====================================================
-- CHAT_MENSAJES_ARCHIVOS
-- =====================================================

create table public.chat_mensajes_archivos (
  id uuid not null default gen_random_uuid (),
  mensaje_id uuid not null,
  nombre_original text not null,
  nombre_storage text not null,
  mime_type text null,
  tamanio integer null,
  created_at timestamp with time zone null default now(),
  constraint chat_mensajes_archivos_pkey primary key (id),
  constraint chat_mensajes_archivos_mensaje_id_fkey
    foreign key (mensaje_id)
    references chat_mensajes (id) on delete cascade
) TABLESPACE pg_default;

create index if not exists idx_chat_arch_mensaje
on public.chat_mensajes_archivos using btree (mensaje_id);


insert into auth.users (
id,
email,
encrypted_password,
email_confirmed_at,
created_at,
updated_at,
raw_app_meta_data,
raw_user_meta_data,
role,
aud
)
values (
gen_random_uuid(),
'admin@admin.com',
crypt('admin123', gen_salt('bf')),
now(),
now(),
now(),
'{"provider":"email","providers":["email"]}',
'{"nombre":"Administrador"}',
'authenticated',
'authenticated'
);

insert into public.profiles (
id,
nombre,
rol,
activo
)
select
id,
'Administrador',
'admin',
true
from auth.users
where email = 'admin@admin.com';