# System Design: Real-Time Multiplayer Card Game (TrucoMineiro)

> Designed following the HelloInterview system design framework.

---

## 1. Requirements

### Functional requirements

1. A player creates a game and receives a shareable link.
2. A second player joins by navigating to that link — no account required.
3. Both players see the game board update in real time as moves are made.
4. Players can play cards, call bets (Truco/Seis/Dez/Doze), accept or reject bets, and fold.
5. The system tracks scores and declares a winner when a player reaches 12 points.
6. Game state persists across page refreshes.

### Non-functional requirements

- **Latency:** Move feedback within 200 ms.
- **Fairness:** No player can see the opponent's unplayed cards or submit invalid moves.
- **Simplicity:** Zero sign-up friction; works on mobile; deployable to static hosting.
- **Availability:** Casual use; no SLA required.

### Out of scope

Leaderboards, spectators, AI opponents, accounts, match history, chat.

---

## 2. Core Entities

| Entity | Key fields | Notes |
|---|---|---|
| **Game** | `id` (UUID), `phase`, `public_state` (JSONB), `private_state` (JSONB), `version` (bigint) | Single DB row per game session |
| **Player** | `token` (UUID), `seat` (player1/player2), `hand` (Card[]) | Token lives in localStorage; never shared |
| **Card** | `rank`, `suit`, `id`, `strength` (number), `isManilha` (bool) | Strength computed once at deal time |
| **Hand** | `handNumber`, `tricks[]`, `currentTrick`, `currentTurn`, `phase`, `bet`, `pointsAtStake` | One hand = best of 3 tricks |
| **Trick** | `roundNumber` (1–3), `p1Card`, `p2Card`, `winner` | Cards revealed after both play |
| **BetState** | `currentLevel` (2/4/6/10/12), `pendingLevel`, `calledBy`, `status` | Finite state machine |

---

## 3. API / Interface

```
POST /functions/v1/create-game
  Body:    { playerToken: string }
  Returns: { gameId: string }

POST /functions/v1/action
  Headers: Authorization: Bearer <SUPABASE_ANON_KEY>
  Body:    { gameId: string, token: string, action: GameAction }
  Returns: { ok: true } | { ok: false, error: string }

type GameAction =
  | { type: 'JOIN_GAME' }
  | { type: 'PLAY_CARD';   cardId: string }
  | { type: 'CALL_TRUCO' }
  | { type: 'RAISE_BET' }
  | { type: 'ACCEPT_BET' }
  | { type: 'REJECT_BET' }
  | { type: 'START_NEXT_HAND' }
```

**Realtime subscriptions (Supabase):**

```
game:{gameId}                      — public channel; both players
  receives: PublicGameState on every state change

game:{gameId}:{seat}:{token}       — private channel; one player
  receives: { hand: Card[] } after every action
```

The client never writes to the database. All mutations go through `POST /action`.

---

## 4. Data Flow

### 4.1 Game creation

```
Client                       Edge Function             DB
  |                               |                     |
  |-- POST /create-game -------->|                     |
  |   { playerToken }             |-- INSERT games ---->|
  |                               |   { private_state: { players: { player1: { token } } } }
  |<-- { gameId } ---------------|                     |
  |                               |                     |
  |  navigate to /#/game/{id}     |                     |
  |  subscribe to Realtime channels                     |
```

### 4.2 Player 2 joins

```
P2 Client                    Edge Function             DB           Realtime
  |                               |                     |               |
  |-- POST /action -------------->|                     |               |
  |   { type: 'JOIN_GAME' }       |-- SELECT private -->|               |
  |                               |<-- state ------------|               |
  |                               |                     |               |
  |                               | validate: no p2 yet                 |
  |                               | deal hands (shuffle deck)           |
  |                               |-- UPDATE games ---->|               |
  |                               |   public_state + private_state      |
  |                               |-- broadcast P1 hand -----------------> P1 private channel
  |                               |-- broadcast P2 hand -----------------> P2 private channel
  |                               |                     |-- postgres_changes -> public channel
  |<-- { ok: true } -------------|                     |               |
  |                               |                     |               |
  |  both browsers: phase='active', game board appears
```

### 4.3 Playing a card

```
P1 Client                    Edge Function             DB           Realtime
  |                               |                     |               |
  |-- POST /action -------------->|                     |               |
  |   { type: 'PLAY_CARD',        |-- SELECT private -->|               |
  |     cardId: '3-clubs' }       |<-- state ------------|               |
  |                               |                     |               |
  |                               | ① token matches player1.token?  ✓  |
  |                               | ② currentTurn === 'player1'?    ✓  |
  |                               | ③ card is in player1.hand?      ✓  |
  |                               | ④ gameReducer(state, action) → newState
  |                               |-- UPDATE games ---->|               |
  |                               |-- broadcast hands ------------------>|
  |<-- { ok: true } -------------|                     |-- postgres_changes -> public channel
  |                               |                     |               |
  |  both browsers update: trick shows played card, turn switches to P2
```

### 4.4 Betting flow

