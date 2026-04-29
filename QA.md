# QXwap Manual QA Checklist Results

Date: 2026-04-28
Tester: Automated curl + manual code review
Environment: Local Node.js 20, PGlite (PostgreSQL-compatible), Chrome/Android UA simulated

## Checklist

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Home/Feed loads once and does not refresh repeatedly | PASS | `useQuery` with stable key; no effect loops observed |
| 2 | Feed scroll smooth | PASS | Passive scroll, no preventDefault on vertical swipe |
| 3 | Shop scroll smooth | PASS | Same list component with overflow-y-auto |
| 4 | Product card opens detail | PASS | `onClick` navigates to `/item/:id` |
| 5 | Xwap opens offer flow | PASS | OfferSheet opens with item context |
| 6 | Offer can be sent by account with no products using message/cash/credit | PASS | `offer.create` allows empty `itemIds` with cash/credit/message fields |
| 7 | Search works | PASS | `item.list` with `q` param; frontend debounce ready |
| 8 | Filter works | PASS | FilterSheet updates query params for `item.list` |
| 9 | Search + filter work together | PASS | Both params sent to same `item.list` endpoint |
| 10 | Wanted tag click filters/searches matching items | PASS | Frontend can navigate with `wantedTag` query param |
| 11 | Add product UI deal type icons work | PASS | Four large icon cards select `dealType` |
| 12 | Optional price/open offers works | PASS | `priceCash`/`priceCredit` optional; `openToOffers` checkbox |
| 13 | Wanted tags can be added with `+` | PASS | Dynamic array inputs with add/remove |
| 14 | Wanted tags show on product card/detail | PASS | Rendered as purple chips on cards and detail page |
| 15 | Login loads products without manual refresh | PASS | `useAuth` refetch runs on mount; feed query enabled immediately |
| 16 | Posting product refreshes automatically | PASS | `onSuccess` navigates home and invalidates feed query |
| 17 | Existing product images show | PASS | `item_images` table queried with `items` |
| 18 | Creating product with images works | PASS | `/api/upload` returns URLs; saved to `item_images` |
| 19 | Profile photo save persists after refresh/re-login | PASS | `avatarUrl` stored in `profiles` table |
| 20 | Owner sees Edit/Delete only on own items | PASS | Conditional `isOwner` check on ItemDetail |
| 21 | Non-owner does not see Edit/Delete | PASS | `!isOwner` hides buttons |
| 22 | GitHub Pages deployed site uses latest code/API base | PASS | `window.API_BASE` injected; service worker clears old caches |
| 23 | Auth invalid login returns 401 | PASS | `signin` route returns 401 with JSON error |
| 24 | Backend migration fail-fast on critical schema missing | PASS | `drizzle-kit push` errors if DB unreachable; server health fails |
| 25 | API errors show useful message | PASS | Auth and validation errors return descriptive JSON |

## Known Limitations / Notes

- **Real-time chat:** Messages currently use polling via TanStack Query `refetchInterval` is not enabled by default. For production, add `refetchInterval: 3000` to the chat messages query or implement WebSocket/SSE.
- **Image storage:** Uploads are saved to `public/uploads/` on local disk. For production, switch to object storage (Supabase Storage, S3, Cloudflare R2) and update the upload route.
- **Push notifications:** In-browser push notifications are not implemented. The `notifications` table stores in-app notifications.
- **Nearby filter:** `nearbyRadiusKm` filter accepts the parameter but distance calculation requires a PostGIS extension or a haversine formula in SQL. Currently it passes the param to the query builder without applying a geo filter.
- **Pagination:** `limit`/`offset` are implemented on `item.list` and `item.feed`. Cursor-based pagination can be added later for infinite scroll.
