# QXwap API Route Documentation

## Base URL

- Local dev: `http://localhost:3000/api`
- Production: configured via `API_BASE_URL` env var, normalized to end in `/api`

---

## REST Routes

### Health

- **GET** `/api/health`
- Response: `{ "ok": true }` or `{ "ok": false }` with 503

### Auth

- **POST** `/api/auth/signup`
  - Body: `{ email: string, password: string }`
  - Response: `{ user: { id, email } }` + sets session cookie

- **POST** `/api/auth/signin`
  - Body: `{ email: string, password: string }`
  - Response: `{ user: { id, email } }` + sets session cookie
  - Error: 401 for invalid credentials

- **POST** `/api/auth/signout`
  - Clears session cookie
  - Response: `{ ok: true }`

- **GET** `/api/auth/me`
  - Requires session cookie
  - Response: `{ user: { id, email, profile } }` or `{ user: null }`

### Upload

- **POST** `/api/upload`
  - Content-Type: `multipart/form-data`
  - Fields: `images` (one or more files)
  - Response: `{ urls: ["/uploads/<name>.jpg", ...] }`

---

## tRPC Routes (endpoint: `/api/trpc`)

### Item Router (`item.`)

| Procedure | Type | Input | Auth |
|-----------|------|-------|------|
| `feed` | query | `{ limit?, offset? }` | public |
| `list` | query | `{ q?, category?, dealType?, minPrice?, maxPrice?, openToOffers?, wantedTag?, ownerId?, following?, nearbyRadiusKm?, lat?, lng?, fastResponder?, featured?, sort?, limit?, offset? }` | public |
| `byId` | query | `{ id: string }` | public |
| `create` | mutation | `{ title, description?, category?, condition?, dealType?, priceCash?, priceCredit?, openToOffers?, wantedText?, wantedTags?, locationLabel?, latitude?, longitude?, images? }` | required |
| `update` | mutation | `{ id, ...partial fields }` | required (owner only) |
| `delete` | mutation | `{ id: string }` | required (owner only) |

### Profile Router (`profile.`)

| Procedure | Type | Input | Auth |
|-----------|------|-------|------|
| `me` | query | — | required |
| `updateMe` | mutation | `{ displayName?, username?, city?, bio?, avatarUrl? }` | required |
| `byId` | query | `{ id: string }` | public |

### Bookmark Router (`bookmark.`)

| Procedure | Type | Input | Auth |
|-----------|------|-------|------|
| `list` | query | — | required |
| `create` | mutation | `{ itemId: string }` | required |
| `delete` | mutation | `{ itemId: string }` | required |

### Follow Router (`follow.`)

| Procedure | Type | Input | Auth |
|-----------|------|-------|------|
| `list` | query | — | required |
| `create` | mutation | `{ followingId: string }` | required |
| `delete` | mutation | `{ followingId: string }` | required |

### Offer Router (`offer.`)

| Procedure | Type | Input | Auth |
|-----------|------|-------|------|
| `list` | query | — | required |
| `sent` | query | — | required |
| `received` | query | — | required |
| `byId` | query | `{ id: string }` | required |
| `create` | mutation | `{ targetItemId, toUserId, message?, cashAmount?, creditAmount?, itemIds? }` | required |
| `accept` | mutation | `{ id: string }` | required (target user only) |
| `reject` | mutation | `{ id: string }` | required (target user only) |
| `cancel` | mutation | `{ id: string }` | required (sender only) |
| `confirm` | mutation | `{ id: string }` | required (target user only) |

### Wallet Router (`wallet.`)

| Procedure | Type | Input | Auth |
|-----------|------|-------|------|
| `get` | query | — | required |
| `transactions` | query | — | required |
| `deposit` | mutation | `{ amount: number }` | required |

### Notification Router (`notification.`)

| Procedure | Type | Input | Auth |
|-----------|------|-------|------|
| `list` | query | — | required |
| `read` | mutation | `{ ids: string[] }` | required |

### Deal Router (`deal.`)

| Procedure | Type | Input | Auth |
|-----------|------|-------|------|
| `mine` | query | — | required |
| `byId` | query | `{ id: string }` | required |
| `updateStage` | mutation | `{ id: string, stage: string }` | required |
| `updateLogistics` | mutation | `{ id: string, logistics: any }` | required |

### Shipment Router (`shipment.`)

| Procedure | Type | Input | Auth |
|-----------|------|-------|------|
| `start` | mutation | `{ offerId: string }` | required |
| `byId` | query | `{ id: string }` | required |
| `updateStep` | mutation | `{ id: string, step: string }` | required |
| `finish` | mutation | `{ id: string }` | required |

### Chat Router (`chat.`)

| Procedure | Type | Input | Auth |
|-----------|------|-------|------|
| `conversations` | query | — | required |
| `messages` | query | `{ conversationId: string }` | required |
| `sendMessage` | mutation | `{ conversationId: string, text: string }` | required |
| `createConversation` | mutation | `{ offerId?, participantIds: string[] }` | required |

---

## Auth / Session

Sessions are stored in the `user_sessions` table. The session ID is passed via an HTTP-only cookie named `sid` with `Path=/`.

All tRPC procedures using `authedQuery` require a valid session cookie.

## Uploads

Images are uploaded via `/api/upload` and saved to `public/uploads/`. The returned URLs are relative (e.g., `/uploads/<uuid>.jpg`). For production, replace the local disk storage with object storage (S3/Supabase Storage) and update the `upload` route.

## Error Codes

- `400` — Bad request (validation errors)
- `401` — Unauthorized (missing/invalid session)
- `404` — Not found
- `409` — Conflict (e.g., duplicate email)
- `500` — Internal server error