```
P1 calls Truco:
  POST /action { type: 'CALL_TRUCO' }
  → bet.status = 'pending', bet.pendingLevel = 4
  → both browsers show BettingPanel to P2

P2 accepts:
  POST /action { type: 'ACCEPT_BET' }
  → bet.status = 'accepted', bet.currentLevel = 4, phase = 'playing'
  → BettingPanel closes, game resumes

P2 raises:
  POST /action { type: 'RAISE_BET' }
  → bet.pendingLevel = 6, calledBy = 'player2'
  → BettingPanel reappears for P1

P2 rejects:
  POST /action { type: 'REJECT_BET' }
  → P2 loses; hand ends at current value (2 pts)
```

---

## 5. High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Pages (CDN)                       │
│   React + Vite SPA — static bundle, hash routing (/#/game/id)  │
│   Zustand: PublicGameState + myHand                             │
│   Framer Motion: card animations                                │
└────────────┬───────────────────────────┬────────────────────────┘
             │ POST /action              │ Realtime WS
             ▼                           ▼
┌─────────────────────┐   ┌──────────────────────────────────────┐
│  Supabase Edge Fn   │   │         Supabase Realtime            │
│  (Deno, serverless) │   │  ┌──────────────────────────────┐   │
│                     │   │  │ Public: game:{id}             │   │
│  ① Verify token     │   │  │  PublicGameState → both       │   │
│  ② Validate action  │   │  ├──────────────────────────────┤   │
│  ③ gameReducer()    │   │  │ Private: game:{id}:p1:{tok}  │   │
│  ④ Write DB         │──►│  │  P1 hand → P1 only           │   │
│  ⑤ Broadcast hands  │   │  ├──────────────────────────────┤   │
│                     │   │  │ Private: game:{id}:p2:{tok}  │   │
└──────────┬──────────┘   │  │  P2 hand → P2 only           │   │
           │              │  └──────────────────────────────┘   │
           ▼              └──────────────────────────────────────┘
┌─────────────────────┐
│  Supabase Postgres  │
│                     │
│  games table        │
│  ┌───────────────┐  │
│  │ public_state  │  │  ← broadcast via Realtime postgres_changes
│  │ private_state │  │  ← never leaves the server
│  │ version       │  │  ← optimistic concurrency control
│  └───────────────┘  │
│  RLS: no anon UPDATE│  ← clients cannot write directly
└─────────────────────┘
```

**Three layers:**

1. **Static frontend (GitHub Pages):** React SPA with hash routing. Sends actions to Edge Functions; receives state from Realtime. Zero server to maintain.
2. **Serverless compute (Edge Functions):** Stateless Deno functions. Authoritative game logic. The only layer that touches `private_state`.
3. **Managed backend (Supabase):** Postgres for persistence + Realtime for push delivery. No infrastructure to manage.

**The game engine (`src/engine/`) is pure TypeScript with no external dependencies.** It is imported by both the frontend (for local UI rendering) and the Edge Function (for authoritative validation). One source of truth for rules.

---

## 6. Deep Dives

### 6.1 Security: card hiding

**Problem:** A naively designed system stores the full game state in one DB column and broadcasts it to both players. Any player can open DevTools → Network → WebSocket and read the opponent's cards.

**Solution: split state columns + private Realtime channels.**

The `games` table has two JSONB columns:

| Column | Contains | Who sees it |
|---|---|---|
| `public_state` | Scores, tricks (played cards only), bet state, whose turn, card counts | Both players via Realtime postgres_changes |
| `private_state` | Full game state including both players' unplayed hands | Edge Function only (service_role key) |

Additionally, after each action, the Edge Function sends each player's hand to their own private Realtime Broadcast channel: `game:{id}:{seat}:{token}`. The channel name includes the player's token — a UUID never visible to the opponent — so they cannot subscribe to it.

**What a determined attacker sees:**
- Public channel: scores, played cards, bet state. Nothing sensitive.
- Their own private channel: only their own hand.
- Opponent's private channel: nothing, because they don't know the token.

### 6.2 Security: move validation

**Problem:** Without server enforcement, a player could POST arbitrary state changes to the DB and give themselves points, play out of turn, or play cards they don't hold.

**Solution: RLS + Edge Function as the only write path.**

RLS on the `games` table has no `anon UPDATE` policy. The browser's public anon key is physically incapable of writing game state. Every `POST /action` is handled by the Edge Function, which:

1. Loads `private_state` from DB using the service_role key (bypasses RLS).
2. Resolves the player's seat from their token — rejects if token doesn't match either seat.
3. Checks action legality: correct turn, correct phase, card actually in hand.
4. Applies `gameReducer(state, action)` to compute new state.
5. Writes both `public_state` and `private_state` via service_role.

Invalid actions return `{ ok: false, error: "..." }` and leave the DB unchanged.

### 6.3 Concurrency control

**Problem:** Two players could act simultaneously (e.g., both try to raise the bet at the same moment). Without coordination, the second write could corrupt state.

**Solution: optimistic locking via a `version` column.**

The Edge Function's UPDATE is:
```sql
UPDATE games
SET public_state = $pub,
    private_state = $priv,
    version = version + 1
WHERE id = $id
  AND version = $expected_version
RETURNING version;
```

If `rowsAffected = 0`, another write won the race. The Edge Function re-fetches the current state, re-validates the action against the new state, and retries (up to 3 times). The losing client receives the authoritative state via Realtime and reconciles.

In practice, simultaneous conflicting writes are rare in a turn-based game, but this makes it safe when they do occur.

### 6.4 Offline / reconnect

When a client reconnects, `useRealtimeGame` re-subscribes to both channels and fetches the current `public_state` row. The client then calls `POST /action { type: 'RECONNECT' }` so the Edge Function can re-broadcast the player's private hand to their newly subscribed channel.

### 6.5 Routing on a static host

GitHub Pages serves only `index.html` and static assets — it has no server to handle dynamic paths like `/truco/game/abc-123`. A standard SPA router would 404 on direct navigation to a game URL.

**Solution: hash routing.** URLs take the form `www.estebanmarin.me/truco/#/game/{id}`. The fragment (`#...`) is never sent to the server; GitHub Pages always serves `index.html`, and the React router reads the fragment client-side. Shareable game links work reliably with zero server configuration.

### 6.6 Optimistic UI updates

**Problem:** Every user action that touches the server has two moments of truth: when the user acts, and when the server confirms. Waiting for the second moment before updating the UI creates 700–1400ms of perceived latency — the full round trip of POST → DB read → reducer → DB write → Realtime event → render. Anything over ~100ms feels sluggish.

**Solution: apply the action locally before awaiting the server.**

You assume ("optimistically") the server will agree, update the UI immediately, then reconcile when the server responds. The pattern has three steps:

1. **Snapshot** — save current state for rollback.
2. **Apply locally** — run the same logic the server will run, client-side, synchronously. Update the UI.
3. **Confirm or revert** — fire the real request in the background. On success, the server's authoritative state overwrites (usually a no-op if it matches). On failure, restore the snapshot.

**Implementation in this game:**

The key enabler is the shared `gameReducer` — a pure TypeScript function with no network or React dependencies, imported by both the Edge Function and the client. Because both sides run the same deterministic reducer, the client can predict the server's output exactly.

On card play, the client:
1. Reconstructs a local `GameState` from `publicState` (what it has) + `myHand` + placeholder cards for the opponent (needed only so `derivePublicState` computes the correct `cardCount`).
2. Runs `gameReducer(localState, { type: 'PLAY_CARD', ... })` — zero network, instant.
3. Calls `derivePublicState(next)` to get the optimistic `PublicGameState`.
4. Pushes both the new public state and the new hand into the Zustand store immediately.
5. Then fires `POST /action` in the background.

**Reconciliation via version numbers:**

The optimistic state keeps the current version N unchanged. When the Realtime event arrives with version N+1, the store's version guard (`version <= prev.version → skip`) passes: `(N+1) <= N` is false, so the authoritative state is applied. If the server errors, the snapshot is restored via `forceSetPublicState` (a second setter that bypasses the version guard, used only for optimistic writes and rollbacks).

**The three hard problems:**

| Problem | How this game handles it |
|---|---|
| Reconciliation | Version numbers; Realtime N+1 overwrites optimistic N |
| Rollback | Snapshot before applying; restore on server error |
| Conflicts | Optimistic lock on DB write; `retry: true` triggers client retry |

**The key interview point:**

Optimistic UI only works when the client can predict the server's result. This requires deterministic shared logic — one source of truth for rules, runnable on both sides. If the server has hidden state the client doesn't know (a price that changes, concurrent writes), optimistic updates are harder. In a turn-based game with a pure state machine, the prediction is exact.

The junior answer to "how do you make this feel fast?" is "add a loading spinner." The senior answer is "don't need one."

### 6.7 Scalability (theoretical)

| Resource | Capacity | Bottleneck? |
|---|---|---|
| Games table rows | Unlimited (Postgres) | No |
| Realtime channels | ~100k concurrent (Supabase Free tier) | For a casual game, no |
| Edge Function invocations | ~500k/month free | No |
| Postgres connections | Limited by plan | Only at very large scale |

For a social card game shared between friends, the architecture is comfortably over-provisioned. If usage grew to thousands of concurrent games, the main lever would be upgrading the Supabase plan (more Postgres connections) or sharding game state into Redis for hot-path reads. Neither is necessary for the current scope.

---

## Summary

| Decision | Choice | Rationale |
|---|---|---|
| Hosting | GitHub Pages (static) | Zero infrastructure; no server to manage |
| Backend | Supabase Edge Functions | Serverless; shares TypeScript engine code |
| Database | Supabase Postgres | JSONB for schema-free game state; versioned for concurrency |
| Realtime | Supabase Realtime | Two-channel model separates public/private state |
| Security | RLS + server validation + private channels | Prevents both card peeking and state manipulation without accounts |
| Routing | Hash routing | Deep links work on static hosts without 404.html hacks |
| Game engine | Pure TypeScript module | Shared between client and server; fully unit-testable |
