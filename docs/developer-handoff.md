# QXwap Developer Handoff

เอกสารนี้คือ handoff สำหรับ Developer เพื่อเอา QXwap prototype/design ไป implement ต่อได้จริง โดยอ้างอิงไฟล์ปัจจุบันใน repo นี้.

## 1. Source Files

| File | Purpose |
| --- | --- |
| `docs/qxwap-interactive-prototype.html` | interactive prototype หลัก |
| `docs/qxwap-figma-final-package.html` | Figma-ready final package |
| `docs/design-final.md` | final UI requirements |
| `docs/design-system-states.md` | design system, components, states |
| `docs/prototype-handoff.md` | prototype flow, user flow, behavior |
| `docs/feature-parity.md` | parity checklist ระหว่าง local app กับ QXwap เดิม |

Local preview:

```bash
cd <repo-root>/docs
python3 -m http.server 8099
```

Open:

```text
http://localhost:8099/qxwap-interactive-prototype.html
http://localhost:8099/qxwap-figma-final-package.html
```

## 2. Figma File

Target Figma file:

```text
QXwap Feed Redesign Concepts
fileKey: 3BHvaNXqmDQJsqpfanxtHL
```

Current note:

- Figma MCP quota was reached, so direct write to Figma could not be completed in this run.
- Use `docs/qxwap-figma-final-package.html` as the import/capture source when quota is available.
- The file already includes the HTML-to-Figma capture script.

Recommended Figma pages:

1. `00 Cover`
2. `01 Design Tokens`
3. `02 Components`
4. `03 Component States`
5. `04 Final UI Screens`
6. `05 User Flows`
7. `06 Prototype`
8. `07 Dev Handoff`
9. `99 Archive`

## 3. Prototype Flow

### Main Flow

```text
Guest opens Feed
→ browses recommendations
→ taps product
→ opens Product Detail
→ taps Xwap
→ sees login prompt
→ signs in
→ offer sheet opens
→ submits item/cash/credit/message offer
→ offer appears in Inbox
→ owner accepts/rejects
→ chat / shipment flow
→ deal completed
```

### Shop Flow

```text
Shop
→ search product/profile
→ apply category/filter
→ tap product card
→ Product Detail
→ save or Xwap
```

### Add Product Flow

```text
Add
→ choose deal type
→ fill title/description/category/condition
→ upload image
→ set cash/credit/open offer
→ add wanted tags
→ publish
→ item appears in Feed/Shop/Profile
```

### Offer Flow

```text
Tap Xwap
→ select my item if available
→ optional cash
→ optional credit
→ optional message
→ submit
→ pending offer
```

Required: users with no listed products must still be able to send message/cash/credit offers.

## 4. Interaction Notes

- QXwap logo returns to Feed.
- Bottom nav has 5 destinations: Feed, Shop, Add, Inbox, Profile.
- Add button is centered and elevated.
- Product card tap opens detail.
- Save button toggles bookmark.
- Xwap button opens offer sheet.
- Wanted tag click applies search/filter and moves to Shop.
- Guest can browse but cannot save, offer, chat, or manage profile.
- Protected actions open login modal/prompt.
- Login should return user to intended journey where possible.
- Owner sees Edit/Delete only on own products.
- Non-owner never sees Edit/Delete.
- Restricted user can view but cannot Xwap.
- Upload/offer/auth errors must show useful UI, not silent failure.

## 5. Screen Specs

### Feed

Purpose: AI recommendation feed for swap opportunities.

Required UI:

- topbar with QXwap brand, search, notifications, profile
- followed-user rail
- credit card
- AI recommended product feed
- product owner profile
- product image/title/deal/match/wanted tags
- save action
- Xwap CTA
- guest login nudge

Behavior:

- No category filter clutter in Feed.
- Feed must scroll smoothly.
- Card tap opens Product Detail.
- Xwap opens Offer Sheet or login prompt.

### Shop

Purpose: marketplace product discovery.

Required UI:

- search bar
- filter button
- category rail
- 2-column product grid
- square 1:1 product image
- condition badge
- title
- owner avatar/name
- wanted preview
- price/credit/open offer
- save button
- Xwap button

Behavior:

- Search and filters combine.
- Product card opens detail.
- Save and Xwap are separate actions.
- Avoid nested interactive elements.

### Product Detail

Required UI:

- product image
- title
- owner profile
- category
- condition
- deal type
- cash/credit/open offer
- wanted tags
- wanted description
- save
- Xwap for non-owner
- Edit/Delete for owner

Behavior:

- Wanted tags are tappable.
- Owner controls are visible only for item owner.
- Restricted user cannot submit Xwap.

### Add Product

Required fields:

- deal type
- title
- description
- category
- condition
- location
- images
- optional cash price
- optional credit price
- open-to-offers toggle/checkbox
- wanted tags
- wanted description

Behavior:

