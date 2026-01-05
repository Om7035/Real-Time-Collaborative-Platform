# Real-Time Collaborative Platform

A production-grade collaborative workspace featuring real-time document editing, secure authentication, and persistent storage. Built with React, Node.js, Socket.io, and Y.js.

## 🎯 Overview

This platform enables multiple users to collaboratively edit documents in real-time with zero conflicts, powered by **Y.js CRDTs** (Conflict-free Replicated Data Types). It focuses on stability, persistence, and secure user management.

### Key Features

- ✅ **Real-Time Collaboration**: Multiple users editing simultaneously with automatic conflict resolution (Tiptap + Y.js).
- ✅ **Live Cursor Presence**: See where other users are editing in real-time.
- ✅ **Secure Authentication**: JWT-based flow with Access & Refresh tokens, properly persisted.
- ✅ **Invite System**: Generate shareable links with role-based access (Viewer/Editor) and expiration.
- ✅ **Persistent Storage**: Users and Documents (state + metadata) survive server restarts.
- ✅ **Production-Ready**: Dockerized deployment, resilient startup, and graceful shutdown.
- ✅ **Modern UI**: Polished, responsive interface built with Tailwind CSS.

---

## 🏗️ Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │  Y.js CRDT   │  │ Socket.io    │          │
│  │   Editor     │◄─┤   Document   │◄─┤   Client     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬─────────────────────────────────────┘
                             │ WebSocket + HTTP
┌────────────────────────────┼─────────────────────────────────────┐
│                    GATEWAY LAYER                                 │
│              ┌──────────────────────┐                           │
│              │   Socket.io Server   │                           │
│              │   + Auth Middleware  │                           │
│              └──────────────────────┘                           │
└─────────────────────────┬────────────────────────────────────────┘
         ┌────────────────┼────────────────┐
         │                │                │
┌────────▼────────┐ ┌────▼─────┐ ┌───────▼────────┐
│  CRDT SYNC      │ │  AUTH    │ │  AI PIPELINE   │
│  ENGINE         │ │  SERVICE │ │  SERVICE       │
│  (Y.js Server)  │ │  (JWT)   │ │  (HuggingFace) │
└────────┬────────┘ └────┬─────┘ └───────┬────────┘
         │               │                │
         └───────────────┼────────────────┘
                         │
                ┌────────▼────────┐
                │  PERSISTENCE    │
                │  LAYER          │
                │  (File/DB)      │
                └─────────────────┘
```

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Y.js (CRDT synchronization)
- Socket.io-client (WebSocket)
- Monaco Editor (code editing)
- React Router (navigation)
- Vite (build tool)

**Backend:**
- Node.js 20 + TypeScript
- Express (HTTP server)
- Socket.io (WebSocket server)
- Y.js (CRDT server)
- JWT (authentication)
- HuggingFace API (AI models)
- Winston (logging)

**Infrastructure:**
- Docker + Docker Compose
- Nginx (reverse proxy)
- File-based storage (scalable to S3/DB)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and npm 10+
- **Docker** and Docker Compose (for containerized deployment)
- **HuggingFace API Key** (for AI features)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd OGGG

# Copy environment template
cp .env.example .env

# Edit .env and set your values:
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - JWT_REFRESH_SECRET (generate with: openssl rand -base64 32)
# - HUGGINGFACE_API_KEY (get from https://huggingface.co/settings/tokens)
```

### 2. Development Mode

```bash
# Install dependencies for both client and server
npm install

# Start development servers (runs concurrently)
npm run dev

# Client will be available at: http://localhost:5173
# Server will be available at: http://localhost:3000
```

### 3. Production Deployment (Docker)

```bash
# Build and start all services
docker-compose up --build

# Application will be available at: http://localhost
```

---

## 📁 Project Structure

```
/
├── AI_CONTEXT.md              # System architecture documentation
├── docker-compose.yml         # Multi-container orchestration
├── .env.example               # Environment variables template
│
├── /server                    # Backend application
│   ├── /src
│   │   ├── /auth              # JWT authentication
│   │   ├── /sockets           # Socket.io gateway
│   │   ├── /crdt              # Y.js document management
│   │   ├── /ai                # HuggingFace integration
│   │   ├── /routes            # HTTP endpoints
│   │   ├── /middleware        # Express middleware
│   │   ├── /types             # TypeScript types
│   │   ├── /utils             # Utilities
│   │   ├── app.ts             # Express app
│   │   └── server.ts          # Entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
└── /client                    # Frontend application
    ├── /src
    │   ├── /auth              # Auth context
    │   ├── /socket            # Socket.io client
    │   ├── /editor            # Collaborative editor
    │   ├── /ai                # AI panel
    │   ├── /components        # React components
    │   ├── /types             # TypeScript types
    │   ├── /utils             # Utilities
    │   ├── App.tsx            # Root component
    │   └── main.tsx           # Entry point
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── vite.config.ts
```

---

## 🔐 Authentication Flow

1. **User Registration**: Email + password → bcrypt hash → JWT tokens
2. **Login**: Validate credentials → Issue access + refresh tokens
3. **WebSocket Auth**: Access token in handshake → Verify → Attach user to socket
4. **Token Refresh**: Refresh token → New access token

**Token Lifetimes:**
- Access Token: 15 minutes
- Refresh Token: 7 days

---

## 📡 Real-Time Collaboration

### CRDT Synchronization

The platform uses **Y.js** for conflict-free document synchronization:

