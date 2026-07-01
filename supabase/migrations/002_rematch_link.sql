-- Link a finished game to the fresh game created for its rematch.
-- Run via: supabase db push

ALTER TABLE games ADD COLUMN IF NOT EXISTS rematch_game_id UUID REFERENCES games(id);