- Price can be empty or `0`.
- Upload errors are visible.
- Publish refreshes Feed/Shop/Profile.

### Offer Sheet

Required fields:

- target item summary
- select my item(s), if available
- message
- cash amount
- credit amount
- shipping responsibility
- submit button

States:

- default
- loading
- success
- error
- no owned products
- restricted user

### Inbox

Required UI:

- tabs: Offers / Notifications
- offer card
- status badge
- offered item/cash/credit/message
- accept/reject/cancel/confirm actions

Behavior:

- Reject requires/selects reason.
- Accepted offer can continue to chat/shipment.

### Profile

Required UI:

- avatar
- display name
- username/city/bio
- user level
- follower count
- shop/listing tabs
- saved items
- wallet/settings/menu entry

Behavior:

- Public profile and my profile differ.
- Tapping owner opens public profile shop.
- Profile photo must persist in final implementation.

### Wallet

Required UI:

- credit balance
- transaction list
- deposit/test action
- rules: credit cannot be withdrawn as cash

### Shipment / Deal Progress

Required UI:

- deal stage list
- pickup proof
- delivery proof
- tracking/status
- fee responsibility
- rejection reason if failed

## 6. Buttons

| Button | Purpose | States |
| --- | --- | --- |
| Primary | main action | default, pressed, disabled, loading |
| Xwap | submit/open offer | default, pressed, disabled, loading |
| Secondary | neutral action | default, pressed, disabled |
| Danger | delete/reject | default, pressed, disabled |
| IconButton | search/filter/save/close | default, active, disabled, badge |
| BottomNavItem | navigation | default, active, pressed |

Rules:

- Minimum touch target: 44px.
- Icon-only buttons need `aria-label`.
- Disabled state must be visually obvious.
- Loading state must prevent duplicate submit.

## 7. Forms

Form components:

- text input
- email input
- password input
- number input
- textarea
- select
- checkbox/toggle
- upload box

Required states:

- default
- focus
- filled
- error
- disabled
- loading

Validation:

- Login invalid returns visible error.
- Required product title must be filled.
- Cash/credit must accept `0`.
- Upload failure preserves form data.
- Offer submit failure preserves entered offer.

## 8. Assets Export

Required assets:

- `qxwap-logo.svg`
- `icon-search.svg` / `Search`
- `icon-notification.svg` / `Bell`
- `icon-user.svg` / `User`
- `icon-feed.svg` / `Home`
- `icon-shop.svg` / `ShoppingBag`
- `icon-add.svg` / `Plus`
- `icon-inbox.svg` / `Inbox`
- `icon-save.svg` / `Bookmark`, `BookmarkCheck`
- `icon-xwap.svg` / `HeartHandshake`
- `icon-filter.svg` / `SlidersHorizontal`
- `icon-close.svg` / `X`
- `icon-proof.svg` / `Camera`
- `icon-shipment.svg` / `Truck`
- `icon-send.svg` / `Send`
- `icon-wallet.svg` / `WalletCards`
- `icon-credit-reward.svg` / `Gift`
- `icon-edit.svg` / `Edit3`
- `icon-delete.svg` / `Trash2`
- `icon-verified.svg` / `CheckCircle2`
- `icon-package.svg` / `PackageCheck`
- product placeholder image
- avatar placeholder image
- empty state illustration/icon
- shipment proof placeholder

Export rules:

- Icons: SVG, 24px viewBox.
- Figma naming: `Icon / Search`, `Icon / Notification`, `Icon / Xwap`.
- Code naming: use `lucide-react` export names where possible.
- Default stroke: 2px to 2.25px, round cap/join.
- Nav visual size: 21px. Inline helper icons: 16-18px.
- Icon-only buttons require `aria-label`; decorative icons use `aria-hidden`.
- Product images: WebP/PNG, square source preferred.
- Avatar source: square, rendered circular.
- Do not bake UI text into images.

## 9. Design Specs

Core sizes:

- mobile target: `390 x 844`
- small mobile QA: `360 x 780`
- large mobile QA: `430 x 932`
- topbar: `72-78px`
- bottom nav: `78-82px`
- touch target: `44px minimum`
- product image in Shop: `1:1`
- card radius: `20-24px`
- large radius: `28px`
- horizontal page padding: `14-20px`
- main bottom padding: `120px minimum`

Color refs:

- primary: `#2F7BFF`
- primary dark: `#0B63CE`
- primary soft: `#EAF3FF`
- page bg: `#F7F8FA`
- card bg: `#FFFFFF`
- text: `#101828`
- muted: `#667085`
- border: `#E7ECF3`
- danger: `#EF4444`
- success: `#16A34A`
- warning: `#F59E0B`

Motion refs:

