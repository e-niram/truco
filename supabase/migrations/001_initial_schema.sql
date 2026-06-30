-- TrucoMineiro initial schema
-- Run via: supabase db push

CREATE TABLE IF NOT EXISTS games (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  phase          TEXT NOT NULL DEFAULT 'waiting'
                   CHECK (phase IN ('waiting', 'active', 'finished')),
  public_state   JSONB NOT NULL DEFAULT '{}',
  -- Safe-to-broadcast: scores, tricks (played cards only), bet state, turn, card counts.
  -- This is the column Realtime pushes to both clients.
  private_state  JSONB NOT NULL DEFAULT '{}',
  -- Full game state including both players' unplayed hands.
  -- Never broadcast; only read/written by Edge Functions via service_role key.
  version        BIGINT NOT NULL DEFAULT 0
  -- Optimistic concurrency: UPDATE ... WHERE version = $expected
);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row-Level Security
-- Clients use the anon key (public). They can read and create games.
-- They CANNOT update game state directly — only Edge Functions can (via service_role key).
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select" ON games;
CREATE POLICY "anon_select" ON games
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert" ON games;
CREATE POLICY "anon_insert" ON games
  FOR INSERT TO anon WITH CHECK (true);

-- No UPDATE policy for anon role.
-- service_role key bypasses RLS and is used exclusively by Edge Functions.

-- Enable Realtime for postgres_changes subscriptions
ALTER TABLE games REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
