# TrucoMineiro

A real-time multiplayer Truco Mineiro card game built for two players. No accounts, no sign-up — just share a link and play.

**Live:** [www.estebanmarin.me/truco](https://www.estebanmarin.me/truco)

---

## Architecture

```mermaid
graph TB
    subgraph "Browser – Player 1"
        C1[React UI]
        S1["Zustand Store
PublicGameState + myHand"]
        H1["useRealtimeGame
useGameActions"]
    end

    subgraph "Browser – Player 2"
        C2[React UI]
        S2["Zustand Store
PublicGameState + myHand"]
        H2["useRealtimeGame
useGameActions"]
    end

    subgraph "Supabase Edge Function"
        EF["POST /action
① Verify token → seat
② Validate action legality
③ gameReducer(state, action)
④ Write public + private state
⑤ Broadcast hands to private channels"]
    end

    subgraph "Supabase Postgres"
        DB[("games table
public_state JSONB — safe to share
private_state JSONB — hands hidden
RLS: no anon UPDATE")]
    end

    subgraph "Supabase Realtime"
        PUB["Public channel
game:{id}
scores · tricks · bet · turn"]
        PR1["Private channel – P1
game:{id}:p1:{token1}
Player 1 hand only"]
        PR2["Private channel – P2
game:{id}:p2:{token2}
Player 2 hand only"]
    end

    C1 -- "POST {gameId, token, action}" --> EF
    C2 -- "POST {gameId, token, action}" --> EF
    EF -- "UPDATE public_state + private_state" --> DB
    EF -- "broadcast hand" --> PR1
    EF -- "broadcast hand" --> PR2
    DB -- "postgres_changes" --> PUB
    PUB --> H1
    PUB --> H2
    PR1 --> H1
    PR2 --> H2
    H1 --> S1
    H2 --> S2
    S1 --> C1
    S2 --> C2
```

### Security model

- **Opponent's cards never reach your browser.** The Edge Function delivers each player's hand only on their private Realtime channel, keyed by a UUID token stored in `localStorage`.
- **All moves are server-validated.** The browser cannot write to the database directly (RLS blocks it). Every action goes through the Edge Function, which verifies the player's token and runs the game reducer before writing.
- **No accounts.** Players are identified by a UUID generated on first visit and persisted in `localStorage`.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Animations | Framer Motion |
| State | Zustand |
| Realtime | Supabase Realtime (postgres_changes + broadcast) |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase Postgres |
| Hosting | GitHub Pages (`/truco` path, hash routing) |

---

## Game rules (Truco Mineiro)

- 40-card deck (French deck, 8s/9s/10s removed)
- 1v1; each player gets 3 cards per hand
- Fixed manilhas (strongest to weakest): **4♣ > 7♥ > A♠ > 7♦**
- Card rank (non-manilha): **3 > 2 > A > K > J > Q > 7 > 6 > 5 > 4**
- Hand starts at 2 points; betting escalates: Truco (4) → Seis (6) → Dez (10) → Doze (12)
- First to **12 points** wins the match

---

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Run the DB migration
supabase db push

# 4. Start Edge Functions locally
supabase functions serve

# 5. Start the frontend (in a separate terminal)
npm run dev
# → http://localhost:5173/truco/
```

## Tests

```bash
npm run test        # run game engine unit tests
npm run test:ui     # open Vitest UI
```

## Deploy

Push to `main`. GitHub Actions builds the frontend and deploys to `gh-pages`. Edge Functions are deployed separately via `supabase functions deploy`.
