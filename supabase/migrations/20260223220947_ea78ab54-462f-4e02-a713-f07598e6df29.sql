-- Add unique constraint on entity_paths for upsert support
ALTER TABLE public.entity_paths
  ADD CONSTRAINT entity_paths_canonical_key_path_unique UNIQUE (canonical_key, path);

-- Add last_synced_at column to public_routes if missing
ALTER TABLE public.public_routes
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz NOT NULL DEFAULT now();