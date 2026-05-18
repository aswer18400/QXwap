# QXwap Feature Parity Brief

This document is a handoff checklist for bringing the new local QXwap monorepo to behavior parity with the older GitHub QXwap app.

Source of truth for new code:

- Local monorepo: `<repo-root>`

Feature reference only:

- Older GitHub app: `https://github.com/aswer18400/QXwap`

Important: keep the local monorepo architecture. Do not move code back to the old GitHub structure. Use the older app only as a behavior and workflow reference.

## Current Direction

The local app has the stronger foundation:

- `apps/web` React/Vite frontend
- `apps/api` Express API
- database-backed sessions
- PostgreSQL/Supabase Postgres support
- PGlite local fallback
- split frontend components, screens, sheets, styles, and shared libs
- API tests
- profile `account_level`
- design system file

The main remaining goal is feature parity in marketplace behavior, mobile UX, offer flow, filters, profile behavior, and deployment behavior.

## Parity Targets

Make these local features match the behavior of the older GitHub QXwap app while keeping the local structure:

- Auth: signup, signin, signout, session restore, `/auth/me`
- Feed, Shop, and Product detail
- Add, edit, and delete product
- Product image upload and display
- Search plus unified filter behavior
- Wanted tags: add, display, and click-to-filter
- Xwap / offer flow
- Inbox and offers
- Profile and profile photo persistence
- Owner vs non-owner permissions
- Wallet and credits
- Notifications
- Chat conversations and messages
- Deals and shipments
- Follow and bookmark
- Mobile UX: no repeated reload, smooth scroll, card tap works, Xwap button works
- Production API base, session, and cookie behavior

## High-Risk QA Areas

These should be tested before calling parity complete:

- Mobile behavior on a 390px wide viewport
- Feed does not refresh repeatedly after opening
- Feed and Shop scroll smoothly
- Product card tap opens detail
- Xwap button opens the offer flow
- User with no products can send an offer using message, cash, credit, or a combination
- Search and filter combine correctly
- Wanted tag click moves to filtered Shop or matching results
- Profile photo persists after refresh and re-login
- Owner sees edit/delete only on own items
- Non-owner never sees edit/delete
- Product images render in Feed, Shop, and Detail
- New image uploads render locally and in production
- `/uploads/<filename>` resolves correctly in local and deployed environments
- Service worker or cache behavior does not trap stale frontend code
- GitHub Pages injects the correct API base
- API base normalization avoids `/api/api`
- Production session cookies and CORS work with the deployed frontend

## Feature Comparison Summary

| Area | Older GitHub App | Local Monorepo | Status |
| --- | --- | --- | --- |
| Feed / Shop | Feed, Shop, Product detail | Feed/Shop/Product components | Test behavior |
| Product listing | Create/edit/delete items | API items + AddProduct | Compare full flow |
| Product images | Upload/render in card/detail | `/api/upload` + asset helper | Verify local/prod paths |
| Xwap / Offer | Offer flow and status actions | Offer APIs and UI | Verify validation |
| No-product offer | Must support cash/credit/message | Backend/UI likely close | Test directly |
| Search | Search works | Search/filter state exists | Verify combined behavior |
| Filter sheet | Unified filters | `FilterSheet` | Compare options |
| Wanted tags | Add/display/click filter | Tags and wanted preview exist | Test click flow |
| Profile | Profile/photo/shop/owner logic | Profile/ProfileShop components | Verify persistence |
| Auth | Session auth | Express auth/session | Verify errors/session |
| Wallet | Wallet/deposit/transactions | Wallet page/routes | Compare behavior |
| Notifications | Notification route/UI | Routes and Inbox tab | Verify flow |
| Chat | Conversations/messages | Chat routes | Verify frontend use |
| Deals / Shipments | Deal/shipment flows | Routes exist | Verify screens |
| Follow / Bookmark | Follow/bookmark | State, tables, routes | Verify UI/API |
| Mobile UX | Hotfixes and QA focus | Needs testing | Test heavily |
| Cache reset | Service worker behavior considered | README says no SW registration | Verify deploy |
| API base | GitHub Pages injection | `normalizeApiBase` | Verify workflow |
| Account level | Not clearly defined | `profiles.account_level` | Local is ahead |

## Recommended Implementation Order

1. Verify the app boots with real persistence and seeded data.
2. Test Auth, Feed, Shop, Product Detail, and Add Product.
3. Test image upload/display across all product surfaces.
4. Test Search + Filter + Wanted tag filtering together.
5. Test Xwap offers for users with products and users without products.
6. Test Inbox offer status actions.
7. Test Profile owner/non-owner visibility and avatar persistence.
8. Test Wallet, Notifications, Chat, Deals, Shipments.
9. Test mobile UX at 390px and Android Chrome-like constraints.
10. Test deployed API base, session cookies, CORS, and cache behavior.

## Developer Handoff Prompt

```text
ช่วยทำ feature parity ระหว่าง QXwap local monorepo ตัวใหม่กับ GitHub QXwap เดิม โดยให้ใช้ local monorepo เป็น codebase หลัก แต่ทำให้ behavior ของฟีเจอร์เหมือนตัว GitHub เดิม

ไม่ต้องย้ายโครงสร้างกลับไปแบบเดิม ให้รักษาโครงสร้าง apps/web และ apps/api ไว้

ฟีเจอร์ที่ต้องเทียบและทำให้เหมือนกัน:

* Auth signup/signin/signout/me
* Feed / Shop / Product detail
* Add/Edit/Delete product
* Product image upload/display
* Search + unified filter
* Wanted tags add/display/click-to-filter
* Xwap / Offer flow รวมถึง user ที่ไม่มีสินค้าก็ส่ง offer ด้วย cash/credit/message ได้
* Inbox / offers
* Profile / profile photo persistence
* Owner vs non-owner permissions
* Wallet
* Notifications
* Chat
* Deals / Shipments
* Follow / Bookmark
* Mobile UX: no repeated reload, smooth scroll, card tap works, Xwap button works
* Production API base/session/cookie behavior

ให้ใช้ GitHub repo เดิมเป็น reference ด้านฟีเจอร์เท่านั้น ส่วน GitHub main เป็น source of truth สำหรับโค้ดใหม่
```
