# Quill Collab

A real-time collaborative editor in the spirit of Notion. Built around Yjs for sync, TipTap for the editor surface, and a NestJS WebSocket gateway that owns document rooms. Postgres is the durable store; the same Yjs state that drives the editor is what gets persisted.

![Quill workspace preview](docs/screenshot.svg)

## What's in the box

### Editor

- Rich text via TipTap on top of ProseMirror
- Slash menu (`/`) for headings (H1–H3), bullet lists, code blocks, paragraphs
- Inline-editable document titles
- Live presence: collaborator avatars and remote cursors with stable per-user colors

### Sync

- Yjs over WebSocket via `y-websocket`
- Server is a `ws.Server` attached to the Nest HTTP server with a custom upgrade handler so JSON activity traffic and binary Yjs traffic share one port without mixing protocols
- In-memory rooms keyed by document id; debounced persistence to Postgres on idle
- Room is destroyed after the last client leaves, with a cleanup grace period so a quick reconnect doesn't churn

### Offline

- `y-indexeddb` mirrors every open document to the browser. Reload, lose the network, keep typing — edits queue locally and the CRDT merges them on reconnect.
- The editor gates on local hydration, not WebSocket status. That means an offline user with a cached doc gets a working editor, not a spinner.

### Versions

- Snapshots are written when a document goes idle after a burst of edits
- Each snapshot stores the full Yjs state plus a derived plaintext preview
- Restore overwrites the document state, kicks all live clients with a 4200 close so they reconnect to a clean room, and writes a `RESTORE` activity

### Sharing

- Per-document share links with `READ` or `WRITE` permission
- Tokens are validated against the same WebSocket gateway, so guests join the same Yjs room as the owner without needing an account
- Read-only guests can connect, sync, and observe presence; the gateway drops any sync message except `SyncStep1` for read-only sessions

### Documents

- Soft delete with a Trash view and restore
- Permanent delete from Trash
- Recently-edited list with previews

### Activity feed

- Per-document activity panel: create, rename, edit (batched), restore, share
- Edits are throttled and folded into `EDIT_BATCH` events keyed off the same idle window that triggers persistence
- Live updates over a separate `/activity/:documentId` WebSocket channel so editor traffic stays binary

### Auth

- JWT access token in memory, HTTP-only refresh cookie with rotation
- 401 on a non-refresh request triggers a single silent refresh, then retries
- Rate limiting on `/auth/login` and `/auth/register`

### Operational hygiene

- Helmet, CORS pinned to the configured origin
- Pino with request-id correlation
- Global exception filter that returns `{ requestId, ... }` so client errors are traceable in logs
- `/healthz` with a Postgres ping; matching Docker healthchecks for db/api/web

## Stack

| Layer    | Choice                                 |
| -------- | -------------------------------------- |
| Web      | Next.js 16, React 19, Tailwind CSS v4  |
| Editor   | TipTap 3 + ProseMirror                 |
| Sync     | Yjs + y-websocket + y-indexeddb        |
| API      | NestJS 10, ws, Prisma 7                |
| Database | PostgreSQL 16                          |
| Auth     | JWT access + HTTP-only refresh cookie  |
| Ops      | Docker Compose                         |

## Run with Docker

You need Docker Desktop or Docker Engine with Compose v2.

```bash
docker compose up --build
```

- Web: <http://localhost:3000>
- API: <http://localhost:4000> (`/healthz` for status)
- Postgres: localhost:5432

The API container runs `prisma migrate deploy` before booting, so a fresh checkout comes up with a migrated schema.

Compose reads `DOCKER_POSTGRES_*` rather than the local `.env` so a developer's local Postgres URL doesn't accidentally point containers at `localhost`. Copy `.env.example` to `.env` if you want to customize ports or secrets.

```bash
docker compose ps
docker compose logs -f api
docker compose down       # stop
docker compose down -v    # stop and wipe the db volume
```

## Local development

Requirements: Node 20+, pnpm 10+, Docker (for Postgres only).

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm --filter @quill-collab/api prisma:migrate
pnpm --filter @quill-collab/api prisma:generate
pnpm dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:4000>
- WebSocket: <ws://localhost:4000>

## Layout

```text
apps/
  api/          NestJS app — auth, documents, sharing, versions, activity, ws gateway
  web/          Next.js app — editor, document UI, share-link UI
packages/
  shared/       Cross-app DTO and event types
```

The API is service-oriented: controllers validate and route, services own Prisma queries, the WebSocket gateway owns in-memory rooms. Anything that crosses the wire between API and web is typed through `packages/shared`.

## How sync actually works

