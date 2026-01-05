# AI_CONTEXT.md
# Real-Time Collaborative Platform
## Single Source of Truth for System Architecture

---

## 0. DEPLOYMENT & ARCHITECTURE MODEL

### 0.1 Infrastructure Layout
- **Frontend**: Vercel or Netlify (Static Hosting + SPA).
- **Backend**: Persistent Node.js container (Railway / Render / Fly.io).
  - *Note*: **NOT** Serverless. Socket.io and Y.js require a persistent process.
- **Database**: External managed DB or Persistent Volume (current: local `storage/` directory).
- **Communication**: Cross-domain HTTPS (API) and WSS (WebSockets).

### 0.2 Platform Constraints
- **Vercel/Netlify**: Purely for the frontend bundle. No WebSockets or persistent state.
- **Backend Persistence**: Must have "sticky sessions" or a single instance to maintain the Y.js server-side document state.
- **Auth Compatibility**: Must use explicit JWT headers to work reliably across different domains (CORS).

---

## 1. HIGH-LEVEL SYSTEM ARCHITECTURE

### 1.1 System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │  Y.js CRDT   │  │ Socket.io    │          │
│  │   Editor     │◄─┤   Document   │◄─┤   Client     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │ WebSocket + HTTP
┌────────────────────────────┼─────────────────────────────────────┐
│                            ▼                                     │
│                    GATEWAY LAYER                                 │
│              ┌──────────────────────┐                           │
│              │   Socket.io Server   │                           │
│              │   + Auth Middleware  │                           │
│              └──────────────────────┘                           │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
┌────────▼────────┐ ┌────▼─────┐ ┌───────▼────────┐
│  CRDT SYNC      │ │  AUTH    │ │  AI PIPELINE   │
│  ENGINE         │ │  SERVICE │ │  (DEFERRED)    │
│  (Y.js Server)  │ │  (JWT)   │ │  [Future]      │
└────────┬────────┘ └────┬─────┘ └───────┬────────┘
         │               │                │
         └───────────────┼────────────────┘
                         │
                ┌────────▼────────┐
                │  PERSISTENCE    │
                │  LAYER          │
                │  (MongoDB DB)   │
                └─────────────────┘
```

### 1.2 Core Components

#### Client Layer
- **React UI**: TypeScript-based component architecture with Tailwind CSS.
- **Collaborative Editor**: Tiptap Editor (Block-based) with `y-tiptap`.
- **Presence System**: Real-time cursor tracking via Y.js Awareness.
- **Auth Module**: JWT-based flow with Refresh Tokens.

#### Server Layer
- **Socket.io Gateway**: WebSocket connection management.
- **CRDT Sync Engine**: Y.js document synchronization in memory.
- **Auth Service**: JWT generation and validation using Database-backed users.
- **Storage Service**: MongoDB persistence for Documents (Binary) and Users (JSON).

### Document Storage Model
- **Database-First**: Documents are stored in MongoDB (or compatible NoSQL DB).
- **State Persistence**: Y.js binary state is stored as a `Buffer` field in the document record.
- **Metadata**: Title, Owner, and Collaborators are top-level fields in the DB schema.
- **No Filesystem**: The `storage/` directory is strictly forbidden for persistence.
- **Auto-Save**: The server periodically flushes the in-memory Y.js state to the database.

### Deployment Guarantees
- **Ephemeral Safe**: The application assumes the local disk is temporary.
- **Stateless**: Any server instance can load any document from the DB.
- **Restart Recovery**: All data survives server restarts and redeployments.

### Collaboration Model
- **Memory Master**: The active Y.Doc is held in memory during collaboration.
- **Live Sync**: Socket.io broadcasts updates to all connected clients immediately.
- **Persistence**: Updates are batched and saved to the DB asynchronously.
- **Hydration**: On opening a document, the server fetches the binary blob from DB and reconstructs the Y.Doc.

---

## 2. CURRENT IMPLEMENTATION STATUS

### 2.1 Backend Persistence (Being Fixed)
- **Users**: Historically in-memory. Moving to `users.json` persistence.
- **Documents**: Historically write-only. Moving to full load-on-startup model.
- **Database**: No external DB (Postgres/Mongo) is used. We rely on the filesystem for simplicity and portability in this agent environment.

### 2.2 Authentication Strategy
- **Mechanism**: JWT (Access + Refresh Tokens).
- **Delivery**: Tokens returned explicitly as JSON in the response body.
- **Transport**:
  - **HTTP**: Sent via `Authorization: Bearer <token>` header.
  - **Socket.io**: Sent via `auth: { token }` during the connection handshake.
- **Requirements**:
  - **NO 204 responses** for auth; always return JSON status.
  - **NO empty bodies** in successful responses.
  - **CORS-safe**: Configured to allow specific frontend origins.

### 2.3 Security Guarantees
- **Stateless Auth**: JWT-based, no session affinity required for auth (though needed for Y.js).
- **Backend Enforcement**: Permission checks performed on every API request and socket event.
- **No Silent Failures**: Explicit error codes (400, 401, 403, 500) returned with descriptive messages.

### 2.4 AI Features (DEFERRED)
- AI integration is **explicitly deferred** to prioritize collaboration stability.
- Related services exist as placeholders but are not active.

---

## 3. DATA FLOW DIAGRAMS

### 3.1 User Authentication Flow
```
┌──────┐                  ┌──────────┐                 ┌─────────┐
│Client│                  │  Server  │                 │  FS     │
│      │                  │          │                 │ (Disk)  │
└──┬───┘                  └────┬─────┘                 └────┬────┘
   │                           │                            │
   │ POST /auth/register       │                            │
   ├──────────────────────────►│                            │
   │                           │ Hash password              │
   │                           │ Generate user ID           │
   │                           │ Save User                  │
   │                           ├───────────────────────────►│
   │                           │                            │
   │                           │◄───────────────────────────┤
   │                           │ Create JWTs                │
   │◄──────────────────────────┤                            │
   │ {tokens, user}            │                            │
   │                           │                            │
   │ Connect Socket.io         │                            │
   │ (with accessToken)        │                            │
   ├──────────────────────────►│                            │
   │                           │ Verify JWT                 │
   │                           │ Attach user to socket      │
   │◄──────────────────────────┤                            │
   │ Connection established    │                            │
```

---

## 4. CRDT + Y.js SYNCHRONIZATION

- **Library**: `yjs`, `y-websocket` (custom adapter), `y-tiptap`.
- **Persistence**:
  - `doc.yjs`: Binary state vector.
  - `doc.meta.json`: Metadata (owner, title, times).
- **Conflict Resolution**: Built-in Y.js logic (Last-Write-Wins for metadata).

---

## 5. SECURITY & SCALABILITY

### 5.1 Security
- **Passwords**: `bcrypt` hashed.
- **JWT**: Signed with secrets (from ENV).
- **Socket**: Handshake authentication required.

### 5.2 Scaling
- **Current**: Single instance, vertical scaling.
- **Future**: Redis adapter for Socket.io to support multi-node.

---

## 6. MODULE BOUNDARIES

### 6.1 Server Structure
- `src/auth`: Auth logic and User persistence.
- `src/crdt`: Y.js logic and Document persistence.
- `src/sockets`: Real-time gateways.
- `storage`: JSON/Binary files.

### 6.2 Client Structure
- `src/editor`: Tiptap + Y.js binding.
- `src/components`: UI components.
- `src/socket`: Socket context.
- `src/whiteboard`: Canvas logic.

---

**Document Version**: 1.1 (Refocused on Stability)
**Last Updated**: 2026-01-04