1. **Local Edits**: Applied immediately to local Y.js document
2. **Delta Transmission**: Only changes (not full document) sent over WebSocket
3. **Automatic Merging**: Y.js CRDTs guarantee eventual consistency
4. **Offline Support**: Edits queued and reconciled on reconnect

### Document Structure

```typescript
{
  content: Y.Text,              // Main collaborative text
  metadata: Y.Map<{
    title: string,
    createdAt: number,
    lastModified: number,
    owner: string
  }>,
  cursors: Y.Map<{              // Live cursor positions
    [userId]: { position, color, name }
  }>,
  aiGenerations: Y.Array<{      // AI-generated content
    id, prompt, result, timestamp
  }>
}
```

---

## 🤖 AI Integration

### Supported Operations

- **Text Generation**: General-purpose text creation
- **Summarization**: Condense long content
- **Code Completion**: Generate code snippets

### Models Used

- Text: `mistralai/Mistral-7B-Instruct-v0.2`
- Summarization: `facebook/bart-large-cnn`
- Code: `bigcode/starcoder`

### Rate Limiting

- 10 requests per minute per user
- Results cached for 1 hour (identical prompts)

### AI Workflow

1. User enters prompt in AI panel
2. Prompt validated and sanitized
3. Request sent to HuggingFace API
4. Result inserted into Y.js document
5. Update broadcasted to all collaborators

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | Access token secret | **Required** |
| `JWT_REFRESH_SECRET` | Refresh token secret | **Required** |
| `HUGGINGFACE_API_KEY` | HuggingFace API key | **Required** |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `STORAGE_PATH` | Document storage path | `./storage/documents` |

### Client Environment

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:3000` |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 📊 Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-04T15:13:42.000Z",
  "uptime": 3600,
  "memory": { ... }
}
```

### Logs

- **Development**: Console output with colors
- **Production**: JSON logs to `logs/combined.log` and `logs/error.log`

---

## 🚢 Deployment

### Docker Compose (Recommended)

```bash
# Production build
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

```bash
# Build server
cd server
npm install
npm run build
npm start

# Build client
cd client
npm install
npm run build
# Serve dist/ with nginx or similar
```

---

## 🔒 Security

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Signing**: HS256 algorithm
- **Input Validation**: Joi schemas on all endpoints
- **Rate Limiting**: 100 requests/minute per IP
- **CORS**: Whitelist specific origins
- **XSS Protection**: Sanitize AI-generated content

---

## 🎨 Design Philosophy

### Visual Excellence

- **Modern Gradients**: Vibrant color palettes (not plain colors)
- **Glassmorphism**: Backdrop blur effects for depth
- **Smooth Animations**: Micro-interactions for engagement
- **Dark Mode**: Eye-friendly interface for long sessions

### Code Quality

- **TypeScript Everywhere**: Full type safety
- **No Placeholders**: All features fully implemented
- **Separation of Concerns**: Clear module boundaries
- **Production-Grade**: Error handling, logging, graceful shutdown

---

## 📈 Scalability

### Horizontal Scaling

For multi-server deployments, add Redis adapter:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### Performance Optimizations

- **Binary Protocol**: Y.js uses efficient encoding
- **WebSocket Compression**: Enabled by default
- **Debounced Cursor Updates**: Batched every 100ms
- **Lazy Loading**: Document history on demand

---

## 🛠️ Troubleshooting

### Common Issues

**1. WebSocket Connection Failed**

```bash
# Check CORS settings in .env
CORS_ORIGIN=http://localhost:5173

# Verify server is running
curl http://localhost:3000/health
```

**2. AI Generation Fails**

```bash
# Verify HuggingFace API key
echo $HUGGINGFACE_API_KEY

# Check model status
curl -H "Authorization: Bearer $HUGGINGFACE_API_KEY" \
  https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2
```

**3. Document Not Syncing**

- Check browser console for errors
- Verify JWT token is valid
- Ensure document ID exists in storage

---

## 📚 API Reference

### Authentication

**POST /api/auth/register**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

### Documents

**POST /api/documents/create** (Requires Auth)
```json
{
  "title": "My Document"
}
```

**GET /api/documents/list** (Requires Auth)

**DELETE /api/documents/:id** (Requires Auth)

### Invites

**POST /api/documents/:id/invites** (Owner Only)
Create a new invite link.
```json
{
  "role": "editor", // "viewer" or "editor"
  "expiresIn": 604800, // seconds
  "maxUses": null // number or null
}
```

**GET /api/invites/:token**
Get invite metadata.

**POST /api/invites/:token/accept** (Requires Auth)
Accept an invite.

**DELETE /api/documents/:id/invite/:userId** (Owner Only)
Remove a collaborator.

### WebSocket Events

**Client → Server:**
- `document:join` - Join collaborative session
- `sync:update` - Send Y.js update
- `awareness:update` - Send cursor position
- `ai:generate` - Request AI generation

**Server → Client:**
- `document:state` - Initial document state
- `sync:update` - Broadcast Y.js update
- `awareness:update` - Broadcast cursor update
- `ai:result` - AI generation result

---

## 🤝 Contributing

This is a production-grade reference implementation. For contributions:

1. Follow existing code structure
2. Maintain TypeScript strict mode
3. Add tests for new features
4. Update documentation

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **Y.js**: Excellent CRDT library
- **Socket.io**: Reliable WebSocket framework
- **HuggingFace**: Open-source AI models
- **Monaco Editor**: VS Code's editor component

---

**Built with ❤️ for real-time collaboration**

For questions or issues, please refer to `AI_CONTEXT.md` for detailed architecture documentation.