1. Client opens a document. The web hook spins up a `Y.Doc`, an `IndexeddbPersistence` for the local cache, and a `WebsocketProvider` pointed at the gateway.
2. Editor renders as soon as IndexedDB has hydrated the doc. WebSocket can still be connecting, or unreachable entirely — the editor doesn't care.
3. On the server, the upgrade handler routes by path: `/:documentId` is a Yjs binary socket, `/activity/:documentId` is a JSON activity socket.
4. The Yjs handler authenticates with either a JWT or a share token, then joins or creates a room. Rooms hold a `Y.Doc`, an `Awareness`, and the connected client set.
5. On join the server sends `SyncStep1`, then `SyncStep2` immediately (read-only guests would otherwise wait for the client to send its state first), then the current awareness map.
6. Updates propagate via a single `ydoc.on('update')` broadcast — client message handlers don't fan out themselves, they only schedule persistence.
7. When updates settle (debounced), the server writes the encoded state to `Document.yState` and considers a version snapshot.

The whole pipeline is one `Y.Doc` instance per room. The same encoded update format goes across the wire, into IndexedDB, and into Postgres.

## Why Yjs

The choice was Yjs vs. operational transform vs. JSON-block diffs. I picked Yjs.

Concurrent editing without a central transform server is the obvious win: clients reconnect, merge, and converge with no application-level logic. The less obvious win is what falls out for free — offline support stops being a separate project, version restore is "swap the state vector," and the server can broadcast updates it doesn't have to understand. TipTap's first-class Yjs binding made the editor side a non-issue.

What I gave up:

- Document content lives as opaque binary in `yState`. Inspecting it from psql is unpleasant.
- Server-side search needs a derived index (deferred — see below).
- Single-instance WebSocket. Multi-instance fanout would mean Redis pub/sub or similar.
- Debugging a CRDT bug means reading Yjs update semantics, not just JSON.

The rejected alternative was JSONB blocks with REST diffs. It looks simpler until two clients race or one reconnects with stale state, and then the conflict logic lives in your application code. For a collaborative editor that wasn't a tradeoff worth taking.

## Testing

```bash
pnpm --filter @quill-collab/api lint
pnpm --filter @quill-collab/api build
pnpm --filter @quill-collab/api exec jest --runInBand --watchman=false
pnpm --filter @quill-collab/api exec jest --config ./test/jest-e2e.json --runInBand --watchman=false
pnpm --filter @quill-collab/web lint
pnpm --filter @quill-collab/shared exec tsc --noEmit
```

Web typecheck depends on `@hookform/resolvers` getting along with Zod 4. If it complains in `login/page.tsx` or `register/page.tsx`, that's the resolver/schema typing issue, not anything you broke.

## Docker notes

`api.Dockerfile` is multi-stage: install workspace deps, generate Prisma Client, build Nest, run as non-root.

`web.Dockerfile` is the same shape, with one wrinkle: `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are passed as build args because Next inlines them into client bundles at build time, not runtime.

## Deferred work

Things I deliberately didn't ship for the timebox:

- Redis pub/sub for multi-instance WebSocket fanout
- Folders / nested document organization
- Embedded blocks (images, tables, mentions)
- Full-text search via a `tsvector` index
- Email verification and password reset
- A permission model richer than owner + share tokens
- Mobile-tuned editor UI
- Playwright end-to-end tests

Each of these is a fair bit of additional surface area and none of them change the core architecture, so they were straightforward to defer.

## AI usage

Codex was the main pair-programming agent. Claude Code came in for
architecture-level decisions and the planning document that became `PROJECT.md`.

Where AI carried weight: scaffolding NestJS modules, Prisma migrations, DTO
wiring, Dockerfile and Compose boilerplate, repetitive React loading states.
Cross-cutting consistency was easier with an agent in the loop — same
`/healthz` shape on both sides of the Docker healthcheck, same error
envelope on every endpoint.

Where it didn't: anything Yjs. Suggested sync-protocol code was plausible
but subtly wrong about `SyncStep1`/`SyncStep2` ordering and awareness
encoding. I rewrote the gateway against the y-websocket source rather than
the model's first pass. The agent also tends to over-suggest infrastructure
— Redis fanout, Bull queues, Swagger, richer permissions — which I declined
to keep the scope honest for a timeboxed assignment.

Decisions where I overrode the model:
- Document state stayed as Yjs binary in Postgres. The model proposed a
  JSONB block tree with server-side merge; that pushes conflict logic into
  application code and was the alternative I'd already rejected on
  architectural grounds.
- WebSocket stayed single-instance. Adding Redis pub/sub for "scalability"
  with no second instance to talk to is theater

## License

Private demo project.
