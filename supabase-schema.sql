-- Table principale des événements
create table events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),

  -- Infos événement
  couple_name text not null,           -- ex: "Sophie & Thomas"
  event_date date not null,
  event_type text default 'mariage',   -- mariage, anniversaire, etc.

  -- pCloud
  pcloud_folder_id text not null,      -- ID du dossier pCloud

  -- Accès galerie
  slug text unique not null,           -- ex: "sophie-thomas-juin-2025"
  password_hash text not null,         -- mot de passe hashé bcrypt

  -- Expiration
  expires_at timestamp with time zone, -- null = pas d'expiration

  -- Statut
  is_active boolean default true
);

-- Index pour lookup rapide par slug
create index events_slug_idx on events(slug);

-- Table des sessions galerie (pour ne pas redemander le mdp à chaque page)
create table gallery_sessions (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + interval '7 days')
);
