# Quill — Real-time Collaborative Note-taking Platform

> A Notion-inspired, real-time collaborative editor built with **NestJS**, **Next.js 16**, **PostgreSQL**, and **Yjs (CRDT)**.
> Engineered with a focus on architectural clarity, scalability, and production-grade code quality.

---

## Table of Contents

1. [Project Vision & Positioning](#1-project-vision--positioning)
2. [Architectural Principles](#2-architectural-principles)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack & Justification](#4-technology-stack--justification)
5. [Domain Model](#5-domain-model)
6. [Sync Strategy: Why CRDT (Yjs)](#6-sync-strategy-why-crdt-yjs)
7. [Repository Structure](#7-repository-structure)
8. [Development Phases (Step-by-Step)](#8-development-phases-step-by-step)
9. [Quality Gates & Definition of Done](#9-quality-gates--definition-of-done)
10. [Out of Scope & Future Roadmap](#10-out-of-scope--future-roadmap)
11. [Claude Code Workflow Guidelines](#11-claude-code-workflow-guidelines)

---

## 1. Project Vision & Positioning

### 1.1 What we are building

A real-time collaborative note-taking application where multiple users can edit shared documents simultaneously without conflicts, with full version history, presence awareness, and offline-first behavior.

### 1.2 What we are NOT building

- A general-purpose Notion clone (databases, embeds, complex permissions).
- A multi-tenant SaaS billing platform.
- A mobile application (web-first, responsive).

### 1.3 Why this design wins the assignment

The brief explicitly values **"quality of decisions over quantity of features."** Therefore:

- We pick **CRDT (Yjs)** over OT/delta-based, and document the tradeoff. This gives us conflict-free sync **and** offline support **for free** — two requirements solved by one architectural decision.
- We treat the WebSocket layer as a **stateless edge**, with PostgreSQL as the source of truth. This makes horizontal scaling trivial.
- We use **TipTap** (built on ProseMirror + Yjs) instead of building a block editor from scratch. This is an architect's call: don't reinvent a 5-year battle-tested editor in 8 hours.
- Clean **DDD-flavored module boundaries** in NestJS. Each domain (`auth`, `documents`, `collaboration`, `versions`, `sharing`) is independently testable.

---

## 2. Architectural Principles

These principles govern every decision below. When in doubt during implementation, refer back here.

| # | Principle | Practical Implication |
|---|-----------|----------------------|
| 1 | **Source of truth is PostgreSQL** | Yjs document state is persisted as a binary blob. The WebSocket layer can crash and recover. |
| 2 | **Stateless edges, stateful core** | API + WS servers are stateless. State lives in Postgres + (optional) Redis pub/sub. |
| 3 | **Domain-driven module boundaries** | Each NestJS module owns its schema, services, controllers. No cross-module DB access. |
| 4 | **Optimistic UI, eventually consistent backend** | The client never waits for the server to feel responsive. CRDT guarantees convergence. |
| 5 | **Explicit over implicit** | DTOs validated with `class-validator`. No `any`. No magic. |
| 6 | **Testable seams** | Services depend on interfaces, not implementations. Repository pattern via Prisma. |
| 7 | **Observability from day one** | Structured logging (Pino), request IDs, basic metrics endpoint. |

---

## 3. System Architecture

### 3.1 High-level diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Next.js)                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ TipTap +     │◄──►│ Yjs Doc      │◄──►│ IndexedDB        │   │
│  │ React UI     │    │ (in-memory)  │    │ (offline cache)  │   │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘   │
│                             │ y-websocket protocol              │
└─────────────────────────────┼───────────────────────────────────┘
                              │ WSS (binary frames)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NestJS Backend (stateless)                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ HTTP API        │  │ WS Gateway       │  │ Worker         │  │
│  │ (REST + JWT)    │  │ (y-websocket)    │  │ (snapshots,    │  │
│  │                 │  │                  │  │  versions)     │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬────────┘  │
│           └────────────┬───────┴────────────────────┘           │
│                        ▼                                        │
│            ┌───────────────────────┐                            │
│            │  Prisma ORM           │                            │
│            └───────────┬───────────┘                            │
└────────────────────────┼────────────────────────────────────────┘
                         ▼
              ┌──────────────────────┐
              │  PostgreSQL          │
              │  (documents, users,  │
              │   versions, ydoc     │
              │   binary state)      │
              └──────────────────────┘
```

### 3.2 Request flow examples

**Creating a document:** Client → REST `POST /documents` → NestJS `DocumentsService` → Prisma → returns metadata. Client navigates to editor → opens WS connection scoped to `documentId`.

**Editing in real-time:** TipTap edit → Yjs `Y.Doc` mutation → `y-websocket` provider syncs update → NestJS WS gateway broadcasts to room → other clients merge → server periodically persists merged state to Postgres + creates version snapshot every N seconds or M ops.

**Going offline:** y-websocket detects disconnection → edits queue locally in IndexedDB → on reconnect, full state diff is exchanged → CRDT merge produces conflict-free result.

---

## 4. Technology Stack & Justification

| Layer | Choice | Why | Alternatives considered |
|-------|--------|-----|------------------------|
| **Frontend framework** | Next.js 16 (App Router) | SSR-ready, file-system routing, my daily driver. Scaffolded via `create-next-app@latest` in Phase 0 (16.2.6 + React 19 + Tailwind v4) | Vite + React Router (simpler but less production-shaped) |
| **Editor** | TipTap v2 | Block-based out of the box, native Yjs integration, headless UI | Slate (more code), Lexical (younger ecosystem) |
| **CRDT engine** | Yjs + y-websocket + y-indexeddb | Industry standard, MIT, used by Notion-likes | Automerge (simpler API but heavier wire format) |
| **Backend framework** | NestJS 10 | DI container, clean module boundaries, my daily driver | Express (no structure), Fastify (no DI) |
| **WebSocket** | `@nestjs/platform-ws` + custom y-websocket adapter | Single process for HTTP + WS, simpler ops | Separate `hocuspocus` service (more deps) |
| **ORM** | Prisma 5 | Type-safe, migration ergonomics, my daily driver | Drizzle, TypeORM |
| **Database** | PostgreSQL 16 | JSONB for blocks, BYTEA for Yjs state, full-text search later | SQLite (no concurrent writers) |
| **Auth** | JWT (access + refresh), httpOnly cookies | Stateless, scales horizontally | Sessions (need sticky sessions or Redis) |
| **Validation** | class-validator + class-transformer | NestJS-native | Zod (fine but adds layer) |
| **Logging** | Pino (via `nestjs-pino`) | Fastest JSON logger | Winston (slower) |
| **Containerization** | Docker + docker-compose | Reproducible local + deploy parity | — |
| **Package manager** | pnpm with workspaces | Fast, efficient, monorepo-friendly | npm, yarn |
| **Linting/Format** | ESLint + Prettier + TypeScript strict | Non-negotiable | — |

---

## 5. Domain Model

### 5.1 Entities (Prisma schema preview)

```prisma
model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String
  displayName  String
  createdAt    DateTime   @default(now())

  documents    Document[] @relation("DocumentOwner")
  shares       Share[]
}

model Document {
  id          String     @id @default(cuid())
  title       String     @default("Untitled")
  ownerId     String
  owner       User       @relation("DocumentOwner", fields: [ownerId], references: [id])

  // CRDT state — the binary Yjs state vector
  yState      Bytes?

  // Soft delete
  deletedAt   DateTime?

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  versions    Version[]
  shares      Share[]
  activities  Activity[]

  @@index([ownerId, deletedAt])
}

model Version {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  // Snapshot of yState at this point in time
  ySnapshot  Bytes

  // Denormalized for quick display in version list
  preview    String   // first ~200 chars of plain text
  createdBy  String   // userId
  createdAt  DateTime @default(now())

  @@index([documentId, createdAt])
}

model Share {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  token      String   @unique  // shareable URL token
  permission SharePermission   // READ | WRITE
  createdBy  String
  expiresAt  DateTime?
  createdAt  DateTime @default(now())
}

enum SharePermission {
  READ
  WRITE
}

model Activity {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  actorId    String
  type       ActivityType
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([documentId, createdAt])
}

enum ActivityType {
  CREATED
  RENAMED
  EDITED
  RESTORED
  DELETED
  VERSION_RESTORED
  SHARED
}
```

### 5.2 Key design decisions

- **`yState` as `Bytes`**: Yjs gives us a binary update format. We persist it as-is. The block-based JSON document tree is *derived* from this, not stored separately. Single source of truth for the editor state.
- **Soft delete via `deletedAt`**: A unique partial index `(ownerId)` filtered by `deletedAt IS NULL` keeps queries fast on the common path.
- **Version snapshots, not deltas**: Storage is cheap; restore complexity is not. We store full snapshots on a debounced trigger (every 30s of activity, or every 100 ops, whichever comes first).
- **Activity feed denormalized**: Cheaper to write a row than to reconstruct from event log.

---

## 6. Sync Strategy: Why CRDT (Yjs)

This is the single most important architectural decision in the project, and the README will dedicate a section to it.

### 6.1 Options considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Last-write-wins** | Trivial to implement | Data loss under contention. Unacceptable. | ❌ |
| **Operational Transform (OT)** | Used by Google Docs. Mature theory. | Requires central server to transform ops. Complex implementation. Hard to support offline well. | ❌ |
| **Delta-based with server arbitration** | Simple mental model. | Server becomes bottleneck. Offline merge is manual. | ❌ |
| **CRDT (Yjs)** | Conflict-free by construction. Offline-first natively. P2P-capable if needed later. Battle-tested. | Larger client bundle. Slightly higher memory per doc. | ✅ |

### 6.2 The win

By choosing Yjs we get, **with one library**:

- ✅ Requirement 3b (no overwrites)
- ✅ Bonus 1 (conflict-free sync)
- ✅ Bonus 2 (offline support via `y-indexeddb`)
- ✅ Awareness protocol → Requirement 3c (presence indicators) for free

Three bonus features collapse into one solid architectural decision. **This is what an architect does.**

### 6.3 Tradeoff acknowledgment

We accept ~50KB of extra client bundle and a small memory overhead per open document in exchange for dramatically reduced backend complexity. We document this in the README.

---

## 7. Repository Structure

A pnpm-managed monorepo. Clean separation, shared types, single command to spin everything up.

```
quill-collab/
├── apps/
│   ├── web/                          # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/                  # App Router routes
│   │   │   │   ├── (auth)/login, register
│   │   │   │   ├── (workspace)/documents, trash
│   │   │   │   └── share/[token]/    # public share view
│   │   │   ├── components/
│   │   │   │   ├── editor/           # TipTap + Yjs integration
│   │   │   │   ├── sidebar/
│   │   │   │   ├── presence/
│   │   │   │   └── ui/               # shadcn-style primitives
│   │   │   ├── lib/
│   │   │   │   ├── api/              # API client (typed)
│   │   │   │   ├── collab/           # Y.Doc factory, providers
│   │   │   │   └── auth/
│   │   │   └── hooks/
│   │   └── ...
│   │
│   └── api/                          # NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/             # JWT, guards, strategies
│       │   │   ├── users/
│       │   │   ├── documents/        # CRUD, soft delete, restore
│       │   │   ├── collaboration/    # WS gateway, Yjs persistence
│       │   │   ├── versions/         # snapshot service
│       │   │   ├── sharing/          # share tokens
│       │   │   └── activity/         # activity feed
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   ├── interceptors/
│       │   │   └── pipes/
│       │   ├── infra/
│       │   │   ├── prisma/
│       │   │   └── logger/
│       │   ├── config/
│       │   └── main.ts
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   ├── shared/                       # Shared types, DTOs, constants
│   │   └── src/
│   │       ├── types/
│   │       └── constants/
│   └── tsconfig/                     # Shared tsconfig presets
│
├── docker/
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   └── nginx.conf                    # (optional reverse proxy)
│
├── docker-compose.yml                # postgres + api + web
├── docker-compose.dev.yml            # dev overrides
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json                        # (optional task runner)
├── README.md
└── PROJECT.md                        # this file
```

---

## 8. Development Phases (Step-by-Step)

This is the **execution plan**. Each phase is a logical unit, ends in a working state, and maps to a meaningful commit (or small commit cluster). Total budget: **8–10 hours**.

> **Strategy:** Build a thin slice end-to-end first, then deepen. Never have "frontend done but backend not started" or vice versa.

---

### Phase 0 — Project Setup *(~30 min)*

**Goal:** Empty but runnable monorepo. `pnpm dev` starts both apps.

**Tasks:**
- [ ] `git init`, set up `.gitignore`, `.editorconfig`, `.prettierrc`, `.eslintrc`.
- [ ] Initialize pnpm workspace (`pnpm-workspace.yaml`).
- [ ] Scaffold `apps/api` with `nest new --skip-git --package-manager pnpm`.
- [ ] Scaffold `apps/web` with `pnpm create next-app` (TypeScript, App Router, Tailwind). *Note: `create-next-app@latest` now ships Next.js 16; we accept the upgrade and read `node_modules/next/dist/docs/` before any non-trivial Next-specific work.*
- [ ] Create `packages/shared` with a placeholder type to validate the import path.
- [ ] Add root `package.json` scripts: `dev`, `build`, `lint`, `format`.
- [ ] Set up `docker-compose.yml` with PostgreSQL 16.
- [ ] Create `.env.example` documenting every required variable.

**Commit:** `chore: scaffold monorepo with NestJS, Next.js, and Postgres compose`

---

### Phase 1 — Database & Auth Foundation *(~1 hour)*

**Goal:** Users can register and log in. Protected routes work.

**Tasks:**
- [ ] Set up Prisma in `apps/api`. Write the schema (see Section 5).
- [ ] Run first migration. Wire `PrismaService` as a NestJS module.
- [ ] Build `AuthModule`: register, login, refresh endpoints. Argon2 password hashing.
- [ ] Implement `JwtStrategy` and `JwtAuthGuard`. Access token (15min) + refresh token (7d) in httpOnly cookies.
- [ ] Build `UsersModule` (just enough for `/me` endpoint).
- [ ] Frontend: login & register pages with React Hook Form + Zod (frontend-only validation; backend has `class-validator`).
- [ ] Frontend: typed API client wrapper with auto-refresh logic.
- [ ] Frontend: AuthProvider + `useAuth` hook + route protection.

**Commit cluster:**
- `feat(api): add Prisma schema and database connection`
- `feat(api): implement JWT-based authentication`
- `feat(web): add login and register flows with token refresh`

---

### Phase 2 — Document CRUD + Sidebar *(~1 hour)*

**Goal:** Logged-in users can create, rename, soft-delete, and restore documents. Sidebar shows live list.

**Tasks:**
- [ ] `DocumentsModule`: controller + service + DTOs.
- [ ] Endpoints:
  - `POST /documents`
  - `GET /documents` (active only)
  - `GET /documents/trash`
  - `PATCH /documents/:id` (rename)
  - `DELETE /documents/:id` (soft delete → sets `deletedAt`)
  - `POST /documents/:id/restore`
  - `DELETE /documents/:id/permanent` (hard delete from trash)
- [ ] Authorization: a `DocumentOwnerGuard` that ensures `req.user.id === document.ownerId` (sharing handled later).
- [ ] Frontend: workspace layout with collapsible sidebar.
- [ ] Frontend: document list, trash view, rename in place, delete/restore with toast.
- [ ] Optimistic UI for create/rename/delete using React Query mutations.

**Commit:** `feat: document CRUD with soft delete and trash`

---

### Phase 3 — Block Editor (TipTap) *(~1.5 hours)*

**Goal:** Open a document, edit blocks, slash commands work, content auto-saves.

**Tasks:**
- [ ] Install TipTap + StarterKit + custom slash command extension.
- [ ] Editor route: `/documents/[id]`.
- [ ] Implement slash command UI (`/heading`, `/h1`, `/h2`, `/bullet`, `/code`).
- [ ] Configure block types: paragraph, heading 1–3, bullet list, code block.
- [ ] Implement debounced auto-save (1s after last keystroke). For now, save the JSON via REST (we'll switch to Yjs in Phase 4).
- [ ] Visual save indicator in the toolbar ("Saving…" / "Saved").
- [ ] Keyboard shortcuts (`Cmd/Ctrl+B` etc.) wired by TipTap StarterKit.

**Commit cluster:**
- `feat(web): integrate TipTap with block-based editor`
- `feat(web): slash command extension for block insertion`
- `feat: debounced auto-save with visual indicator`

---

### Phase 4 — Real-time Collaboration with Yjs *(~2 hours)*

**Goal:** Two browser tabs editing the same document see each other's changes live, with no conflicts.

**Tasks:**
- [ ] Add Yjs, `y-websocket`, `y-prosemirror` to web.
- [ ] Frontend: replace REST auto-save with `Y.Doc` + `WebsocketProvider`.
- [ ] Backend: `CollaborationGateway` using `@nestjs/websockets`.
  - Implement y-websocket server protocol (sync + awareness).
  - Authenticate on connection via JWT in query string (validated → upgrade).
  - Maintain in-memory rooms keyed by `documentId`.
- [ ] Backend: `YjsPersistenceService` — debounced persistence of merged Yjs state to `Document.yState` (every 5s of inactivity per document).
- [ ] On connection, hydrate the room from `yState` if present.
- [ ] Awareness: each client sets `{ userId, displayName, color }`. Frontend renders avatars in the editor header.
- [ ] Cursor presence in the editor (TipTap collaboration cursor extension).

**Commit cluster:**
- `feat(api): WebSocket gateway with Yjs sync protocol`
- `feat(api): debounced Yjs state persistence to Postgres`
- `feat(web): collaborative editing with presence indicators`

**Verification:** open two tabs (different users), edit simultaneously → no conflicts, both see each other's cursors and avatars.

---

### Phase 5 — Document Versioning *(~1 hour)*

**Goal:** Every meaningful edit produces a version. Users can browse and restore.

**Tasks:**
- [ ] `VersionsModule`: service that subscribes to a "document changed and idle" signal from `YjsPersistenceService`.
- [ ] On idle (e.g., 30s after last update), capture a snapshot: clone `yState`, generate a plain-text preview, write a `Version` row.
- [ ] Endpoints:
  - `GET /documents/:id/versions`
  - `POST /documents/:id/versions/:versionId/restore`
- [ ] Restore mechanism: load `ySnapshot` into a new `Y.Doc`, encode as update, broadcast to all room clients with a state-reset message. Persist as new `yState`.
- [ ] Frontend: version history drawer with timestamp, author, preview. "Restore this version" button with confirmation.

**Commit:** `feat: document versioning with snapshot-based history`

---

### Phase 6 — Sharing & Public Links *(~45 min)*

**Goal:** Generate read-only or editable share links.

**Tasks:**
- [ ] `SharingModule`: create / revoke / list shares for a document.
- [ ] `POST /documents/:id/shares` → returns token + URL.
- [ ] Public route `GET /share/:token` resolves to `{ documentId, permission }`.
- [ ] Frontend: share modal in the editor toolbar with copy-to-clipboard.
- [ ] Frontend: `/share/[token]` page that opens the editor in read-only or write mode.
- [ ] Backend: `ShareGuard` for WS upgrade — accepts either JWT or share token.

**Commit:** `feat: shareable read-only and editable document links`

---

### Phase 7 — Activity Feed *(~30 min)*

**Goal:** A panel shows recent edits per document in real-time.

**Tasks:**
- [ ] `ActivityModule`: writes activity rows on relevant events (create, rename, edit-batch, restore, share).
- [ ] Throttle "edited" activity to 1 per user per 5 minutes per document (avoid noise).
- [ ] WebSocket event `activity:new` broadcast to document room.
- [ ] Frontend: activity panel as a sidebar tab.

**Commit:** `feat: real-time activity feed per document`

---

### Phase 8 — Hardening *(~1 hour)*

**Goal:** Production-grade polish.

**Tasks:**
- [ ] Global exception filter with structured error responses.
- [ ] Request ID middleware + Pino correlation.
- [ ] Rate limiting (`@nestjs/throttler`) on auth endpoints.
- [ ] Helmet, CORS configured for the web origin.
- [ ] Health check endpoint `/healthz` (db ping).
- [ ] Frontend: error boundary, 404, loading skeletons.
- [ ] Frontend: keyboard accessibility audit on editor and sidebar.
- [ ] Add a few high-value tests:
  - Auth e2e (register, login, refresh).
  - Documents service unit (soft delete + restore logic).
  - Yjs persistence service unit (debounce + persistence trigger).

**Commit cluster:**
- `chore(api): add security middleware, rate limiting, health checks`
- `test: e2e auth and unit tests for core services`

---

### Phase 9 — Docker & Documentation *(~45 min)*

**Goal:** `docker-compose up` runs the entire stack. README is excellent.

**Tasks:**
- [ ] Multi-stage `api.Dockerfile` (build → run, non-root user).
- [ ] Multi-stage `web.Dockerfile` (Next standalone output).
- [ ] `docker-compose.yml`: postgres + api + web with healthchecks.
- [ ] Migrations run automatically on api start (`prisma migrate deploy`).
- [ ] Write a comprehensive `README.md` covering:
  - What it is, screenshot/GIF.
  - Tech stack.
  - Quickstart (Docker + local dev).
  - Architecture overview (link to PROJECT.md).
  - **CRDT decision and tradeoffs** (this is what they'll grade).
  - **AI tool usage section** (mandatory by the brief — see Section 11.4 below).
  - "What I'd do next" section listing things consciously deferred.
- [ ] Optional: short Loom recording linked in README.

**Commit cluster:**
- `chore: docker-compose with multi-stage Dockerfiles`
- `docs: comprehensive README with architecture and tradeoff documentation`

---

## 9. Quality Gates & Definition of Done

Every commit must pass these. **No exceptions.**

| Gate | Tooling |
|------|---------|
| Type-checks pass with `strict: true` | `tsc --noEmit` |
| ESLint clean (zero warnings) | `pnpm lint` |
| Prettier-formatted | `pnpm format:check` |
| Compiles | `pnpm build` |
| No `any` types in committed code | ESLint rule |
| Every endpoint has a DTO | `class-validator` |
| Every Prisma query is wrapped in a service method (no controllers calling Prisma directly) | code review |
| Every WS event payload is typed via `packages/shared` | compiler |
| `.env.example` is updated when adding a new variable | code review |
| Commit messages follow Conventional Commits | `commitlint` (optional) |

---

## 10. Out of Scope & Future Roadmap

**Explicitly skipped to respect the 8–10h timebox.** Documented in README under "What I'd do next."

- ❌ Redis pub/sub for multi-instance WS (single instance is fine for the demo; the abstraction is there).
- ❌ Document folders / nesting.
- ❌ Embedded blocks (images, tables, mentions).
- ❌ Full-text search (Postgres `tsvector` is a 1-day add-on).
- ❌ Email verification / password reset.
- ❌ Rich permission model (only owner + share tokens for now).
- ❌ Mobile-optimized layout.
- ❌ E2E tests with Playwright (only critical-path unit + e2e api tests included).

---

## 11. Claude Code Workflow Guidelines

Tactical rules for working *with* Claude Code on this project. These exist so the AI behaves like a senior pair-programmer, not an autocomplete.

### 11.1 Always

- **Start each Claude Code session by referencing this file.** "Read PROJECT.md, then we're on Phase X." This grounds the model.
- **One phase at a time.** Don't ask Claude to do Phases 4 and 5 in one session.
- **Review every diff before committing.** Especially Prisma migrations and security-sensitive code (guards, JWT).
- **Run `pnpm lint && pnpm build` before every commit.** If it fails, fix it before moving on.

### 11.2 Never

- Never let Claude install a dependency without justifying it. "Why this lib? What did we evaluate against it?"
- Never accept a `// @ts-ignore` or `any` without a written reason.
- Never let the AI write a Prisma query inside a controller. It belongs in a service.
- Never accept "it works on my machine" — verify with `docker-compose up` at least once per phase.

### 11.3 When Claude is wrong

Common failure modes to watch for:

- **Outdated NestJS patterns.** Insist on NestJS 10 idioms (e.g., `@Module` with `imports/providers/exports`, not legacy patterns).
- **Yjs misuse.** Yjs has subtle pitfalls (e.g., applying updates from the wrong client ID). When in doubt, refer to the Yjs official docs.
- **Suggesting Express middleware in NestJS.** Always prefer NestJS-native equivalents (Guards, Interceptors, Pipes).
- **Over-engineering.** If Claude suggests a "queue system" for the activity feed, push back: a single throttled writer is enough.

### 11.4 README's "AI Usage" Section (required by the brief)

The README must include a section that answers:

1. **Which AI tools were used and for what?**
   Example: "Claude Code (Sonnet 4.5) for scaffolding, NestJS module generation, TipTap configuration, Prisma schema iteration. ChatGPT for occasional rubber-duck on CRDT semantics."

2. **Where did AI help, where did it fall short?**
   Example: "Excellent at boilerplate (DTOs, Prisma migrations, NestJS controllers). Weaker at Yjs — produced subtly broken update-application logic that I rewrote against the official docs. Tended to over-suggest libraries; I declined `bull-mq`, `cache-manager`, `swagger` to keep scope tight."

3. **Where did I override the AI?**
   Example: "Claude initially proposed storing the document tree as JSONB and computing diffs server-side. I rejected this in favor of Yjs binary state — it removes a whole class of conflict bugs and unlocks offline support. The decision is documented in PROJECT.md §6."

This section is **graded directly**. Be specific, be honest, show judgment.

---

## Appendix A — Daily Checklist (Use This)

Before each Claude Code session:

- [ ] Pull latest `main`.
- [ ] Re-read the current phase in §8.
- [ ] Re-read §2 (Architectural Principles).
- [ ] State out loud: "Today I am completing Phase X. Definition of done is Y."

After each phase:

- [ ] `pnpm lint && pnpm build` clean.
- [ ] Manual smoke test of the new feature.
- [ ] Commit with a Conventional Commit message.
- [ ] Push to GitHub.
- [ ] Update PROJECT.md if any decision changed (this is a living document).

---

**End of PROJECT.md**

*This document is the contract between you, the architect, and Claude Code, the implementer. Keep it honest, keep it updated.*