- Source file: `apps/web/src/styles/animations.css`
- Token file: `apps/web/src/design-system/qxwap-design-tokens.css`
- `--qx-motion-fast`: `140ms`
- `--qx-motion-base`: `220ms`
- `--qx-motion-slow`: `320ms`
- `--qx-ease-standard`: `cubic-bezier(.2,.8,.2,1)`
- Screen entry: `.screen { animation: rise 0.22s ease; }`
- `rise` keyframe: opacity `0 → 1`, transform `translateY(8px) → none`
- Button transition: background/color/box-shadow/transform with fast duration
- Pressed button: `translateY(1px)`
- Loading spinner: `qx-spin var(--qx-motion-slow) linear infinite`
- Reduced motion: respect `prefers-reduced-motion: reduce`

## 10. Checklist Before Coding

Before implementation starts:

- [ ] Figma file has organized pages.
- [ ] Final UI screens are approved.
- [ ] Component states are defined.
- [ ] Design tokens are agreed.
- [ ] Asset export rules are clear.
- [ ] Prototype flow is reviewed.
- [ ] Feed and Shop hierarchy is approved.
- [ ] Button/form states are approved.
- [ ] Owner/non-owner behavior is clear.
- [ ] Guest/restricted behavior is clear.
- [ ] Error/empty/loading states are included.
- [ ] Mobile 390px QA target is locked.

Before marking frontend complete:

- [ ] Feed scroll is smooth.
- [ ] Shop has no horizontal scroll.
- [ ] Product card opens detail.
- [ ] Save toggles state.
- [ ] Xwap opens offer sheet.
- [ ] Wanted tag filters Shop.
- [ ] Login prompt appears for guest protected actions.
- [ ] Upload error is visible.
- [ ] Offer error is visible.
- [ ] Bottom nav does not cover important content.
- [ ] Icon-only controls have labels.
- [ ] No nested buttons.

## 11. Critical Journey Coverage

Use this as the minimum coverage map before coding:

| Area | Must Cover | Why |
| --- | --- | --- |
| Guest Gate | Save, Xwap, Add, Inbox, Profile protected actions | prevents dead buttons and confusing labels |
| No-Product Offer | message/cash/credit offer without owned items | core QXwap requirement |
| Owner Boundary | edit/delete only own items | security and trust |
| Restricted Level 4 | browse allowed, Xwap/API offer blocked | CMS restriction must work |
| Credit Integrity | wallet, transaction trail, no cash withdrawal | prevents payment confusion |
| Shipment Proof | pickup/delivery photo states | trust and dispute handling |

## 12. Prioritized Build Plan

1. **P0: Repair DB/API/Auth**
   Health, migrations, sessions, items, images, useful JSON errors.

2. **P1: Feed + Shop + Detail with real data**
   Product list, card tap, wanted tag, search/filter, owner boundary.

3. **P2: Xwap / Offer Flow**
   Offer sheet, no-product offer, sent/received, accept/reject/cancel/confirm.

4. **P3: Profile + Upload + Wallet**
   Profile persistence, image upload/display, credit balance/transactions.

5. **P4: Chat + Shipment + Notifications**
   Messages, pickup/delivery proof, notification badge/read state.

6. **P5: Admin / CMS + External Integrations**
   Restriction, moderation, maps, email, SMS, payment provider if approved.

## 13. Design to API Traceability

| Flow / Screen | API Contract | Database | Acceptance |
| --- | --- | --- | --- |
| Feed / Shop | `GET /api/feed`, `GET /api/items` | items, item_images, profiles, bookmarks, follows | loads once, no refresh loop, card opens detail |
| Auth / Guest Gate | `POST /api/auth/signin`, `GET /api/auth/me` | users, user_sessions, profiles | 401 on invalid login, prompt on protected action |
| Add Product | `POST /api/upload`, `POST /api/items` | items, item_images, categories | new item appears in Feed/Shop/Profile |
| Xwap Offer | `POST /api/offers`, `GET /api/offers` | offers, offer_items, notifications, wallets | no-product user can still offer |
| Profile | `GET /api/profiles/:id`, `PATCH /api/profiles/me` | profiles, items, bookmarks, follows | avatar persists, owner boundary correct |
| Shipment | shipment/deal endpoints | deals, shipments, offers | pickup/delivery proof required |

## 14. Acceptance Criteria

- **Feed Done:** real API data, smooth scroll, Xwap opens offer/login, wanted tag routes to Shop, no repeated reload.
- **Shop Done:** 2-column grid, search+filter combine, card opens detail, save/Xwap separate, no nested buttons.
- **Offer Done:** item/cash/credit/message offer works, no-product user can offer, owner receives inbox/notification.
- **Profile Done:** mine/public profiles differ, avatar persists, owner controls correct, level visible after login.
- **Credit Done:** wallet/transactions persist, credits can strengthen offer, no cash withdrawal.
- **Launch Ready:** 390px mobile pass, API health pass, auth/session/images work, security checklist pass.
